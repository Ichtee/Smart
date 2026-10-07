const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const { createUser } = require('./helpers/auth');
const Food = require('../models/Food');

const customFood = (over = {}) => ({ name: 'Salad nhà làm', servingSize: '1 tô', calories: 180, protein: 5, carbs: 20, fat: 8, ...over });

const names = (res) => res.body.map(f => f.name);

describe('food search and ownership', () => {
  beforeAll(db.connect);
  beforeEach(db.clear);
  afterAll(db.close);

  test('anonymous users get the seeded system foods only', async () => {
    const res = await request(app).get('/api/foods');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every(f => f.user === null && f.isCustom === false)).toBe(true);
  });

  test('seeding happens once, not on every request', async () => {
    await request(app).get('/api/foods');
    const first = await Food.countDocuments();
    await request(app).get('/api/foods');
    expect(await Food.countDocuments()).toBe(first);
  });

  test('a user sees system foods plus their own custom foods, never anyone elses', async () => {
    const a = await createUser();
    const b = await createUser();
    await request(app).post('/api/foods/custom').set(a.auth).send(customFood({ name: 'Món của A' }));
    await request(app).post('/api/foods/custom').set(b.auth).send(customFood({ name: 'Món của B' }));

    const resA = await request(app).get('/api/foods').set(a.auth);
    expect(names(resA)).toContain('Món của A');
    expect(names(resA)).not.toContain('Món của B');
    expect(names(resA)).toContain('Phở bò'); // system food

    const anon = await request(app).get('/api/foods');
    expect(names(anon)).not.toContain('Món của A');
  });

  test('onlyCustom=true returns just the callers custom foods', async () => {
    const a = await createUser();
    await request(app).post('/api/foods/custom').set(a.auth).send(customFood({ name: 'Riêng tôi' }));
    const res = await request(app).get('/api/foods').query({ onlyCustom: 'true' }).set(a.auth);
    expect(names(res)).toEqual(['Riêng tôi']);
  });

  test('search is case-insensitive', async () => {
    const res = await request(app).get('/api/foods').query({ search: 'PHỞ' });
    expect(names(res)).toContain('Phở bò');
  });

  test.each(['(', ')', '[', '*', '+', '?', '\\', '(a+)+$', '.*', 'a|b'])(
    'regex metacharacters in search are matched literally and never crash (%s)',
    async (term) => {
      const res = await request(app).get('/api/foods').query({ search: term });
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]); // none of the seeded names contain these characters
    }
  );

  test('a search containing parentheses finds the food that has them', async () => {
    const a = await createUser();
    await request(app).post('/api/foods/custom').set(a.auth).send(customFood({ name: 'Cơm (gạo lứt)' }));
    const res = await request(app).get('/api/foods').query({ search: '(gạo' }).set(a.auth);
    expect(names(res)).toEqual(['Cơm (gạo lứt)']);
  });

  test('"." does not act as a wildcard', async () => {
    const res = await request(app).get('/api/foods').query({ search: 'P.ở' });
    expect(res.body).toEqual([]);
  });

  test('repeated search params are ignored rather than crashing (?search=a&search=b)', async () => {
    const res = await request(app).get('/api/foods?search=a&search=b');
    expect(res.status).toBe(200);
  });

  test('category filter works and a repeated category param cannot inject a query', async () => {
    const some = await request(app).get('/api/foods').query({ category: 'Bữa Sáng' });
    expect(some.body.length).toBeGreaterThan(0);
    expect(some.body.every(f => f.category === 'Bữa Sáng')).toBe(true);

    const res = await request(app).get('/api/foods?category=Bữa Sáng&category=Ăn Vặt');
    expect(res.status).toBe(200);
  });
});

describe('custom food rules', () => {
  beforeAll(db.connect);
  beforeEach(db.clear);
  afterAll(db.close);

  test('creating requires login', async () => {
    expect((await request(app).post('/api/foods/custom').send(customFood())).status).toBe(401);
  });

  test('stores macros and marks the food as custom and owned', async () => {
    const { auth, user } = await createUser();
    const res = await request(app).post('/api/foods/custom').set(auth).send(customFood());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ isCustom: true, protein: 5, carbs: 20, fat: 8, calories: 180 });
    expect(String(res.body.user)).toBe(String(user._id));
  });

  test('macros that were not sent are stored as unknown (null), not as 0 g', async () => {
    const { auth } = await createUser();
    const res = await request(app).post('/api/foods/custom').set(auth)
      .send(customFood({ protein: undefined, carbs: undefined, fat: undefined }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ calories: 180, protein: null, carbs: null, fat: null });
  });

  test.each([
    ['name too short', { name: 'a' }],
    ['name blank', { name: '   ' }],
    ['calories missing', { calories: undefined }],
    ['calories zero', { calories: 0 }],
    ['calories negative', { calories: -5 }],
    ['calories over 10000', { calories: 10001 }],
    ['calories not a number', { calories: 'lots' }],
    ['negative protein', { protein: -1 }],
    ['negative carbs', { carbs: -1 }],
    ['negative fat', { fat: -1 }],
  ])('rejects %s', async (_label, over) => {
    const { auth, user } = await createUser();
    const res = await request(app).post('/api/foods/custom').set(auth).send(customFood(over));
    expect(res.status).toBe(400);
    expect(await Food.countDocuments({ user: user._id })).toBe(0);
  });

  test('a user can delete their own food but not someone elses or a system food', async () => {
    const a = await createUser();
    const b = await createUser();
    const mine = (await request(app).post('/api/foods/custom').set(a.auth).send(customFood())).body;

    expect((await request(app).delete(`/api/foods/custom/${mine._id}`).set(b.auth)).status).toBe(404);
    expect(await Food.countDocuments({ _id: mine._id })).toBe(1);

    await request(app).get('/api/foods'); // seed
    const system = await Food.findOne({ isCustom: false });
    expect((await request(app).delete(`/api/foods/custom/${system._id}`).set(a.auth)).status).toBe(404);
    expect(await Food.countDocuments({ _id: system._id })).toBe(1);

    expect((await request(app).delete(`/api/foods/custom/${mine._id}`).set(a.auth)).status).toBe(200);
    expect(await Food.countDocuments({ _id: mine._id })).toBe(0);
  });

  test('system food management is admin-only', async () => {
    const user = await createUser();
    const admin = await createUser({ role: 'admin' });

    expect((await request(app).post('/api/foods').set(user.auth).send(customFood({ name: 'Hệ thống' }))).status).toBe(403);

    const created = await request(app).post('/api/foods').set(admin.auth).send(customFood({ name: 'Hệ thống' }));
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ isCustom: false, user: null });

    const id = created.body._id;
    expect((await request(app).put(`/api/foods/${id}`).set(user.auth).send({ calories: 1 })).status).toBe(403);
    expect((await request(app).put(`/api/foods/${id}`).set(admin.auth).send({ calories: 99 })).body.calories).toBe(99);
    expect((await request(app).delete(`/api/foods/${id}`).set(user.auth)).status).toBe(403);
    expect((await request(app).delete(`/api/foods/${id}`).set(admin.auth)).status).toBe(200);
  });
});
