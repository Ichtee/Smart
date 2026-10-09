'use client';
import { ArrowDown, ArrowUp, GripVertical, ListPlus, MinusCircle, Play, Trash2 } from 'lucide-react';
import type { Playlist, Track } from '@/hooks/useMusicLibrary';

interface Props {
  track: Track;
  /** this is the track that is playing now */
  current: boolean;
  /** the playlist being viewed; null on the "Tất cả bài" tab (no reordering there) */
  inPlaylist: Playlist | null;
  first: boolean;
  last: boolean;
  onPlay(): void;
  onPlayNext(): void;
  onRemoveFromPlaylist(): void;
  onDelete(): void;
  onMove(delta: -1 | 1): void;
  onDragStart(): void;
  onDrop(): void;
  onDragEnd(): void;
}

const small = 'size-8 rounded-full border border-border flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary';

export default function TrackRow({
  track, current, inPlaylist, first, last,
  onPlay, onPlayNext, onRemoveFromPlaylist, onDelete, onMove, onDragStart, onDrop, onDragEnd,
}: Props) {
  return (
    <li
      aria-current={current ? 'true' : undefined}
      onDragOver={inPlaylist ? e => e.preventDefault() : undefined}
      onDrop={inPlaylist ? e => { e.preventDefault(); onDrop(); } : undefined}
      className={`flex flex-wrap items-center gap-2 rounded-2xl border p-2 ${current ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
    >
      {inPlaylist && (
        <button
          type="button"
          draggable
          aria-label="Kéo để sắp xếp"
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="cursor-grab text-muted-foreground"
        >
          <GripVertical className="size-4" />
        </button>
      )}

      <button type="button" aria-label={`Phát ${track.title}`} onClick={onPlay} className="flex flex-1 min-w-40 items-center gap-3 text-left cursor-pointer">
        {track.thumbnail ? <img src={track.thumbnail} alt="" className="size-11 rounded-lg object-cover" /> : <span className="size-11 rounded-lg bg-secondary" />}
        <span className="min-w-0">
          <span data-testid="track-title" className="block text-sm font-bold truncate">{track.title}</span>
          <span className="block text-xs text-muted-foreground truncate">{track.author} · {track.source === 'youtube' ? 'YouTube' : 'SoundCloud'}</span>
        </span>
        <Play className="size-4 shrink-0 text-primary" />
      </button>

      <div className="flex items-center gap-1.5">
        {inPlaylist && (
          <>
            <button type="button" aria-label={`Lên: ${track.title}`} disabled={first} onClick={() => onMove(-1)} className={small}><ArrowUp className="size-4" /></button>
            <button type="button" aria-label={`Xuống: ${track.title}`} disabled={last} onClick={() => onMove(1)} className={small}><ArrowDown className="size-4" /></button>
          </>
        )}
        <button type="button" aria-label={`Phát tiếp theo: ${track.title}`} onClick={onPlayNext} className={small}><ListPlus className="size-4" /></button>
        {inPlaylist && (
          <button type="button" aria-label={`Gỡ khỏi playlist: ${track.title}`} onClick={onRemoveFromPlaylist} className={small}><MinusCircle className="size-4" /></button>
        )}
        <button type="button" aria-label={`Xóa khỏi thư viện: ${track.title}`} onClick={onDelete} className={`${small} hover:text-destructive`}><Trash2 className="size-4" /></button>
      </div>
    </li>
  );
}
