'use client';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useMusicLibrary } from '@/hooks/useMusicLibrary';
import { useWakeLock } from '@/hooks/useWakeLock';
import { isPublicPath } from '@/components/AuthGuard';
import { loadSoundCloudApi, loadYouTubeApi, type SCWidget, type YTPlayer } from '@/utils/embedPlayers';
import { advance, buildOrder, previous as previousId, type RepeatMode } from '@/utils/musicQueue';
import { clearSession, loadSession, saveSession } from '@/utils/musicSession';
import { MusicContext, type MusicContextValue } from './musicContext';
import MiniPlayer from './MiniPlayer';

export { useMusic, type MusicContextValue } from './musicContext';

// YouTube's rules: an embedded player must stay visible and at least 200x200 while it is loaded.
const EMBED_SIZE = 200;
const MAX_QUEUE = 200;
const SAVE_EVERY_MS = 5000;

interface PlayerState {
  currentId: string | null;
  playing: boolean;
  activePlaylistId: string | null;
  shuffle: boolean;
  repeat: RepeatMode;
  /** the shuffled play order; null means "build it when the library is ready" */
  shuffleOrder: string[] | null;
  queue: string[];
  /** the last track taken from the context order (where the context continues after queued tracks) */
  anchorId: string | null;
  volume: number;
  /** restored from a saved session whose track has not been confirmed to exist yet */
  restoring: boolean;
  /** a saved session was abandoned (its track is gone) and must be cleared */
  dropped: boolean;
}

const IDLE: Omit<PlayerState, 'shuffle' | 'repeat' | 'volume'> = {
  currentId: null, playing: false, activePlaylistId: null, shuffleOrder: null, queue: [], anchorId: null, restoring: false, dropped: false,
};

const subscribeToStorage = (onChange: () => void) => {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
};
const hasToken = () => {
  try {
    return localStorage.getItem('token') !== null;
  } catch {
    return false; // storage unavailable
  }
};

interface Start { state: PlayerState; resume: { trackId: string; sec: number } | null }

// The provider only mounts on the client (AuthGuard shows a loader until it knows who the user is), so
// reading the saved session here cannot cause a hydration mismatch.
const startFrom = (active: boolean): Start => {
  const saved = active ? loadSession() : null;
  return {
    state: {
      ...IDLE,
      currentId: saved?.trackId ?? null,
      activePlaylistId: saved?.playlistId ?? null,
      anchorId: saved?.trackId ?? null,
      queue: saved?.queue ?? [],
      shuffle: saved?.shuffle ?? false,
      repeat: saved?.repeat ?? 'off',
      volume: saved?.volume ?? 80,
      restoring: saved !== null,
    },
    resume: saved ? { trackId: saved.trackId, sec: saved.positionSec } : null,
  };
};

/**
 * One music player for the whole app: the library page and the mini player both drive it through
 * useMusic(), so the embedded YouTube/SoundCloud player (and the music) survives page changes.
 * It is only "active" when signed in on a non-public page; otherwise everything is reset and destroyed.
 */
export function MusicProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const signedIn = useSyncExternalStore(subscribeToStorage, hasToken, () => false);
  const active = signedIn && !isPublicPath(pathname);
  const onMusicPage = pathname === '/music' || pathname.startsWith('/music/');

  const [start] = useState(() => startFrom(active));
  const [s, setS] = useState<PlayerState>(start.state);
  const update = useCallback((patch: Partial<PlayerState>) => setS(prev => ({ ...prev, ...patch })), []);

  const ytRef = useRef<YTPlayer | null>(null);
  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const scRef = useRef<SCWidget | null>(null);
  const scIframeRef = useRef<HTMLIFrameElement | null>(null);
  const tokenRef = useRef(0); // bumped to ignore async work that belongs to an older track
  const resumeRef = useRef(start.resume);
  const hadCurrentRef = useRef(false);

  // ---- data ----
  const { tracks, playlists, loaded } = useMusicLibrary(active && (s.currentId !== null || onMusicPage));
  const trackById = useMemo(() => new Map(tracks.map(t => [t._id, t])), [tracks]);
  const contextIds = useMemo(() => {
    if (s.activePlaylistId === null) return tracks.map(t => t._id);
    const playlist = playlists.find(p => p._id === s.activePlaylistId);
    return playlist ? playlist.trackIds.filter(id => trackById.has(id)) : [];
  }, [s.activePlaylistId, tracks, playlists, trackById]);
  const order = useMemo(() => {
    if (s.shuffle && s.shuffleOrder) {
      const inContext = new Set(contextIds);
      return s.shuffleOrder.filter(id => inContext.has(id));
    }
    return contextIds;
  }, [s.shuffle, s.shuffleOrder, contextIds]);
  const validQueue = useMemo(() => s.queue.filter(id => trackById.has(id)), [s.queue, trackById]);
  const current = s.currentId !== null ? trackById.get(s.currentId) ?? null : null;

  // ---- render-time corrections (React's "adjust state when something changes" pattern) ----
  // the order of the previous render: it still holds a track that was just deleted, which tells where to continue
  const [prevOrder, setPrevOrder] = useState(order);
  if (prevOrder !== order) setPrevOrder(order);

  if (!active) {
    if (s.currentId !== null || s.queue.length > 0 || s.playing) setS(prev => ({ ...prev, ...IDLE }));
  } else if (loaded) {
    if (s.activePlaylistId !== null && !playlists.some(p => p._id === s.activePlaylistId)) {
      update({ activePlaylistId: null, shuffleOrder: null }); // the playlist was deleted: back to all tracks
    } else if (s.currentId !== null && !trackById.has(s.currentId)) {
      if (s.restoring) {
        setS(prev => ({ ...prev, ...IDLE, dropped: true })); // the saved track no longer exists
      } else {
        // the playing track was deleted: carry on from where it was in the previous order
        const at = prevOrder.indexOf(s.currentId);
        const before = at === -1
          ? (s.anchorId !== null && order.includes(s.anchorId) ? s.anchorId : null) // it was a queued track
          : prevOrder.slice(0, at).reverse().find(id => order.includes(id)) ?? null;
        const next = advance({ order, currentId: before, queue: validQueue, repeat: s.repeat, anchorId: before }, 'manual', s.shuffle);
        setS(prev => ({
          ...prev,
          currentId: next.currentId,
          queue: next.queue,
          anchorId: next.anchorId,
          shuffleOrder: prev.shuffle ? next.order : null,
          playing: next.currentId === null ? false : prev.playing,
        }));
      }
    } else if (s.restoring && s.currentId !== null) {
      update({ restoring: false });
    } else if (s.shuffle && s.shuffleOrder === null && s.currentId !== null) {
      update({ shuffleOrder: buildOrder(contextIds, true, s.currentId) });
    }
  }

  // ---- refs the player callbacks read (they outlive the render that created them) ----
  const latest = useRef({ s, order, validQueue, active, loaded });
  useEffect(() => {
    latest.current = { s, order, validQueue, active, loaded };
  });

  useWakeLock(s.playing && active);

  const replayCurrent = useCallback(() => {
    ytRef.current?.seekTo(0, true);
    ytRef.current?.playVideo();
    scRef.current?.seekTo(0);
    scRef.current?.play();
  }, []);

  /** Moves on (next button or a natural end); `reason` decides how repeat-one behaves. */
  const goNext = useCallback((reason: 'auto' | 'manual') => {
    const { s: cur, order: ord, validQueue: q } = latest.current;
    const result = advance({ order: ord, currentId: cur.currentId, queue: q, repeat: cur.repeat, anchorId: cur.anchorId }, reason, cur.shuffle);
    if (result.currentId === null) {
      setS(prev => ({ ...prev, playing: false, queue: result.queue }));
      return;
    }
    if (result.currentId === cur.currentId) replayCurrent();
    setS(prev => ({
      ...prev,
      currentId: result.currentId,
      queue: result.queue,
      anchorId: result.anchorId,
      shuffleOrder: prev.shuffle ? result.order : prev.shuffleOrder,
    }));
  }, [replayCurrent]);

  // ---- drive the right embed whenever the current track changes ----
  // Primitive deps: a refreshed library must not restart the song that is already playing.
  const source = current?.source;
  const videoId = current?.videoId;
  const url = current?.url;
  const trackId = current?._id;
  useEffect(() => {
    if (!trackId || !source) return;
    tokenRef.current += 1;
    const token = tokenRef.current;
    const stale = () => token !== tokenRef.current;
    const resumeFor = () => (resumeRef.current?.trackId === trackId ? resumeRef.current : null);

    if (source === 'youtube') {
      scRef.current = null;
      loadYouTubeApi().then(YT => {
        if (stale()) return;
        if (ytRef.current) { ytRef.current.loadVideoById(videoId!); return; }
        const host = ytHostRef.current;
        if (!host) return;
        const target = document.createElement('div');
        host.replaceChildren(target);
        const resume = resumeFor();
        ytRef.current = new YT.Player(target, {
          width: EMBED_SIZE,
          height: EMBED_SIZE,
          videoId: videoId!,
          // `start` cues the video at the saved second without playing it (seekTo would start playback)
          playerVars: { playsinline: 1, ...(resume ? { start: Math.floor(resume.sec) } : {}) },
          events: {
            onReady: () => {
              const player = ytRef.current;
              if (!player) return;
              player.setVolume(latest.current.s.volume);
              if (resumeFor()) resumeRef.current = null; // restored: wait for the user to press play
              else player.playVideo();
            },
            onStateChange: ({ data: state }) => {
              if (state === 1) update({ playing: true });
              else if (state === 2) update({ playing: false });
              else if (state === 0) { update({ playing: false }); goNext('auto'); }
            },
            onError: () => goNext('manual'), // not embeddable or removed: skip it
          },
        });
      }).catch(() => {});
    } else {
      ytRef.current?.destroy();
      ytRef.current = null;
      loadSoundCloudApi().then(SC => {
        if (stale()) return;
        if (scRef.current) { scRef.current.load(url!, { auto_play: true }); return; }
        const iframe = scIframeRef.current;
        if (!iframe) return;
        const widget = SC.Widget(iframe);
        scRef.current = widget;
        const { READY, PLAY, PAUSE, FINISH, ERROR } = SC.Widget.Events;
        widget.bind(READY, () => {
          widget.setVolume(latest.current.s.volume);
          const resume = resumeFor();
          if (resume) { resumeRef.current = null; widget.seekTo(Math.round(resume.sec * 1000)); } // restored: wait for play
          else widget.play();
        });
        widget.bind(PLAY, () => update({ playing: true }));
        widget.bind(PAUSE, () => update({ playing: false }));
        widget.bind(FINISH, () => goNext('auto'));
        widget.bind(ERROR, () => goNext('manual'));
      }).catch(() => {});
    }
  }, [trackId, source, videoId, url, goNext, update]);

  // nothing to play any more (stopped, signed out, deleted): tear the embed down
  useEffect(() => {
    if (s.currentId !== null) return;
    tokenRef.current += 1;
    ytRef.current?.destroy();
    ytRef.current = null;
    scRef.current = null;
  }, [s.currentId]);

  useEffect(() => () => {
    tokenRef.current += 1;
    ytRef.current?.destroy();
  }, []);

  // ---- remember where the user was ----
  const saveNow = useCallback(() => {
    const { s: cur, active: isActive } = latest.current;
    if (!isActive || cur.currentId === null || cur.restoring) return;
    const write = (rawSec: number) => saveSession({
      trackId: cur.currentId!,
      playlistId: cur.activePlaylistId,
      shuffle: cur.shuffle,
      repeat: cur.repeat,
      queue: cur.queue,
      volume: cur.volume,
      positionSec: Number.isFinite(rawSec) && rawSec >= 0 ? rawSec : 0,
    });
    const resume = resumeRef.current;
    if (resume && resume.trackId === cur.currentId) write(resume.sec); // restored but not started: keep the saved second
    else if (ytRef.current) write(ytRef.current.getCurrentTime());
    else if (scRef.current) scRef.current.getPosition(ms => write(ms / 1000));
    else write(0);
  }, []);

  useEffect(() => {
    saveNow();
  }, [saveNow, s.currentId, s.playing, s.queue, s.shuffle, s.repeat, s.volume, s.activePlaylistId]);

  useEffect(() => {
    if (!s.playing) return;
    const id = setInterval(saveNow, SAVE_EVERY_MS);
    return () => clearInterval(id);
  }, [s.playing, saveNow]);

  useEffect(() => {
    window.addEventListener('pagehide', saveNow);
    return () => window.removeEventListener('pagehide', saveNow);
  }, [saveNow]);

  // the saved session is cleared when playback is stopped or abandoned, never merely because nothing is loaded yet
  useEffect(() => {
    if (s.currentId === null && (hadCurrentRef.current || s.dropped)) clearSession();
    hadCurrentRef.current = s.currentId !== null;
  }, [s.currentId, s.dropped]);

  // ---- actions ----
  const playTrack = useCallback((id: string, playlistId?: string | null) => {
    if (latest.current.s.currentId === id) { replayCurrent(); }
    setS(prev => {
      const pid = playlistId === undefined ? prev.activePlaylistId : playlistId;
      return { ...prev, currentId: id, activePlaylistId: pid, shuffleOrder: null, anchorId: id, restoring: false, dropped: false };
    });
  }, [replayCurrent]);

  const playPlaylist = useCallback((playlistId: string | null) => {
    const { s: cur, loaded: isLoaded } = latest.current;
    if (!isLoaded) return;
    const ids = playlistId === null
      ? tracks.map(t => t._id)
      : (playlists.find(p => p._id === playlistId)?.trackIds ?? []).filter(id => trackById.has(id));
    if (ids.length === 0) return;
    const first = cur.shuffle ? ids[Math.floor(Math.random() * ids.length)] : ids[0];
    playTrack(first, playlistId);
  }, [tracks, playlists, trackById, playTrack]);

  const togglePlay = useCallback(() => {
    if (latest.current.s.playing) {
      ytRef.current?.pauseVideo();
      scRef.current?.pause();
    } else {
      ytRef.current?.playVideo();
      scRef.current?.play();
    }
  }, []);

  const previous = useCallback(() => {
    const { s: cur, order: ord } = latest.current;
    const id = previousId({ order: ord, currentId: cur.currentId, queue: [], repeat: cur.repeat, anchorId: cur.anchorId });
    if (id) setS(prev => ({ ...prev, currentId: id, anchorId: ord.includes(id) ? id : prev.anchorId }));
  }, []);

  const setShuffle = useCallback((on: boolean) => update({ shuffle: on, shuffleOrder: null }), [update]);
  const setRepeat = useCallback((mode: RepeatMode) => update({ repeat: mode }), [update]);
  const setVolume = useCallback((volume: number) => {
    const value = Math.min(100, Math.max(0, Math.round(volume)));
    update({ volume: value });
    ytRef.current?.setVolume(value);
    scRef.current?.setVolume(value);
  }, [update]);
  const enqueue = useCallback((id: string) => setS(prev => (
    prev.queue.length >= MAX_QUEUE ? prev : { ...prev, queue: [...prev.queue, id] }
  )), []);
  const dequeue = useCallback((index: number) => setS(prev => ({ ...prev, queue: prev.queue.filter((_, i) => i !== index) })), []);
  const clearQueue = useCallback(() => update({ queue: [] }), [update]);
  const stop = useCallback(() => setS(prev => ({ ...prev, ...IDLE })), []);

  // ---- what the UI may enable ----
  const anchor = s.currentId !== null && order.includes(s.currentId) ? s.currentId : s.anchorId;
  const hasNextInOrder = order[(anchor === null ? -1 : order.indexOf(anchor)) + 1] !== undefined;
  const canNext = current !== null && (validQueue.length > 0 || hasNextInOrder || (s.repeat === 'all' && order.length > 0));
  const canPrevious = current !== null
    && previousId({ order, currentId: s.currentId, queue: [], repeat: s.repeat, anchorId: s.anchorId }) !== null;

  const value: MusicContextValue = {
    current,
    playing: s.playing,
    ready: loaded,
    activePlaylistId: s.activePlaylistId,
    shuffle: s.shuffle,
    repeat: s.repeat,
    volume: s.volume,
    queue: validQueue.map(id => trackById.get(id)!),
    canPrevious,
    canNext,
    ytHostRef,
    scIframeRef,
    playTrack,
    playPlaylist,
    togglePlay,
    next: () => goNext('manual'),
    previous,
    setShuffle,
    setRepeat,
    setVolume,
    enqueue,
    dequeue,
    clearQueue,
    stop,
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
      <MiniPlayer idleShortcut={active && !onMusicPage} />
    </MusicContext.Provider>
  );
}
