import { describe, expect, test } from 'vitest';
import { advance, buildOrder, previous, shuffled, type PlayState } from './musicQueue';

// deterministic pseudo-random numbers in [0, 1)
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const state = (over: Partial<PlayState> = {}): PlayState => ({ order: ['a', 'b', 'c'], currentId: 'a', queue: [], repeat: 'off', ...over });

describe('shuffled', () => {
  test('keeps every id exactly once', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect([...shuffled(ids, null, seeded(7))].sort()).toEqual(ids);
  });

  test('puts firstId first and shuffles the rest', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const result = shuffled(['a', 'b', 'c', 'd'], 'c', seeded(seed));
      expect(result[0]).toBe('c');
      expect([...result].sort()).toEqual(['a', 'b', 'c', 'd']);
    }
  });

  test('does not mutate the input', () => {
    const ids = ['a', 'b', 'c'];
    shuffled(ids, 'b', seeded(3));
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  test('returns [] for []', () => {
    expect(shuffled([], null)).toEqual([]);
    expect(shuffled([], 'x')).toEqual([]);
  });

  test('ignores a firstId that is not in the list', () => {
    expect([...shuffled(['a', 'b'], 'zzz', seeded(2))].sort()).toEqual(['a', 'b']);
  });

  test('actually reorders (not the identity for most seeds)', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const differing = Array.from({ length: 10 }, (_, i) => shuffled(ids, null, seeded(i + 1)).join('') !== ids.join('')).filter(Boolean);
    expect(differing.length).toBeGreaterThan(5);
  });
});

describe('buildOrder', () => {
  test('copies the list when shuffle is off', () => {
    const ids = ['a', 'b', 'c'];
    const order = buildOrder(ids, false, 'b');
    expect(order).toEqual(ids);
    expect(order).not.toBe(ids);
  });

  test('shuffles with the current track first', () => {
    const order = buildOrder(['a', 'b', 'c', 'd'], true, 'd', seeded(5));
    expect(order[0]).toBe('d');
    expect([...order].sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('advance', () => {
  test('goes to the next track', () => {
    expect(advance(state(), 'manual', false)).toMatchObject({ currentId: 'b', queue: [], order: ['a', 'b', 'c'], anchorId: 'b' });
  });

  test('queue plays before the context and is consumed in order', () => {
    const first = advance(state({ queue: ['x', 'y'] }), 'auto', false);
    expect(first).toMatchObject({ currentId: 'x', queue: ['y'], order: ['a', 'b', 'c'] });
    const second = advance({ ...state(), ...first }, 'auto', false);
    expect(second).toMatchObject({ currentId: 'y', queue: [] });
  });

  test('a queued track can appear twice', () => {
    const first = advance(state({ queue: ['x', 'x'] }), 'manual', false);
    expect(first).toMatchObject({ currentId: 'x', queue: ['x'] });
    expect(advance({ ...state(), ...first }, 'manual', false)).toMatchObject({ currentId: 'x', queue: [] });
  });

  test('after queued tracks the context continues from where it was', () => {
    const order = ['a', 'b', 'c'];
    const toQueued = advance(state({ order, currentId: 'a', queue: ['q'] }), 'auto', false);
    expect(toQueued).toMatchObject({ currentId: 'q', anchorId: 'a' });
    const back = advance({ repeat: 'off', ...toQueued }, 'auto', false);
    expect(back).toMatchObject({ currentId: 'b', anchorId: 'b' });
  });

  test('repeat one replays on auto but moves on for manual', () => {
    expect(advance(state({ repeat: 'one', currentId: 'b' }), 'auto', false).currentId).toBe('b');
    expect(advance(state({ repeat: 'one', currentId: 'b' }), 'manual', false).currentId).toBe('c');
  });

  test('repeat one does not touch the queue on auto', () => {
    const result = advance(state({ repeat: 'one', queue: ['x'] }), 'auto', false);
    expect(result).toMatchObject({ currentId: 'a', queue: ['x'] });
  });

  test('stops at the end with repeat off', () => {
    expect(advance(state({ currentId: 'c' }), 'auto', false).currentId).toBeNull();
  });

  test('wraps with repeat all', () => {
    const result = advance(state({ currentId: 'c', repeat: 'all' }), 'auto', false);
    expect(result).toMatchObject({ currentId: 'a', order: ['a', 'b', 'c'] });
  });

  test('wrap with shuffle does not start with the track that just ended', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const result = advance(state({ currentId: 'c', repeat: 'all' }), 'auto', true, seeded(seed));
      expect(result.currentId).not.toBe('c');
      expect(result.currentId).toBe(result.order[0]);
      expect([...result.order].sort()).toEqual(['a', 'b', 'c']);
    }
  });

  test('a single track loops with repeat all', () => {
    const result = advance(state({ order: ['a'], currentId: 'a', repeat: 'all' }), 'auto', true, seeded(1));
    expect(result.currentId).toBe('a');
  });

  test('an empty order stops even with repeat all', () => {
    expect(advance(state({ order: [], currentId: null, repeat: 'all' }), 'auto', false).currentId).toBeNull();
  });

  test('a queue still plays when the order is exhausted', () => {
    const result = advance(state({ currentId: 'c', queue: ['x'] }), 'auto', false);
    expect(result).toMatchObject({ currentId: 'x', queue: [] });
  });

  test('with nothing playing yet it starts at the beginning of the context', () => {
    expect(advance(state({ currentId: null }), 'manual', false).currentId).toBe('a');
  });
});

describe('previous', () => {
  test('goes back one', () => {
    expect(previous(state({ currentId: 'b' }))).toBe('a');
  });

  test('is null at the start with repeat off', () => {
    expect(previous(state({ currentId: 'a' }))).toBeNull();
  });

  test('wraps to the last with repeat all', () => {
    expect(previous(state({ currentId: 'a', repeat: 'all' }))).toBe('c');
  });

  test('is null for an unknown current track', () => {
    expect(previous(state({ currentId: 'zzz' }))).toBeNull();
    expect(previous(state({ currentId: null }))).toBeNull();
  });

  test('from a queued track it goes back to the context track it interrupted', () => {
    expect(previous(state({ currentId: 'q', anchorId: 'b' }))).toBe('b');
  });
});
