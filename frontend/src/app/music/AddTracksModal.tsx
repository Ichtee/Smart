'use client';
import { useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import type { Playlist, Track } from '@/hooks/useMusicLibrary';

interface Props {
  playlist: Playlist;
  /** the whole library: the tracks the playlist does not hold yet can be picked */
  tracks: Track[];
  onAdd(track: Track): void;
  onClose(): void;
}

export default function AddTracksModal({ playlist, tracks, onAdd, onClose }: Props) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = tracks.filter(t => !q || `${t.title} ${t.author}`.toLowerCase().includes(q));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Thêm bài vào ${playlist.name}`}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        className="flex max-h-[80vh] w-full max-w-lg flex-col gap-3 rounded-3xl border border-border bg-card p-5 shadow-2xl"
      >
        <h2 className="text-lg font-black">Thêm bài vào “{playlist.name}”</h2>
        <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <input
            aria-label="Tìm bài trong thư viện"
            value={query}
            autoFocus
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm theo tên bài hoặc nghệ sĩ"
            className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
          />
        </label>

        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {matches.map(t => {
            const added = playlist.trackIds.includes(t._id);
            return (
              <li key={t._id} className="flex items-center gap-3 rounded-2xl border border-border p-2">
                {t.thumbnail ? <img src={t.thumbnail} alt="" className="size-10 rounded-lg object-cover" /> : <span className="size-10 rounded-lg bg-secondary" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{t.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{t.author}</span>
                </span>
                <button
                  type="button"
                  aria-label={`Thêm ${t.title}`}
                  disabled={added}
                  onClick={() => onAdd(t)}
                  className="flex h-8 cursor-pointer items-center gap-1 rounded-full border border-border px-3 text-xs font-bold hover:border-primary disabled:cursor-default disabled:opacity-60"
                >
                  {added ? <><Check className="size-3.5" /> Đã thêm</> : <><Plus className="size-3.5" /> Thêm</>}
                </button>
              </li>
            );
          })}
          {matches.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">
              {tracks.length === 0 ? 'Thư viện chưa có bài nào.' : 'Không tìm thấy bài phù hợp.'}
            </li>
          )}
        </ul>

        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="min-h-11 cursor-pointer rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground">Xong</button>
        </div>
      </div>
    </div>
  );
}
