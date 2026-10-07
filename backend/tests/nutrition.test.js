const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const { createUser } = require('./helpers/auth');
const NutritionLog = require('../models/NutritionLog');

const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const MEAL_KEYS = ['Bữa Sáng', 'Bữa Trưa', 'Bữa Tối', 'Ăn Vặt'];

const saveDay = (auth, body) => request(app).post('/api/nutrition').set(auth).send(body);
const getDay = (auth, date) => request(app).get('/api/nutrition').query({ date }).set(auth);

const item = (over = {}) => ({ id: String(Math.random()), name: 'Cơm', calories: 200, ...over });

describe('nutrition day log', () => {
  beforeAll(db.connect);
  beforeEach(db.clear);
  afterAll(db.close);

  test('requires authentication', async () => {
    expect((await request(app).get('/api/nutrition').query({ date: day(0) })).status).toBe(401);
    expect((await request(app).post('/api/nutrition').send({ date: day(0) })).status).toBe(401);
    expect((await request(app).get('/api/nutrition/logs')).status).toBe(401);
  });

  test('GET with no saved log returns an empty day (not an error)', async () => {
    const { auth } = await createUser();
    const res = await getDay(auth, day(0));
    expect(res.status).toBe(200);
    expect(res.body.waterGlasses).toBe(0);
    expect(res.body.mlPerGlass).toBe(250);
    expect(Object.keys(res.body.meals)).toEqual(MEAL_KEYS);
    Object.values(res.body.meals).forEach(list => expect(list).toEqual([]));
  });

  test('GET and POST require a date', async () => {
    const { auth } = await createUser();
    expect((await request(app).get('/api/nutrition').set(auth)).status).toBe(400);
    expect((await saveDay(auth, { waterGlasses: 3 })).status).toBe(400);
  });

  test('round-trips meals, water and the real macros of each item', async () => {
    const { auth } = await createUser();
    const meals = {
      'Bữa Sáng': [item({ name: 'Phở bò', calories: 450, protein: 22, carbs: 55, fat: 12, quantity: '1 tô' })],
      'Bữa Trưa': [item({ name: 'Ức gà', calories: 220, protein: 46, carbs: 0, fat: 3.6, image: 'https://img/x.jpg' })],
      'Bữa Tối': [],
      'Ăn Vặt': [item({ name: 'Táo', calories: 95 })], // manual entry: no macros stored
    };
    const save = await saveDay(auth, { date: day(0), waterGlasses: 6, mlPerGlass: 300, meals });
    expect(save.status).toBe(200);

    const res = await getDay(auth, day(0));
    expect(res.body.waterGlasses).toBe(6);
    expect(res.body.mlPerGlass).toBe(300);
    expect(res.body.meals['Bữa Sáng'][0]).toMatchObject({ name: 'Phở bò', calories: 450, protein: 22, carbs: 55, fat: 12, quantity: '1 tô' });
    expect(res.body.meals['Bữa Trưa'][0].fat).toBe(3.6);
    expect(res.body.meals['Ăn Vặt'][0].protein).toBeUndefined();
  });

  test('saving the same date again replaces the day (one document per user per date)', async () => {
    const { auth, user } = await createUser();
    await saveDay(auth, { date: day(0), meals: { 'Bữa Sáng': [item(), item()] } });
    await saveDay(auth, { date: day(0), meals: { 'Bữa Sáng': [item()] }, waterGlasses: 2 });

    expect(await NutritionLog.countDocuments({ user: user._id, date: day(0) })).toBe(1);
    const res = await getDay(auth, day(0));
    expect(res.body.meals['Bữa Sáng']).toHaveLength(1);
    expect(res.body.waterGlasses).toBe(2);
  });

  test('removing the last item persists (empty list is saved, not ignored)', async () => {
    const { auth } = await createUser();
    await saveDay(auth, { date: day(0), meals: { 'Bữa Sáng': [item()] } });
    await saveDay(auth, { date: day(0), meals: { 'Bữa Sáng': [] } });
    expect((await getDay(auth, day(0))).body.meals['Bữa Sáng']).toEqual([]);
  });

  test('days are independent and so are users', async () => {
    const a = await createUser();
    const b = await createUser();
    await saveDay(a.auth, { date: day(0), waterGlasses: 5 });
    await saveDay(a.auth, { date: day(-1), waterGlasses: 1 });
    await saveDay(b.auth, { date: day(0), waterGlasses: 9 });

    expect((await getDay(a.auth, day(0))).body.waterGlasses).toBe(5);
    expect((await getDay(a.auth, day(-1))).body.waterGlasses).toBe(1);
    expect((await getDay(b.auth, day(0))).body.waterGlasses).toBe(9);
  });

  describe('validation', () => {
    const save = async (body) => { const { auth } = await createUser(); return saveDay(auth, { date: day(0), ...body }); };
    const breakfast = (...items) => ({ meals: { 'Bữa Sáng': items } });

    test.each(['yesterday', '2026-02-30', '2026-1-5'])('date %j is refused on save and on read', async (date) => {
      const { auth } = await createUser();
      expect((await saveDay(auth, { date })).status).toBe(400);
      expect((await getDay(auth, date)).status).toBe(400);
    });

    test.each([
      ['negative calories', { calories: -5 }],
      ['text calories', { calories: 'lots' }],
      ['absurd calories', { calories: 1e9 }],
      ['negative protein', { protein: -1 }],
      ['text carbs', { carbs: 'x' }],
      ['no name', { name: '' }],
    ])('an item with %s is refused', async (_label, over) => {
      expect((await save(breakfast(item(over)))).status).toBe(400);
    });

    test('items that are not objects, or lists that are not arrays, are refused', async () => {
      expect((await save(breakfast('Cơm'))).status).toBe(400);
      expect((await save({ meals: { 'Bữa Sáng': 'Cơm' } })).status).toBe(400);
      expect((await save({ meals: [] })).status).toBe(400);
      expect((await save({ meals: 'x' })).status).toBe(400);
    });

    test('at most 100 items per meal', async () => {
      expect((await save(breakfast(...Array.from({ length: 101 }, () => item())))).status).toBe(400);
      expect((await save(breakfast(...Array.from({ length: 100 }, () => item())))).status).toBe(200);
    });

    test.each([{ waterGlasses: -1 }, { waterGlasses: 101 }, { waterGlasses: 'many' }, { mlPerGlass: -250 }, { mlPerGlass: 99999 }, { mlPerGlass: 'big' }])('water %j is refused', async (body) => {
      expect((await save(body)).status).toBe(400);
    });

    test('numeric strings are stored as numbers; unknown fields and meals are dropped; long text is cut', async () => {
      const { auth } = await createUser();
      const res = await saveDay(auth, {
        date: day(0),
        waterGlasses: '3',
        meals: {
          'Bữa Sáng': [item({ calories: '450', protein: '22', name: 'x'.repeat(500), hacker: '<script>' })],
          'Bữa Khuya': [item()],
        },
      });
      expect(res.status).toBe(200);
      const saved = (await getDay(auth, day(0))).body;
      expect(saved.waterGlasses).toBe(3);
      expect(saved.meals['Bữa Sáng'][0]).toMatchObject({ calories: 450, protein: 22 });
      expect(saved.meals['Bữa Sáng'][0].name).toHaveLength(200);
      expect(saved.meals['Bữa Sáng'][0].hacker).toBeUndefined();
      expect(Object.keys(saved.meals)).toEqual(MEAL_KEYS);
    });
  });

  test('concurrent saves of the same new day do not fail or duplicate it', async () => {
    const { auth, user } = await createUser();
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => saveDay(auth, { date: day(0), waterGlasses: i }))
    );
    expect(results.map(r => r.status)).toEqual(Array(6).fill(200));
    expect(await NutritionLog.countDocuments({ user: user._id, date: day(0) })).toBe(1);
  });
});

describe('GET /api/nutrition/logs', () => {
  beforeAll(db.connect);
  beforeEach(db.clear);
  afterAll(db.close);

  test('adds up calories across all meals and counts items that have a photo', async () => {
    const { auth } = await createUser();
    await saveDay(auth, {
      date: day(-1),
      waterGlasses: 4,
      meals: {
        'Bữa Sáng': [item({ calories: 300, image: 'a.jpg' })],
        'Bữa Trưa': [item({ calories: 500 }), item({ calories: 150, image: 'b.jpg' })],
        'Bữa Tối': [],
        'Ăn Vặt': [item({ calories: 50 })],
      },
    });
    const res = await request(app).get('/api/nutrition/logs').set(auth);
    expect(res.status).toBe(200);
    expect(res.body[day(-1)]).toMatchObject({ date: day(-1), dayCalories: 1000, photoCount: 2, waterGlasses: 4 });
  });

  test('items without calories count as 0 instead of producing NaN', async () => {
    const { auth } = await createUser();
    await saveDay(auth, { date: day(0), meals: { 'Bữa Sáng': [{ id: 'x', name: 'Không rõ' }, item({ calories: 100 })] } });
    const res = await request(app).get('/api/nutrition/logs').set(auth);
    expect(res.body[day(0)].dayCalories).toBe(100);
  });

  test('is keyed by date and honours from/to', async () => {
    const { auth } = await createUser();
    for (const off of [-50, -10, -2, 0]) {
      await saveDay(auth, { date: day(off), meals: { 'Bữa Sáng': [item({ calories: 100 })] } });
    }
    const res = await request(app).get('/api/nutrition/logs').query({ from: day(-12), to: day(-1) }).set(auth);
    expect(Object.keys(res.body).sort()).toEqual([day(-10), day(-2)]);
  });

  test('default window is ~120 days', async () => {
    const { auth } = await createUser();
    await saveDay(auth, { date: day(-300), meals: { 'Bữa Sáng': [item()] } });
    await saveDay(auth, { date: day(-5), meals: { 'Bữa Sáng': [item()] } });
    const res = await request(app).get('/api/nutrition/logs').set(auth);
    expect(Object.keys(res.body)).toEqual([day(-5)]);
  });

  test("never returns another user's days", async () => {
    const a = await createUser();
    const b = await createUser();
    await saveDay(a.auth, { date: day(0), meals: { 'Bữa Sáng': [item()] } });
    const res = await request(app).get('/api/nutrition/logs').set(b.auth);
    expect(res.body).toEqual({});
  });

  test('rejects an invalid or reversed range', async () => {
    const { auth } = await createUser();
    expect((await request(app).get('/api/nutrition/logs').query({ from: 'nope' }).set(auth)).status).toBe(400);
    expect((await request(app).get('/api/nutrition/logs').query({ from: day(0), to: day(-3) }).set(auth)).status).toBe(400);
  });
});
