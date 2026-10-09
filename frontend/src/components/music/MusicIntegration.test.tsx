import { beforeEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MusicProvider, useMusic } from './MusicProvider';

// The real provider and the real mini player together; only the outside world (YouTube/SoundCloud
// scripts, the network library, storage helpers) is replaced.

interface FakeYT {
  el: HTMLElement;
  opts: { events: { onReady?: () => void; onStateChange?: (e: { data: number }) => void } };
  loadVideoById: ReturnType<typeof vi.fn>;
  playVideo: ReturnType<typeof vi.fn>;
}
const embeds = vi.hoisted(() => ({ yt: [] as unknown[], sc: [] as unknown[], srcAtCreation: [] as (string | null)[] }));

vi.mock('@/utils/embedPlayers', () => {
  class FakeYTPlayer {
    loadVideoById = vi.fn();
    playVideo = vi.fn();
    pauseVideo = vi.fn();
    setVolume = vi.fn();
    getCurrentTime = vi.fn(() => 0);
    seekTo = vi.fn();
    destroy = vi.fn();
    constructor(public el: HTMLElement, public opts: unknown) { embeds.yt.push(this); }
  }
  const Widget = Object.assign(
    (iframe: HTMLIFrameElement) => {
      embeds.srcAtCreation.push(iframe.getAttribute('src'));
      const widget = { bind: vi.fn(), load: vi.fn(), play: vi.fn(), pause: vi.fn(), setVolume: vi.fn(), getPosition: vi.fn(), seekTo: vi.fn() };
      embeds.sc.push(widget);
      return widget;
    },
    { Events: { READY: 'ready', PLAY: 'play', PAUSE: 'pause', FINISH: 'finish', ERROR: 'error' } },
  );
  return { loadYouTubeApi: vi.fn(async () => ({ Player: FakeYTPlayer })), loadSoundCloudApi: vi.fn(async () => ({ Widget })) };
});
vi.mock('next/navigation', () => ({ usePathname: () => '/music' }));
vi.mock('@/hooks/useWakeLock', () => ({ useWakeLock: vi.fn() }));
vi.mock('@/utils/musicSession', () => ({ loadSession: vi.fn(() => null), saveSession: vi.fn(), clearSession: vi.fn() }));

const track = (n: number, source: 'youtube' | 'soundcloud') => ({
  _id: `t${n}`, source, url: source === 'youtube' ? `https://www.youtube.com/watch?v=video${n}` : `https://soundcloud.com/a/song${n}`,
  videoId: source === 'youtube' ? `v${n}` : '', title: `Song ${n}`, author: 'A', thumbnail: '',
});
const TRACKS = [track(1, 'youtube'), track(2, 'youtube'), track(3, 'soundcloud')];
const PLAYLISTS = [{ _id: 'p1', name: 'Gym', trackIds: ['t1', 't2', 't3'] }];
vi.mock('@/hooks/useMusicLibrary', () => ({
  useMusicLibrary: () => ({ tracks: TRACKS, playlists: PLAYLISTS, loaded: true }),
}));

// stands in for the library page: buttons that drive the shared player
function Buttons() {
  const music = useMusic();
  return (
    <>
      <button type="button" onClick={() => music.playTrack('t1', 'p1')}>start youtube</button>
      <button type="button" onClick={() => music.playTrack('t3', 'p1')}>start soundcloud</button>
      <button type="button" onClick={() => music.enqueue('t2')}>queue second</button>
    </>
  );
}

const setup = () => {
  const user = userEvent.setup({ delay: null });
  render(<MusicProvider><Buttons /></MusicProvider>);
  return user;
};

beforeEach(() => {
  embeds.yt.length = 0;
  embeds.sc.length = 0;
  embeds.srcAtCreation.length = 0;
  localStorage.clear();
  localStorage.setItem('token', 'test-token');
});

describe('MusicProvider + MiniPlayer together', () => {
  test('shows nothing until something plays', () => {
    setup();
    expect(screen.queryByRole('region', { name: 'Đang phát' })).not.toBeInTheDocument();
  });

  test('the mini player hosts the YouTube embed the provider creates, and the controls drive it', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'start youtube' }));

    await waitFor(() => expect(embeds.yt).toHaveLength(1));
    const player = embeds.yt[0] as FakeYT;
    expect(screen.getByTestId('music-yt-host')).toContainElement(player.el);
    expect(screen.getByTestId('music-embed')).toHaveStyle({ width: '200px', height: '200px' });
    expect(screen.getByText('Song 1')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Danh sách phát' })).toHaveValue('p1');

    act(() => player.opts.events.onStateChange?.({ data: 1 }));
    expect(await screen.findByRole('button', { name: 'Tạm dừng' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Bài tiếp' }));
    await waitFor(() => expect(player.loadVideoById).toHaveBeenCalledWith('v2'));
  });

  test('the queue shows in the mini player and plays before the playlist continues', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'start youtube' }));
    await waitFor(() => expect(embeds.yt).toHaveLength(1));

    await user.click(screen.getByRole('button', { name: 'queue second' }));
    expect(await screen.findByRole('heading', { name: 'Phát tiếp theo' })).toBeInTheDocument();

    act(() => (embeds.yt[0] as FakeYT).opts.events.onStateChange?.({ data: 0 }));
    await waitFor(() => expect((embeds.yt[0] as FakeYT).loadVideoById).toHaveBeenCalledWith('v2'));
    expect(screen.queryByRole('heading', { name: 'Phát tiếp theo' })).not.toBeInTheDocument();
  });

  test('a SoundCloud track gets its iframe src before the widget is created', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'start soundcloud' }));

    await waitFor(() => expect(embeds.sc).toHaveLength(1));
    expect(embeds.srcAtCreation[0]).toContain(encodeURIComponent('https://soundcloud.com/a/song3'));
    expect(screen.getByText('Nguồn: SoundCloud')).toBeInTheDocument();
  });

  test('stopping removes the mini player and destroys the embed', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'start youtube' }));
    await waitFor(() => expect(embeds.yt).toHaveLength(1));

    await user.click(screen.getByRole('button', { name: 'Tắt nhạc' }));
    expect(screen.queryByRole('region', { name: 'Đang phát' })).not.toBeInTheDocument();
    await waitFor(() => expect((embeds.yt[0] as { destroy: ReturnType<typeof vi.fn> }).destroy).toHaveBeenCalled());
  });
});
