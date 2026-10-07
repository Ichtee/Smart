const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const db = require('./helpers/db');
const { createUser } = require('./helpers/auth');
const Exercise = require('../models/Exercise');

const exercise = (over = {}) => ({
  name: 'Bench Press',
  muscle: 'chest',
  defaultSets: 3,
  defaultReps: '10',
  equipment: 'Barbell',
  description: 'Nằm đẩy tạ',
  videoUrl: 'https://youtu.be/abcdefghijk',
  secondaryMuscles: ['triceps', 'front-deltoids'],
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

const create = (body, who = admin) => request(app).post('/api/exercises').set(who.auth).send(body);

describe('GET /api/exercises', () => {
  test('is public and returns every exercise', async () => {
    await create(exercise({ name: 'A1' }));
    await create(exercise({ name: 'B2' }));
    const res = await request(app).get('/api/exercises'); // no auth header
    expect(res.status).toBe(200);
    expect(res.body.map(e => e.name).sort()).toEqual(['A1', 'B2']);
  });

  test('empty library -> empty list', async () => {
    const res = await request(app).get('/api/exercises');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/exercises', () => {
  test('only admins can create', async () => {
    expect((await request(app).post('/api/exercises').send(exercise())).status).toBe(401);
    expect((await create(exercise(), user)).status).toBe(403);
    expect(await Exercise.countDocuments()).toBe(0);
  });

  test('stores every field, trims name/muscle and applies defaults', async () => {
    const res = await create(exercise({ name: '  Squat  ', muscle: ' quadriceps ' }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Squat', muscle: 'quadriceps', defaultSets: 3, defaultReps: '10',
      equipment: 'Barbell', secondaryMuscles: ['triceps', 'front-deltoids'],
    });

    const minimal = await create({ name: 'Plank', muscle: 'abs' });
    expect(minimal.status).toBe(201);
    expect(minimal.body).toMatchObject({ defaultSets: 1, defaultReps: '10', equipment: '', description: '', videoUrl: '' });
  });

  test('ignores fields it does not own (no mass assignment)', async () => {
    const res = await create({ ...exercise(), _id: new mongoose.Types.ObjectId(), createdAt: '2000-01-01', isAdmin: true });
    expect(res.status).toBe(201);
    expect(res.body.isAdmin).toBeUndefined();
    expect(new Date(res.body.createdAt).getFullYear()).toBeGreaterThan(2000);
  });

  test.each([
    ['missing name', { name: undefined }],
    ['blank name', { name: '   ' }],
    ['one-character name', { name: 'A' }],
    ['101-character name', { name: 'A'.repeat(101) }],
    ['missing muscle', { muscle: undefined }],
    ['blank muscle', { muscle: '  ' }],
    ['sets 0', { defaultSets: 0 }],
    ['sets 51', { defaultSets: 51 }],
    ['sets not a number', { defaultSets: 'many' }],
    ['blank reps', { defaultReps: '   ' }],
    ['reps longer than 20 characters', { defaultReps: '1'.repeat(21) }],
    ['name as an object', { name: { $gt: '' } }],
  ])('rejects %s with a 400 and saves nothing', async (_label, over) => {
    const res = await create(exercise(over));
    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
    expect(await Exercise.countDocuments()).toBe(0);
  });

  test('boundary values are accepted', async () => {
    expect((await create(exercise({ name: 'AB', defaultSets: 1 }))).status).toBe(201);
    expect((await create(exercise({ name: 'C'.repeat(100), defaultSets: 50, defaultReps: '1'.repeat(20) }))).status).toBe(201);
  });

  test('names are unique', async () => {
    await create(exercise({ name: 'Deadlift' }));
    const dup = await create(exercise({ name: 'Deadlift' }));
    expect(dup.status).toBe(400);
    expect(await Exercise.countDocuments()).toBe(1);
  });
});

describe('PUT /api/exercises/:id', () => {
  let id;
  beforeEach(async () => {
    id = (await create(exercise({ name: 'Row', muscle: 'upper-back', defaultSets: 4 }))).body._id;
  });
  const update = (body, who = admin, target = id) => request(app).put(`/api/exercises/${target}`).set(who.auth).send(body);

  test('only admins can update', async () => {
    expect((await request(app).put(`/api/exercises/${id}`).send({ muscle: 'x' })).status).toBe(401);
    expect((await update({ muscle: 'biceps' }, user)).status).toBe(403);
    expect((await Exercise.findById(id)).muscle).toBe('upper-back');
  });

  test('a partial update changes only what was sent', async () => {
    const res = await update({ muscle: 'lats' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Row', muscle: 'lats', defaultSets: 4, equipment: 'Barbell' });
  });

  test('can change every editable field', async () => {
    const res = await update({
      name: ' Cable Row ', muscle: 'lats', defaultSets: 5, defaultReps: '12',
      equipment: 'Cable', description: 'new', videoUrl: '', secondaryMuscles: ['biceps'],
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: 'Cable Row', muscle: 'lats', defaultSets: 5, defaultReps: '12',
      equipment: 'Cable', description: 'new', videoUrl: '', secondaryMuscles: ['biceps'],
    });
  });

  test('can clear optional text fields to an empty string', async () => {
    const res = await update({ description: '', equipment: '' });
    expect(res.body).toMatchObject({ description: '', equipment: '' });
  });

  test.each([
    ['blank name', { name: '  ' }],
    ['one-character name', { name: 'A' }],
    ['blank muscle', { muscle: ' ' }],
    ['sets 0', { defaultSets: 0 }],
    ['sets 51', { defaultSets: 51 }],
    ['blank reps', { defaultReps: ' ' }],
    ['reps over 20 characters', { defaultReps: '1'.repeat(21) }],
  ])('rejects %s with 400 and leaves the exercise unchanged', async (_label, body) => {
    const before = await Exercise.findById(id).lean();
    const res = await update(body);
    expect(res.status).toBe(400);
    const after = await Exercise.findById(id).lean();
    expect(after).toEqual(before);
  });

  test('renaming onto an existing name is refused', async () => {
    await create(exercise({ name: 'Taken' }));
    const res = await update({ name: 'Taken' });
    expect(res.status).toBe(400);
    expect((await Exercise.findById(id)).name).toBe('Row');
  });

  test('keeping the same name is fine', async () => {
    expect((await update({ name: 'Row', muscle: 'lats' })).status).toBe(200);
  });

  test('unknown id -> 404, malformed id -> 400/404 (never a 500)', async () => {
    expect((await update({ muscle: 'x' }, admin, new mongoose.Types.ObjectId())).status).toBe(404);
    const bad = await update({ muscle: 'x' }, admin, 'not-an-object-id');
    expect([400, 404]).toContain(bad.status);
  });
});

describe('DELETE /api/exercises/:id', () => {
  test('only admins can delete', async () => {
    const id = (await create(exercise())).body._id;
    expect((await request(app).delete(`/api/exercises/${id}`)).status).toBe(401);
    expect((await request(app).delete(`/api/exercises/${id}`).set(user.auth)).status).toBe(403);
    expect(await Exercise.countDocuments()).toBe(1);
  });

  test('deletes it; a second delete is a 404', async () => {
    const id = (await create(exercise())).body._id;
    expect((await request(app).delete(`/api/exercises/${id}`).set(admin.auth)).status).toBe(200);
    expect(await Exercise.countDocuments()).toBe(0);
    expect((await request(app).delete(`/api/exercises/${id}`).set(admin.auth)).status).toBe(404);
  });

  test('a malformed id is not a 500', async () => {
    const res = await request(app).delete('/api/exercises/nope').set(admin.auth);
    expect([400, 404]).toContain(res.status);
  });
});
