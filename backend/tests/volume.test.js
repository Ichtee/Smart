const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const { createUser } = require('./helpers/auth');
const { weekStart, computeWeeklyVolume } = require('../utils/volume');

const save = (auth, date, body) => request(app).post('/api/workouts').set(auth).send({ date, isSaved: true, ...body });
const volume = (auth, query = {}) => request(app).get('/api/workouts/volume').query(query).set(auth);

const ex = (id, muscle, over = {}) => ({ id, name: id, muscle, normMuscle: muscle, sets: 3, reps: '10', completed: true, ...over });
const logOf = (date, exercises, detailsMap, completedIds) => ({ date, exercises, detailsMap, completedIds: completedIds ?? exercises.map(e => e.id) });

describe('weekStart', () => {
  test.each([
    ['2026-09-07', '2026-09-07'], // Monday
    ['2026-09-09', '2026-09-07'], // Wednesday
    ['2026-09-13', '2026-09-07'], // Sunday belongs to the week that started on Monday
    ['2026-09-14', '2026-09-14'],
    ['2026-01-01', '2025-12-29'], // across the year boundary
    ['2024-03-01', '2024-02-26'], // leap year
  ])('%s -> %s', (date, monday) => {
    expect(weekStart(date)).toBe(monday);
  });
});

describe('computeWeeklyVolume', () => {
  const from = '2026-09-07';
  const to = '2026-09-27';

  test('weeks are every Monday from the first to the last, empty weeks included', () => {
    const out = computeWeeklyVolume([], from, to);
    expect(out.weeks).toEqual(['2026-09-07', '2026-09-14', '2026-09-21']);
    expect(out.muscles).toEqual([]);
  });

  test('a range that starts mid-week begins at the Monday of that week', () => {
    expect(computeWeeklyVolume([], '2026-09-10', '2026-09-16').weeks).toEqual(['2026-09-07', '2026-09-14']);
  });

  test('counts the sets done per muscle in the week of each log', () => {
    const logs = [
      logOf('2026-09-07', [ex('bench', 'chest'), ex('fly', 'chest')], { bench: { completedSets: [0, 1, 2] }, fly: { completedSets: [0, 1] } }),
      logOf('2026-09-09', [ex('squat', 'quads')], { squat: { completedSets: [0, 1, 2, 3] } }),
      logOf('2026-09-15', [ex('bench', 'chest')], { bench: { completedSets: [0] } }),
    ];
    const out = computeWeeklyVolume(logs, from, to);
    expect(out.muscles).toEqual([
      { muscle: 'chest', total: 6, weekly: [5, 1, 0] },
      { muscle: 'quads', total: 4, weekly: [4, 0, 0] },
    ]);
  });

  test('sets of an exercise that was not finished still count; sets never done do not', () => {
    const logs = [logOf('2026-09-07', [ex('bench', 'chest', { sets: 5 })], { bench: { sets: 5, completedSets: [0, 1] } }, [])];
    expect(computeWeeklyVolume(logs, from, to).muscles[0].total).toBe(2);
    expect(computeWeeklyVolume([logOf('2026-09-07', [ex('bench', 'chest')], { bench: { completedSets: [] } }, [])], from, to).muscles).toEqual([]);
  });

  test('an exercise ticked as a whole with no per-set progress counts its planned sets', () => {
    const logs = [logOf('2026-09-07', [ex('bench', 'chest')], { bench: { sets: 4, completedSets: [] } }, ['bench'])];
    expect(computeWeeklyVolume(logs, from, to).muscles[0].total).toBe(4);
    const noDetail = [logOf('2026-09-07', [ex('bench', 'chest', { sets: 2 })], {}, ['bench'])];
    expect(computeWeeklyVolume(noDetail, from, to).muscles[0].total).toBe(2);
  });

  test('duplicate or invalid set indexes are ignored', () => {
    const logs = [logOf('2026-09-07', [ex('bench', 'chest')], { bench: { completedSets: [0, 0, 1, -1, 1.5, 99, 'x'] } })];
    expect(computeWeeklyVolume(logs, from, to).muscles[0].total).toBe(2);
  });

  test('muscle falls back to the plain muscle name, is case-insensitive, and blank is skipped', () => {
    const logs = [logOf('2026-09-07', [
      { id: 'a', name: 'a', muscle: 'Back' }, { id: 'b', name: 'b', normMuscle: 'back' }, { id: 'c', name: 'c' },
    ], { a: { completedSets: [0] }, b: { completedSets: [0] }, c: { completedSets: [0] } })];
    expect(computeWeeklyVolume(logs, from, to).muscles).toEqual([{ muscle: 'back', total: 2, weekly: [2, 0, 0] }]);
  });

  test('malformed logs do not crash it; logs outside the weeks are ignored', () => {
    const logs = [null, {}, { date: '2026-09-07', exercises: 'x' }, { date: '2026-09-07', exercises: [null, { id: 'a', muscle: 'chest' }], detailsMap: 'x' }, logOf('2026-08-01', [ex('a', 'chest')], { a: { completedSets: [0] } })];
    expect(computeWeeklyVolume(logs, from, to).muscles).toEqual([]);
  });

  test('the week of the last day is included, even when that day is a Monday', () => {
    expect(computeWeeklyVolume([], '2026-09-07', '2026-09-21').weeks).toEqual(['2026-09-07', '2026-09-14', '2026-09-21']);
    expect(computeWeeklyVolume([], '2026-09-07', '2026-09-07').weeks).toEqual(['2026-09-07']);
  });

  test('set indexes 0..49 are valid, 50 is not', () => {
    const at = (idx) => [logOf('2026-09-07', [ex('a', 'chest')], { a: { completedSets: idx } }, [])];
    expect(computeWeeklyVolume(at([49]), from, to).muscles[0].total).toBe(1);
    expect(computeWeeklyVolume(at([50]), from, to).muscles).toEqual([]);
  });

  test('planned sets for a whole-ticked exercise must be a whole number above 0, at most 50', () => {
    const planned = (sets) => [logOf('2026-09-07', [ex('a', 'chest', { sets: undefined })], { a: { sets, completedSets: [] } }, ['a'])];
    expect(computeWeeklyVolume(planned(0), from, to).muscles).toEqual([]);
    expect(computeWeeklyVolume(planned(-3), from, to).muscles).toEqual([]);
    expect(computeWeeklyVolume(planned(2.5), from, to).muscles).toEqual([]);
    expect(computeWeeklyVolume(planned('lots'), from, to).muscles).toEqual([]);
    expect(computeWeeklyVolume(planned(80), from, to).muscles[0].total).toBe(50);
  });

  test('normMuscle wins over the free-text muscle name, and spaces around the name are ignored', () => {
    const logs = [logOf('2026-09-07', [
      { id: 'a', normMuscle: 'chest', muscle: 'Ngực' },
      { id: 'b', muscle: ' chest ' },
    ], { a: { completedSets: [0] }, b: { completedSets: [0] } })];
    expect(computeWeeklyVolume(logs, from, to).muscles).toEqual([{ muscle: 'chest', total: 2, weekly: [2, 0, 0] }]);
  });

  test('ids are compared as text, and a missing or null detailsMap does not crash', () => {
    const numeric = [logOf('2026-09-07', [{ id: 1, muscle: 'chest', sets: 2 }], {}, [1])];
    expect(computeWeeklyVolume(numeric, from, to).muscles[0].total).toBe(2);
    const nullMap = [{ date: '2026-09-07', exercises: [{ id: 'a', muscle: 'chest', sets: 2 }], completedIds: ['a'], detailsMap: null }];
    expect(computeWeeklyVolume(nullMap, from, to).muscles[0].total).toBe(2);
  });

  test('busiest muscle first, ties alphabetical', () => {
    const logs = [logOf('2026-09-07', [ex('a', 'triceps'), ex('b', 'biceps'), ex('c', 'chest')], { a: { completedSets: [0] }, b: { completedSets: [0] }, c: { completedSets: [0, 1] } })];
    expect(computeWeeklyVolume(logs, from, to).muscles.map(m => m.muscle)).toEqual(['chest', 'biceps', 'triceps']);
  });
});

describe('GET /api/workouts/volume', () => {
  beforeAll(db.connect);
  beforeEach(db.clear);
  afterAll(db.close);

  test('requires authentication', async () => {
    expect((await request(app).get('/api/workouts/volume')).status).toBe(401);
  });

  test('empty history gives the weeks and no muscles', async () => {
    const { auth } = await createUser();
    const res = await volume(auth, { from: '2026-09-07', to: '2026-09-20' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ from: '2026-09-07', to: '2026-09-20', weeks: ['2026-09-07', '2026-09-14'], muscles: [] });
  });

  test('adds up saved logs inside the range, only for the caller', async () => {
    const a = await createUser();
    const b = await createUser();
    const bench = ex('bench', 'chest');
    const body = (sets) => ({ selectedIds: ['bench'], completedIds: ['bench'], exercises: [bench], detailsMap: { bench: { sets: 3, completedSets: sets } } });
    await save(a.auth, '2026-09-08', body([0, 1, 2]));
    await save(a.auth, '2026-09-16', body([0, 1]));
    await save(a.auth, '2026-08-01', body([0])); // before the range
    await save(b.auth, '2026-09-08', body([0, 1, 2]));

    const res = await volume(a.auth, { from: '2026-09-07', to: '2026-09-20' });
    expect(res.body.muscles).toEqual([{ muscle: 'chest', total: 5, weekly: [3, 2] }]);
  });

  test('rejects an invalid or reversed range', async () => {
    const { auth } = await createUser();
    expect((await volume(auth, { from: 'nope' })).status).toBe(400);
    expect((await volume(auth, { from: '2026-09-20', to: '2026-09-01' })).status).toBe(400);
  });

  test('default window covers the last ~120 days', async () => {
    const { auth } = await createUser();
    const res = await volume(auth);
    expect(res.status).toBe(200);
    expect(res.body.weeks.length).toBeGreaterThanOrEqual(17);
    expect(res.body.weeks.length).toBeLessThanOrEqual(19);
  });
});
