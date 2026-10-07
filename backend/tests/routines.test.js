const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const { createUser } = require('./helpers/auth');
const Routine = require('../models/Routine');

const day = (over = {}) => ({
  day: 'Thứ 2',
  name: 'Push',
  isRestDay: false,
  targets: [{ id: 'chest', label: 'Ngực', count: 2 }],
  exercises: [
    { exerciseId: 'ex1', exerciseName: 'Bench Press', muscle: 'chest', sets: 4, repsRange: '10', rir: '1', restTimeSeconds: 120 },
  ],
  ...over,
});

const routine = (over = {}) => ({
  id: 'ppl',
  name: 'Push Pull Legs',
  type: 'PPL',
  description: '6 ngày/tuần',
  frequencyDaysPerWeek: 3,
  generalNotes: ['Khởi động kỹ'],
  schedule: [day(), day({ day: 'Thứ 3', name: 'Nghỉ ngơi', isRestDay: true, targets: [], exercises: [] })],
  ...over,
});

let admin;
let user;
beforeAll(db.connect);
beforeEach(async () => {
  await db.clear();
  admin = await createUser({ role: 'admin' });
  user = await createUser();
});
afterAll(db.close);

const create = (body, who = admin) => request(app).post('/api/routines').set(who.auth).send(body);

describe('GET /api/routines', () => {
  test('is public and returns the full schedules', async () => {
    await create(routine());
    const res = await request(app).get('/api/routines');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].schedule).toHaveLength(2);
    expect(res.body[0].schedule[0].exercises[0]).toMatchObject({ exerciseId: 'ex1', exerciseName: 'Bench Press', sets: 4 });
  });
});

describe('POST /api/routines', () => {
  test('only admins can create', async () => {
    expect((await request(app).post('/api/routines').send(routine())).status).toBe(401);
    expect((await create(routine(), user)).status).toBe(403);
    expect(await Routine.countDocuments()).toBe(0);
  });

  test('stores the whole nested schedule, including exerciseId links', async () => {
    const res = await create(routine());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 'ppl', name: 'Push Pull Legs', type: 'PPL', frequencyDaysPerWeek: 3, generalNotes: ['Khởi động kỹ'] });
    const [push, rest] = res.body.schedule;
    expect(push.exercises[0]).toMatchObject({ exerciseId: 'ex1', muscle: 'chest', repsRange: '10', restTimeSeconds: 120 });
    expect(push.targets[0]).toEqual({ id: 'chest', label: 'Ngực', count: 2 });
    expect(rest.isRestDay).toBe(true);
  });

  test('trims id and name, and applies defaults', async () => {
    const res = await create({ id: '  my-plan ', name: '  Upper Lower  ' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 'my-plan', name: 'Upper Lower', type: 'Custom', frequencyDaysPerWeek: 3, schedule: [] });
  });

  test('exercise defaults inside a schedule day', async () => {
    const res = await create(routine({ schedule: [day({ exercises: [{ exerciseName: 'Squat' }] })] }));
    expect(res.status).toBe(201);
    expect(res.body.schedule[0].exercises[0]).toMatchObject({ exerciseName: 'Squat', sets: 3, repsRange: '10', rir: '1', restTimeSeconds: 180, muscle: 'chest' });
  });

  test('the routine id is unique', async () => {
    await create(routine());
    const dup = await create(routine({ name: 'Another' }));
    expect(dup.status).toBe(400);
    expect(await Routine.countDocuments()).toBe(1);
  });

  test.each([
    ['missing id', { id: undefined }],
    ['blank id', { id: '   ' }],
    ['id as an object', { id: { $ne: '' } }],
    ['missing name', { name: undefined }],
    ['one-character name', { name: 'A' }],
    ['101-character name', { name: 'A'.repeat(101) }],
    ['frequency 0', { frequencyDaysPerWeek: 0 }],
    ['frequency 8', { frequencyDaysPerWeek: 8 }],
    ['frequency not a number', { frequencyDaysPerWeek: 'often' }],
  ])('rejects %s with a 400 and saves nothing', async (_label, over) => {
    const res = await create(routine(over));
    expect(res.status).toBe(400);
    expect(await Routine.countDocuments()).toBe(0);
  });

  test.each([
    ['a day without a name', { schedule: [{ day: 'Thứ 2' }] }],
    ['a day without a weekday', { schedule: [{ name: 'Push' }] }],
    ['an exercise without a name', { schedule: [day({ exercises: [{ sets: 3 }] })] }],
    ['0 sets', { schedule: [day({ exercises: [{ exerciseName: 'X', sets: 0 }] })] }],
    ['51 sets', { schedule: [day({ exercises: [{ exerciseName: 'X', sets: 51 }] })] }],
    ['negative rest time', { schedule: [day({ exercises: [{ exerciseName: 'X', restTimeSeconds: -1 }] })] }],
    ['rest time over 10 minutes', { schedule: [day({ exercises: [{ exerciseName: 'X', restTimeSeconds: 601 }] })] }],
    ['a target without a count', { schedule: [day({ targets: [{ id: 'chest', label: 'Ngực' }] })] }],
  ])('rejects a schedule with %s as a 400 (not a server error)', async (_label, over) => {
    const res = await create(routine(over));
    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
    expect(await Routine.countDocuments()).toBe(0);
  });

  test('boundary values are accepted', async () => {
    const res = await create(routine({
      frequencyDaysPerWeek: 7,
      schedule: [day({ exercises: [{ exerciseName: 'X', sets: 50, restTimeSeconds: 600 }, { exerciseName: 'Y', sets: 1, restTimeSeconds: 0 }] })],
    }));
    expect(res.status).toBe(201);
    expect((await create(routine({ id: 'b', frequencyDaysPerWeek: 1 }))).status).toBe(201);
  });
});

describe('PUT /api/routines/:id', () => {
  beforeEach(async () => { await create(routine()); });
  const update = (body, who = admin, id = 'ppl') => request(app).put(`/api/routines/${id}`).set(who.auth).send(body);

  test('only admins can update', async () => {
    expect((await request(app).put('/api/routines/ppl').send({ name: 'Hacked' })).status).toBe(401);
    expect((await update({ name: 'Hacked' }, user)).status).toBe(403);
    expect((await Routine.findOne({ id: 'ppl' })).name).toBe('Push Pull Legs');
  });

  test('a partial update changes only what was sent', async () => {
    const res = await update({ description: 'mới' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ description: 'mới', name: 'Push Pull Legs', frequencyDaysPerWeek: 3 });
    expect(res.body.schedule).toHaveLength(2);
  });

  test('replaces the whole schedule when one is sent', async () => {
    const res = await update({ schedule: [day({ day: 'Thứ 4', name: 'Legs', exercises: [] })] });
    expect(res.body.schedule).toHaveLength(1);
    expect(res.body.schedule[0]).toMatchObject({ day: 'Thứ 4', name: 'Legs' });
  });

  test('looks the routine up by its string id and cannot change that id', async () => {
    const res = await update({ id: 'renamed', name: 'New name' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('ppl');
    expect(await Routine.countDocuments({ id: 'renamed' })).toBe(0);
  });

  test('ignores fields it does not own', async () => {
    const res = await update({ isAdmin: true, createdAt: '2000-01-01', name: 'Ok' });
    expect(res.status).toBe(200);
    expect(res.body.isAdmin).toBeUndefined();
    expect(new Date(res.body.createdAt).getFullYear()).toBeGreaterThan(2000);
  });

  test.each([
    ['blank name', { name: '' }],
    ['one-character name', { name: 'A' }],
    ['frequency 0', { frequencyDaysPerWeek: 0 }],
    ['frequency 8', { frequencyDaysPerWeek: 8 }],
    ['an invalid schedule', { schedule: [{ day: 'Thứ 2' }] }],
    ['an exercise with 99 sets', { schedule: [day({ exercises: [{ exerciseName: 'X', sets: 99 }] })] }],
  ])('rejects %s with 400 and keeps the routine as it was', async (_label, body) => {
    const before = await Routine.findOne({ id: 'ppl' }).lean();
    const res = await update(body);
    expect(res.status).toBe(400);
    expect(await Routine.findOne({ id: 'ppl' }).lean()).toEqual(before);
  });

  test('unknown routine -> 404', async () => {
    expect((await update({ name: 'Nope' }, admin, 'does-not-exist')).status).toBe(404);
  });
});

describe('DELETE /api/routines/:id', () => {
  beforeEach(async () => { await create(routine()); });

  test('only admins can delete', async () => {
    expect((await request(app).delete('/api/routines/ppl')).status).toBe(401);
    expect((await request(app).delete('/api/routines/ppl').set(user.auth)).status).toBe(403);
    expect(await Routine.countDocuments()).toBe(1);
  });

  test('deletes by string id and reports it; a second delete is a 404', async () => {
    const res = await request(app).delete('/api/routines/ppl').set(admin.auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'ppl' });
    expect(await Routine.countDocuments()).toBe(0);
    expect((await request(app).delete('/api/routines/ppl').set(admin.auth)).status).toBe(404);
  });

  test("a user's saved lastActiveRoutineId may point at a deleted routine without breaking their profile", async () => {
    const put = await request(app).put('/api/users/profile').set(user.auth).send({ lastActiveRoutineId: 'ppl' });
    expect(put.status).toBe(200);
    await request(app).delete('/api/routines/ppl').set(admin.auth);
    const profile = await request(app).get('/api/users/profile').set(user.auth);
    expect(profile.status).toBe(200);
    expect(profile.body.lastActiveRoutineId).toBe('ppl');
  });
});
