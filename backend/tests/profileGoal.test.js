const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const { createUser } = require('./helpers/auth');
const User = require('../models/User');

const put = (auth, body) => request(app).put('/api/users/profile').set(auth).send(body);

describe('profile goal: pace and target weight', () => {
  beforeAll(db.connect);
  beforeEach(db.clear);
  afterAll(db.close);

  test('a new account has the medium pace and no target weight', async () => {
    const { user } = await createUser();
    const fresh = await User.findById(user._id);
    expect(fresh.goalPace).toBe('Vừa');
    expect(fresh.targetWeight).toBeNull();
    expect(fresh.bodyFat).toBeNull();
  });

  test('saves and returns the pace and the target weight', async () => {
    const { auth } = await createUser();
    const res = await put(auth, { goal: 'Giảm mỡ', goalPace: 'Nhanh', targetWeight: 65 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ goal: 'Giảm mỡ', goalPace: 'Nhanh', targetWeight: 65 });
    expect((await request(app).get('/api/users/profile').set(auth)).body).toMatchObject({ goalPace: 'Nhanh', targetWeight: 65 });
  });

  test('an empty or null target weight clears it', async () => {
    const { auth } = await createUser();
    await put(auth, { targetWeight: 65 });
    expect((await put(auth, { targetWeight: '' })).body.targetWeight).toBeNull();
    await put(auth, { targetWeight: 65 });
    expect((await put(auth, { targetWeight: null })).body.targetWeight).toBeNull();
  });

  test.each([
    ['unknown pace', { goalPace: 'Turbo' }],
    ['pace as an object', { goalPace: { $ne: '' } }],
    ['target too low', { targetWeight: 9 }],
    ['target too high', { targetWeight: 501 }],
    ['target not a number', { targetWeight: 'abc' }],
  ])('%s is rejected', async (_, body) => {
    const { auth } = await createUser();
    expect((await put(auth, body)).status).toBe(400);
  });

  test('changing the pace resets the calorie adjustment; sending the same pace keeps it', async () => {
    const { user, auth } = await createUser();
    await put(auth, { goal: 'Giảm mỡ', goalPace: 'Vừa' });
    await put(auth, { calorieAdjustment: -150 });
    await put(auth, { goalPace: 'Vừa' });
    expect((await User.findById(user._id)).calorieAdjustment).toBe(-150);
    await put(auth, { goalPace: 'Chậm' });
    expect((await User.findById(user._id)).calorieAdjustment).toBe(0);
  });
});
