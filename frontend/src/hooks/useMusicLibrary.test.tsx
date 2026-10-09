import { beforeEach, describe, expect, test, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';
import { useMusicLibrary, type Playlist, type Track } from './useMusicLibrary';
import { apiFetch } from '@/utils/api';
import { fetcher } from '@/hooks/useApi';

vi.mock('@/hooks/useApi', () => ({ fetcher: vi.fn() }));
vi.mock('@/utils/api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/utils/api')>()), apiFetch: vi.fn() }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const track = (id: string): Track => ({
  _id: id, source: 'youtube', url: `https://www.youtube.com/watch?v=${id}`, videoId: id, title: `Song ${id}`, author: 'A', thumbnail: '',
});
const TRACKS = [track('a'), track('b')];
const PLAYLISTS: Playlist[] = [{ _id: 'p1', name: 'Gym', trackIds: ['a', 'b'] }];

const wrapper = ({ children }: { children: ReactNode }) => <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
const calls = (path: string) => vi.mocked(fetcher).mock.calls.filter(c => c[0] === path).length;

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  vi.mocked(fetcher).mockReset();
  vi.mocked(fetcher).mockImplementation(async (path: string) => (path === '/api/music/tracks' ? TRACKS : PLAYLISTS));
});

describe('useMusicLibrary', () => {
  test('does not fetch while disabled', async () => {
    const { result } = renderHook(() => useMusicLibrary(false), { wrapper });
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.loaded).toBe(false);
    expect(result.current.tracks).toEqual([]);
    expect(result.current.playlists).toEqual([]);
  });

  test('loads tracks and playlists when enabled', async () => {
    const { result } = renderHook(() => useMusicLibrary(true), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.tracks).toEqual(TRACKS);
    expect(result.current.playlists).toEqual(PLAYLISTS);
  });

  test('addTrack posts the link and revalidates the tracks', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json(track('c'), 201));
    const { result } = renderHook(() => useMusicLibrary(true), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    const before = calls('/api/music/tracks');

    await act(async () => { await result.current.addTrack('https://youtu.be/ccccccccccc'); });

    const [path, init, retries] = vi.mocked(apiFetch).mock.calls[0];
    expect(path).toBe('/api/music/tracks');
    expect(init!.method).toBe('POST');
    expect(JSON.parse(init!.body as string)).toEqual({ url: 'https://youtu.be/ccccccccccc' });
    expect(retries).toBe(0);
    await waitFor(() => expect(calls('/api/music/tracks')).toBeGreaterThan(before));
  });

  test('removeTrack deletes and revalidates both lists', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({ id: 'a' }));
    const { result } = renderHook(() => useMusicLibrary(true), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    const tracksBefore = calls('/api/music/tracks');
    const playlistsBefore = calls('/api/music/playlists');

    await act(async () => { await result.current.removeTrack('a'); });

    expect(vi.mocked(apiFetch).mock.calls[0]).toEqual(['/api/music/tracks/a', { method: 'DELETE' }, 0]);
    await waitFor(() => {
      expect(calls('/api/music/tracks')).toBeGreaterThan(tracksBefore);
      expect(calls('/api/music/playlists')).toBeGreaterThan(playlistsBefore);
    });
  });

  test('create, rename and delete playlist call the right endpoints', async () => {
    const { result } = renderHook(() => useMusicLibrary(true), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    vi.mocked(apiFetch).mockResolvedValueOnce(json({ _id: 'p2', name: 'Chạy', trackIds: [] }, 201));
    let created: Playlist | undefined;
    await act(async () => { created = await result.current.createPlaylist('Chạy'); });
    expect(created).toMatchObject({ _id: 'p2', name: 'Chạy' });
    expect(vi.mocked(apiFetch).mock.calls[0].slice(0, 2)).toEqual(['/api/music/playlists', expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Chạy' }) })]);

    vi.mocked(apiFetch).mockResolvedValueOnce(json({ _id: 'p1', name: 'Mới', trackIds: ['a', 'b'] }));
    await act(async () => { await result.current.renamePlaylist('p1', 'Mới'); });
    expect(vi.mocked(apiFetch).mock.calls[1].slice(0, 2)).toEqual(['/api/music/playlists/p1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Mới' }) })]);

    vi.mocked(apiFetch).mockResolvedValueOnce(json({ id: 'p1' }));
    await act(async () => { await result.current.deletePlaylist('p1'); });
    expect(vi.mocked(apiFetch).mock.calls[2]).toEqual(['/api/music/playlists/p1', { method: 'DELETE' }, 0]);
  });

  test('setPlaylistTracks updates optimistically and keeps the saved result', async () => {
    let finish: (r: Response) => void = () => {};
    vi.mocked(apiFetch).mockReturnValue(new Promise<Response>(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useMusicLibrary(true), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = result.current.setPlaylistTracks('p1', ['b', 'a']); });

    await waitFor(() => expect(result.current.playlists[0].trackIds).toEqual(['b', 'a']));
    expect(JSON.parse(vi.mocked(apiFetch).mock.calls[0][1]!.body as string)).toEqual({ trackIds: ['b', 'a'] });

    finish(json({ _id: 'p1', name: 'Gym', trackIds: ['b', 'a'] }));
    await act(async () => { await pending; });
    expect(result.current.playlists[0].trackIds).toEqual(['b', 'a']);
  });

  test('setPlaylistTracks rolls back when the save fails', async () => {
    let finish: (r: Response) => void = () => {};
    vi.mocked(apiFetch).mockReturnValue(new Promise<Response>(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useMusicLibrary(true), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = result.current.setPlaylistTracks('p1', ['b', 'a']); });
    await waitFor(() => expect(result.current.playlists[0].trackIds).toEqual(['b', 'a']));

    finish(json({ message: 'Danh sách bài không hợp lệ.' }, 400));
    await act(async () => { await expect(pending).rejects.toThrow('Danh sách bài không hợp lệ.'); });
    await waitFor(() => expect(result.current.playlists[0].trackIds).toEqual(['a', 'b']));
  });

  test('mutations surface the server message, or HTTP <status> without one', async () => {
    const { result } = renderHook(() => useMusicLibrary(true), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    vi.mocked(apiFetch).mockResolvedValueOnce(json({ message: 'Tối đa 30 playlist.' }, 400));
    await expect(result.current.createPlaylist('x')).rejects.toThrow('Tối đa 30 playlist.');

    vi.mocked(apiFetch).mockResolvedValueOnce(new Response('<html>', { status: 502 }));
    await expect(result.current.addTrack('https://youtu.be/ccccccccccc')).rejects.toThrow('HTTP 502');
  });
});
