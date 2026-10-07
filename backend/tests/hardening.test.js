const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const { createUser } = require('./helpers/auth');
const Routine = require('../models/Routine');
const Food = require('../models/Food');

const validRoutine = (over = {}) => ({
  name: 'Lịch của tôi',
  schedule: [{ day: 'Thứ 2', name: 'Push', exercises: [{ exerciseId: 'ex1', exerciseName: 'Bench Press', muscle: 'chest', sets: 4, repsRange: '8-12', rir: '1', restTimeSeconds: 120 }] }],
  ...over,
});

describe('small hardening fixes', () => {
  beforeAll(db.connect);
  beforeEach(db.clear);
  afterAll(db.close);

  describe("admin routine routes never touch a user's routine", () => {
    test('PUT and DELETE on a user-owned routine id are 404', async () => {
      const owner = await createUser();
      const admin = await createUser({ role: 'admin' });
      const created = await request(app).post('/api/routines/mine').set(owner.auth).send(validRoutine());
      expect(created.status).toBe(201);

      const put = await request(app).put(`/api/routines/${created.body.id}`).set(admin.auth).send({ name: 'Hacked' });
      expect(put.status).toBe(404);
      const del = await request(app).delete(`/api/routines/${created.body.id}`).set(admin.auth);
      expect(del.status).toBe(404);

      const still = await Routine.findOne({ id: created.body.id });
      expect(still.name).toBe('Lịch của tôi');
    });
  });

  describe('admin user management', () => {
    test('malformed id is 404, not 500', async () => {
      const admin = await createUser({ role: 'admin' });
      expect((await request(app).put('/api/users/not-an-id').set(admin.auth).send({ role: 'user' })).status).toBe(404);
      expect((await request(app).delete('/api/users/not-an-id').set(admin.auth)).status).toBe(404);
    });

    test('unknown role is 400 and leaves the user unchanged', async () => {
      const admin = await createUser({ role: 'admin' });
      const target = await createUser();
      for (const role of ['superuser', 123, {}]) {
        const res = await request(app).put(`/api/users/${target.user._id}`).set(admin.auth).send({ role });
        expect(res.status).toBe(400);
      }
    });
  });

  describe('foods', () => {
    test('admin PUT rejects negative / non-numeric macros and bad name', async () => {
      const admin = await createUser({ role: 'admin' });
      const food = await Food.create({ name: 'Cơm', calories: 200, isCustom: false, user: null });
      for (const body of [{ calories: -5 }, { calories: 'x' }, { protein: -1 }, { carbs: 'x' }, { fat: -0.1 }, { name: 'a' }, { calories: 0 }]) {
        const res = await request(app).put(`/api/foods/${food._id}`).set(admin.auth).send(body);
        expect(res.status).toBe(400);
      }
      const ok = await request(app).put(`/api/foods/${food._id}`).set(admin.auth).send({ calories: 250, protein: 5 });
      expect(ok.status).toBe(200);
      expect(ok.body.calories).toBe(250);
    });

    test('malformed ids are 404 on PUT/DELETE', async () => {
      const admin = await createUser({ role: 'admin' });
      expect((await request(app).put('/api/foods/nope').set(admin.auth).send({ calories: 5 })).status).toBe(404);
      expect((await request(app).delete('/api/foods/nope').set(admin.auth)).status).toBe(404);
      expect((await request(app).delete('/api/foods/custom/nope').set(admin.auth)).status).toBe(404);
    });

    test('a revoked session is treated as anonymous on the public list', async () => {
      const { user, auth } = await createUser();
      const mine = await request(app).post('/api/foods/custom').set(auth).send({ name: 'Món riêng', calories: 100 });
      expect(mine.status).toBe(201);
      const before = await request(app).get('/api/foods').set(auth);
      expect(before.body.some(f => f.name === 'Món riêng')).toBe(true);

      user.tokenVersion = 1; await user.save();
      const after = await request(app).get('/api/foods').set(auth);
      expect(after.body.some(f => f.name === 'Món riêng')).toBe(false);
    });
  });

  describe('workouts', () => {
    const save = (auth, over) => request(app).post('/api/workouts').set(auth).send({ date: '2026-01-05', ...over });

    test('completedIds is cut down to the selected exercises', async () => {
      const { auth } = await createUser();
      const res = await save(auth, { selectedIds: ['a', 'b'], completedIds: ['a', 'zzz'] });
      expect(res.status).toBe(200);
      expect(res.body.completedIds).toEqual(['a']);
    });

    test('nothing selected means nothing completed', async () => {
      const { auth } = await createUser();
      const res = await save(auth, { completedIds: ['a'] });
      expect(res.body.completedIds).toEqual([]);
    });

    test.each(['2026-02-30', 'today', '2026-1-5'])('date %j is 400 on save, read and delete', async (date) => {
      const { auth } = await createUser();
      expect((await save(auth, { date })).status).toBe(400);
      expect((await request(app).get('/api/workouts').query({ date }).set(auth)).status).toBe(400);
      expect((await request(app).delete('/api/workouts').query({ date }).set(auth)).status).toBe(400);
    });
  });
});
