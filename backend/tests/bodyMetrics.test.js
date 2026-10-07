const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const { createUser } = require('./helpers/auth');
const User = require('../models/User');
const BodyMetric = require('../models/BodyMetric');

const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

const save = (auth, body) => request(app).post('/api/body-metrics').set(auth).send(body);
const list = (auth, query = {}) => request(app).get('/api/body-metrics').query(query).set(auth);
const remove = (auth, date) => request(app).delete('/api/body-metrics').query({ date }).set(auth);
const profileWeight = async (user) => (await User.findById(user._id)).weight;

describe('body metrics', () => {
  beforeAll(db.connect);
  beforeEach(db.clear);
  afterAll(db.close);

  test('every route requires authentication', async () => {
    expect((await request(app).get('/api/body-metrics')).status).toBe(401);
    expect((await request(app).post('/api/body-metrics').send({ date: day(0), weight: 70 })).status).toBe(401);
    expect((await request(app).delete('/api/body-metrics').query({ date: day(0) })).status).toBe(401);
  });

  describe('saving', () => {
    test('stores weight, body fat and waist, and returns them', async () => {
      const { auth } = await createUser();
      const res = await save(auth, { date: day(0), weight: 70.5, bodyFat: 18.2, waist: 82 });
      expect(res.status).toBe(200);
      expect(res.body.metric).toEqual({ date: day(0), weight: 70.5, bodyFat: 18.2, waist: 82 });
    });

    test('body fat and waist are optional (null when absent)', async () => {
      const { auth } = await createUser();
      const res = await save(auth, { date: day(0), weight: 70 });
      expect(res.body.metric).toEqual({ date: day(0), weight: 70, bodyFat: null, waist: null });
    });

    test('blank optional fields count as absent; numeric strings are accepted', async () => {
      const { auth } = await createUser();
      const res = await save(auth, { date: day(0), weight: '70.5', bodyFat: '', waist: null });
      expect(res.status).toBe(200);
      expect(res.body.metric).toMatchObject({ weight: 70.5, bodyFat: null, waist: null });
    });

    test('saving the same day again replaces it (one measurement per day) and clears omitted fields', async () => {
      const { user, auth } = await createUser();
      await save(auth, { date: day(0), weight: 70, bodyFat: 20 });
      await save(auth, { date: day(0), weight: 69 });
      expect(await BodyMetric.countDocuments({ user: user._id })).toBe(1);
      expect((await list(auth)).body).toEqual([{ date: day(0), weight: 69, bodyFat: null, waist: null }]);
    });

    test.each([
      ['no date', { weight: 70 }],
      ['bad date format', { date: '2026/01/01', weight: 70 }],
      ['impossible date', { date: '2026-02-30', weight: 70 }],
      ['a date object', { date: { $gt: '' }, weight: 70 }],
      ['no weight', { date: day(0) }],
      ['weight below 10', { date: day(0), weight: 9.9 }],
      ['weight above 500', { date: day(0), weight: 500.1 }],
      ['weight text', { date: day(0), weight: 'heavy' }],
      ['weight object', { date: day(0), weight: { $gt: 0 } }],
      ['weight array', { date: day(0), weight: [70] }],
      ['weight NaN-like', { date: day(0), weight: 'NaN' }],
      ['body fat below 2', { date: day(0), weight: 70, bodyFat: 1.9 }],
      ['body fat above 70', { date: day(0), weight: 70, bodyFat: 70.1 }],
      ['body fat text', { date: day(0), weight: 70, bodyFat: 'x' }],
      ['waist below 30', { date: day(0), weight: 70, waist: 29 }],
      ['waist above 250', { date: day(0), weight: 70, waist: 251 }],
      ['waist object', { date: day(0), weight: 70, waist: {} }],
      ['a date far in the future', { date: day(5), weight: 70 }],
    ])('refuses %s with 400 and saves nothing', async (_name, body) => {
      const { user, auth } = await createUser();
      const res = await save(auth, body);
      expect(res.status).toBe(400);
      expect(await BodyMetric.countDocuments({ user: user._id })).toBe(0);
    });

    test('the limits themselves are accepted', async () => {
      const { auth } = await createUser();
      expect((await save(auth, { date: day(-1), weight: 10, bodyFat: 2, waist: 30 })).status).toBe(200);
      expect((await save(auth, { date: day(-2), weight: 500, bodyFat: 70, waist: 250 })).status).toBe(200);
    });

    test('tomorrow (UTC) is still allowed so clients ahead of UTC can log "today"', async () => {
      const { auth } = await createUser();
      expect((await save(auth, { date: day(1), weight: 70 })).status).toBe(200);
    });
  });

  describe('the profile weight follows the latest measurement', () => {
    test('a new latest weigh-in becomes the profile weight (so TDEE is recalculated from it)', async () => {
      const { user, auth } = await createUser({ weight: 80 });
      const res = await save(auth, { date: day(0), weight: 75 });
      expect(res.body.profileWeight).toBe(75);
      expect(await profileWeight(user)).toBe(75);
    });

    test('an older day does not change the current weight', async () => {
      const { user, auth } = await createUser();
      await save(auth, { date: day(0), weight: 75 });
      const res = await save(auth, { date: day(-10), weight: 90 });
      expect(res.body.profileWeight).toBe(75);
      expect(await profileWeight(user)).toBe(75);
    });

    test('correcting the latest day changes the profile weight', async () => {
      const { user, auth } = await createUser();
      await save(auth, { date: day(-3), weight: 80 });
      await save(auth, { date: day(0), weight: 75 });
      await save(auth, { date: day(0), weight: 74 });
      expect(await profileWeight(user)).toBe(74);
    });

    test('deleting the latest day falls back to the previous measurement', async () => {
      const { user, auth } = await createUser();
      await save(auth, { date: day(-3), weight: 80 });
      await save(auth, { date: day(0), weight: 75 });
      const res = await remove(auth, day(0));
      expect(res.status).toBe(200);
      expect(res.body.profileWeight).toBe(80);
      expect(await profileWeight(user)).toBe(80);
    });

    test('deleting the only measurement leaves the profile weight alone', async () => {
      const { user, auth } = await createUser({ weight: 66 });
      await save(auth, { date: day(0), weight: 75 });
      await remove(auth, day(0));
      expect(await profileWeight(user)).toBe(75);
    });

    test('changing the weight in the profile also logs it as today\'s measurement', async () => {
      const { user, auth } = await createUser({ weight: 70 });
      const res = await request(app).put('/api/users/profile').set(auth).send({ weight: 72, metricDate: day(0) });
      expect(res.status).toBe(200);
      expect(res.body.weight).toBe(72);
      expect((await list(auth)).body).toEqual([{ date: day(0), weight: 72, bodyFat: null, waist: null }]);
      expect(await profileWeight(user)).toBe(72);
    });

    test('profile save without a metricDate logs under the UTC date; a bad one is ignored', async () => {
      const { auth } = await createUser({ weight: 70 });
      await request(app).put('/api/users/profile').set(auth).send({ weight: 71, metricDate: 'tomorrow-ish' });
      expect((await list(auth)).body.map(m => m.date)).toEqual([day(0)]);
    });

    test('a profile save that keeps the same weight logs nothing', async () => {
      const { user, auth } = await createUser({ weight: 70 });
      await request(app).put('/api/users/profile').set(auth).send({ name: 'New Name', weight: 70 });
      expect(await BodyMetric.countDocuments({ user: user._id })).toBe(0);
    });

    test('a profile save that edits an older weigh-in position keeps the profile consistent with the latest entry', async () => {
      const { user, auth } = await createUser({ weight: 70 });
      await save(auth, { date: day(0), weight: 75 });
      const res = await request(app).put('/api/users/profile').set(auth).send({ weight: 60, metricDate: day(-20) });
      expect(res.body.weight).toBe(75); // the latest measurement still wins
      expect(await profileWeight(user)).toBe(75);
    });
  });

  describe('listing', () => {
    test('returns the range oldest first', async () => {
      const { auth } = await createUser();
      await save(auth, { date: day(-1), weight: 71 });
      await save(auth, { date: day(-5), weight: 73 });
      await save(auth, { date: day(-3), weight: 72 });
      const res = await list(auth, { from: day(-10), to: day(0) });
      expect(res.body.map(m => m.date)).toEqual([day(-5), day(-3), day(-1)]);
    });

    test('from/to are inclusive and exclude days outside', async () => {
      const { auth } = await createUser();
      for (const o of [-6, -5, -3, -2]) await save(auth, { date: day(o), weight: 70 });
      const res = await list(auth, { from: day(-5), to: day(-3) });
      expect(res.body.map(m => m.date)).toEqual([day(-5), day(-3)]);
    });

    test('without a range the last 120 days are returned', async () => {
      const { auth } = await createUser();
      await save(auth, { date: day(-100), weight: 70 });
      await save(auth, { date: day(-130), weight: 70 });
      expect((await list(auth)).body.map(m => m.date)).toEqual([day(-100)]);
    });

    test('rejects a malformed or oversized range', async () => {
      const { auth } = await createUser();
      expect((await list(auth, { from: 'x' })).status).toBe(400);
      expect((await list(auth, { from: day(-400), to: day(0) })).status).toBe(400);
    });

    test('an empty history is an empty list', async () => {
      const { auth } = await createUser();
      const res = await list(auth);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('never exposes internal fields', async () => {
      const { auth } = await createUser();
      await save(auth, { date: day(0), weight: 70 });
      expect(Object.keys((await list(auth)).body[0]).sort()).toEqual(['bodyFat', 'date', 'waist', 'weight']);
    });
  });

  describe('deleting', () => {
    test('removes only that day', async () => {
      const { auth } = await createUser();
      await save(auth, { date: day(-1), weight: 71 });
      await save(auth, { date: day(0), weight: 70 });
      expect((await remove(auth, day(-1))).status).toBe(200);
      expect((await list(auth)).body.map(m => m.date)).toEqual([day(0)]);
    });

    test('404 when there is nothing on that day, 400 for a bad or missing date', async () => {
      const { auth } = await createUser();
      expect((await remove(auth, day(0))).status).toBe(404);
      expect((await remove(auth, 'nope')).status).toBe(400);
      expect((await request(app).delete('/api/body-metrics').set(auth)).status).toBe(400);
    });
  });

  describe('isolation between users', () => {
    test('each user sees and changes only their own measurements', async () => {
      const a = await createUser();
      const b = await createUser();
      await save(a.auth, { date: day(0), weight: 70 });
      await save(b.auth, { date: day(0), weight: 90 });

      expect((await list(a.auth)).body.map(m => m.weight)).toEqual([70]);
      expect((await list(b.auth)).body.map(m => m.weight)).toEqual([90]);
      expect(await profileWeight(a.user)).toBe(70);

      expect((await remove(a.auth, day(0))).status).toBe(200);
      expect((await list(b.auth)).body).toHaveLength(1);
    });

    test('deleting an account removes its measurements', async () => {
      const admin = await createUser({ role: 'admin' });
      const victim = await createUser();
      await save(victim.auth, { date: day(0), weight: 70 });
      const res = await request(app).delete(`/api/users/${victim.user._id}`).set(admin.auth);
      expect(res.status).toBe(200);
      expect(await BodyMetric.countDocuments({ user: victim.user._id })).toBe(0);
    });
  });
});
