const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const { createUser } = require('./helpers/auth');
const User = require('../models/User');
const { cleanMealPlan, MAX_MEAL_PLANS_PER_USER } = require('../utils/mealPlan');

const day = (over = {}) => ({
  name: 'Ngày 1',
  meals: {
    'Bữa Sáng': [{ id: 'a1', name: 'Yến mạch', calories: '300', protein: 10 }],
    'Bữa Trưa': [{ id: 'a2', name: 'Cơm gà', calories: 600, protein: 40, carbs: 70, fat: 12 }],
  },
  ...over,
});
const body = (over = {}) => ({ name: 'Tuần ăn sạch', description: 'Ít dầu mỡ', targetCalories: 2000, days: [day()], ...over });

let alice;
let bob;
beforeAll(db.connect);
beforeEach(async () => {
  await db.clear();
  alice = await createUser();
  bob = await createUser();
});
afterAll(db.close);

const create = (payload, who = alice) => request(app).post('/api/meal-plans').set(who.auth).send(payload);
const list = (who = alice) => request(app).get('/api/meal-plans').set(who.auth);
const setActive = (id, who = alice) => request(app).put('/api/users/profile').set(who.auth).send({ activeMealPlanId: id });

describe('cleanMealPlan (pure)', () => {
  test('fills defaults: day names, no target, four meal keys', () => {
    const { plan } = cleanMealPlan({ name: ' Plan  A ', days: [{ meals: { 'Bữa Sáng': [{ name: 'Phở', calories: 400 }] } }, { meals: { 'Ăn Vặt': [{ name: 'Chuối', calories: 90 }] } }] });
    expect(plan.name).toBe('Plan A');
    expect(plan.targetCalories).toBeNull();
    expect(plan.days.map(d => d.name)).toEqual(['Ngày 1', 'Ngày 2']);
    expect(Object.keys(plan.days[0].meals)).toEqual(['Bữa Sáng', 'Bữa Trưa', 'Bữa Tối', 'Ăn Vặt']);
  });

  test.each([
    ['a missing name', { name: '  ' }],
    ['a name over 100 chars', { name: 'x'.repeat(101) }],
    ['a target below 800', { targetCalories: 500 }],
    ['a fractional target', { targetCalories: 2000.5 }],
    ['no days', { days: [] }],
    ['8 days', { days: Array.from({ length: 8 }, () => day()) }],
    ['a description over 300 chars', { description: 'x'.repeat(301) }],
  ])('rejects %s', (_label, over) => {
    expect(cleanMealPlan(body(over)).error).toEqual(expect.any(String));
  });

  test('a plan with no food at all is refused', () => {
    expect(cleanMealPlan(body({ days: [{ name: 'Ngày 1', meals: {} }] })).error).toBe('Thực đơn cần ít nhất một món.');
  });
});

describe('/api/meal-plans', () => {
  test('requires authentication', async () => {
    expect((await request(app).get('/api/meal-plans')).status).toBe(401);
    expect((await request(app).post('/api/meal-plans').send(body())).status).toBe(401);
  });

  test('creates, lists and updates own plans', async () => {
    const created = await create(body());
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'Tuần ăn sạch', targetCalories: 2000 });
    expect(created.body.id).toEqual(expect.any(String));
    expect(created.body).not.toHaveProperty('owner');
    expect(created.body.days[0].meals['Bữa Sáng'][0].calories).toBe(300); // "300" became a number

    expect((await list()).body.map(p => p.id)).toEqual([created.body.id]);

    const newDays = [day({ meals: { 'Bữa Tối': [{ id: 'z', name: 'Cá hồi', calories: 500 }] } })];
    const updated = await request(app).put(`/api/meal-plans/${created.body.id}`).set(alice.auth).send(body({ name: 'Tuần mới', days: newDays }));
    expect(updated.status).toBe(200);
    const [stored] = (await list()).body;
    expect(stored.name).toBe('Tuần mới');
    expect(stored.days[0].meals['Bữa Tối'][0].name).toBe('Cá hồi');
    expect(stored.days[0].meals['Bữa Sáng']).toEqual([]); // replaced, not merged
  });

  test('rejects a plan with no items', async () => {
    const res = await create(body({ days: [{ name: 'Ngày 1', meals: {} }] }));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Thực đơn cần ít nhất một món.');
  });

  test('rejects 8 days', async () => {
    expect((await create(body({ days: Array.from({ length: 8 }, () => day()) }))).status).toBe(400);
  });

  test('rejects negative calories in an item', async () => {
    const res = await create(body({ days: [day({ meals: { 'Bữa Sáng': [{ name: 'Lỗi', calories: -5 }] } })] }));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Calo/);
  });

  test('11th plan is refused', async () => {
    for (let i = 0; i < MAX_MEAL_PLANS_PER_USER; i++) expect((await create(body({ name: `Plan ${i}` }))).status).toBe(201);
    const res = await create(body());
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/10/);
    expect((await create(body(), bob)).status).toBe(201); // the limit is per user
  });

  test('another user gets 404 on PUT and DELETE, and never sees the plan in a list', async () => {
    const { body: mine } = await create(body());
    expect((await request(app).put(`/api/meal-plans/${mine.id}`).set(bob.auth).send(body())).status).toBe(404);
    expect((await request(app).delete(`/api/meal-plans/${mine.id}`).set(bob.auth)).status).toBe(404);
    expect((await list(bob)).body).toEqual([]);
    expect((await list()).body).toHaveLength(1);
  });

  test('an id that is not an ObjectId is a 404, not a server error', async () => {
    expect((await request(app).put('/api/meal-plans/not-an-id').set(alice.auth).send(body())).status).toBe(404);
    expect((await request(app).delete('/api/meal-plans/not-an-id').set(alice.auth)).status).toBe(404);
  });

  test('DELETE clears activeMealPlanId when it was the active plan', async () => {
    const { body: a } = await create(body({ name: 'A' }));
    const { body: b } = await create(body({ name: 'B' }));
    expect((await setActive(a.id)).status).toBe(200);

    expect((await request(app).delete(`/api/meal-plans/${b.id}`).set(alice.auth)).status).toBe(200);
    expect((await User.findById(alice.user._id)).activeMealPlanId).toBe(a.id); // another plan: untouched

    const del = await request(app).delete(`/api/meal-plans/${a.id}`).set(alice.auth);
    expect(del.status).toBe(200);
    expect((await request(app).get('/api/users/profile').set(alice.auth)).body.activeMealPlanId).toBe('');
  });

  test('profile accepts and returns activeMealPlanId, and clears it with an empty string', async () => {
    const { body: plan } = await create(body());
    const set = await setActive(plan.id);
    expect(set.status).toBe(200);
    expect(set.body.activeMealPlanId).toBe(plan.id);
    expect((await request(app).get('/api/users/profile').set(alice.auth)).body.activeMealPlanId).toBe(plan.id);
    expect((await setActive('')).body.activeMealPlanId).toBe('');
  });

  test('profile refuses an active plan that is not yours or not an id', async () => {
    const { body: bobs } = await create(body(), bob);
    expect((await setActive(bobs.id)).status).toBe(400);
    expect((await setActive('nope')).status).toBe(400);
    expect((await setActive({ $ne: '' })).status).toBe(400);
  });
});
