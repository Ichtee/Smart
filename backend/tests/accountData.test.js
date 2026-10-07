const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const { createUser } = require('./helpers/auth');
const User = require('../models/User');
const WorkoutLog = require('../models/WorkoutLog');
const NutritionLog = require('../models/NutritionLog');
const BodyMetric = require('../models/BodyMetric');
const Routine = require('../models/Routine');
const Food = require('../models/Food');

const today = new Date().toISOString().slice(0, 10);

// Give a user one document of every kind the app stores.
const seed = async (user) => {
  await WorkoutLog.create({ user: user._id, date: today, selectedIds: ['a'], completedIds: ['a'] });
  await NutritionLog.create({ user: user._id, date: today, meals: { 'Bữa Sáng': [{ name: 'Cơm', calories: 200 }] }, waterGlasses: 2 });
  await BodyMetric.create({ user: user._id, date: today, weight: 70 });
  await Routine.create({ id: `r-${user._id}`, name: 'Mine', owner: user._id, schedule: [] });
  await Food.create({ name: 'Món riêng', calories: 100, isCustom: true, user: user._id });
};
const counts = (user) => Promise.all([
  WorkoutLog.countDocuments({ user: user._id }),
  NutritionLog.countDocuments({ user: user._id }),
  BodyMetric.countDocuments({ user: user._id }),
  Routine.countDocuments({ owner: user._id }),
  Food.countDocuments({ user: user._id }),
]);

describe('account data', () => {
  beforeAll(db.connect);
  beforeEach(db.clear);
  afterAll(db.close);

  describe('GET /api/users/me/export', () => {
    test('requires authentication', async () => {
      expect((await request(app).get('/api/users/me/export')).status).toBe(401);
    });

    test('returns the caller\'s data as a download, without secrets', async () => {
      const { user, auth } = await createUser();
      await seed(user);
      const res = await request(app).get('/api/users/me/export').set(auth);
      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="my-fitness-data.json"/);
      expect(res.body.profile).toMatchObject({ email: user.email, username: user.username });
      expect(res.body.workouts).toHaveLength(1);
      expect(res.body.nutrition).toHaveLength(1);
      expect(res.body.bodyMetrics).toHaveLength(1);
      expect(res.body.routines).toHaveLength(1);
      expect(res.body.customFoods).toHaveLength(1);
      const text = JSON.stringify(res.body);
      for (const secret of ['"password"', 'resetPasswordToken', 'verificationToken', 'tokenVersion']) {
        expect(text).not.toContain(secret);
      }
    });

    test('only custom foods are exported, matching what account deletion removes', async () => {
      const { user, auth } = await createUser();
      await Food.create({ name: 'Món riêng', calories: 100, isCustom: true, user: user._id });
      await Food.create({ name: 'Món hệ thống', calories: 100, isCustom: false, user: user._id });
      const res = await request(app).get('/api/users/me/export').set(auth);
      expect(res.body.customFoods.map(f => f.name)).toEqual(['Món riêng']);
    });

    test('never includes another user\'s data', async () => {
      const a = await createUser();
      const b = await createUser();
      await seed(b.user);
      const res = await request(app).get('/api/users/me/export').set(a.auth);
      expect(res.body.workouts).toEqual([]);
      expect(res.body.nutrition).toEqual([]);
      expect(res.body.bodyMetrics).toEqual([]);
      expect(res.body.routines).toEqual([]);
      expect(res.body.customFoods).toEqual([]);
    });
  });

  describe('DELETE /api/users/me', () => {
    const del = (auth, body) => request(app).delete('/api/users/me').set(auth).send(body);

    test('requires authentication', async () => {
      expect((await request(app).delete('/api/users/me').send({ password: 'x' })).status).toBe(401);
    });

    test('needs the password; a missing, non-text or wrong one deletes nothing', async () => {
      const { user, auth } = await createUser();
      await seed(user);
      expect((await del(auth, {})).status).toBe(400);
      expect((await del(auth, { password: { $ne: null } })).status).toBe(400);
      const wrong = await del(auth, { password: 'not-my-password' });
      expect(wrong.status).toBe(400); // not 401: the session is still valid, the page must stay signed in
      expect(await User.countDocuments({ _id: user._id })).toBe(1);
      expect(await counts(user)).toEqual([1, 1, 1, 1, 1]);
    });

    test('with the right password removes the account and all of its data, and ends the session', async () => {
      const { user, auth, password } = await createUser();
      await seed(user);
      const res = await del(auth, { password });
      expect(res.status).toBe(200);
      expect(res.headers['set-cookie'].join(';')).toMatch(/token=;/);
      expect(await User.countDocuments({ _id: user._id })).toBe(0);
      expect(await counts(user)).toEqual([0, 0, 0, 0, 0]);
      expect((await request(app).get('/api/users/profile').set(auth)).status).toBe(401);
    });

    test('leaves other users and the built-in routines untouched', async () => {
      const a = await createUser();
      const b = await createUser();
      await seed(b.user);
      await Routine.create({ id: 'builtin', name: 'Built-in', owner: null, schedule: [] });
      expect((await del(a.auth, { password: a.password })).status).toBe(200);
      expect(await counts(b.user)).toEqual([1, 1, 1, 1, 1]);
      expect(await Routine.countDocuments({ owner: null })).toBe(1);
    });

    test('the last admin cannot delete themselves, but one of several can', async () => {
      const first = await createUser({ role: 'admin' });
      const refused = await del(first.auth, { password: first.password });
      expect(refused.status).toBe(400);
      expect(await User.countDocuments({ _id: first.user._id })).toBe(1);

      await createUser({ role: 'admin' });
      expect((await del(first.auth, { password: first.password })).status).toBe(200);
      expect(await User.countDocuments({ _id: first.user._id })).toBe(0);
    });
  });
});
