import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MiniPlayer from './MiniPlayer';
import type { MusicContextValue } from './musicContext';
import type { Track } from '@/hooks/useMusicLibrary';

const hold = vi.hoisted(() => ({ music: null as unknown, playlists: [] as unknown[] }));
vi.mock('./musicContext', () => ({ useMusic: () => hold.music }));
vi.mock('@/hooks/useMusicLibrary', () => ({ useMusicLibrary: () => ({ playlists: hold.playlists, tracks: [], loaded: true }) }));

const yt = (n: number): Track => ({ _id: `t${n}`, source: 'youtube', url: `https://www.youtube.com/watch?v=video${n}`, videoId: `v${n}`, title: `Song ${n}`, author: `Artist ${n}`, thumbnail: '' });
const sc = (n: number): Track => ({ _id: `t${n}`, source: 'soundcloud', url: `https://soundcloud.com/a/song${n}`, videoId: '', title: `Cloud ${n}`, author: `Artist ${n}`, thumbnail: '' });

const makeMusic = (over: Partial<MusicContextValue> = {}) => ({
  current: yt(1) as Track | null,
  playing: false,
  ready: true,
  activePlaylistId: null as string | null,
  shuffle: false,
  repeat: 'off' as const,
  volume: 80,
  queue: [] as Track[],
  canPrevious: true,
  canNext: true,
  ytHostRef: { current: null },
  scIframeRef: { current: null },
  playTrack: vi.fn(),
  playPlaylist: vi.fn(),
  togglePlay: vi.fn(),
  next: vi.fn(),
  previous: vi.fn(),
  setShuffle: vi.fn(),
  setRepeat: vi.fn(),
  setVolume: vi.fn(),
  enqueue: vi.fn(),
  dequeue: vi.fn(),
  clearQueue: vi.fn(),
  stop: vi.fn(),
  ...over,
});
type Music = ReturnType<typeof makeMusic>;

const setup = (over: Partial<MusicContextValue> = {}) => {
  const music = makeMusic(over);
  hold.music = music;
  const user = userEvent.setup({ delay: null });
  const utils = render(<MiniPlayer />);
  const reload = (next: Partial<MusicContextValue>) => {
    hold.music = { ...music, ...next };
    utils.rerender(<MiniPlayer />);
  };
  return { music: music as Music, user, reload, ...utils };
};

beforeEach(() => {
  hold.playlists = [{ _id: 'p1', name: 'Gym', trackIds: ['t1'] }, { _id: 'p2', name: 'Chạy', trackIds: [] }];
});

describe('MiniPlayer', () => {
  test('renders nothing when no track is loaded', () => {
    const { container } = setup({ current: null });
    expect(container).toBeEmptyDOMElement();
  });

  test('shows the title, the source credit and the 200x200 embed', () => {
    setup();
    expect(screen.getByText('Song 1')).toBeInTheDocument();
    expect(screen.getByText('Nguồn: YouTube')).toBeInTheDocument();
    expect(screen.getByTestId('music-embed')).toHaveStyle({ width: '200px', height: '200px' });
    expect(screen.getByTestId('music-yt-host')).toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();
  });

  test('a SoundCloud track shows the widget iframe with the track url', () => {
    setup({ current: sc(3) });
    expect(screen.getByText('Nguồn: SoundCloud')).toBeInTheDocument();
    const iframe = document.querySelector('iframe[src*="w.soundcloud.com/player"]') as HTMLIFrameElement;
    expect(iframe.getAttribute('src')).toContain(encodeURIComponent('https://soundcloud.com/a/song3'));
    expect(screen.queryByTestId('music-yt-host')).not.toBeInTheDocument();
  });

  test('the iframe src is set once, so the next SoundCloud track is loaded through the widget instead', () => {
    const { reload } = setup({ current: sc(3) });
    const before = document.querySelector('iframe')!.getAttribute('src');
    reload({ current: sc(4) });
    expect(document.querySelector('iframe')!.getAttribute('src')).toBe(before);
  });

  test('transport buttons call the provider and the label flips with the state', async () => {
    const { music, user, reload } = setup();
    await user.click(screen.getByRole('button', { name: 'Phát' }));
    expect(music.togglePlay).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Bài tiếp' }));
    expect(music.next).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Bài trước' }));
    expect(music.previous).toHaveBeenCalledTimes(1);

    reload({ playing: true });
    expect(screen.getByRole('button', { name: 'Tạm dừng' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Phát' })).not.toBeInTheDocument();
  });

  test('previous and next are disabled when there is nowhere to go', () => {
    setup({ canPrevious: false, canNext: false });
    expect(screen.getByRole('button', { name: 'Bài trước' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bài tiếp' })).toBeDisabled();
  });

  test('the volume slider calls setVolume', () => {
    const { music } = setup();
    const slider = screen.getByRole('slider', { name: 'Âm lượng' });
    expect(slider).toHaveValue('80');
    fireEvent.change(slider, { target: { value: '30' } });
    expect(music.setVolume).toHaveBeenCalledWith(30);
  });

  test('choosing a playlist calls playPlaylist, and the select shows the active one', async () => {
    const { music, user } = setup({ activePlaylistId: 'p2' });
    const select = screen.getByRole('combobox', { name: 'Danh sách phát' });
    expect(select).toHaveValue('p2');
    expect(within(select).getAllByRole('option').map(o => o.textContent)).toEqual(['Tất cả bài', 'Gym', 'Chạy']);

    await user.selectOptions(select, 'p1');
    expect(music.playPlaylist).toHaveBeenCalledWith('p1');
    await user.selectOptions(select, '');
    expect(music.playPlaylist).toHaveBeenLastCalledWith(null);
  });

  test('shuffle toggles and shows its state', async () => {
    const { music, user, reload } = setup();
    const button = screen.getByRole('button', { name: 'Trộn bài' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.click(button);
    expect(music.setShuffle).toHaveBeenCalledWith(true);

    reload({ shuffle: true });
    expect(screen.getByRole('button', { name: 'Trộn bài' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Trộn bài' }));
    expect(music.setShuffle).toHaveBeenLastCalledWith(false);
  });

  test('repeat cycles off, all, one, off', async () => {
    const { music, user, reload } = setup();
    await user.click(screen.getByRole('button', { name: 'Lặp lại: tắt' }));
    expect(music.setRepeat).toHaveBeenLastCalledWith('all');

    reload({ repeat: 'all' });
    await user.click(screen.getByRole('button', { name: 'Lặp lại: tất cả' }));
    expect(music.setRepeat).toHaveBeenLastCalledWith('one');

    reload({ repeat: 'one' });
    await user.click(screen.getByRole('button', { name: 'Lặp lại: một bài' }));
    expect(music.setRepeat).toHaveBeenLastCalledWith('off');
  });

  test('the queue lists queued tracks, removes one and clears all', async () => {
    const { music, user } = setup({ queue: [yt(2), yt(4)] });
    expect(screen.getByRole('heading', { name: 'Phát tiếp theo' })).toBeInTheDocument();
    expect(screen.getByText('Song 2')).toBeInTheDocument();
    expect(screen.getByText('Song 4')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Bỏ khỏi hàng đợi' })[1]);
    expect(music.dequeue).toHaveBeenCalledWith(1);
    await user.click(screen.getByRole('button', { name: 'Xoá hàng đợi' }));
    expect(music.clearQueue).toHaveBeenCalled();
  });

  test('the queue section is hidden when it is empty', () => {
    setup({ queue: [] });
    expect(screen.queryByRole('heading', { name: 'Phát tiếp theo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xoá hàng đợi' })).not.toBeInTheDocument();
  });

  test('links to the library and stops from the close button', async () => {
    const { music, user } = setup();
    expect(screen.getByRole('link', { name: 'Mở thư viện' })).toHaveAttribute('href', '/music');
    await user.click(screen.getByRole('button', { name: 'Tắt nhạc' }));
    expect(music.stop).toHaveBeenCalled();
  });
});
