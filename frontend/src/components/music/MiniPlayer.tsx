'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ListMusic, Minimize2, Music, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, X } from 'lucide-react';
import { useMusic } from './musicContext';
import { useMusicLibrary } from '@/hooks/useMusicLibrary';
import type { RepeatMode } from '@/utils/musicQueue';

// YouTube's rules: an embedded player must stay visible and at least 200x200 while it is loaded.
const EMBED_SIZE = 200;

const REPEAT: Record<RepeatMode, { label: string; next: RepeatMode }> = {
  off: { label: 'tắt', next: 'all' },
  all: { label: 'tất cả', next: 'one' },
  one: { label: 'một bài', next: 'off' },
};

const soundCloudSrc = (url: string) => `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&visual=true`;

const iconButton = 'size-9 rounded-full border border-border flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary';

/**
 * What is playing, and the controls for it: playlist, shuffle, repeat, the "play next" queue.
 * The library itself (adding links, playlists) lives on /music. Renders nothing while idle.
 */
export default function MiniPlayer() {
  const music = useMusic();
  const { current, playing, activePlaylistId, shuffle, repeat, volume, queue, canPrevious, canNext, ytHostRef, scIframeRef } = music;
  const { playlists } = useMusicLibrary(current !== null);

  // Set the iframe's src once, when it first mounts: the next SoundCloud track is loaded through the
  // widget, and rewriting src would reload the whole player.
  const soundCloudUrl = current?.source === 'soundcloud' ? current.url : null;
  useLayoutEffect(() => {
    const iframe = scIframeRef.current;
    if (soundCloudUrl && iframe && !iframe.getAttribute('src')) iframe.setAttribute('src', soundCloudSrc(soundCloudUrl));
  }, [soundCloudUrl, scIframeRef]);

  // The widget is a small icon or the full panel, both draggable. pos stays null until the first drag (the CSS corner applies).
  const [open, setOpen] = useState(true);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const swallowClick = useRef(false);

  const clamp = (x: number, y: number) => {
    const r = box.current?.getBoundingClientRect();
    return { x: Math.min(Math.max(0, x), window.innerWidth - (r?.width ?? 0)), y: Math.min(Math.max(0, y), window.innerHeight - (r?.height ?? 0)) };
  };
  // the panel is bigger than the icon: once it has rendered, pull it back on screen
  const switchTo = (next: boolean) => {
    setOpen(next);
    requestAnimationFrame(() => setPos(p => (p ? clamp(p.x, p.y) : p)));
  };

  const startDrag = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    // on the panel header the buttons and the link keep their own clicks
    if (e.button !== 0 || target.closest('a') || (target.closest('button') && e.currentTarget.tagName !== 'BUTTON')) return;
    const r = box.current!.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5)) return;
    d.moved = true;
    setPos(clamp(e.clientX - d.dx, e.clientY - d.dy));
  };
  const endDrag = () => {
    swallowClick.current = !!drag.current?.moved;
    drag.current = null;
  };

  if (!current) return null;

  return (
    <div
      ref={box}
      style={pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined}
      className="fixed right-4 bottom-24 md:right-6 md:bottom-6 z-40"
    >
      {/* collapsed: only the icon shows, but the panel stays mounted so the song keeps playing */}
      {!open && (
        <button
          type="button"
          aria-label="Mở trình phát nhạc"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onClick={() => { if (swallowClick.current) swallowClick.current = false; else switchTo(true); }}
          className="touch-none flex size-12 cursor-grab items-center justify-center rounded-full border border-primary bg-card text-primary shadow-2xl active:cursor-grabbing"
        >
          <Music className={`size-5 ${playing ? 'animate-pulse' : ''}`} />
        </button>
      )}
    <section
      aria-label="Đang phát"
      hidden={!open}
      className="w-[17rem] max-h-[80vh] overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl p-4 space-y-3"
    >
      <div onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} className="touch-none cursor-grab active:cursor-grabbing flex items-center justify-between gap-2">
        <h2 className="text-sm font-black flex items-center gap-2"><Music className="size-4 text-primary" /> Nhạc tập</h2>
        <div className="flex gap-1.5">
          <button type="button" aria-label="Thu nhỏ" onClick={() => switchTo(false)} className={iconButton}><Minimize2 className="size-4" /></button>
          <Link href="/music" aria-label="Mở thư viện" className={iconButton}><ListMusic className="size-4" /></Link>
          <button type="button" aria-label="Tắt nhạc" onClick={music.stop} className={iconButton}><X className="size-4" /></button>
        </div>
      </div>

      <div data-testid="music-embed" style={{ width: EMBED_SIZE, height: EMBED_SIZE }} className="mx-auto overflow-hidden rounded-xl bg-black">
        {current.source === 'youtube' ? (
          <div ref={ytHostRef} data-testid="music-yt-host" className="size-full" />
        ) : (
          <iframe ref={scIframeRef} title="SoundCloud" allow="autoplay" className="size-full" />
        )}
      </div>

      <div className="text-center">
        <p className="text-xs font-bold truncate">{current.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">Nguồn: {current.source === 'youtube' ? 'YouTube' : 'SoundCloud'}</p>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button type="button" aria-label="Trộn bài" aria-pressed={shuffle} onClick={() => music.setShuffle(!shuffle)} className={`${iconButton} ${shuffle ? 'bg-primary/15 border-primary text-primary' : ''}`}>
          <Shuffle className="size-4" />
        </button>
        <button type="button" aria-label="Bài trước" disabled={!canPrevious} onClick={music.previous} className={iconButton}><SkipBack className="size-4" /></button>
        <button type="button" aria-label={playing ? 'Tạm dừng' : 'Phát'} onClick={music.togglePlay} className={`${iconButton} !size-11 bg-primary text-primary-foreground`}>
          {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
        </button>
        <button type="button" aria-label="Bài tiếp" disabled={!canNext} onClick={music.next} className={iconButton}><SkipForward className="size-4" /></button>
        <button type="button" aria-label={`Lặp lại: ${REPEAT[repeat].label}`} onClick={() => music.setRepeat(REPEAT[repeat].next)} className={`${iconButton} ${repeat !== 'off' ? 'bg-primary/15 border-primary text-primary' : ''}`}>
          {repeat === 'one' ? <Repeat1 className="size-4" /> : <Repeat className="size-4" />}
        </button>
      </div>

      <input
        type="range"
        aria-label="Âm lượng"
        min={0}
        max={100}
        value={volume}
        onChange={e => music.setVolume(Number(e.target.value))}
        className="w-full accent-primary"
      />

      <select
        aria-label="Danh sách phát"
        value={activePlaylistId ?? ''}
        onChange={e => music.playPlaylist(e.target.value || null)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
      >
        <option value="">Tất cả bài</option>
        {playlists.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
      </select>

      {queue.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold">Phát tiếp theo</h3>
            <button type="button" onClick={music.clearQueue} className="text-[11px] underline text-muted-foreground cursor-pointer">Xoá hàng đợi</button>
          </div>
          <ul className="space-y-1">
            {queue.map((track, i) => (
              <li key={`${track._id}-${i}`} className="flex items-center gap-2 text-xs">
                <span className="flex-1 truncate">{track.title}</span>
                <button type="button" aria-label="Bỏ khỏi hàng đợi" onClick={() => music.dequeue(i)} className="p-1 text-muted-foreground hover:text-destructive cursor-pointer">
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-center text-[11px] text-muted-foreground">Màn hình sẽ luôn sáng khi đang phát nhạc.</p>
    </section>
    </div>
  );
}
