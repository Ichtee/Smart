const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const { createUser } = require('./helpers/auth');
const { parseSetWeight, sanitizeDetailsMap, heaviestSet, computeRecords } = require('../utils/records');

const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

const saveLog = (auth, date, body) => request(app).post('/api/workouts').set(auth).send({ date, isSaved: true, ...body });
const records = (auth) => request(app).get('/api/workouts/records').set(auth);

/** A day where `bench` was trained: completed sets and the weight of each set. */
const benchDay = (completedSets, setWeights, over = {}) => ({
  selectedIds: ['bench'],
  completedIds: completedSets.length ? ['bench'] : [],
  exercises: [{ id: 'bench', name: over.name || 'Bench Press', sets: 3, reps: '10', completed: true }],
  detailsMap: { bench: { sets: 3, reps: '10', completedSets, setWeights } },
});

describe('parseSetWeight', () => {
  test.each([[60, 60], ['62.5', 62.5], [0.5, 0.5], [1000, 1000], [60.126, 60.13]])('%j -> %j', (v, expected) => {
    expect(parseSetWeight(v)).toBe(expected);
  });
  test.each([0, -5, 1000.01, '', '  ', 'abc', NaN, Infinity, null, undefined, {}, [60], true])('%j -> null', (v) => {
    expect(parseSetWeight(v)).toBeNull();
  });
});

describe('sanitizeDetailsMap', () => {
  test('keeps valid weights and drops everything else', () => {
    const out = sanitizeDetailsMap({
      a: { sets: 3, setWeights: { 0: 60, 1: '62.5', 2: 'x', 3: -1, '-1': 50, abc: 40, 99: 40, 1.5: 40 } },
    });
    expect(out.a.setWeights).toEqual({ 0: 60, 1: 62.5 });
    expect(out.a.sets).toBe(3);
  });

  test('leaves other fields and exercises without weights untouched', () => {
    const input = { a: { sets: 3, completedSets: [0] }, b: 'odd', c: null };
    expect(sanitizeDetailsMap(input)).toEqual(input);
  });

  test('a non-object setWeights becomes empty; a non-object map is returned as is', () => {
    expect(sanitizeDetailsMap({ a: { setWeights: [60, 70] } }).a.setWeights).toEqual({});
    expect(sanitizeDetailsMap({ a: { setWeights: 'heavy' } }).a.setWeights).toEqual({});
    expect(sanitizeDetailsMap(undefined)).toBeUndefined();
    expect(sanitizeDetailsMap('x')).toBe('x');
  });

  test('does not mutate its input', () => {
    const input = { a: { setWeights: { 0: 'x', 1: 50 } } };
    sanitizeDetailsMap(input);
    expect(input.a.setWeights).toEqual({ 0: 'x', 1: 50 });
  });
});

describe('heaviestSet', () => {
  test('only completed sets count', () => {
    expect(heaviestSet({ completedSets: [0, 1], setWeights: { 0: 60, 1: 70, 2: 100 } })).toBe(70);
  });
  test('null without weights, without completed sets, or with bad data', () => {
    expect(heaviestSet({ completedSets: [], setWeights: { 0: 60 } })).toBeNull();
    expect(heaviestSet({ completedSets: [0] })).toBeNull();
    expect(heaviestSet({ completedSets: [1], setWeights: { 0: 60 } })).toBeNull();
    expect(heaviestSet(null)).toBeNull();
    expect(heaviestSet({ completedSets: 'x', setWeights: {} })).toBeNull();
  });
});

describe('computeRecords', () => {
  const log = (date, name, completedSets, setWeights) => ({ date, ...benchDay(completedSets, setWeights, { name }) });

  test('best, last and the history per exercise, with PR days marked', () => {
    const r = computeRecords([
      log('2026-05-01', 'Bench Press', [0, 1], { 0: 60, 1: 60 }),
      log('2026-05-08', 'Bench Press', [0, 1], { 0: 62.5, 1: 65 }),
      log('2026-05-15', 'Bench Press', [0], { 0: 62.5 }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].best).toEqual({ weight: 65, date: '2026-05-08' });
    expect(r[0].last).toEqual({ weight: 62.5, date: '2026-05-15' });
    expect(r[0].sessions).toEqual([
      { date: '2026-05-01', maxWeight: 60, pr: true },
      { date: '2026-05-08', maxWeight: 65, pr: true },
      { date: '2026-05-15', maxWeight: 62.5, pr: false },
    ]);
  });

  test('logs may arrive in any order', () => {
    const r = computeRecords([
      log('2026-05-15', 'Squat', [0], { 0: 100 }),
      log('2026-05-01', 'Squat', [0], { 0: 80 }),
    ]);
    expect(r[0].sessions.map(s => s.date)).toEqual(['2026-05-01', '2026-05-15']);
    expect(r[0].last.date).toBe('2026-05-15');
  });

  test('matching the same weight is not a new PR (the earlier day keeps it)', () => {
    const r = computeRecords([
      log('2026-05-01', 'Squat', [0], { 0: 100 }),
      log('2026-05-08', 'Squat', [0], { 0: 100 }),
    ]);
    expect(r[0].best.date).toBe('2026-05-01');
    expect(r[0].sessions.map(s => s.pr)).toEqual([true, false]);
  });

  test('names match ignoring case and extra spaces; the first spelling is shown', () => {
    const r = computeRecords([
      log('2026-05-01', 'Bench Press', [0], { 0: 60 }),
      log('2026-05-08', '  bench   PRESS ', [0], { 0: 70 }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('Bench Press');
    expect(r[0].best.weight).toBe(70);
  });

  test('exercises are listed alphabetically', () => {
    const r = computeRecords([
      log('2026-05-01', 'Squat', [0], { 0: 80 }),
      log('2026-05-01', 'Deadlift', [0], { 0: 100 }),
    ]);
    expect(r.map(x => x.name)).toEqual(['Deadlift', 'Squat']);
  });

  test('days without a weighted, completed set are ignored; so is garbage', () => {
    const r = computeRecords([
      log('2026-05-01', 'Squat', [], { 0: 80 }),
      log('2026-05-02', 'Squat', [0], {}),
      null,
      { date: '2026-05-03' },
      { date: '2026-05-04', exercises: [{ id: 'x', name: '' }], detailsMap: { x: { completedSets: [0], setWeights: { 0: 5 } } } },
    ]);
    expect(r).toEqual([]);
  });

  test('keeps only the most recent 60 sessions but the best is over all of them', () => {
    const logs = [];
    for (let i = 0; i < 70; i++) {
      const d = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
      logs.push(log(d, 'Squat', [0], { 0: i === 0 ? 200 : 50 }));
    }
    const [r] = computeRecords(logs);
    expect(r.sessions).toHaveLength(60);
    expect(r.best.weight).toBe(200);
  });
});

describe('workout weights through the API', () => {
  beforeAll(db.connect);
  beforeEach(db.clear);
  afterAll(db.close);

  test('records require authentication', async () => {
    expect((await request(app).get('/api/workouts/records')).status).toBe(401);
  });

  test('no workouts -> an empty list', async () => {
    const { auth } = await createUser();
    const res = await records(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('weights are stored with the log and come back on reload', async () => {
    const { auth } = await createUser();
    await saveLog(auth, day(0), benchDay([0, 1], { 0: 60, 1: 62.5 }));
    const res = await request(app).get('/api/workouts').query({ date: day(0) }).set(auth);
    expect(res.body.detailsMap.bench.setWeights).toEqual({ 0: 60, 1: 62.5 });
    expect(res.body.detailsMap.bench.completedSets).toEqual([0, 1]);
  });

  test('invalid weights are dropped when saving (the rest of the log is kept)', async () => {
    const { auth } = await createUser();
    const res = await saveLog(auth, day(0), benchDay([0, 1], { 0: 60, 1: 'heavy', 2: -5, 3: 5000 }));
    expect(res.status).toBe(200);
    expect(res.body.detailsMap.bench.setWeights).toEqual({ 0: 60 });
    expect(res.body.detailsMap.bench.completedSets).toEqual([0, 1]);
  });

  test('records follow the logs: PR on a heavier day, and they update when a log is deleted', async () => {
    const { auth } = await createUser();
    await saveLog(auth, day(-7), benchDay([0], { 0: 60 }));
    await saveLog(auth, day(0), benchDay([0], { 0: 70 }));

    let [bench] = (await records(auth)).body;
    expect(bench.name).toBe('Bench Press');
    expect(bench.best).toEqual({ weight: 70, date: day(0) });
    expect(bench.sessions.map(s => s.pr)).toEqual([true, true]);

    await request(app).delete('/api/workouts').query({ date: day(0) }).set(auth);
    [bench] = (await records(auth)).body;
    expect(bench.best).toEqual({ weight: 60, date: day(-7) });
  });

  test('a day with weights but nothing completed has no records yet', async () => {
    const { auth } = await createUser();
    await saveLog(auth, day(0), benchDay([], { 0: 60 }));
    expect((await records(auth)).body).toEqual([]);
  });

  test('records are private to each user', async () => {
    const a = await createUser();
    const b = await createUser();
    await saveLog(a.auth, day(0), benchDay([0], { 0: 100 }));
    expect((await records(b.auth)).body).toEqual([]);
    expect((await records(a.auth)).body).toHaveLength(1);
  });
});
