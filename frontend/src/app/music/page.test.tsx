import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MusicPage from './page';
import { apiFetch } from '@/utils/api';
import type { Playlist, Track } from '@/hooks/useMusicLibrary';

vi.mock('@/components/Sidebar', () => ({ default: () => <aside /> }));
vi.mock('@/utils/api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/utils/api')>()), apiFetch: vi.fn() }));

const hold = vi.hoisted(() => ({ music: null as unknown, library: null as unknown }));
vi.mock('@/components/music/musicContext', () => ({ useMusic: () => hold.music }));
vi.mock('@/hooks/useMusicLibrary', () => ({ useMusicLibrary: () => hold.library }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const track = (n: number, source: 'youtube' | 'soundcloud' = 'youtube'): Track => ({
  _id: `t${n}`, source, url: `https://example.com/${n}`, videoId: `v${n}`, title: `Song ${n}`, author: `Artist ${n}`, thumbnail: '',
});
const TRACKS = [track(1), track(2), track(3)];
const PLAYLISTS: Playlist[] = [
  { _id: 'p1', name: 'Gym', trackIds: ['t3', 't1'] }, // deliberately not the order tracks were added in
  { _id: 'p2', name: 'Chạy', trackIds: [] },
];

const setup = (over: { tracks?: Track[]; playlists?: Playlist[]; current?: Track | null } = {}) => {
  const music = {
    current: over.current ?? null,
    playTrack: vi.fn(), playPlaylist: vi.fn(), enqueue: vi.fn(),
  };
  const library = {
    tracks: over.tracks ?? TRACKS,
    playlists: over.playlists ?? PLAYLISTS,
    loaded: true,
    addTrack: vi.fn(async () => TRACKS[0]),
    removeTrack: vi.fn(async () => {}),
    createPlaylist: vi.fn(async (name: string) => ({ _id: 'new', name, trackIds: [] })),
    renamePlaylist: vi.fn(async () => {}),
    deletePlaylist: vi.fn(async () => {}),
    setPlaylistTracks: vi.fn(async () => {}),
  };
  hold.music = music;
  hold.library = library;
  const user = userEvent.setup({ delay: null });
  render(<MusicPage />);
  const titles = () => screen.getAllByTestId('track-title').map(el => el.textContent);
  const openPlaylist = (name: string) => user.click(screen.getByRole('tab', { name }));
  return { music, library, user, titles, openPlaylist };
};

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  vi.stubGlobal('confirm', vi.fn(() => true));
});

describe('Music page: adding links', () => {
  test('previews and adds a pasted link', async () => {
    const { library, user } = setup();
    const previewed = { source: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoId: 'dQw4w9WgXcQ', title: 'Never Gonna', author: 'Rick', thumbnail: '' };
    vi.mocked(apiFetch).mockResolvedValue(json(previewed));

    await user.type(screen.getByRole('textbox', { name: 'Link YouTube hoặc SoundCloud' }), 'https://youtu.be/dQw4w9WgXcQ');
    await user.click(screen.getByRole('button', { name: 'Xem trước' }));
    expect(await screen.findByText('Never Gonna')).toBeInTheDocument();
    const [path, init, retries] = vi.mocked(apiFetch).mock.calls[0];
    expect(path).toBe('/api/music/preview');
    expect(JSON.parse(init!.body as string)).toEqual({ url: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(retries).toBe(0);

    await user.click(screen.getByRole('button', { name: 'Thêm vào thư viện' }));
    await waitFor(() => expect(library.addTrack).toHaveBeenCalledWith(previewed.url));
    await waitFor(() => expect(screen.queryByText('Never Gonna')).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: 'Link YouTube hoặc SoundCloud' })).toHaveValue('');
  });

  test('add button disabled while pending', async () => {
    const { library, user } = setup();
    let finish: () => void = () => {};
    library.addTrack.mockReturnValue(new Promise<Track>(resolve => { finish = () => resolve(TRACKS[0]); }));
    vi.mocked(apiFetch).mockResolvedValue(json({ source: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoId: 'x', title: 'Never Gonna', author: 'Rick', thumbnail: '' }));
    await user.type(screen.getByRole('textbox', { name: 'Link YouTube hoặc SoundCloud' }), 'https://youtu.be/dQw4w9WgXcQ');
    await user.click(screen.getByRole('button', { name: 'Xem trước' }));
    await screen.findByText('Never Gonna');

    await user.click(screen.getByRole('button', { name: 'Thêm vào thư viện' }));
    const pending = screen.getByRole('button', { name: /Thêm vào thư viện|Đang thêm/ });
    expect(pending).toBeDisabled();
    await user.click(pending);
    expect(library.addTrack).toHaveBeenCalledTimes(1);

    finish();
    await waitFor(() => expect(screen.queryByText('Never Gonna')).not.toBeInTheDocument());
  });

  test('shows the server message on failure', async () => {
    const { user } = setup();
    vi.mocked(apiFetch).mockResolvedValue(json({ message: 'Chỉ hỗ trợ link YouTube hoặc SoundCloud.' }, 400));
    await user.type(screen.getByRole('textbox', { name: 'Link YouTube hoặc SoundCloud' }), 'https://evil.com');
    await user.click(screen.getByRole('button', { name: 'Xem trước' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chỉ hỗ trợ link YouTube hoặc SoundCloud.');
  });

  test('shows the message when adding fails', async () => {
    const { library, user } = setup();
    library.addTrack.mockRejectedValue(new Error('Bài này đã có trong thư viện.'));
    vi.mocked(apiFetch).mockResolvedValue(json({ source: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoId: 'x', title: 'Never Gonna', author: 'Rick', thumbnail: '' }));
    await user.type(screen.getByRole('textbox', { name: 'Link YouTube hoặc SoundCloud' }), 'https://youtu.be/dQw4w9WgXcQ');
    await user.click(screen.getByRole('button', { name: 'Xem trước' }));
    await screen.findByText('Never Gonna');
    await user.click(screen.getByRole('button', { name: 'Thêm vào thư viện' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Bài này đã có trong thư viện.');
  });
});

describe('Music page: library and playing', () => {
  test('lists the library in the order tracks were added, and plays a row with the all-tracks context', async () => {
    const { music, user, titles } = setup();
    expect(screen.getByRole('heading', { name: 'Thư viện nhạc' })).toBeInTheDocument();
    expect(titles()).toEqual(['Song 1', 'Song 2', 'Song 3']);

    await user.click(screen.getByRole('button', { name: 'Phát Song 2' }));
    expect(music.playTrack).toHaveBeenCalledWith('t2', null);
  });

  test('plays a row of a playlist with that playlist as the context', async () => {
    const { music, user, openPlaylist } = setup();
    await openPlaylist('Gym');
    await user.click(screen.getByRole('button', { name: 'Phát Song 1' }));
    expect(music.playTrack).toHaveBeenCalledWith('t1', 'p1');
  });

  test('play next queues the track', async () => {
    const { music, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Phát tiếp theo: Song 3' }));
    expect(music.enqueue).toHaveBeenCalledWith('t3');
  });

  test('the playing track is highlighted', () => {
    setup({ current: TRACKS[1] });
    const rows = screen.getAllByRole('listitem');
    expect(rows[1]).toHaveAttribute('aria-current', 'true');
    expect(rows[0]).not.toHaveAttribute('aria-current');
    expect(screen.getByText(/Đang phát: Song 2/)).toBeInTheDocument();
  });

  test('play all and play playlist start the right context', async () => {
    const { music, user, openPlaylist } = setup();
    await user.click(screen.getByRole('button', { name: 'Phát tất cả' }));
    expect(music.playPlaylist).toHaveBeenLastCalledWith(null);

    await openPlaylist('Gym');
    await user.click(screen.getByRole('button', { name: 'Phát playlist' }));
    expect(music.playPlaylist).toHaveBeenLastCalledWith('p1');
  });
});

describe('Music page: playlists', () => {
  test('switching tabs shows the tracks of that playlist in its own order', async () => {
    const { titles, openPlaylist } = setup();
    expect(screen.getByRole('tab', { name: 'Tất cả bài' })).toHaveAttribute('aria-selected', 'true');
    await openPlaylist('Gym');
    expect(screen.getByRole('tab', { name: 'Gym' })).toHaveAttribute('aria-selected', 'true');
    expect(titles()).toEqual(['Song 3', 'Song 1']);
  });

  test('creates a playlist', async () => {
    const { library, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Tạo playlist' }));
    await user.type(screen.getByRole('textbox', { name: 'Tên playlist' }), '  Cardio  ');
    await user.click(screen.getByRole('button', { name: 'Tạo' }));
    await waitFor(() => expect(library.createPlaylist).toHaveBeenCalledWith('Cardio'));
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Tên playlist' })).not.toBeInTheDocument());
  });

  test('renames a playlist', async () => {
    const { library, user, openPlaylist } = setup();
    await openPlaylist('Gym');
    await user.click(screen.getByRole('button', { name: 'Đổi tên' }));
    const input = screen.getByRole('textbox', { name: 'Tên mới' });
    expect(input).toHaveValue('Gym');
    await user.clear(input);
    await user.type(input, 'Tạ');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(library.renamePlaylist).toHaveBeenCalledWith('p1', 'Tạ'));
  });

  test('deletes a playlist after asking, and goes back to all tracks', async () => {
    const { library, user, openPlaylist } = setup();
    await openPlaylist('Gym');
    await user.click(screen.getByRole('button', { name: 'Xoá playlist' }));
    expect(confirm).toHaveBeenCalled();
    await waitFor(() => expect(library.deletePlaylist).toHaveBeenCalledWith('p1'));
    expect(screen.getByRole('tab', { name: 'Tất cả bài' })).toHaveAttribute('aria-selected', 'true');
  });

  test('declining the confirmation deletes nothing', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    const { library, user, openPlaylist } = setup();
    await openPlaylist('Gym');
    await user.click(screen.getByRole('button', { name: 'Xoá playlist' }));
    await user.click(screen.getByRole('button', { name: 'Xóa khỏi thư viện: Song 3' }));
    expect(library.deletePlaylist).not.toHaveBeenCalled();
    expect(library.removeTrack).not.toHaveBeenCalled();
  });

  test('adds a track to a playlist, and a playlist that already has it is disabled', async () => {
    const { library, user } = setup();
    const select = screen.getByRole('combobox', { name: 'Thêm Song 1 vào playlist' });
    expect(within(select).getByRole('option', { name: 'Gym' })).toBeDisabled();
    expect(within(select).getByRole('option', { name: 'Chạy' })).toBeEnabled();

    await user.selectOptions(select, 'p2');
    expect(library.setPlaylistTracks).toHaveBeenCalledWith('p2', ['t1']);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Thêm Song 2 vào playlist' }), 'p1');
    expect(library.setPlaylistTracks).toHaveBeenLastCalledWith('p1', ['t3', 't1', 't2']);
  });

  test('removing from a playlist keeps the track in the library', async () => {
    const { library, user, openPlaylist } = setup();
    await openPlaylist('Gym');
    await user.click(screen.getByRole('button', { name: 'Gỡ khỏi playlist: Song 3' }));
    expect(library.setPlaylistTracks).toHaveBeenCalledWith('p1', ['t1']);
    expect(library.removeTrack).not.toHaveBeenCalled();
  });

  test('deleting from the library asks first', async () => {
    const { library, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Xóa khỏi thư viện: Song 2' }));
    expect(confirm).toHaveBeenCalled();
    await waitFor(() => expect(library.removeTrack).toHaveBeenCalledWith('t2'));
  });

  test('a failed action shows its message', async () => {
    const { library, user } = setup();
    library.removeTrack.mockRejectedValue(new Error('Không tìm thấy bài.'));
    await user.click(screen.getByRole('button', { name: 'Xóa khỏi thư viện: Song 2' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy bài.');
  });
});

describe('Music page: reordering a playlist', () => {
  test('Lên and Xuống reorder and save the new order; the ends are disabled', async () => {
    const { library, user, openPlaylist } = setup();
    await openPlaylist('Gym'); // Song 3, Song 1
    expect(screen.getByRole('button', { name: 'Lên: Song 3' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Xuống: Song 1' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Xuống: Song 3' }));
    expect(library.setPlaylistTracks).toHaveBeenLastCalledWith('p1', ['t1', 't3']);
    await user.click(screen.getByRole('button', { name: 'Lên: Song 1' }));
    expect(library.setPlaylistTracks).toHaveBeenLastCalledWith('p1', ['t1', 't3']);
  });

  test('dropping a dragged row reorders', async () => {
    const { library, openPlaylist } = setup();
    await openPlaylist('Gym');
    const rows = screen.getAllByRole('listitem');
    const handles = screen.getAllByLabelText('Kéo để sắp xếp');

    fireEvent.dragStart(handles[0]); // Song 3
    fireEvent.dragOver(rows[1]);
    fireEvent.drop(rows[1]); // onto Song 1
    expect(library.setPlaylistTracks).toHaveBeenCalledWith('p1', ['t1', 't3']);
  });

  test('dropping a row onto itself does nothing', async () => {
    const { library, openPlaylist } = setup();
    await openPlaylist('Gym');
    const rows = screen.getAllByRole('listitem');
    fireEvent.dragStart(screen.getAllByLabelText('Kéo để sắp xếp')[0]);
    fireEvent.drop(rows[0]);
    expect(library.setPlaylistTracks).not.toHaveBeenCalled();
  });

  test('the all-tracks tab has no reorder controls', () => {
    setup();
    expect(screen.queryByLabelText('Kéo để sắp xếp')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Lên:/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Xuống:/ })).not.toBeInTheDocument();
  });
});

describe('Music page: empty states', () => {
  test('an empty library invites adding a link', () => {
    setup({ tracks: [], playlists: [] });
    expect(screen.getByText('Chưa có bài nào')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  test('an empty playlist says how to fill it', async () => {
    const { openPlaylist } = setup();
    await openPlaylist('Chạy');
    expect(screen.getByText('Playlist này chưa có bài')).toBeInTheDocument();
  });
});
