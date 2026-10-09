import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { clearSession, loadSession, saveSession, type MusicSession } from './musicSession';

const KEY = 'music_session_v1';
const SESSION: MusicSession = {
  trackId: 't1',
  playlistId: 'p1',
  shuffle: true,
  repeat: 'all',
  queue: ['t2', 't3'],
  volume: 55,
  positionSec: 42.5,
};

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('musicSession', () => {
  test('round-trips a session', () => {
    saveSession(SESSION);
    expect(loadSession()).toEqual(SESSION);
  });

  test('a null playlist (all tracks) round-trips', () => {
    saveSession({ ...SESSION, playlistId: null });
    expect(loadSession()).toEqual({ ...SESSION, playlistId: null });
  });

  test('returns null when nothing is saved', () => {
    expect(loadSession()).toBeNull();
  });

  test.each([
    ['not JSON', 'definitely { not json'],
    ['a JSON array', '[1,2,3]'],
    ['JSON null', 'null'],
    ['a missing field', JSON.stringify({ ...SESSION, trackId: undefined })],
    ['an empty track id', JSON.stringify({ ...SESSION, trackId: '' })],
    ['a numeric track id', JSON.stringify({ ...SESSION, trackId: 5 })],
    ['a non-string playlist id', JSON.stringify({ ...SESSION, playlistId: 7 })],
    ['a non-boolean shuffle', JSON.stringify({ ...SESSION, shuffle: 'yes' })],
    ['an unknown repeat mode', JSON.stringify({ ...SESSION, repeat: 'sometimes' })],
    ['a queue that is not an array', JSON.stringify({ ...SESSION, queue: 'abc' })],
    ['a non-string queue entry', JSON.stringify({ ...SESSION, queue: ['t2', 9] })],
    ['a queue over 200 entries', JSON.stringify({ ...SESSION, queue: Array.from({ length: 201 }, () => 't') })],
    ['a volume above 100', JSON.stringify({ ...SESSION, volume: 500 })],
    ['a negative volume', JSON.stringify({ ...SESSION, volume: -1 })],
    ['a negative position', JSON.stringify({ ...SESSION, positionSec: -3 })],
    ['a non-numeric position', JSON.stringify({ ...SESSION, positionSec: 'soon' })],
  ])('ignores corrupt or malformed data: %s', (_label, raw) => {
    localStorage.setItem(KEY, raw);
    expect(loadSession()).toBeNull();
  });

  test('a NaN or infinite position is not accepted', () => {
    // JSON turns these into null, which is also rejected
    localStorage.setItem(KEY, JSON.stringify({ ...SESSION, positionSec: Number.NaN }));
    expect(loadSession()).toBeNull();
  });

  test('survives unavailable storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied'); });
    expect(loadSession()).toBeNull();
    expect(() => saveSession(SESSION)).not.toThrow();
    expect(() => clearSession()).not.toThrow();
  });

  test('clearSession removes it', () => {
    saveSession(SESSION);
    clearSession();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(loadSession()).toBeNull();
  });
});
