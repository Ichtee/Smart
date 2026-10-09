import { beforeEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import MusicPlayer from './MusicPlayer';
import { apiFetch } from '@/utils/api';
import { fetcher } from '@/hooks/useApi';
import { useWakeLock } from '@/hooks/useWakeLock';

interface FakeYT {
  el: HTMLElement;
  opts: { width: number; height: number; videoId: string; playerVars?: Record<string, number>; events: { onReady?: () => void; onStateChange?: (e: { data: number }) => void; onError?: () => void } };
  loadVideoById: ReturnType<typeof vi.fn>;
  playVideo: ReturnType<typeof vi.fn>;
  pauseVideo: ReturnType<typeof vi.fn>;
  setVolume: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}
interface FakeSC {
  iframe: HTMLIFrameElement;
  handlers: Record<string, () => void>;
  bind: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  setVolume: ReturnType<typeof vi.fn>;
}

const embeds = vi.hoisted(() => ({ yt: [] as unknown[], sc: [] as unknown[] }));
const ytPlayers = () => embeds.yt as FakeYT[];
const scWidgets = () => embeds.sc as FakeSC[];

vi.mock('@/utils/embedPlayers', () => {
  class FakeYTPlayer {
    loadVideoById = vi.fn();
    playVideo = vi.fn();
    pauseVideo = vi.fn();
    setVolume = vi.fn();
    destroy = vi.fn();
    constructor(public el: HTMLElement, public opts: unknown) { embeds.yt.push(this); }
  }
  const Widget = Object.assign(
    (iframe: HTMLIFrameElement) => {
      const widget: Record<string, unknown> = { iframe, handlers: {} as Record<string, () => void> };
      widget.bind = vi.fn((event: string, fn: () => void) => { (widget.handlers as Record<string, () => void>)[event] = fn; });
      widget.load = vi.fn();
      widget.play = vi.fn();
      widget.pause = vi.fn();
      widget.setVolume = vi.fn();
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
vi.mock('@/hooks/useWakeLock', () => ({ useWakeLock: vi.fn() }));
vi.mock('@/hooks/useApi', () => ({ fetcher: vi.fn() }));
vi.mock('@/utils/api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/utils/api')>()), apiFetch: vi.fn() }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const track = (n: number, source: 'youtube' | 'soundcloud') => ({
  _id: `t${n}`,
  source,
  url: source === 'youtube' ? `https://www.youtube.com/watch?v=video${n}xxxxx` : `https://soundcloud.com/artist/song${n}`,
  videoId: source === 'youtube' ? `v${n}` : '',
  title: `Song ${n}`,
  author: `Artist ${n}`,
  thumbnail: `https://img/${n}.jpg`,
  createdAt: '2026-10-09T00:00:00.000Z',
});
const LIBRARY = [track(1, 'youtube'), track(2, 'youtube'), track(3, 'soundcloud'), track(4, 'soundcloud')];

const setup = async (library = LIBRARY) => {
  vi.mocked(fetcher).mockResolvedValue(library);
  const user = userEvent.setup({ delay: null });
  render(<SWRConfig value={{ provider: () => new Map() }}><MusicPlayer /></SWRConfig>);
  const open = async () => {
    await user.click(screen.getByRole('button', { name: 'Mở trình nghe nhạc' }));
    if (library.length) await screen.findByRole('button', { name: `Phát ${library[0].title}` });
  };
  const play = (title: string) => user.click(screen.getByRole('button', { name: `Phát ${title}` }));
  const lastWakeLock = () => vi.mocked(useWakeLock).mock.calls.at(-1)?.[0];
  return { user, open, play, lastWakeLock };
};

const scEvent = (widget: FakeSC, name: string) => act(() => { widget.handlers[name](); });
const ytState = (player: FakeYT, data: number) => act(() => { player.opts.events.onStateChange?.({ data }); });

beforeEach(() => {
  embeds.yt.length = 0;
  embeds.sc.length = 0;
  vi.mocked(apiFetch).mockReset();
  vi.mocked(fetcher).mockReset();
  vi.mocked(useWakeLock).mockClear();
  vi.stubGlobal('confirm', vi.fn(() => true));
});

describe('MusicPlayer: opening and adding links', () => {
  test('shows only the music button until opened', async () => {
    await setup();
    expect(screen.getByRole('button', { name: 'Mở trình nghe nhạc' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Link YouTube/ })).not.toBeInTheDocument();
  });

  test('previews a pasted link', async () => {
    const { user, open } = await setup();
    vi.mocked(apiFetch).mockResolvedValue(json({ source: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoId: 'dQw4w9WgXcQ', title: 'Never Gonna', author: 'Rick', thumbnail: 'https://img/r.jpg' }));
    await open();

    await user.type(screen.getByRole('textbox', { name: 'Link YouTube hoặc SoundCloud' }), 'https://youtu.be/dQw4w9WgXcQ');
    await user.click(screen.getByRole('button', { name: 'Xem trước' }));

    expect(await screen.findByText('Never Gonna')).toBeInTheDocument();
    expect(screen.getByText('Rick')).toBeInTheDocument();
    const [path, init, retries] = vi.mocked(apiFetch).mock.calls[0];
    expect(path).toBe('/api/music/preview');
    expect(init!.method).toBe('POST');
    expect(JSON.parse(init!.body as string)).toEqual({ url: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(retries).toBe(0);
  });

  test('adds the previewed track to the library and refreshes the list', async () => {
    const { user, open } = await setup();
    const previewed = { source: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoId: 'dQw4w9WgXcQ', title: 'Never Gonna', author: 'Rick', thumbnail: '' };
    vi.mocked(apiFetch).mockResolvedValueOnce(json(previewed)).mockResolvedValueOnce(json({ _id: 'new', ...previewed }, 201));
    await open();
    await user.type(screen.getByRole('textbox', { name: 'Link YouTube hoặc SoundCloud' }), previewed.url);
    await user.click(screen.getByRole('button', { name: 'Xem trước' }));
    await screen.findByText('Never Gonna');
    const callsBefore = vi.mocked(fetcher).mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'Thêm vào thư viện' }));

    await waitFor(() => expect(vi.mocked(fetcher).mock.calls.length).toBeGreaterThan(callsBefore));
    const [path, init, retries] = vi.mocked(apiFetch).mock.calls[1];
    expect(path).toBe('/api/music/tracks');
    expect(init!.method).toBe('POST');
    expect(JSON.parse(init!.body as string)).toEqual({ url: previewed.url });
    expect(retries).toBe(0);
    await waitFor(() => expect(screen.queryByText('Never Gonna')).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: 'Link YouTube hoặc SoundCloud' })).toHaveValue('');
  });

  test('add button disabled while pending', async () => {
    const { user, open } = await setup();
    let finish: (r: Response) => void = () => {};
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(json({ source: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoId: 'dQw4w9WgXcQ', title: 'Never Gonna', author: 'Rick', thumbnail: '' }))
      .mockReturnValueOnce(new Promise<Response>(resolve => { finish = resolve; }));
    await open();
    await user.type(screen.getByRole('textbox', { name: 'Link YouTube hoặc SoundCloud' }), 'https://youtu.be/dQw4w9WgXcQ');
    await user.click(screen.getByRole('button', { name: 'Xem trước' }));
    await screen.findByText('Never Gonna');

    await user.click(screen.getByRole('button', { name: 'Thêm vào thư viện' }));
    const addButton = screen.getByRole('button', { name: /Thêm vào thư viện|Đang thêm/ });
    expect(addButton).toBeDisabled();
    await user.click(addButton);
    expect(vi.mocked(apiFetch).mock.calls.filter(c => c[0] === '/api/music/tracks')).toHaveLength(1);

    finish(json({ _id: 'x' }, 201));
    await waitFor(() => expect(screen.queryByText('Never Gonna')).not.toBeInTheDocument());
  });

  test('preview button disabled while pending', async () => {
    const { user, open } = await setup();
    vi.mocked(apiFetch).mockReturnValue(new Promise<Response>(() => {}));
    await open();
    await user.type(screen.getByRole('textbox', { name: 'Link YouTube hoặc SoundCloud' }), 'https://youtu.be/dQw4w9WgXcQ');
    await user.click(screen.getByRole('button', { name: 'Xem trước' }));
    expect(screen.getByRole('button', { name: /Xem trước|Đang kiểm tra/ })).toBeDisabled();
  });

  test('shows the server message on failure', async () => {
    const { user, open } = await setup();
    vi.mocked(apiFetch).mockResolvedValue(json({ message: 'Chỉ hỗ trợ link YouTube hoặc SoundCloud.' }, 400));
    await open();
    await user.type(screen.getByRole('textbox', { name: 'Link YouTube hoặc SoundCloud' }), 'https://evil.com');
    await user.click(screen.getByRole('button', { name: 'Xem trước' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chỉ hỗ trợ link YouTube hoặc SoundCloud.');
  });
});

describe('MusicPlayer: library', () => {
  test('lists the library and deletes a track after confirming', async () => {
    const { user, open } = await setup();
    vi.mocked(apiFetch).mockResolvedValue(json({ id: 't1' }));
    await open();
    for (const t of LIBRARY) expect(screen.getByRole('button', { name: `Phát ${t.title}` })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Xóa Song 1' }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(vi.mocked(apiFetch).mock.calls[0]).toEqual(['/api/music/tracks/t1', { method: 'DELETE' }, 0]);
  });

  test('declining the confirmation deletes nothing', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    const { user, open } = await setup();
    await open();
    await user.click(screen.getByRole('button', { name: 'Xóa Song 1' }));
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test('says so when the library is empty', async () => {
    const { open } = await setup([]);
    await open();
    expect(await screen.findByText(/Chưa có bài nào/)).toBeInTheDocument();
  });

  test('deleting the track that is playing stops the player', async () => {
    const { user, open, play } = await setup();
    vi.mocked(apiFetch).mockResolvedValue(json({ id: 't1' }));
    await open();
    await play('Song 1');
    await waitFor(() => expect(ytPlayers()).toHaveLength(1));

    await user.click(screen.getByRole('button', { name: 'Xóa Song 1' }));

    await waitFor(() => expect(ytPlayers()[0].destroy).toHaveBeenCalled());
  });
});

describe('MusicPlayer: playback', () => {
  test('plays a clicked YouTube track in a 200x200 player', async () => {
    const { open, play } = await setup();
    await open();
    await play('Song 1');

    await waitFor(() => expect(ytPlayers()).toHaveLength(1));
    const { opts } = ytPlayers()[0];
    expect(opts).toMatchObject({ videoId: 'v1', width: 200, height: 200, playerVars: { playsinline: 1 } });
    act(() => opts.events.onReady?.());
    expect(ytPlayers()[0].playVideo).toHaveBeenCalled();
    expect(screen.getByText('Nguồn: YouTube')).toBeInTheDocument();
  });

  test('a second YouTube track reuses the player', async () => {
    const { open, play } = await setup();
    await open();
    await play('Song 1');
    await waitFor(() => expect(ytPlayers()).toHaveLength(1));
    await play('Song 2');
    await waitFor(() => expect(ytPlayers()[0].loadVideoById).toHaveBeenCalledWith('v2'));
    expect(ytPlayers()).toHaveLength(1);
  });

  test('plays a SoundCloud track in the widget', async () => {
    const { open, play } = await setup();
    await open();
    await play('Song 3');

    await waitFor(() => expect(scWidgets()).toHaveLength(1));
    const iframe = document.querySelector('iframe[src*="w.soundcloud.com/player"]') as HTMLIFrameElement;
    expect(iframe.getAttribute('src')).toContain(encodeURIComponent('https://soundcloud.com/artist/song3'));
    scEvent(scWidgets()[0], 'ready');
    expect(scWidgets()[0].play).toHaveBeenCalled();
    expect(screen.getByText('Nguồn: SoundCloud')).toBeInTheDocument();
  });

  test('switching from YouTube to SoundCloud swaps the embed', async () => {
    const { user, open, play } = await setup();
    await open();
    await play('Song 2');
    await waitFor(() => expect(ytPlayers()).toHaveLength(1));

    await user.click(screen.getByRole('button', { name: 'Bài tiếp' }));

    await waitFor(() => expect(ytPlayers()[0].destroy).toHaveBeenCalled());
    await waitFor(() => expect(scWidgets()).toHaveLength(1));
    expect(document.querySelector('iframe[src*="w.soundcloud.com/player"]')).toBeInTheDocument();
  });

  test('a second SoundCloud track is loaded into the same widget', async () => {
    const { open, play } = await setup();
    await open();
    await play('Song 3');
    await waitFor(() => expect(scWidgets()).toHaveLength(1));
    await play('Song 4');
    await waitFor(() => expect(scWidgets()[0].load).toHaveBeenCalledWith('https://soundcloud.com/artist/song4', expect.objectContaining({ auto_play: true })));
    expect(scWidgets()).toHaveLength(1);
  });

  test('plays the next track when a YouTube video ends, and stops after the last', async () => {
    const { open, play } = await setup([track(1, 'youtube'), track(2, 'youtube')]);
    await open();
    await play('Song 1');
    await waitFor(() => expect(ytPlayers()).toHaveLength(1));

    ytState(ytPlayers()[0], 0);
    await waitFor(() => expect(ytPlayers()[0].loadVideoById).toHaveBeenCalledWith('v2'));

    ytState(ytPlayers()[0], 0);
    expect(ytPlayers()[0].loadVideoById).toHaveBeenCalledTimes(1);
  });

  test('plays the next track when a SoundCloud track finishes', async () => {
    const { open, play } = await setup([track(3, 'soundcloud'), track(4, 'soundcloud')]);
    await open();
    await play('Song 3');
    await waitFor(() => expect(scWidgets()).toHaveLength(1));

    scEvent(scWidgets()[0], 'finish');

    await waitFor(() => expect(scWidgets()[0].load).toHaveBeenCalledWith('https://soundcloud.com/artist/song4', expect.anything()));
  });

  test('skips a track that fails to play (YouTube)', async () => {
    const { open, play } = await setup([track(1, 'youtube'), track(2, 'youtube')]);
    await open();
    await play('Song 1');
    await waitFor(() => expect(ytPlayers()).toHaveLength(1));

    act(() => ytPlayers()[0].opts.events.onError?.());

    await waitFor(() => expect(ytPlayers()[0].loadVideoById).toHaveBeenCalledWith('v2'));
  });

  test('skips a track that fails to play (SoundCloud)', async () => {
    const { open, play } = await setup([track(3, 'soundcloud'), track(4, 'soundcloud')]);
    await open();
    await play('Song 3');
    await waitFor(() => expect(scWidgets()).toHaveLength(1));

    scEvent(scWidgets()[0], 'error');

    await waitFor(() => expect(scWidgets()[0].load).toHaveBeenCalledWith('https://soundcloud.com/artist/song4', expect.anything()));
  });

  test('play/pause, previous/next and volume drive the active player', async () => {
    const { user, open, play } = await setup([track(1, 'youtube'), track(2, 'youtube')]);
    await open();
    await play('Song 2');
    await waitFor(() => expect(ytPlayers()).toHaveLength(1));
    const player = ytPlayers()[0];

    ytState(player, 1);
    await user.click(screen.getByRole('button', { name: 'Tạm dừng' }));
    expect(player.pauseVideo).toHaveBeenCalled();
    ytState(player, 2);
    await user.click(screen.getByRole('button', { name: 'Phát' }));
    expect(player.playVideo).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Bài trước' }));
    await waitFor(() => expect(player.loadVideoById).toHaveBeenCalledWith('v1'));
    expect(screen.getByRole('button', { name: 'Bài trước' })).toBeDisabled();

    fireEvent.change(screen.getByRole('slider', { name: 'Âm lượng' }), { target: { value: '30' } });
    expect(player.setVolume).toHaveBeenCalledWith(30);
  });

  test('holds a wake lock only while playing', async () => {
    const { open, play, lastWakeLock } = await setup();
    await open();
    expect(lastWakeLock()).toBe(false);

    await play('Song 1');
    await waitFor(() => expect(ytPlayers()).toHaveLength(1));
    ytState(ytPlayers()[0], 1);
    await waitFor(() => expect(lastWakeLock()).toBe(true));

    ytState(ytPlayers()[0], 2);
    await waitFor(() => expect(lastWakeLock()).toBe(false));
  });

  test('minimise keeps the player visible; close destroys it', async () => {
    const { user, open, play } = await setup();
    await open();
    await play('Song 1');
    await waitFor(() => expect(ytPlayers()).toHaveLength(1));

    await user.click(screen.getByRole('button', { name: 'Thu nhỏ' }));
    expect(screen.queryByRole('textbox', { name: 'Link YouTube hoặc SoundCloud' })).not.toBeInTheDocument();
    expect(screen.getByTestId('music-embed')).toBeInTheDocument();
    expect(ytPlayers()[0].destroy).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Tắt nhạc' }));
    expect(ytPlayers()[0].destroy).toHaveBeenCalled();
    expect(screen.queryByTestId('music-embed')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở trình nghe nhạc' })).toBeInTheDocument();
  });
});
