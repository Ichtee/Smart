'use client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { Loader2, Maximize2, Minus, Music, Pause, Play, SkipBack, SkipForward, Trash2, X } from 'lucide-react';
import { apiFetch, describeError } from '@/utils/api';
import { fetcher } from '@/hooks/useApi';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useConfirm } from '@/components/ui/feedback';
import { isPublicPath } from '@/components/AuthGuard';
import { loadSoundCloudApi, loadYouTubeApi, type SCWidget, type YTPlayer } from '@/utils/embedPlayers';

interface Preview { source: 'youtube' | 'soundcloud'; url: string; videoId: string; title: string; author: string; thumbnail: string }
interface Track extends Preview { _id: string }

type View = 'closed' | 'panel' | 'mini';

// YouTube's rules: an embedded player must stay visible and at least 200x200 while it is loaded.
const EMBED_SIZE = 200;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

const readError = async (res: Response) => (await res.json().catch(() => null))?.message ?? `HTTP ${res.status}`;
const soundCloudSrc = (url: string) => `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&visual=true`;

const subscribeToStorage = (onChange: () => void) => {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
};
const hasToken = () => {
  try {
    return localStorage.getItem('token') !== null;
  } catch {
    return false; // storage unavailable
  }
};

/**
 * Mounted once in Providers so playback survives page changes. The player itself is unmounted (which
 * stops the music) on public pages or when there is no token, e.g. after signing out.
 */
export default function MusicPlayer() {
  const pathname = usePathname();
  const signedIn = useSyncExternalStore(subscribeToStorage, hasToken, () => false);
  if (isPublicPath(pathname) || !signedIn) return null;
  return <Player />;
}

function Player() {
  const confirm = useConfirm();
  const [view, setView] = useState<View>('closed');
  const [link, setLink] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<'' | 'preview' | 'add'>('');
  const [error, setError] = useState('');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(80);

  // the library is only fetched once the player is opened
  const { data, mutate } = useSWR<Track[]>(view === 'closed' ? null : '/api/music/tracks', fetcher, { revalidateOnFocus: false });
  const tracks = data ?? [];
  const current = tracks.find(t => t._id === currentId) ?? null;
  const index = current ? tracks.indexOf(current) : -1;

  const ytRef = useRef<YTPlayer | null>(null);
  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const scRef = useRef<SCWidget | null>(null);
  const scIframeRef = useRef<HTMLIFrameElement | null>(null);
  const tracksRef = useRef<Track[]>([]);
  const currentIdRef = useRef<string | null>(null);
  const volumeRef = useRef(80);
  const tokenRef = useRef(0); // bumped to ignore async work that belongs to an older track

  useEffect(() => {
    tracksRef.current = tracks;
    currentIdRef.current = currentId;
    volumeRef.current = volume;
  });

  useWakeLock(playing);

  // next (+1) or previous (-1) track; no wrap-around, so the last track ending just stops
  const step = useCallback((delta: number) => {
    const list = tracksRef.current;
    const at = list.findIndex(t => t._id === currentIdRef.current);
    const next = at === -1 ? undefined : list[at + delta];
    if (next) setCurrentId(next._id);
    else if (delta > 0) setPlaying(false);
  }, []);

  const stopPlayback = useCallback(() => {
    tokenRef.current += 1;
    ytRef.current?.destroy();
    ytRef.current = null;
    scRef.current = null;
    setCurrentId(null);
    setPlaying(false);
  }, []);

  // Drive the right embed whenever the current track changes. Primitive deps: a refreshed library
  // must not restart the song that is already playing.
  const source = current?.source;
  const videoId = current?.videoId;
  const url = current?.url;
  const trackId = current?._id;
  useEffect(() => {
    if (!trackId || !source) return;
    tokenRef.current += 1;
    const token = tokenRef.current;
    const stale = () => token !== tokenRef.current;
    const fail = (err: unknown) => { if (!stale()) setError(describeError(err)); };

    if (source === 'youtube') {
      scRef.current = null;
      loadYouTubeApi().then(YT => {
        if (stale()) return;
        if (ytRef.current) { ytRef.current.loadVideoById(videoId!); return; }
        const host = ytHostRef.current;
        if (!host) return;
        const target = document.createElement('div');
        host.replaceChildren(target);
        ytRef.current = new YT.Player(target, {
          width: EMBED_SIZE,
          height: EMBED_SIZE,
          videoId: videoId!,
          playerVars: { playsinline: 1 },
          events: {
            onReady: () => { ytRef.current?.setVolume(volumeRef.current); ytRef.current?.playVideo(); },
            onStateChange: ({ data: state }) => {
              if (state === 1) setPlaying(true);
              else if (state === 2) setPlaying(false);
              else if (state === 0) { setPlaying(false); step(1); }
            },
            onError: () => step(1), // not embeddable or removed: skip it
          },
        });
      }).catch(fail);
    } else {
      ytRef.current?.destroy();
      ytRef.current = null;
      loadSoundCloudApi().then(SC => {
        if (stale()) return;
        if (scRef.current) { scRef.current.load(url!, { auto_play: true }); return; }
        const iframe = scIframeRef.current;
        if (!iframe) return;
        const widget = SC.Widget(iframe);
        scRef.current = widget;
        const { READY, PLAY, PAUSE, FINISH, ERROR } = SC.Widget.Events;
        widget.bind(READY, () => { widget.setVolume(volumeRef.current); widget.play(); });
        widget.bind(PLAY, () => setPlaying(true));
        widget.bind(PAUSE, () => setPlaying(false));
        widget.bind(FINISH, () => step(1));
        widget.bind(ERROR, () => step(1));
      }).catch(fail);
    }
  }, [trackId, source, videoId, url, step]);

  // leaving the page entirely (sign-out unmounts the player) stops the music
  useEffect(() => () => {
    tokenRef.current += 1;
    ytRef.current?.destroy();
  }, []);

  const lookUp = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !link.trim()) return;
    setBusy('preview');
    setError('');
    setPreview(null);
    try {
      const res = await apiFetch('/api/music/preview', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ url: link.trim() }) }, 0);
      if (!res.ok) throw new Error(await readError(res));
      setPreview(await res.json());
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy('');
    }
  };

  const addToLibrary = async () => {
    if (busy || !preview) return;
    setBusy('add');
    setError('');
    try {
      const res = await apiFetch('/api/music/tracks', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ url: preview.url }) }, 0);
      if (!res.ok) throw new Error(await readError(res));
      setPreview(null);
      setLink('');
      await mutate();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy('');
    }
  };

  const removeTrack = async (track: Track) => {
    if (!(await confirm({ message: `Xóa "${track.title}" khỏi thư viện?`, tone: 'danger' }))) return;
    setError('');
    try {
      const res = await apiFetch(`/api/music/tracks/${track._id}`, { method: 'DELETE' }, 0);
      if (!res.ok) throw new Error(await readError(res));
      if (currentIdRef.current === track._id) stopPlayback();
      await mutate();
    } catch (err) {
      setError(describeError(err));
    }
  };

  const togglePlay = () => {
    if (playing) { ytRef.current?.pauseVideo(); scRef.current?.pause(); }
    else { ytRef.current?.playVideo(); scRef.current?.play(); }
  };

  const changeVolume = (value: number) => {
    setVolume(value);
    ytRef.current?.setVolume(value);
    scRef.current?.setVolume(value);
  };

  const closeAll = () => {
    stopPlayback();
    setView('closed');
  };

  if (view === 'closed') {
    return (
      <button
        type="button"
        aria-label="Mở trình nghe nhạc"
        onClick={() => setView('panel')}
        className="fixed right-4 bottom-24 md:right-6 md:bottom-6 z-40 size-12 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center cursor-pointer"
      >
        <Music className="size-5" />
      </button>
    );
  }

  const iconButton = 'size-9 rounded-full border border-border flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary';

  return (
    <section
      aria-label="Trình nghe nhạc"
      className={`fixed right-4 bottom-24 md:right-6 md:bottom-6 z-40 rounded-3xl border border-border bg-card shadow-2xl p-4 space-y-3 ${view === 'panel' ? 'w-[min(22rem,calc(100vw-2rem))] max-h-[75vh] overflow-y-auto' : 'w-[17rem]'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-black flex items-center gap-2"><Music className="size-4 text-primary" /> Nhạc tập</h2>
        <div className="flex gap-1.5">
          {current && view === 'panel' && (
            <button type="button" aria-label="Thu nhỏ" onClick={() => setView('mini')} className={iconButton}><Minus className="size-4" /></button>
          )}
          {view === 'mini' && (
            <button type="button" aria-label="Mở rộng" onClick={() => setView('panel')} className={iconButton}><Maximize2 className="size-4" /></button>
          )}
          <button type="button" aria-label={current ? 'Tắt nhạc' : 'Đóng'} onClick={closeAll} className={iconButton}><X className="size-4" /></button>
        </div>
      </div>

      {view === 'panel' && (
        <>
          <form onSubmit={lookUp} className="flex gap-2">
            <input
              aria-label="Link YouTube hoặc SoundCloud"
              value={link}
              maxLength={500}
              onChange={e => { setLink(e.target.value); setPreview(null); }}
              placeholder="Dán link YouTube hoặc SoundCloud"
              className="flex-1 min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-xs"
            />
            <button type="submit" disabled={busy !== '' || !link.trim()} className="px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
              {busy === 'preview' ? 'Đang kiểm tra…' : 'Xem trước'}
            </button>
          </form>

          {error && <p role="alert" className="text-xs font-semibold text-destructive">{error}</p>}

          {preview && (
            <div className="flex items-center gap-3 rounded-xl border border-border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {preview.thumbnail && <img src={preview.thumbnail} alt="" className="size-12 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate">{preview.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{preview.author}</p>
              </div>
              <button type="button" onClick={addToLibrary} disabled={busy !== ''} className="px-3 py-1.5 rounded-lg bg-success text-slate-950 text-xs font-bold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                {busy === 'add' ? 'Đang thêm…' : 'Thêm vào thư viện'}
              </button>
            </div>
          )}
        </>
      )}

      {current && (
        <div className="space-y-2">
          <div data-testid="music-embed" style={{ width: EMBED_SIZE, height: EMBED_SIZE }} className="mx-auto overflow-hidden rounded-xl bg-black">
            {current.source === 'youtube' ? (
              <div ref={ytHostRef} className="size-full" />
            ) : (
              <iframe
                title="SoundCloud"
                allow="autoplay"
                className="size-full"
                ref={el => {
                  scIframeRef.current = el;
                  // set once: React must not rewrite src when the next track is loaded through the widget
                  if (el && !el.getAttribute('src')) el.setAttribute('src', soundCloudSrc(current.url));
                }}
              />
            )}
          </div>
          <p className="text-center text-xs font-bold truncate">{current.title}</p>
          <p className="text-center text-[11px] text-muted-foreground">Nguồn: {current.source === 'youtube' ? 'YouTube' : 'SoundCloud'}</p>
          <div className="flex items-center justify-center gap-2">
            <button type="button" aria-label="Bài trước" disabled={index <= 0} onClick={() => step(-1)} className={iconButton}><SkipBack className="size-4" /></button>
            <button type="button" aria-label={playing ? 'Tạm dừng' : 'Phát'} onClick={togglePlay} className={`${iconButton} !size-11 bg-primary text-primary-foreground`}>
              {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
            </button>
            <button type="button" aria-label="Bài tiếp" disabled={index === -1 || index >= tracks.length - 1} onClick={() => step(1)} className={iconButton}><SkipForward className="size-4" /></button>
          </div>
          <input type="range" aria-label="Âm lượng" min={0} max={100} value={volume} onChange={e => changeVolume(Number(e.target.value))} className="w-full accent-primary" />
          <p className="text-center text-[11px] text-muted-foreground">Màn hình sẽ luôn sáng khi đang phát nhạc.</p>
        </div>
      )}

      {view === 'panel' && (
        data && tracks.length === 0 ? (
          <p className="text-xs text-muted-foreground">Chưa có bài nào. Dán link YouTube hoặc SoundCloud ở trên để thêm.</p>
        ) : (
          <ul className="space-y-1">
            {tracks.map(track => (
              <li key={track._id} aria-current={track._id === currentId ? 'true' : undefined} className={`flex items-center gap-2 rounded-xl p-1.5 ${track._id === currentId ? 'bg-primary/10' : ''}`}>
                <button type="button" aria-label={`Phát ${track.title}`} onClick={() => setCurrentId(track._id)} className="flex flex-1 min-w-0 items-center gap-2 text-left cursor-pointer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {track.thumbnail ? <img src={track.thumbnail} alt="" className="size-9 rounded-md object-cover" /> : <span className="size-9 rounded-md bg-secondary" />}
                  <span className="min-w-0">
                    <span className="block text-xs font-bold truncate">{track.title}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{track.author}</span>
                  </span>
                </button>
                <button type="button" aria-label={`Xóa ${track.title}`} onClick={() => removeTrack(track)} className="p-1.5 text-muted-foreground hover:text-destructive cursor-pointer">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )
      )}

      {view === 'panel' && !data && <Loader2 className="size-4 animate-spin text-primary mx-auto" aria-label="Đang tải thư viện" />}
    </section>
  );
}
