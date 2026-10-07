const { parseDateRange, isValidDate, MAX_RANGE_DAYS, DEFAULT_RANGE_DAYS } = require('../utils/dateRange');

const NOW = new Date('2026-10-07T12:00:00Z');

describe('isValidDate', () => {
  test.each([
    ['2026-10-07', true],
    ['2028-02-29', true], // leap day
    ['2026-02-29', false], // not a leap year
    ['2026-02-30', false],
    ['2026-13-01', false],
    ['2026/10/07', false],
    ['26-10-07', false],
    ['', false],
    [undefined, false],
    [['2026-10-07'], false], // ?from[]=... arrives as an array
    [{ $gt: '' }, false], // ?from[$gt]= arrives as an object
  ])('%j -> %s', (input, expected) => {
    expect(isValidDate(input)).toBe(expected);
  });
});

describe('parseDateRange', () => {
  test('explicit range is returned as given', () => {
    expect(parseDateRange({ from: '2026-10-01', to: '2026-10-31' }, NOW)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  test('no params -> last DEFAULT_RANGE_DAYS days, +1 day slack for clients ahead of UTC', () => {
    const r = parseDateRange({}, NOW);
    expect(r).toEqual({ from: '2026-06-10', to: '2026-10-08' });
    const days = (Date.parse(r.to) - Date.parse(r.from)) / 86400000;
    expect(days).toBe(DEFAULT_RANGE_DAYS);
  });

  test('only `from` spans MAX_RANGE_DAYS inclusive', () => {
    expect(parseDateRange({ from: '2026-01-01' }, NOW)).toEqual({ from: '2026-01-01', to: '2027-01-01' });
  });

  test('only `to` spans MAX_RANGE_DAYS inclusive backwards', () => {
    expect(parseDateRange({ to: '2026-12-31' }, NOW)).toEqual({ from: '2025-12-31', to: '2026-12-31' });
  });

  test('range of exactly MAX_RANGE_DAYS is allowed, one more is not', () => {
    expect(parseDateRange({ from: '2026-01-01', to: '2027-01-01' }, NOW).error).toBeUndefined();
    expect(MAX_RANGE_DAYS).toBe(366);
    expect(parseDateRange({ from: '2026-01-01', to: '2027-01-02' }, NOW).error).toBeDefined();
  });

  test('rejects from > to', () => {
    expect(parseDateRange({ from: '2026-10-31', to: '2026-10-01' }, NOW).error).toBeDefined();
  });

  test('rejects malformed, impossible and injected values', () => {
    expect(parseDateRange({ from: 'yesterday' }, NOW).error).toBeDefined();
    expect(parseDateRange({ from: '2026-02-30', to: '2026-03-01' }, NOW).error).toBeDefined();
    expect(parseDateRange({ from: ['2026-10-01'], to: '2026-10-31' }, NOW).error).toBeDefined();
    expect(parseDateRange({ to: { $ne: null } }, NOW).error).toBeDefined();
  });

  test('handles a missing query object', () => {
    expect(parseDateRange(undefined, NOW).error).toBeUndefined();
  });
});
