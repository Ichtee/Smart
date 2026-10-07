'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import EmptyState from '@/components/ui/EmptyState';
import { apiFetch, describeError } from '@/utils/api';
import { useRoutines, useExercises, useProfile, refreshProfile, isUnauthorizedError } from '@/hooks/useApi';
import {
  draftFromRoutine, draftToBody, emptyDraft, exerciseFromLibrary, routineSummary, validateDraft,
  MAX_EXERCISES_PER_DAY, type DayMode, type DraftDay, type LibraryExercise, type RoutineDraft,
} from './routineDraft';
import { ClipboardList, Loader2, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useConfirm } from '@/components/ui/feedback';

const MODE_LABELS: Record<DayMode, string> = { off: 'Không tập', train: 'Ngày tập', rest: 'Ngày nghỉ' };
const MAX_ROUTINES = 10;

type Notice = { text: string; type: 'success' | 'error' } | null;

export default function RoutinesPage() {
  const confirm = useConfirm();
  const router = useRouter();
  const { routines, error, isLoading, mutate } = useRoutines();
  const { exercises: library } = useExercises();
  const { profile } = useProfile();

  const mine = useMemo(() => (routines ?? []).filter((r: any) => r.isMine), [routines]);

  // null = showing the list; otherwise the editor (editingId null = a new routine)
  const [draft, setDraft] = useState<RoutineDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [search, setSearch] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isUnauthorizedError(error)) {
      localStorage.removeItem('token');
      router.push('/login');
    }
  }, [error, router]);

  const startNew = () => { setDraft(emptyDraft()); setEditingId(null); setNotice(null); setSearch({}); };
  const startEdit = (r: any) => { setDraft(draftFromRoutine(r)); setEditingId(r.id); setNotice(null); setSearch({}); };
  const closeEditor = () => { setDraft(null); setEditingId(null); };

  const updateDay = (day: string, patch: (d: DraftDay) => DraftDay) =>
    setDraft(d => d && { ...d, days: d.days.map(x => (x.day === day ? patch(x) : x)) });

  const handleSave = async () => {
    if (!draft || saving) return;
    setNotice(null);
    const problem = validateDraft(draft);
    if (problem) { setNotice({ text: problem, type: 'error' }); return; }

    setSaving(true);
    try {
      const res = await apiFetch(editingId ? `/api/routines/mine/${editingId}` : '/api/routines/mine', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftToBody(draft)),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setNotice({ text: err.message || 'Lưu lịch tập thất bại. Vui lòng thử lại.', type: 'error' });
        return;
      }
      await mutate();
      closeEditor();
      setNotice({ text: editingId ? 'Đã cập nhật lịch tập!' : 'Đã tạo lịch tập!', type: 'success' });
    } catch (err) {
      setNotice({ text: describeError(err), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: any) => {
    if (!(await confirm({ message: `Xóa lịch tập "${r.name}"?`, tone: 'danger' }))) return;
    setNotice(null);
    try {
      const res = await apiFetch(`/api/routines/mine/${r.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
      setNotice({ text: 'Đã xóa lịch tập.', type: 'success' });
    } catch {
      setNotice({ text: 'Không xóa được lịch tập. Vui lòng thử lại.', type: 'error' });
    }
  };

  // "Use this routine" = make it the active one (the workouts page opens the active routine)
  const handleUse = async (r: any) => {
    setNotice(null);
    try {
      const res = await apiFetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastActiveRoutineId: r.id, lastActiveRoutineName: r.name }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refreshProfile();
      setNotice({ text: `Đang dùng lịch "${r.name}". Mở trang Tập luyện để bắt đầu tập.`, type: 'success' });
    } catch {
      setNotice({ text: 'Không đổi được lịch tập đang dùng. Vui lòng thử lại.', type: 'error' });
    }
  };

  if (isLoading && !routines) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground font-sans">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    );
  }

  const input = 'w-full bg-background border border-input rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors';
  const label = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5';
  const lib = (library ?? []) as LibraryExercise[];

  return (
    <div suppressHydrationWarning className="min-h-screen bg-background text-foreground flex font-sans overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 p-4 md:p-8 lg:p-10 space-y-8 overflow-y-auto pb-28 md:pb-10">
        <div className="max-w-[1000px] w-full mx-auto space-y-6">
          <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
                <ClipboardList className="size-8 text-primary" /> Lịch tập của tôi
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm font-semibold mt-1">Tự xây dựng lịch tập riêng từ thư viện bài tập.</p>
            </div>
            {!draft && (
              <button
                type="button"
                onClick={startNew}
                disabled={mine.length >= MAX_ROUTINES}
                className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="size-4" /> Tạo lịch mới
              </button>
            )}
          </div>

          {error && !isUnauthorizedError(error) && (
            <div role="alert" className="p-4 rounded-2xl border bg-destructive/10 border-destructive/30 text-destructive text-xs font-semibold flex items-center justify-between gap-3">
              <span>Không tải được danh sách lịch tập.</span>
              <button type="button" onClick={() => mutate()} className="underline cursor-pointer">Thử lại</button>
            </div>
          )}

          {notice && (
            <div role={notice.type === 'error' ? 'alert' : 'status'} className={`p-4 rounded-2xl border flex items-center gap-2 text-xs font-semibold ${notice.type === 'success' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
              {notice.type === 'success' ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
              <span>{notice.text}</span>
            </div>
          )}

          {!draft && (
            <>
              {mine.length === 0 && !error && (
                <EmptyState icon={<ClipboardList className="size-6" aria-hidden />} title="Bạn chưa có lịch tập riêng" hint="Bấm “Tạo lịch mới” để tự xếp các bài tập theo từng ngày trong tuần." />
              )}
              <ul className="space-y-3">
                {mine.map((r: any) => (
                  <li key={r.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3" data-testid="my-routine">
                    <div>
                      <p className="font-black text-lg">
                        {r.name}
                        {profile?.lastActiveRoutineId === r.id && <span className="ml-2 text-xs font-bold text-primary uppercase">Đang dùng</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{routineSummary(r)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => handleUse(r)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold cursor-pointer">Dùng lịch này</button>
                      <button type="button" onClick={() => startEdit(r)} className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-bold cursor-pointer">Sửa</button>
                      <button type="button" onClick={() => handleDelete(r)} aria-label={`Xóa lịch tập ${r.name}`} className="p-2 text-destructive cursor-pointer"><Trash2 className="size-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">Lịch có sẵn của hệ thống nằm ở trang <Link href="/workouts" className="text-primary font-bold">Tập luyện</Link>.</p>
            </>
          )}

          {draft && (
            <form onSubmit={(e) => { e.preventDefault(); void handleSave(); }} noValidate className="space-y-6">
              <div className="bg-card border border-border rounded-3xl p-5 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="routine-name" className={label}>Tên lịch tập</label>
                  <input id="routine-name" className={input} maxLength={100} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="routine-desc" className={label}>Mô tả (tùy chọn)</label>
                  <input id="routine-desc" className={input} maxLength={300} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} />
                </div>
              </div>

              {draft.days.map(d => {
                const q = (search[d.day] ?? '').trim().toLowerCase();
                const matches = q ? lib.filter(x => x.name.toLowerCase().includes(q)).slice(0, 6) : [];
                return (
                  <section key={d.day} aria-label={d.day} className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-black">{d.day}</h2>
                      <div role="group" aria-label={`Loại ngày ${d.day}`} className="flex rounded-full bg-secondary p-1 text-xs font-bold">
                        {(Object.keys(MODE_LABELS) as DayMode[]).map(m => (
                          <button
                            key={m}
                            type="button"
                            aria-pressed={d.mode === m}
                            onClick={() => updateDay(d.day, x => ({ ...x, mode: m }))}
                            className={`px-3 py-1 rounded-full cursor-pointer ${d.mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                          >
                            {MODE_LABELS[m]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {d.mode === 'train' && (
                      <>
                        <div>
                          <label htmlFor={`day-name-${d.day}`} className={label}>Tên buổi tập</label>
                          <input id={`day-name-${d.day}`} className={input} maxLength={50} placeholder="VD: Push, Chân, Toàn thân" value={d.name} onChange={e => updateDay(d.day, x => ({ ...x, name: e.target.value }))} />
                        </div>

                        {d.exercises.map((e, i) => (
                          <div key={`${e.exerciseId}-${i}`} className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end bg-secondary/40 rounded-2xl p-3" data-testid="draft-exercise">
                            <p className="col-span-2 sm:col-span-2 font-bold text-sm">{e.exerciseName}</p>
                            {([['sets', 'Hiệp'], ['repsRange', 'Số lần'], ['restTimeSeconds', 'Nghỉ (giây)']] as const).map(([field, text]) => (
                              <div key={field}>
                                <label htmlFor={`${d.day}-${i}-${field}`} className={label}>{text}</label>
                                <input
                                  id={`${d.day}-${i}-${field}`}
                                  aria-label={`${text} - ${e.exerciseName} (${d.day})`}
                                  className={input}
                                  value={e[field]}
                                  onChange={ev => updateDay(d.day, x => ({ ...x, exercises: x.exercises.map((y, j) => (j === i ? { ...y, [field]: ev.target.value } : y)) }))}
                                />
                              </div>
                            ))}
                            <button
                              type="button"
                              aria-label={`Bỏ ${e.exerciseName} khỏi ${d.day}`}
                              onClick={() => updateDay(d.day, x => ({ ...x, exercises: x.exercises.filter((_, j) => j !== i) }))}
                              className="justify-self-end p-2 text-destructive cursor-pointer"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        ))}

                        <div>
                          <label htmlFor={`search-${d.day}`} className={label}>Thêm bài tập ({d.exercises.length}/{MAX_EXERCISES_PER_DAY})</label>
                          <input
                            id={`search-${d.day}`}
                            className={input}
                            placeholder="Tìm trong thư viện..."
                            value={search[d.day] ?? ''}
                            onChange={ev => setSearch(s => ({ ...s, [d.day]: ev.target.value }))}
                          />
                          {matches.length > 0 && (
                            <ul className="mt-2 border border-border rounded-xl divide-y divide-border">
                              {matches.map(x => (
                                <li key={x._id}>
                                  <button
                                    type="button"
                                    disabled={d.exercises.length >= MAX_EXERCISES_PER_DAY}
                                    onClick={() => {
                                      updateDay(d.day, y => ({ ...y, exercises: [...y.exercises, exerciseFromLibrary(x)] }));
                                      setSearch(s => ({ ...s, [d.day]: '' }));
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary disabled:opacity-50 cursor-pointer"
                                  >
                                    {x.name} <span className="text-xs text-muted-foreground">· {x.muscle}</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          {q && matches.length === 0 && <p className="text-xs text-muted-foreground mt-2">Không tìm thấy bài tập nào.</p>}
                        </div>
                      </>
                    )}
                  </section>
                );
              })}

              <div className="flex items-center gap-3">
                <button type="submit" disabled={saving} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 cursor-pointer">
                  {saving ? 'Đang lưu...' : 'Lưu lịch tập'}
                </button>
                <button type="button" onClick={closeEditor} disabled={saving} className="px-6 py-3 rounded-full bg-secondary font-semibold text-sm cursor-pointer">Hủy</button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
