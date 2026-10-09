// What the music player remembers between visits (this browser only). Every access is wrapped in
// try/catch: storage can be missing or blocked, and the saved text is never trusted.
import type { RepeatMode } from './musicQueue';

const KEY = 'music_session_v1';
const MAX_QUEUE = 200;
const REPEAT_MODES: RepeatMode[] = ['off', 'all', 'one'];

export interface MusicSession {
  trackId: string;
  /** null = all tracks */
  playlistId: string | null;
  shuffle: boolean;
  repeat: RepeatMode;
  queue: string[];
  volume: number;
  positionSec: number;
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const parse = (raw: unknown): MusicSession | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const s = raw as Record<string, unknown>;
  const valid =
    typeof s.trackId === 'string' && s.trackId !== '' &&
    (s.playlistId === null || typeof s.playlistId === 'string') &&
    typeof s.shuffle === 'boolean' &&
    REPEAT_MODES.includes(s.repeat as RepeatMode) &&
    Array.isArray(s.queue) && s.queue.length <= MAX_QUEUE && s.queue.every(id => typeof id === 'string') &&
    isFiniteNumber(s.volume) && s.volume >= 0 && s.volume <= 100 &&
    isFiniteNumber(s.positionSec) && s.positionSec >= 0;
  if (!valid) return null;
  return {
    trackId: s.trackId as string,
    playlistId: s.playlistId as string | null,
    shuffle: s.shuffle as boolean,
    repeat: s.repeat as RepeatMode,
    queue: s.queue as string[],
    volume: s.volume as number,
    positionSec: s.positionSec as number,
  };
};

/** The saved session, or null when there is none or it is not exactly the expected shape. */
export function loadSession(): MusicSession | null {
  try {
    const text = localStorage.getItem(KEY);
    return text === null ? null : parse(JSON.parse(text));
  } catch {
    return null;
  }
}

export function saveSession(session: MusicSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // storage full or blocked: resuming is a convenience, not a requirement
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to clean up
  }
}
