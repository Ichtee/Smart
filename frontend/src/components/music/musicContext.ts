import { createContext, useContext, type RefObject } from 'react';
import type { Track } from '@/hooks/useMusicLibrary';
import type { RepeatMode } from '@/utils/musicQueue';

// Kept apart from MusicProvider so the provider can render the MiniPlayer without a circular import.

export interface MusicContextValue {
  current: Track | null;
  playing: boolean;
  /** the library has loaded, so lists are meaningful */
  ready: boolean;
  /** null = all tracks */
  activePlaylistId: string | null;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  queue: Track[];
  canPrevious: boolean;
  canNext: boolean;
  /** where the player's UI mounts the embed (the YouTube host div or the SoundCloud iframe) */
  ytHostRef: RefObject<HTMLDivElement | null>;
  scIframeRef: RefObject<HTMLIFrameElement | null>;
  playTrack(trackId: string, playlistId?: string | null): void;
  /** starts a playlist (null = all tracks); needs the library to be loaded, as it is on /music and in the mini player */
  playPlaylist(playlistId: string | null): void;
  togglePlay(): void;
  next(): void;
  previous(): void;
  setShuffle(on: boolean): void;
  setRepeat(mode: RepeatMode): void;
  setVolume(volume: number): void;
  enqueue(trackId: string): void;
  dequeue(index: number): void;
  clearQueue(): void;
  stop(): void;
}

export const MusicContext = createContext<MusicContextValue | null>(null);

export function useMusic(): MusicContextValue {
  const value = useContext(MusicContext);
  if (!value) throw new Error('useMusic must be used inside <MusicProvider>');
  return value;
}
