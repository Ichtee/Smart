import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { MusicProvider, useMusic, type MusicContextValue } from './MusicProvider';
import { useWakeLock } from '@/hooks/useWakeLock';
import { clearSession, loadSession, saveSession } from '@/utils/musicSession';

interface FakeYT {
  el: HTMLElement;
  opts: { width: number; height: number; videoId: string; playerVars?: Record<string, number>; events: { onReady?: () => void; onStateChange?: (e: { data: number }) => void; onError?: () => void } };
  loadVideoById: ReturnType<typeof vi.fn>;
  playVideo: ReturnType<typeof vi.fn>;
  pauseVideo: ReturnType<typeof vi.fn>;
  setVolume: ReturnType<typeof vi.fn>;
  getCurrentTime: ReturnType<typeof vi.fn>;
  seekTo: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}
interface FakeSC {
  handlers: Record<string, () => void>;
  bind: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  setVolume: ReturnType<typeof vi.fn>;
  getPosition: ReturnType<typeof vi.fn>;
  seekTo: ReturnType<typeof vi.fn>;
}

const embeds = vi.hoisted(() => ({ yt: [] as unknown[], sc: [] as unknown[], time: 12.5 }));
const players = () => embeds.yt as FakeYT[];
const widgets = () => embeds.sc as FakeSC[];

vi.mock('@/utils/embedPlayers', () => {
  class FakeYTPlayer {
    loadVideoById = vi.fn();
    playVideo = vi.fn();
    pauseVideo = vi.fn();
    setVolume = vi.fn();
    getCurrentTime = vi.fn(() => embeds.time);
    seekTo = vi.fn();
    destroy = vi.fn();
    constructor(public el: HTMLElement, public opts: unknown) { embeds.yt.push(this); }
  }
  const Widget = Object.assign(
    () => {
      const widget: Record<string, unknown> = { handlers: {} as Record<string, () => void> };
      widget.bind = vi.fn((event: string, fn: () => void) => { (widget.handlers as Record<string, () => void>)[event] = fn; });
      widget.load = vi.fn();
      widget.play = vi.fn();
      widget.pause = vi.fn();
      widget.setVolume = vi.fn();
      widget.getPosition = vi.fn((cb: (ms: number) => void) => cb(embeds.time * 1000));
      widget.seekTo = vi.fn();
      embeds.sc.push(widget);
      return widget;
    },
    { Events: { READY: 'ready', PLAY: 'play', PAUSE: 'pause', FINISH: 'finish', ERROR: 'error' } },
  );
  return {
    loadYouTubeApi: vi.fn(async () => ({ Player: FakeYTPlayer })),
    loadSoundCloudApi: vi.fn(async () => ({ Widget })),
  };
});

const nav = vi.hoisted(() => ({ pathname: '/workouts' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));
vi.mock('./MiniPlayer', () => ({ default: () => null })); // the Probe below mounts the embed hosts instead
vi.mock('@/hooks/useWakeLock', () => ({ useWakeLock: vi.fn() }));
vi.mock('@/utils/musicSession', () => ({ loadSession: vi.fn(() => null), saveSession: vi.fn(), clearSession: vi.fn() }));

interface LibTrack { _id: string; source: 'youtube' | 'soundcloud'; url: string; videoId: string; title: string; author: string; thumbnail: string }
interface LibPlaylist { _id: string; name: string; trackIds: string[] }
const lib = vi.hoisted(() => ({
  tracks: [] as unknown[],
  playlists: [] as unknown[],
  loaded: true,
  enabled: [] as boolean[],
}));
const NONE: never[] = [];
vi.mock('@/hooks/useMusicLibrary', () => ({
  useMusicLibrary: (enabled: boolean) => {
    lib.enabled.push(enabled);
    return enabled
      ? { tracks: lib.tracks, playlists: lib.playlists, loaded: lib.loaded }
      : { tracks: NONE, playlists: NONE, loaded: false };
  },
}));

const yt = (n: number): LibTrack => ({ _id: `t${n}`, source: 'youtube', url: `https://www.youtube.com/watch?v=video${n}`, videoId: `v${n}`, title: `Song ${n}`, author: 'A', thumbnail: '' });
const sc = (n: number): LibTrack => ({ _id: `t${n}`, source: 'soundcloud', url: `https://soundcloud.com/a/song${n}`, videoId: '', title: `Cloud ${n}`, author: 'A', thumbnail: '' });
const TRACKS = [yt(1), yt(2), sc(3), yt(4), yt(5)];
const PLAYLISTS: LibPlaylist[] = [
  { _id: 'p1', name: 'Gym', trackIds: ['t2', 't1'] },
  { _id: 'p2', name: 'Chạy', trackIds: ['t1', 't2', 't4'] },
];

const SESSION = { trackId: 't1', playlistId: 'p1', shuffle: false, repeat: 'off' as const, queue: [] as string[], volume: 65, positionSec: 42 };

function Probe({ onApi }: { onApi: (api: MusicContextValue) => void }) {
  const api = useMusic();
  const { current, ytHostRef, scIframeRef } = api;
  useEffect(() => { onApi(api); });
  if (!current) return null;
  return current.source === 'youtube'
    ? <div data-testid="yt-host" ref={ytHostRef} />
    : <iframe title="sc" data-testid="sc-frame" ref={scIframeRef} />;
}

const setup = () => {
  const latest: { current: MusicContextValue | null } = { current: null };
  const ui = () => <MusicProvider><Probe onApi={a => { latest.current = a; }} /></MusicProvider>;
  const utils = render(ui());
  const api = () => latest.current!;
  return { api, rerender: () => utils.rerender(ui()), unmount: utils.unmount };
};

const state = (player: FakeYT, data: number) => act(() => { player.opts.events.onStateChange?.({ data }); });
const ended = (player: FakeYT) => state(player, 0);
const scEvent = (widget: FakeSC, name: string) => act(() => { widget.handlers[name](); });

beforeEach(() => {
  embeds.yt.length = 0;
  embeds.sc.length = 0;
  embeds.time = 12.5;
  lib.tracks = TRACKS;
  lib.playlists = PLAYLISTS;
  lib.loaded = true;
  lib.enabled.length = 0;
  nav.pathname = '/workouts';
  localStorage.clear();
  localStorage.setItem('token', 'test-token');
  vi.mocked(useWakeLock).mockClear();
  vi.mocked(loadSession).mockReset().mockReturnValue(null);
  vi.mocked(saveSession).mockClear();
  vi.mocked(clearSession).mockClear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const startOn = async (api: () => MusicContextValue, trackId: string, playlistId: string | null) => {
  act(() => api().playTrack(trackId, playlistId));
  await waitFor(() => expect(players().length).toBeGreaterThan(0));
};

describe('MusicProvider: playing', () => {
  test('plays a track and sets the context to the chosen playlist', async () => {
    const { api } = setup();
    act(() => api().playTrack('t1', 'p1'));

    await waitFor(() => expect(players()).toHaveLength(1));
    expect(players()[0].opts).toMatchObject({ videoId: 'v1', width: 200, height: 200, playerVars: { playsinline: 1 } });
    expect(api().current?.title).toBe('Song 1');
    expect(api().activePlaylistId).toBe('p1');
    act(() => players()[0].opts.events.onReady?.());
    expect(players()[0].playVideo).toHaveBeenCalled();
  });

  test('plays the next track in the playlist order when a video ends', async () => {
    const { api } = setup();
    await startOn(api, 't2', 'p1');
    ended(players()[0]);
    await waitFor(() => expect(players()[0].loadVideoById).toHaveBeenCalledWith('v1'));
    expect(api().current?._id).toBe('t1');
  });

  test('a queued track plays before the playlist continues', async () => {
    const { api } = setup();
    await startOn(api, 't2', 'p1');
    act(() => api().enqueue('t4'));
    expect(api().queue.map(t => t._id)).toEqual(['t4']);

    ended(players()[0]);
    await waitFor(() => expect(players()[0].loadVideoById).toHaveBeenLastCalledWith('v4'));
    expect(api().queue).toEqual([]);

    ended(players()[0]);
    await waitFor(() => expect(players()[0].loadVideoById).toHaveBeenLastCalledWith('v1'));
  });

  test('dequeue and clearQueue remove queued tracks', async () => {
    const { api } = setup();
    await startOn(api, 't1', null);
    act(() => { api().enqueue('t2'); api().enqueue('t4'); api().enqueue('t5'); });
    act(() => api().dequeue(1));
    expect(api().queue.map(t => t._id)).toEqual(['t2', 't5']);
    act(() => api().clearQueue());
    expect(api().queue).toEqual([]);
  });

  test('shuffle plays every track once before repeating', async () => {
    let seed = 7;
    vi.spyOn(Math, 'random').mockImplementation(() => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; });
    const { api } = setup();
    act(() => api().setShuffle(true));
    await startOn(api, 't1', 'p2');

    ended(players()[0]);
    await waitFor(() => expect(players()[0].loadVideoById).toHaveBeenCalledTimes(1));
    ended(players()[0]);
    await waitFor(() => expect(players()[0].loadVideoById).toHaveBeenCalledTimes(2));
    const played = players()[0].loadVideoById.mock.calls.map(c => c[0]);
    expect(new Set(played).size).toBe(2);
    expect([...played, 'v1'].sort()).toEqual(['v1', 'v2', 'v4']);

    ended(players()[0]);
    expect(players()[0].loadVideoById).toHaveBeenCalledTimes(2);
    expect(api().playing).toBe(false);
  });

  test('repeat one replays the same track on auto-end but next moves on', async () => {
    const { api } = setup();
    await startOn(api, 't2', 'p1');
    act(() => api().setRepeat('one'));

    ended(players()[0]);
    expect(players()[0].loadVideoById).not.toHaveBeenCalled();
    expect(players()[0].seekTo).toHaveBeenCalledWith(0, true);
    expect(players()[0].playVideo).toHaveBeenCalled();

    act(() => api().next());
    await waitFor(() => expect(players()[0].loadVideoById).toHaveBeenCalledWith('v1'));
  });

  test('repeat all wraps to the first track', async () => {
    const { api } = setup();
    await startOn(api, 't1', 'p1');
    act(() => api().setRepeat('all'));
    ended(players()[0]);
    await waitFor(() => expect(players()[0].loadVideoById).toHaveBeenCalledWith('v2'));
  });

  test('stops at the end with repeat off and keeps showing the last track', async () => {
    const { api } = setup();
    await startOn(api, 't1', 'p1');
    state(players()[0], 1);
    expect(api().playing).toBe(true);

    ended(players()[0]);
    expect(players()[0].loadVideoById).not.toHaveBeenCalled();
    expect(api().playing).toBe(false);
    expect(api().current?._id).toBe('t1');
  });

  test('playPlaylist starts the first track', async () => {
    nav.pathname = '/music'; // the library is loaded on the library page (and while something plays)
    const { api } = setup();
    act(() => api().playPlaylist('p1'));
    await waitFor(() => expect(players()).toHaveLength(1));
    expect(players()[0].opts.videoId).toBe('v2');
    expect(api().activePlaylistId).toBe('p1');
  });

  test('playPlaylist(null) plays all tracks in added order', async () => {
    nav.pathname = '/music';
    const { api } = setup();
    act(() => api().playPlaylist(null));
    await waitFor(() => expect(players()[0].opts.videoId).toBe('v1'));
    expect(api().activePlaylistId).toBeNull();
  });

  test('playlist order changes are followed', async () => {
    const { api, rerender } = setup();
    await startOn(api, 't2', 'p1');

    lib.playlists = [{ _id: 'p1', name: 'Gym', trackIds: ['t2', 't4', 't1'] }, PLAYLISTS[1]];
    rerender();

    ended(players()[0]);
    await waitFor(() => expect(players()[0].loadVideoById).toHaveBeenCalledWith('v4'));
  });

  test('deleting the playing track moves on', async () => {
    const { api, rerender } = setup();
    await startOn(api, 't2', 'p1');

    lib.tracks = TRACKS.filter(t => t._id !== 't2');
    lib.playlists = [{ _id: 'p1', name: 'Gym', trackIds: ['t1'] }, { _id: 'p2', name: 'Chạy', trackIds: ['t1', 't4'] }];
    rerender();

    await waitFor(() => expect(players()[0].loadVideoById).toHaveBeenCalledWith('v1'));
    expect(api().current?._id).toBe('t1');
  });

  test('deleting the last playing track with nothing after it stops the player', async () => {
    const { api, rerender } = setup();
    await startOn(api, 't1', 'p1');

    lib.tracks = TRACKS.filter(t => t._id !== 't1');
    lib.playlists = [{ _id: 'p1', name: 'Gym', trackIds: ['t2'] }, PLAYLISTS[1]];
    rerender();

    await waitFor(() => expect(api().current).toBeNull());
    expect(players()[0].destroy).toHaveBeenCalled();
  });

  test('a queued track that was deleted is skipped', async () => {
    const { api, rerender } = setup();
    await startOn(api, 't2', 'p1');
    act(() => api().enqueue('t4'));

    lib.tracks = TRACKS.filter(t => t._id !== 't4');
    rerender();
    expect(api().queue).toEqual([]);

    ended(players()[0]);
    await waitFor(() => expect(players()[0].loadVideoById).toHaveBeenCalledWith('v1'));
  });

  test('skips a track that fails to play', async () => {
    const { api } = setup();
    await startOn(api, 't2', 'p1');
    act(() => players()[0].opts.events.onError?.());
    await waitFor(() => expect(players()[0].loadVideoById).toHaveBeenCalledWith('v1'));
  });

  test('previous goes back in the playlist', async () => {
    const { api } = setup();
    await startOn(api, 't1', 'p1');
    act(() => api().previous());
    await waitFor(() => expect(players()[0].loadVideoById).toHaveBeenCalledWith('v2'));
  });

  test('canPrevious and canNext follow the position, repeat mode and queue', async () => {
    const { api } = setup();
    await startOn(api, 't2', 'p1');
    expect([api().canPrevious, api().canNext]).toEqual([false, true]);

    act(() => api().next());
    await waitFor(() => expect(api().current?._id).toBe('t1'));
    expect([api().canPrevious, api().canNext]).toEqual([true, false]);

    act(() => api().enqueue('t4'));
    expect(api().canNext).toBe(true);
    act(() => api().clearQueue());

    act(() => api().setRepeat('all'));
    expect(api().canNext).toBe(true);
  });

  test('volume and play/pause drive the player', async () => {
    const { api } = setup();
    await startOn(api, 't1', null);
    act(() => api().setVolume(30));
    expect(players()[0].setVolume).toHaveBeenCalledWith(30);
    expect(api().volume).toBe(30);

    state(players()[0], 1);
    act(() => api().togglePlay());
    expect(players()[0].pauseVideo).toHaveBeenCalled();
    state(players()[0], 2);
    act(() => api().togglePlay());
    expect(players()[0].playVideo).toHaveBeenCalled();
  });

  test('plays a SoundCloud track and moves on when it finishes', async () => {
    const { api } = setup();
    lib.playlists = [{ _id: 'p3', name: 'Mix', trackIds: ['t3', 't4'] }];
    act(() => api().playTrack('t3', 'p3'));
    await waitFor(() => expect(widgets()).toHaveLength(1));
    scEvent(widgets()[0], 'ready');
    expect(widgets()[0].play).toHaveBeenCalled();

    scEvent(widgets()[0], 'finish');
    await waitFor(() => expect(players()).toHaveLength(1));
    expect(players()[0].opts.videoId).toBe('v4');
  });
});

describe('MusicProvider: where it is active', () => {
  test('does not load the library while idle, loads it on /music and once something plays', async () => {
    const { api, rerender } = setup();
    expect(lib.enabled.at(-1)).toBe(false);

    nav.pathname = '/music';
    rerender();
    expect(lib.enabled.at(-1)).toBe(true);

    nav.pathname = '/workouts';
    rerender();
    expect(lib.enabled.at(-1)).toBe(false);

    act(() => api().playTrack('t1', null));
    expect(lib.enabled.at(-1)).toBe(true);
  });

  test('resets and destroys when the user lands on a public page', async () => {
    const { api, rerender } = setup();
    await startOn(api, 't1', 'p1');

    localStorage.clear();
    nav.pathname = '/login';
    rerender();

    await waitFor(() => expect(api().current).toBeNull());
    expect(players()[0].destroy).toHaveBeenCalled();
    expect(api().playing).toBe(false);
    expect(api().queue).toEqual([]);
  });

  test('keeps playing while the user moves between app pages', async () => {
    const { api, rerender } = setup();
    await startOn(api, 't1', 'p1');
    nav.pathname = '/nutrition';
    rerender();
    expect(players()[0].destroy).not.toHaveBeenCalled();
    expect(api().current?._id).toBe('t1');
  });

  test('holds a wake lock only while playing', async () => {
    const { api } = setup();
    const last = () => vi.mocked(useWakeLock).mock.calls.at(-1)?.[0];
    expect(last()).toBe(false);

    await startOn(api, 't1', null);
    state(players()[0], 1);
    await waitFor(() => expect(last()).toBe(true));
    state(players()[0], 2);
    await waitFor(() => expect(last()).toBe(false));
  });

  test('stop destroys the player and clears the session', async () => {
    const { api } = setup();
    await startOn(api, 't1', 'p1');
    act(() => api().stop());

    expect(players()[0].destroy).toHaveBeenCalled();
    expect(api().current).toBeNull();
    await waitFor(() => expect(clearSession).toHaveBeenCalled());
  });

  test('useMusic outside the provider throws a clear error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe onApi={() => {}} />)).toThrow(/MusicProvider/);
  });
});

describe('MusicProvider: remembering where the user was', () => {
  test('saves the session every 5 seconds while playing and on pause', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { api } = setup();
    await startOn(api, 't1', 'p1');
    act(() => api().enqueue('t4'));
    state(players()[0], 1);
    vi.mocked(saveSession).mockClear();

    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(saveSession).toHaveBeenLastCalledWith({
      trackId: 't1', playlistId: 'p1', shuffle: false, repeat: 'off', queue: ['t4'], volume: 80, positionSec: 12.5,
    });

    embeds.time = 20;
    vi.mocked(saveSession).mockClear();
    state(players()[0], 2);
    await waitFor(() => expect(saveSession).toHaveBeenLastCalledWith(expect.objectContaining({ positionSec: 20 })));
  });

  test('saves on pagehide', async () => {
    const { api } = setup();
    await startOn(api, 't1', null);
    vi.mocked(saveSession).mockClear();
    embeds.time = 33;
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(saveSession).toHaveBeenLastCalledWith(expect.objectContaining({ trackId: 't1', playlistId: null, positionSec: 33 }));
  });

  test('restores paused, resumes from the saved position', async () => {
    vi.mocked(loadSession).mockReturnValue(SESSION);
    const { api } = setup();

    await waitFor(() => expect(players()).toHaveLength(1));
    expect(players()[0].opts.videoId).toBe('v1');
    expect(players()[0].opts.playerVars).toMatchObject({ playsinline: 1, start: 42 });
    expect(api().current?._id).toBe('t1');
    expect(api().activePlaylistId).toBe('p1');
    expect(api().volume).toBe(65);

    act(() => players()[0].opts.events.onReady?.());
    expect(players()[0].setVolume).toHaveBeenCalledWith(65);
    expect(players()[0].playVideo).not.toHaveBeenCalled();
    expect(api().playing).toBe(false);

    act(() => api().togglePlay());
    expect(players()[0].playVideo).toHaveBeenCalled();
  });

  test('restores shuffle, repeat and the queue', async () => {
    vi.mocked(loadSession).mockReturnValue({ ...SESSION, shuffle: true, repeat: 'all', queue: ['t4', 't5'] });
    const { api } = setup();
    await waitFor(() => expect(api().current?._id).toBe('t1'));
    expect(api().shuffle).toBe(true);
    expect(api().repeat).toBe('all');
    expect(api().queue.map(t => t._id)).toEqual(['t4', 't5']);
  });

  test('restores a SoundCloud track paused at the saved position', async () => {
    vi.mocked(loadSession).mockReturnValue({ ...SESSION, trackId: 't3', playlistId: null, positionSec: 30 });
    setup();
    await waitFor(() => expect(widgets()).toHaveLength(1));
    scEvent(widgets()[0], 'ready');
    expect(widgets()[0].seekTo).toHaveBeenCalledWith(30000);
    expect(widgets()[0].play).not.toHaveBeenCalled();
  });

  test('drops a saved session whose track was deleted', async () => {
    vi.mocked(loadSession).mockReturnValue({ ...SESSION, trackId: 'gone' });
    const { api } = setup();

    await waitFor(() => expect(clearSession).toHaveBeenCalled());
    expect(api().current).toBeNull();
    expect(players()).toHaveLength(0);
    expect(api().queue).toEqual([]);
  });

  test('ignores a saved session when the user is not signed in', async () => {
    localStorage.clear();
    vi.mocked(loadSession).mockReturnValue(SESSION);
    const { api } = setup();
    expect(api().current).toBeNull();
    expect(players()).toHaveLength(0);
  });

  test('a saved session on a public page does not start anything and is not wiped by merely loading the app', async () => {
    nav.pathname = '/login';
    vi.mocked(loadSession).mockReturnValue(SESSION);
    const { api } = setup();
    expect(api().current).toBeNull();
    expect(clearSession).not.toHaveBeenCalled();
    expect(screen.queryByTestId('yt-host')).not.toBeInTheDocument();
  });
});
