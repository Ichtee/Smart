// Pure play-order logic for the music player (shuffle, repeat, "play next" queue). No React, no side effects.

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayState {
  /** The play context's track ids in play order (a playlist, or all tracks; already shuffled when shuffle is on). */
  order: string[];
  currentId: string | null;
  /** "Play next" ids, taken before the context continues. */
  queue: string[];
  repeat: RepeatMode;
  /**
   * The last track taken from `order`. After a queued track ends, the context continues from here.
   * Optional: when the current track is in `order`, that track is the anchor.
   */
  anchorId?: string | null;
}

export interface Advanced {
  currentId: string | null;
  queue: string[];
  order: string[];
  anchorId: string | null;
}

type Rand = () => number;

/** Fisher-Yates over a copy; `firstId` (when present in `ids`) is placed first and the rest are shuffled. */
export function shuffled(ids: string[], firstId: string | null, rand: Rand = Math.random): string[] {
  const rest = [...ids];
  let first: string | undefined;
  const at = firstId === null ? -1 : rest.indexOf(firstId);
  if (at !== -1) first = rest.splice(at, 1)[0];

  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return first === undefined ? rest : [first, ...rest];
}

/** The play order for a context: a shuffled copy (current track first) or a plain copy. */
export function buildOrder(ids: string[], shuffle: boolean, currentId: string | null, rand?: Rand): string[] {
  return shuffle ? shuffled(ids, currentId, rand) : [...ids];
}

// the track of `order` the context is "at": the current track, or the one a queued track interrupted
const anchorOf = (state: PlayState): string | null => {
  if (state.currentId !== null && state.order.includes(state.currentId)) return state.currentId;
  return state.anchorId ?? null;
};

/**
 * What plays after the current track.
 * Order of rules: repeat-one on a natural end, then the queue, then the next track of the context,
 * then (repeat all) a fresh lap of the context, otherwise stop (`currentId: null`).
 */
export function advance(state: PlayState, reason: 'auto' | 'manual', shuffle: boolean, rand?: Rand): Advanced {
  const { order, currentId, queue, repeat } = state;
  const anchor = anchorOf(state);

  if (reason === 'auto' && repeat === 'one' && currentId !== null) {
    return { currentId, queue, order, anchorId: anchor };
  }
  if (queue.length > 0) {
    return { currentId: queue[0], queue: queue.slice(1), order, anchorId: anchor };
  }

  const next = order[(anchor === null ? -1 : order.indexOf(anchor)) + 1];
  if (next !== undefined) return { currentId: next, queue, order, anchorId: next };

  if (repeat === 'all' && order.length > 0) {
    const lap = buildOrder(order, shuffle, null, rand);
    // a shuffled lap must not open with the track that just ended (unless it is the only one)
    if (lap.length > 1 && lap[0] === currentId) [lap[0], lap[1]] = [lap[1], lap[0]];
    return { currentId: lap[0], queue, order: lap, anchorId: lap[0] };
  }
  return { currentId: null, queue, order, anchorId: anchor };
}

/** The track before the current one, or null when there is none to go back to. */
export function previous(state: PlayState): string | null {
  const { order, currentId, repeat } = state;
  if (currentId === null) return null;

  const at = order.indexOf(currentId);
  if (at === -1) {
    // a queued track: back to the context track it interrupted
    return state.anchorId && order.includes(state.anchorId) ? state.anchorId : null;
  }
  if (at > 0) return order[at - 1];
  return repeat === 'all' ? order[order.length - 1] : null;
}
