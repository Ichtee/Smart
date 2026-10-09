'use client';
import { useState, type FormEvent } from 'react';
import Sidebar from '@/components/Sidebar';
import EmptyState from '@/components/ui/EmptyState';
import { useConfirm } from '@/components/ui/feedback';
import { apiFetch, describeError } from '@/utils/api';
import { useMusic } from '@/components/music/musicContext';
import { useMusicLibrary, type Track } from '@/hooks/useMusicLibrary';
import { ListMusic, Loader2, Music, Play, Plus } from 'lucide-react';
import TrackRow from './TrackRow';

interface Preview { source: 'youtube' | 'soundcloud'; url: string; title: string; author: string; thumbnail: string }

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const readError = async (res: Response) => (await res.json().catch(() => null))?.message ?? `HTTP ${res.status}`;

const pill = 'px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer';
const field = 'rounded-xl border border-border bg-background px-3 py-2 text-sm';
const action = 'px-3 py-1.5 rounded-full border border-border text-xs font-semibold cursor-pointer hover:border-primary';

export default function MusicPage() {
  const confirm = useConfirm();
  const music = useMusic();
  const library = useMusicLibrary(true);
  const { tracks, playlists } = library;

  const [selectedId, setSelectedId] = useState<string | null>(null); // null = all tracks
  const [link, setLink] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<'' | 'preview' | 'add'>('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'create' | 'rename' | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);

  const selected = playlists.find(p => p._id === selectedId) ?? null;
  const trackById = new Map(tracks.map(t => [t._id, t]));
  const visible: Track[] = selected
    ? selected.trackIds.map(id => trackById.get(id)).filter((t): t is Track => t !== undefined)
    : tracks;
  const visibleIds = visible.map(t => t._id);

  const run = async (task: () => Promise<unknown>) => {
    setError('');
    try {
      await task();
    } catch (err) {
      setError(describeError(err));
    }
  };

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
    await run(async () => {
      await library.addTrack(preview.url);
      setPreview(null);
      setLink('');
    });
    setBusy('');
  };

  const submitName = (event: FormEvent) => {
    event.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    run(async () => {
      if (mode === 'create') setSelectedId((await library.createPlaylist(name))._id);
      else if (selected) await library.renamePlaylist(selected._id, name);
      setMode(null);
      setNameInput('');
    });
  };

  const removePlaylist = async () => {
    if (!selected || !(await confirm({ message: `Xoá playlist "${selected.name}"? Các bài vẫn còn trong thư viện.`, tone: 'danger' }))) return;
    run(async () => {
      await library.deletePlaylist(selected._id);
      setSelectedId(null);
    });
  };

  const deleteTrack = async (track: Track) => {
    if (!(await confirm({ message: `Xóa "${track.title}" khỏi thư viện?`, tone: 'danger' }))) return;
    run(() => library.removeTrack(track._id));
  };

  const addToPlaylist = (track: Track, playlistId: string) => {
    const playlist = playlists.find(p => p._id === playlistId);
    if (playlist && !playlist.trackIds.includes(track._id)) run(() => library.setPlaylistTracks(playlistId, [...playlist.trackIds, track._id]));
  };

  const moveTrack = (from: number, to: number) => {
    if (!selected || from === to || from < 0 || to < 0 || to >= visibleIds.length) return;
    const ids = [...visibleIds];
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    run(() => library.setPlaylistTracks(selected._id, ids));
  };

  const dropOn = (targetId: string) => {
    if (dragId) moveTrack(visibleIds.indexOf(dragId), visibleIds.indexOf(targetId));
    setDragId(null);
  };

  const openForm = (next: 'create' | 'rename') => {
    setMode(next);
    setNameInput(next === 'rename' && selected ? selected.name : '');
  };

  return (
    <div suppressHydrationWarning className="min-h-screen bg-background text-foreground flex font-sans overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 p-4 md:p-8 lg:p-10 space-y-6 overflow-y-auto pb-28 md:pb-10">
        <div className="max-w-[900px] w-full mx-auto space-y-6">
          <div className="border-b border-border pb-6">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              <Music className="size-8 text-primary" /> Thư viện nhạc
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-semibold mt-1">
              Dán link YouTube hoặc SoundCloud để lưu bài, gom thành playlist rồi phát khi tập.
            </p>
            {music.current && <p className="text-xs font-semibold text-primary mt-2">Đang phát: {music.current.title}</p>}
          </div>

          <section aria-label="Thêm bài" className="space-y-3">
            <form onSubmit={lookUp} className="flex flex-wrap gap-2">
              <input
                aria-label="Link YouTube hoặc SoundCloud"
                value={link}
                maxLength={500}
                onChange={e => { setLink(e.target.value); setPreview(null); }}
                placeholder="Dán link YouTube hoặc SoundCloud"
                className={`${field} flex-1 min-w-56`}
              />
              <button type="submit" disabled={busy !== '' || !link.trim()} className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                {busy === 'preview' ? 'Đang kiểm tra…' : 'Xem trước'}
              </button>
            </form>
            {preview && (
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                {preview.thumbnail && <img src={preview.thumbnail} alt="" className="size-14 rounded-lg object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{preview.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{preview.author}</p>
                </div>
                <button type="button" onClick={addToLibrary} disabled={busy !== ''} className="px-4 py-2 rounded-full bg-success text-slate-950 text-xs font-bold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                  {busy === 'add' ? 'Đang thêm…' : 'Thêm vào thư viện'}
                </button>
              </div>
            )}
          </section>

          {error && <p role="alert" className="p-3 rounded-2xl border bg-destructive/10 border-destructive/30 text-destructive text-xs font-semibold">{error}</p>}

          <section aria-label="Playlist" className="space-y-3">
            <div role="tablist" aria-label="Danh sách phát" className="flex flex-wrap gap-2">
              <button type="button" role="tab" aria-selected={selected === null} onClick={() => setSelectedId(null)} className={`${pill} ${selected === null ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>
                Tất cả bài
              </button>
              {playlists.map(p => (
                <button key={p._id} type="button" role="tab" aria-selected={selected?._id === p._id} onClick={() => setSelectedId(p._id)} className={`${pill} ${selected?._id === p._id ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>
                  {p.name}
                </button>
              ))}
              <button type="button" onClick={() => openForm('create')} className={`${pill} border-dashed border-border flex items-center gap-1`}><Plus className="size-3" /> Tạo playlist</button>
            </div>

            {mode && (
              <form onSubmit={submitName} className="flex flex-wrap gap-2">
                <input
                  aria-label={mode === 'create' ? 'Tên playlist' : 'Tên mới'}
                  value={nameInput}
                  maxLength={60}
                  autoFocus
                  onChange={e => setNameInput(e.target.value)}
                  className={`${field} flex-1 min-w-48`}
                />
                <button type="submit" disabled={!nameInput.trim()} className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                  {mode === 'create' ? 'Tạo' : 'Lưu'}
                </button>
                <button type="button" onClick={() => setMode(null)} className={action}>Hủy</button>
              </form>
            )}

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => music.playPlaylist(selected ? selected._id : null)} disabled={visible.length === 0} className={`${action} flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed`}>
                <Play className="size-3.5" /> {selected ? 'Phát playlist' : 'Phát tất cả'}
              </button>
              {selected && (
                <>
                  <button type="button" onClick={() => openForm('rename')} className={action}>Đổi tên</button>
                  <button type="button" onClick={removePlaylist} className={`${action} hover:text-destructive`}>Xoá playlist</button>
                </>
              )}
            </div>
          </section>

          {!library.loaded ? (
            <Loader2 className="size-6 animate-spin text-primary mx-auto" aria-label="Đang tải thư viện" />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<ListMusic className="size-7" />}
              title={selected ? 'Playlist này chưa có bài' : 'Chưa có bài nào'}
              hint={selected ? 'Mở "Tất cả bài" rồi chọn "Thêm vào playlist" ở bài bạn muốn.' : 'Dán link YouTube hoặc SoundCloud ở trên để thêm.'}
            />
          ) : (
            <ul role="tabpanel" className="space-y-2">
              {visible.map((track, index) => (
                <TrackRow
                  key={track._id}
                  track={track}
                  current={music.current?._id === track._id}
                  playlists={playlists}
                  inPlaylist={selected}
                  first={index === 0}
                  last={index === visible.length - 1}
                  onPlay={() => music.playTrack(track._id, selected ? selected._id : null)}
                  onPlayNext={() => music.enqueue(track._id)}
                  onAddToPlaylist={playlistId => addToPlaylist(track, playlistId)}
                  onRemoveFromPlaylist={() => selected && run(() => library.setPlaylistTracks(selected._id, visibleIds.filter(id => id !== track._id)))}
                  onDelete={() => deleteTrack(track)}
                  onMove={delta => moveTrack(index, index + delta)}
                  onDragStart={() => setDragId(track._id)}
                  onDrop={() => dropOn(track._id)}
                  onDragEnd={() => setDragId(null)}
                />
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
