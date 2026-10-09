'use client';
import useSWR from 'swr';
import { apiFetch } from '@/utils/api';
import { fetcher } from '@/hooks/useApi';

export interface Track {
  _id: string;
  source: 'youtube' | 'soundcloud';
  url: string;
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
}

export interface Playlist {
  _id: string;
  name: string;
  trackIds: string[];
}

const TRACKS = '/api/music/tracks';
const PLAYLISTS = '/api/music/playlists';
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const NO_TRACKS: Track[] = [];
const NO_PLAYLISTS: Playlist[] = [];

// Mutations are never retried: a retried POST could add the same thing twice.
async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const init = body === undefined ? { method } : { method, headers: JSON_HEADERS, body: JSON.stringify(body) };
  const res = await apiFetch(path, init, 0);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
  return data as T;
}

/**
 * The user's music tracks and playlists plus the actions on them. Nothing is fetched while `enabled` is
 * false (the player is mounted on every page, but only needs the library once music is involved).
 */
export function useMusicLibrary(enabled: boolean) {
  const options = { revalidateOnFocus: false };
  const tracksSwr = useSWR<Track[]>(enabled ? TRACKS : null, fetcher, options);
  const playlistsSwr = useSWR<Playlist[]>(enabled ? PLAYLISTS : null, fetcher, options);
  const { mutate: mutateTracks } = tracksSwr;
  const { mutate: mutatePlaylists } = playlistsSwr;

  const refresh = async () => { await Promise.all([mutateTracks(), mutatePlaylists()]); };

  const addTrack = async (url: string) => {
    const track = await send<Track>(TRACKS, 'POST', { url });
    await mutateTracks();
    return track;
  };

  const removeTrack = async (id: string) => {
    await send(`${TRACKS}/${id}`, 'DELETE');
    await refresh(); // the server also removed it from every playlist
  };

  const createPlaylist = async (name: string) => {
    const playlist = await send<Playlist>(PLAYLISTS, 'POST', { name });
    await mutatePlaylists();
    return playlist;
  };

  const renamePlaylist = async (id: string, name: string) => {
    await send(`${PLAYLISTS}/${id}`, 'PATCH', { name });
    await mutatePlaylists();
  };

  const deletePlaylist = async (id: string) => {
    await send(`${PLAYLISTS}/${id}`, 'DELETE');
    await mutatePlaylists();
  };

  /** Replaces a playlist's tracks (add, remove and reorder all go through this). Shown at once, undone if the save fails. */
  const setPlaylistTracks = async (id: string, trackIds: string[]) => {
    await mutatePlaylists(
      async (current) => {
        const saved = await send<Playlist>(`${PLAYLISTS}/${id}`, 'PATCH', { trackIds });
        return (current ?? []).map(p => (p._id === id ? saved : p));
      },
      {
        optimisticData: (current) => (current ?? []).map(p => (p._id === id ? { ...p, trackIds } : p)),
        rollbackOnError: true,
        revalidate: false,
      },
    );
  };

  return {
    tracks: tracksSwr.data ?? NO_TRACKS,
    playlists: playlistsSwr.data ?? NO_PLAYLISTS,
    loaded: tracksSwr.data !== undefined && playlistsSwr.data !== undefined,
    error: tracksSwr.error ?? playlistsSwr.error,
    refresh,
    addTrack,
    removeTrack,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    setPlaylistTracks,
  };
}
