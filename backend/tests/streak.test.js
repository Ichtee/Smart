const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const { createUser } = require('./helpers/auth');
const { computeStreaks } = require('../controllers/workoutController');
const WorkoutLog = require('../models/WorkoutLog');

// UTC date n days from today (the server's own "today" when the client sends none)
const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

const saveLog = (auth, date, extra = {}) =>
  request(app).post('/api/workouts').set(auth).send({
    date,
    routineId: 'ppl',
    selectedIds: ['ex1', 'ex2'],
    completedIds: ['ex1'],
    isSaved: true,
    ...extra,
  });

const getStreak = (auth, today) =>
  request(app).get('/api/workouts/streak').query(today ? { today } : {}).set(auth);

describe('computeStreaks (pure)', () => {
  test.each([
    ['empty', [], '2026-10-07', { current: 0, longest: 0 }],
    ['single day today', ['2026-10-07'], '2026-10-07', { current: 1, longest: 1 }],
    ['single day yesterday still alive', ['2026-10-06'], '2026-10-07', { current: 1, longest: 1 }],
    ['last day two days ago is dead', ['2026-10-05'], '2026-10-07', { current: 0, longest: 1 }],
    ['consecutive run ending today', ['2026-10-05', '2026-10-06', '2026-10-07'], '2026-10-07', { current: 3, longest: 3 }],
    ['gap resets current, keeps longest', ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-06', '2026-10-07'], '2026-10-07', { current: 2, longest: 3 }],
    ['month rollover', ['2026-09-29', '2026-09-30', '2026-10-01'], '2026-10-01', { current: 3, longest: 3 }],
    ['year rollover', ['2025-12-31', '2026-01-01'], '2026-01-01', { current: 2, longest: 2 }],
    ['leap day', ['2028-02-28', '2028-02-29', '2028-03-01'], '2028-03-01', { current: 3, longest: 3 }],
    ['longest run is in the past', ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-10-07'], '2026-10-07', { current: 1, longest: 4 }],
  ])('%s', (_name, dates, today, expected) => {
    expect(computeStreaks(dates, today)).toEqual(expected);
  });
});

describe('workout streak API', () => {
  beforeAll(db.connect);
  beforeEach(db.clear);
  afterAll(db.close);

  test('requires authentication', async () => {
    expect((await request(app).get('/api/workouts/streak')).status).toBe(401);
    expect((await request(app).post('/api/workouts').send({ date: day(0) })).status).toBe(401);
  });

  test('empty history -> zeros', async () => {
    const { auth } = await createUser();
    const res = await getStreak(auth, day(0));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ streakDates: [], current: 0, longest: 0, total: 0, count: 0 });
  });

  test('consecutive days ending today count as the current streak', async () => {
    const { auth } = await createUser();
    for (const off of [-2, -1, 0]) await saveLog(auth, day(off));
    const res = await getStreak(auth, day(0));
    expect(res.body.current).toBe(3);
    expect(res.body.longest).toBe(3);
    expect(res.body.total).toBe(3);
    expect(res.body.count).toBe(3); // legacy field now means the consecutive streak
    expect(res.body.streakDates).toEqual([day(-2), day(-1), day(0)]);
  });

  test('a missed day breaks the current streak but keeps the longest', async () => {
    const { auth } = await createUser();
    for (const off of [-6, -5, -4, -1, 0]) await saveLog(auth, day(off));
    const res = await getStreak(auth, day(0));
    expect(res.body).toMatchObject({ current: 2, longest: 3, total: 5 });
  });

  test('a streak whose last day was two days ago is over', async () => {
    const { auth } = await createUser();
    for (const off of [-4, -3, -2]) await saveLog(auth, day(off));
    const res = await getStreak(auth, day(0));
    expect(res.body).toMatchObject({ current: 0, longest: 3 });
  });

  test("honours the client's local 'today' (timezone ahead of UTC)", async () => {
    const { auth } = await createUser();
    await saveLog(auth, day(0));
    // a client already in "tomorrow": yesterday (server today) is still within the grace day
    expect((await getStreak(auth, day(1))).body.current).toBe(1);
    // two days later it is over
    expect((await getStreak(auth, day(2))).body.current).toBe(0);
  });

  test('falls back to the server date when `today` is missing or malformed', async () => {
    const { auth } = await createUser();
    await saveLog(auth, day(0));
    expect((await getStreak(auth)).body.current).toBe(1);
    expect((await getStreak(auth, 'not-a-date')).body.current).toBe(1);
  });

  test('only days with at least one completed exercise count', async () => {
    const { auth } = await createUser();
    await saveLog(auth, day(0), { completedIds: [] }); // planned but nothing ticked
    const res = await getStreak(auth, day(0));
    expect(res.body).toMatchObject({ current: 0, total: 0 });
  });

  test('un-ticking the last exercise removes the day from the streak', async () => {
    const { auth } = await createUser();
    await saveLog(auth, day(0), { completedIds: ['ex1'] });
    expect((await getStreak(auth, day(0))).body.current).toBe(1);
    await saveLog(auth, day(0), { completedIds: [] });
    expect((await getStreak(auth, day(0))).body.current).toBe(0);
  });

  test("streaks are per user: another user's logs are ignored", async () => {
    const a = await createUser();
    const b = await createUser();
    await saveLog(a.auth, day(0));
    await saveLog(a.auth, day(-1));
    expect((await getStreak(b.auth, day(0))).body.total).toBe(0);
    expect((await getStreak(a.auth, day(0))).body.total).toBe(2);
  });

  test('deleting a day shrinks the streak', async () => {
    const { auth } = await createUser();
    for (const off of [-2, -1, 0]) await saveLog(auth, day(off));
    const del = await request(app).delete('/api/workouts').query({ date: day(-1) }).set(auth);
    expect(del.status).toBe(200);
    const res = await getStreak(auth, day(0));
    expect(res.body).toMatchObject({ current: 1, longest: 1, total: 2 });
  });

  test('delete requires a date', async () => {
    const { auth } = await createUser();
    expect((await request(app).delete('/api/workouts').set(auth)).status).toBe(400);
  });
});

describe('saving a workout log', () => {
  beforeAll(db.connect);
  beforeEach(db.clear);
  afterAll(db.close);

  test('upserts: one log per user per date', async () => {
    const { auth, user } = await createUser();
    await saveLog(auth, day(0), { completedIds: ['ex1'] });
    await saveLog(auth, day(0), { completedIds: ['ex1', 'ex2'] });
    expect(await WorkoutLog.countDocuments({ user: user._id, date: day(0) })).toBe(1);
    const res = await request(app).get('/api/workouts').query({ date: day(0) }).set(auth);
    expect(res.body.completedIds).toEqual(['ex1', 'ex2']);
  });

  test('persists per-set progress in detailsMap', async () => {
    const { auth } = await createUser();
    const detailsMap = { ex1: { sets: 3, reps: '10', completedSets: [0, 1] } };
    await saveLog(auth, day(0), { detailsMap });
    const res = await request(app).get('/api/workouts').query({ date: day(0) }).set(auth);
    expect(res.body.detailsMap.ex1.completedSets).toEqual([0, 1]);
    expect(res.body.isSaved).toBe(true);
  });

  test('rejects a missing or malformed date', async () => {
    const { auth } = await createUser();
    expect((await request(app).post('/api/workouts').set(auth).send({})).status).toBe(400);
    expect((await saveLog(auth, '07/10/2026')).status).toBe(400);
  });

  test('cannot mark exercises completed on a future day', async () => {
    const { auth, user } = await createUser();
    const res = await saveLog(auth, day(5), { completedIds: ['ex1'] });
    expect(res.status).toBe(400);
    expect(await WorkoutLog.countDocuments({ user: user._id })).toBe(0);
  });

  test('may plan a future day without completing anything', async () => {
    const { auth } = await createUser();
    const res = await saveLog(auth, day(5), { completedIds: [] });
    expect(res.status).toBe(200);
  });

  test('allows today+1 (client timezone ahead of UTC) but not today+2', async () => {
    const { auth } = await createUser();
    expect((await saveLog(auth, day(1))).status).toBe(200);
    expect((await saveLog(auth, day(2))).status).toBe(400);
  });

  test('GET without a saved log returns an empty default, GET without date is a 400', async () => {
    const { auth } = await createUser();
    const empty = await request(app).get('/api/workouts').query({ date: day(0) }).set(auth);
    expect(empty.status).toBe(200);
    expect(empty.body).toMatchObject({ selectedIds: [], completedIds: [], isSaved: false });
    expect((await request(app).get('/api/workouts').set(auth)).status).toBe(400);
  });
});

describe('GET /api/workouts/logs (date-ranged)', () => {
  beforeAll(db.connect);
  beforeEach(db.clear);
  afterAll(db.close);

  test('returns only logs inside from..to', async () => {
    const { auth } = await createUser();
    for (const off of [-40, -20, -3, 0]) await saveLog(auth, day(off));
    const res = await request(app).get('/api/workouts/logs').query({ from: day(-25), to: day(-1) }).set(auth);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual([day(-20), day(-3)]);
  });

  test('default window is ~120 days: older logs are left out', async () => {
    const { auth } = await createUser();
    await saveLog(auth, day(-200));
    await saveLog(auth, day(-10));
    const res = await request(app).get('/api/workouts/logs').set(auth);
    expect(Object.keys(res.body)).toEqual([day(-10)]);
  });

  test('an explicit range can reach older history', async () => {
    const { auth } = await createUser();
    await saveLog(auth, day(-200));
    const res = await request(app).get('/api/workouts/logs').query({ from: day(-210), to: day(-190) }).set(auth);
    expect(Object.keys(res.body)).toEqual([day(-200)]);
  });

  test('includes saved-but-unticked logs, skips unsaved ones with nothing completed', async () => {
    const { auth } = await createUser();
    await saveLog(auth, day(-3), { completedIds: [], isSaved: true });
    await saveLog(auth, day(-2), { completedIds: [], isSaved: false });
    await saveLog(auth, day(-1), { completedIds: ['ex1'], isSaved: false });
    const res = await request(app).get('/api/workouts/logs').set(auth);
    expect(Object.keys(res.body).sort()).toEqual([day(-3), day(-1)]);
  });

  test('is scoped to the caller', async () => {
    const a = await createUser();
    const b = await createUser();
    await saveLog(a.auth, day(-1));
    const res = await request(app).get('/api/workouts/logs').set(b.auth);
    expect(res.body).toEqual({});
  });

  test('rejects a repeated parameter (?from=a&from=b arrives as an array)', async () => {
    const { auth } = await createUser();
    const res = await request(app).get('/api/workouts/logs?from=2026-10-01&from=2026-10-02').set(auth);
    expect(res.status).toBe(400);
  });

  test.each([
    [{ from: '2026-13-01' }],
    [{ from: '2026-10-31', to: '2026-10-01' }],
    [{ from: '2020-01-01', to: '2026-01-01' }],
  ])('rejects invalid range %j', async (query) => {
    const { auth } = await createUser();
    const res = await request(app).get('/api/workouts/logs').query(query).set(auth);
    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
  });
});
