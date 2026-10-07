const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const { createUser } = require('./helpers/auth');
const Routine = require('../models/Routine');
const { cleanUserRoutine, MAX_ROUTINES_PER_USER } = require('../utils/userRoutine');

const ex = (over = {}) => ({ exerciseId: 'ex1', exerciseName: 'Bench Press', muscle: 'chest', sets: 4, repsRange: '8-12', rir: '1', restTimeSeconds: 120, ...over });
const trainingDay = (over = {}) => ({ day: 'Thứ 2', name: 'Push', exercises: [ex(), ex({ exerciseId: 'ex2', exerciseName: 'Triceps Pushdown', muscle: 'triceps' })], ...over });
const body = (over = {}) => ({
  name: 'My Split',
  description: 'Ba buổi mỗi tuần',
  schedule: [trainingDay(), trainingDay({ day: 'Thứ 4', name: 'Pull' }), { day: 'Thứ 3', name: 'Nghỉ', isRestDay: true }],
  ...over,
});

let alice;
let bob;
let admin;
beforeAll(db.connect);
beforeEach(async () => {
  await db.clear();
  alice = await createUser();
  bob = await createUser();
  admin = await createUser({ role: 'admin' });
});
afterAll(db.close);

const createMine = (payload, who = alice) => request(app).post('/api/routines/mine').set(who.auth).send(payload);
const listFor = (who) => request(app).get('/api/routines').set(who ? who.auth : {});

describe('cleanUserRoutine (pure)', () => {
  test('keeps only whitelisted fields and derives frequency and targets', () => {
    const { routine } = cleanUserRoutine({ ...body(), owner: 'x', id: 'hack', type: 'PPL', frequencyDaysPerWeek: 7, generalNotes: ['x'] });
    expect(routine.type).toBe('Custom');
    expect(routine.frequencyDaysPerWeek).toBe(2);
    expect(routine).not.toHaveProperty('owner');
    expect(routine).not.toHaveProperty('id');
    expect(routine.generalNotes).toEqual([]);
    expect(routine.schedule[0].targets).toEqual([{ id: 'chest', label: 'chest', count: 1 }, { id: 'triceps', label: 'triceps', count: 1 }]);
  });

  test('days are sorted Monday to Sunday and a rest day keeps no exercises', () => {
    const { routine } = cleanUserRoutine(body({ schedule: [
      trainingDay({ day: 'Chủ nhật' }), trainingDay({ day: 'Thứ 2' }),
      { day: 'Thứ 5', name: '', isRestDay: true, exercises: [ex()] },
    ] }));
    expect(routine.schedule.map(d => d.day)).toEqual(['Thứ 2', 'Thứ 5', 'Chủ nhật']);
    expect(routine.schedule[1]).toMatchObject({ name: 'Nghỉ ngơi', isRestDay: true, exercises: [], targets: [] });
  });

  test('defaults and trimming', () => {
    const { routine } = cleanUserRoutine({ name: '  Full   Body ', schedule: [{ day: 'Thứ 2', name: ' A ', exercises: [{ exerciseName: ' Squat ', muscle: 'quadriceps' }] }] });
    expect(routine.name).toBe('Full Body');
    expect(routine.schedule[0].name).toBe('A');
    expect(routine.schedule[0].exercises[0]).toMatchObject({ exerciseName: 'Squat', sets: 3, repsRange: '10', rir: '1', restTimeSeconds: 90, exerciseId: '' });
  });

  test.each([
    ['not an object', null],
    ['a one-letter name', body({ name: 'A' })],
    ['a blank name', body({ name: '   ' })],
    ['a name that is not text', body({ name: { $ne: 1 } })],
    ['a description that is not text', body({ description: ['x'] })],
    ['no schedule', body({ schedule: undefined })],
    ['an empty schedule', body({ schedule: [] })],
    ['more than 7 days', body({ schedule: Array.from({ length: 8 }, () => trainingDay()) })],
    ['an unknown day', body({ schedule: [trainingDay({ day: 'Monday' })] })],
    ['a repeated day', body({ schedule: [trainingDay(), trainingDay()] })],
    ['a training day without exercises', body({ schedule: [trainingDay({ exercises: [] })] })],
    ['a training day without a name', body({ schedule: [trainingDay({ name: ' ' })] })],
    ['only rest days', body({ schedule: [{ day: 'Thứ 2', name: 'Nghỉ', isRestDay: true }] })],
    ['exercises that are not a list', body({ schedule: [trainingDay({ exercises: 'bench' })] })],
    ['more than 30 exercises in a day', body({ schedule: [trainingDay({ exercises: Array.from({ length: 31 }, () => ex()) })] })],
    ['an exercise that is not an object', body({ schedule: [trainingDay({ exercises: ['bench'] })] })],
    ['an exercise without a name', body({ schedule: [trainingDay({ exercises: [ex({ exerciseName: '' })] })] })],
    ['an exercise without a muscle', body({ schedule: [trainingDay({ exercises: [ex({ muscle: '' })] })] })],
    ['0 sets', body({ schedule: [trainingDay({ exercises: [ex({ sets: 0 })] })] })],
    ['51 sets', body({ schedule: [trainingDay({ exercises: [ex({ sets: 51 })] })] })],
    ['fractional sets', body({ schedule: [trainingDay({ exercises: [ex({ sets: 2.5 })] })] })],
    ['sets as an object', body({ schedule: [trainingDay({ exercises: [ex({ sets: { $gt: 0 } })] })] })],
    ['reps with letters', body({ schedule: [trainingDay({ exercises: [ex({ repsRange: 'many' })] })] })],
    ['negative rest', body({ schedule: [trainingDay({ exercises: [ex({ restTimeSeconds: -1 })] })] })],
    ['rest above 10 minutes', body({ schedule: [trainingDay({ exercises: [ex({ restTimeSeconds: 601 })] })] })],
  ])('refuses %s', (_name, payload) => {
    const result = cleanUserRoutine(payload);
    expect(result.routine).toBeUndefined();
    expect(typeof result.error).toBe('string');
  });

  test('limits are accepted: 7 days, 30 exercises, 50 sets, 600 s', () => {
    const day = (d) => trainingDay({ day: d, exercises: Array.from({ length: 30 }, () => ex({ sets: 50, restTimeSeconds: 600 })) });
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    expect(cleanUserRoutine(body({ schedule: days.map(day) })).routine.frequencyDaysPerWeek).toBe(7);
  });
});

describe('POST /api/routines/mine', () => {
  test('requires login', async () => {
    expect((await request(app).post('/api/routines/mine').send(body())).status).toBe(401);
  });

  test('creates a routine for the user with a generated id and no owner in the reply', async () => {
    const res = await createMine(body());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'My Split', type: 'Custom', isMine: true, frequencyDaysPerWeek: 2 });
    expect(res.body.id).toMatch(/^u[0-9a-f]{6}-/);
    expect(res.body).not.toHaveProperty('owner');
    const stored = await Routine.findOne({ id: res.body.id });
    expect(String(stored.owner)).toBe(String(alice.user._id));
  });

  test('ids never collide, even for identical routines', async () => {
    const a = await createMine(body());
    const b = await createMine(body());
    expect(a.body.id).not.toBe(b.body.id);
  });

  test('invalid data is a 400 with a message and nothing is stored', async () => {
    const res = await createMine(body({ name: 'A' }));
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Tên lịch tập');
    expect(await Routine.countDocuments()).toBe(0);
  });

  test('a client cannot choose the id, owner or type', async () => {
    const res = await createMine({ ...body(), id: 'ppl', owner: bob.user._id, type: 'PPL' });
    expect(res.status).toBe(201);
    expect(res.body.id).not.toBe('ppl');
    expect(res.body.type).toBe('Custom');
    expect(String((await Routine.findOne({ id: res.body.id })).owner)).toBe(String(alice.user._id));
  });

  test(`a user may have at most ${MAX_ROUTINES_PER_USER} routines (others are not affected)`, async () => {
    for (let i = 0; i < MAX_ROUTINES_PER_USER; i++) expect((await createMine(body())).status).toBe(201);
    const extra = await createMine(body());
    expect(extra.status).toBe(400);
    expect(extra.body.message).toContain(String(MAX_ROUTINES_PER_USER));
    expect((await createMine(body(), bob)).status).toBe(201);
  });
});

describe('who sees which routines', () => {
  beforeEach(async () => {
    await Routine.create({ id: 'ppl', name: 'Push Pull Legs', schedule: [] });
  });

  test('anonymous visitors only see the built-in routines (still public)', async () => {
    await createMine(body());
    const res = await listFor(null);
    expect(res.status).toBe(200);
    expect(res.body.map(r => r.id)).toEqual(['ppl']);
  });

  test('a user sees the built-in ones plus their own, flagged isMine', async () => {
    const mine = (await createMine(body())).body;
    await createMine(body({ name: 'Bob only' }), bob);
    const res = await listFor(alice);
    expect(res.body.map(r => r.id).sort()).toEqual(['ppl', mine.id].sort());
    expect(res.body.find(r => r.id === 'ppl').isMine).toBe(false);
    expect(res.body.find(r => r.id === mine.id).isMine).toBe(true);
  });

  test('the owner id is never exposed', async () => {
    await createMine(body());
    (await listFor(alice)).body.forEach(r => expect(r).not.toHaveProperty('owner'));
  });

  test('an invalid token is treated as anonymous, not as an error', async () => {
    await createMine(body());
    const res = await request(app).get('/api/routines').set('Authorization', 'Bearer not-a-token');
    expect(res.status).toBe(200);
    expect(res.body.map(r => r.id)).toEqual(['ppl']);
  });

  test('routines that existed before owners were introduced (no owner field) stay built-in', async () => {
    await Routine.collection.insertOne({ id: 'legacy', name: 'Legacy', schedule: [] });
    expect((await listFor(alice)).body.map(r => r.id)).toContain('legacy');
    expect((await listFor(null)).body.map(r => r.id)).toContain('legacy');
  });
});

describe('PUT /api/routines/mine/:id', () => {
  test('the owner can replace the routine', async () => {
    const { id } = (await createMine(body())).body;
    const res = await request(app).put(`/api/routines/mine/${id}`).set(alice.auth).send(body({ name: 'Renamed', schedule: [trainingDay({ day: 'Thứ 6' })] }));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id, name: 'Renamed', isMine: true, frequencyDaysPerWeek: 1 });
    expect(res.body.schedule.map(d => d.day)).toEqual(['Thứ 6']);
    expect(await Routine.countDocuments({ owner: alice.user._id })).toBe(1);
  });

  test('another user gets 404 and nothing changes', async () => {
    const { id } = (await createMine(body())).body;
    const res = await request(app).put(`/api/routines/mine/${id}`).set(bob.auth).send(body({ name: 'Hijacked' }));
    expect(res.status).toBe(404);
    expect((await Routine.findOne({ id })).name).toBe('My Split');
  });

  test('built-in routines cannot be edited through this route', async () => {
    await Routine.create({ id: 'ppl', name: 'Push Pull Legs', schedule: [] });
    const res = await request(app).put('/api/routines/mine/ppl').set(alice.auth).send(body());
    expect(res.status).toBe(404);
    expect((await Routine.findOne({ id: 'ppl' })).name).toBe('Push Pull Legs');
  });

  test('invalid data is a 400 and the old routine is kept', async () => {
    const { id } = (await createMine(body())).body;
    const res = await request(app).put(`/api/routines/mine/${id}`).set(alice.auth).send(body({ schedule: [] }));
    expect(res.status).toBe(400);
    expect((await Routine.findOne({ id })).schedule).toHaveLength(3);
  });

  test('requires login; the owner cannot be changed by sending one', async () => {
    const { id } = (await createMine(body())).body;
    expect((await request(app).put(`/api/routines/mine/${id}`).send(body())).status).toBe(401);
    await request(app).put(`/api/routines/mine/${id}`).set(alice.auth).send({ ...body(), owner: bob.user._id });
    expect(String((await Routine.findOne({ id })).owner)).toBe(String(alice.user._id));
  });
});

describe('DELETE /api/routines/mine/:id', () => {
  test('the owner can delete', async () => {
    const { id } = (await createMine(body())).body;
    expect((await request(app).delete(`/api/routines/mine/${id}`).set(alice.auth)).status).toBe(200);
    expect(await Routine.countDocuments()).toBe(0);
  });

  test('another user gets 404 and the routine stays; built-in routines are untouchable', async () => {
    const { id } = (await createMine(body())).body;
    await Routine.create({ id: 'ppl', name: 'PPL', schedule: [] });
    expect((await request(app).delete(`/api/routines/mine/${id}`).set(bob.auth)).status).toBe(404);
    expect((await request(app).delete('/api/routines/mine/ppl').set(alice.auth)).status).toBe(404);
    expect(await Routine.countDocuments()).toBe(2);
  });

  test('requires login', async () => {
    expect((await request(app).delete('/api/routines/mine/anything')).status).toBe(401);
  });
});

describe('admin routes keep working', () => {
  test('an admin still creates built-in routines (owner null) through POST /api/routines', async () => {
    const res = await request(app).post('/api/routines').set(admin.auth).send({ id: 'ppl', name: 'PPL', schedule: [] });
    expect(res.status).toBe(201);
    expect((await Routine.findOne({ id: 'ppl' })).owner).toBeNull();
    expect((await listFor(null)).body.map(r => r.id)).toEqual(['ppl']);
  });

  test('a regular user still cannot use the admin routes on any routine', async () => {
    const { id } = (await createMine(body())).body;
    expect((await request(app).put(`/api/routines/${id}`).set(bob.auth).send({ name: 'Nope!' })).status).toBe(403);
    expect((await request(app).delete(`/api/routines/${id}`).set(alice.auth)).status).toBe(403);
  });
});

describe('account removal', () => {
  test('deleting a user removes their routines but not other people\'s', async () => {
    await createMine(body());
    await createMine(body(), bob);
    const res = await request(app).delete(`/api/users/${alice.user._id}`).set(admin.auth);
    expect(res.status).toBe(200);
    expect(await Routine.countDocuments({ owner: alice.user._id })).toBe(0);
    expect(await Routine.countDocuments({ owner: bob.user._id })).toBe(1);
  });
});
