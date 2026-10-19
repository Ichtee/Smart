'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import EmptyState from '@/components/ui/EmptyState';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useConfirm } from '@/components/ui/feedback';
import { apiFetch, describeError } from '@/utils/api';
import { useMealPlans, useProfile, refreshProfile, isUnauthorizedError } from '@/hooks/useApi';
import { calcEnergyPlan, macroTargets } from '@/utils/nutritionCalc';
import { AlertCircle, CalendarDays, CheckCircle2, Sparkles, Trash2 } from 'lucide-react';
import type { MealPlan } from '@/types/domain';
import AiMealPlanForm from './AiMealPlanForm';
import MealPlanView from './MealPlanView';
import { MAX_MEAL_PLANS, planSummary } from './mealPlan';

type Draft = Omit<MealPlan, 'id'>;
type Notice = { text: string; type: 'success' | 'error' } | null;

const SHELL = {
  title: 'Dinh dưỡng',
  section: 'nutrition',
  subtitle: 'Thực đơn',
  icon: <CalendarDays className="size-6 text-primary" aria-hidden />,
} as const;

// the server accepts targets from 1000 to 6000 kcal
const clampTarget = (kcal: number) => Math.min(6000, Math.max(1000, Math.round(kcal)));

const field = 'min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:border-primary';

export default function MealPlansPage() {
  const confirm = useConfirm();
  const router = useRouter();
  const { plans, error, isLoading, mutate } = useMealPlans();
  const { profile } = useProfile();

  // null = showing the list; otherwise the editor (editingId null = a new plan)
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [showAi, setShowAi] = useState(false);

  useEffect(() => {
    if (isUnauthorizedError(error)) {
      localStorage.removeItem('token');
      router.push('/login');
    }
  }, [error, router]);

  if (isLoading && !plans) {
    return <AppShell {...SHELL}><PageSkeleton rows={3} /></AppShell>;
  }

  const list = plans ?? [];
  const energy = profile ? calcEnergyPlan(profile) : null;
  const atLimit = list.length >= MAX_MEAL_PLANS;

  const closeEditor = () => { setDraft(null); setEditingId(null); };
  const startEdit = (p: MealPlan) => {
    setDraft({ name: p.name, description: p.description ?? '', targetCalories: p.targetCalories ?? null, days: p.days });
    setEditingId(p.id);
    setNotice(null);
  };

  const handleSave = async () => {
    if (!draft || saving) return;
    setNotice(null);
    if (!draft.name.trim()) { setNotice({ text: 'Hãy đặt tên cho thực đơn.', type: 'error' }); return; }

    setSaving(true);
    try {
      const res = await apiFetch(editingId ? `/api/meal-plans/${editingId}` : '/api/meal-plans', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setNotice({ text: err.message || 'Lưu thực đơn thất bại. Vui lòng thử lại.', type: 'error' });
        return;
      }
      await mutate();
      closeEditor();
      setNotice({ text: editingId ? 'Đã cập nhật thực đơn!' : 'Đã lưu thực đơn!', type: 'success' });
    } catch (err) {
      setNotice({ text: describeError(err), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: MealPlan) => {
    if (!(await confirm({ message: `Xóa thực đơn "${p.name}"?`, tone: 'danger' }))) return;
    setNotice(null);
    try {
      const res = await apiFetch(`/api/meal-plans/${p.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
      await refreshProfile(); // the server clears activeMealPlanId when the deleted plan was the one in use
      setNotice({ text: 'Đã xóa thực đơn.', type: 'success' });
    } catch {
      setNotice({ text: 'Không xóa được thực đơn. Vui lòng thử lại.', type: 'error' });
    }
  };

  // "Use" = make it the active plan; the Dinh dưỡng page then offers its foods for the day
  const handleUse = async (p: MealPlan) => {
    setNotice(null);
    try {
      const res = await apiFetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeMealPlanId: p.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refreshProfile();
      setNotice({ text: `Đang dùng thực đơn "${p.name}". Mở tab Nhật ký để thêm món của hôm nay.`, type: 'success' });
    } catch {
      setNotice({ text: 'Không đổi được thực đơn đang dùng. Vui lòng thử lại.', type: 'error' });
    }
  };

  const actions = !draft && (
    <button
      type="button"
      onClick={() => setShowAi(v => !v)}
      disabled={atLimit}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50 cursor-pointer"
    >
      <Sparkles className="size-4" aria-hidden /> Tạo bằng AI
    </button>
  );

  return (
    <AppShell {...SHELL} actions={actions}>
      <p className="text-sm font-semibold text-muted-foreground">Thực đơn nhiều ngày do AI soạn theo mục tiêu calo của bạn. Xem lại, lưu, rồi thêm món vào nhật ký mỗi ngày.</p>

      {error && !isUnauthorizedError(error) && (
        <div role="alert" className="p-4 rounded-2xl border bg-destructive/10 border-destructive/30 text-destructive text-xs font-semibold flex items-center justify-between gap-3">
          <span>Không tải được danh sách thực đơn.</span>
          <button type="button" onClick={() => mutate()} className="underline cursor-pointer">Thử lại</button>
        </div>
      )}

      {!draft && showAi && (energy ? (
        <AiMealPlanForm
          targetCalories={clampTarget(energy.target)}
          proteinG={macroTargets(energy.target, profile).protein}
          onCancel={() => setShowAi(false)}
          onGenerated={plan => {
            setDraft({ name: plan.name, description: plan.description ?? '', targetCalories: plan.targetCalories ?? null, days: plan.days });
            setEditingId(null);
            setShowAi(false);
            setNotice({ text: 'Đã tạo bản nháp bằng AI. Kiểm tra, bỏ món không thích rồi bấm Lưu.', type: 'success' });
          }}
        />
      ) : (
        <section aria-label="Tạo thực đơn bằng AI" className="bg-card border border-border rounded-3xl p-4 sm:p-6 space-y-3">
          <p className="text-sm font-semibold">Hoàn thiện hồ sơ (tuổi, chiều cao, cân nặng) để tính mục tiêu calo trước khi tạo thực đơn.</p>
          <div className="flex gap-2">
            <Link href="/profile" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Mở hồ sơ</Link>
            <button type="button" onClick={() => setShowAi(false)} className="min-h-11 rounded-full border border-border px-5 text-sm font-semibold cursor-pointer">Hủy</button>
          </div>
        </section>
      ))}

      {notice && (
        <div role={notice.type === 'error' ? 'alert' : 'status'} className={`p-4 rounded-2xl border flex items-center gap-2 text-xs font-semibold ${notice.type === 'success' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
          {notice.type === 'success' ? <CheckCircle2 className="size-4 shrink-0" aria-hidden /> : <AlertCircle className="size-4 shrink-0" aria-hidden />}
          <span>{notice.text}</span>
        </div>
      )}

      {!draft && (
        <>
          {list.length === 0 && !error && (
            <EmptyState icon={<CalendarDays className="size-6" aria-hidden />} title="Bạn chưa có thực đơn nào" hint="Bấm “Tạo bằng AI” để có thực đơn 1–7 ngày theo mục tiêu calo của bạn." />
          )}
          <ul className="space-y-3">
            {list.map(p => (
              <li key={p.id} className="bg-card border border-border rounded-2xl p-4 space-y-3" data-testid="my-meal-plan">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-black text-lg break-words">
                      {p.name}
                      {profile?.activeMealPlanId === p.id && <span className="ml-2 text-xs font-bold text-primary uppercase">Đang dùng</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{planSummary(p)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => handleUse(p)} className="min-h-11 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground cursor-pointer">Dùng thực đơn này</button>
                    <button type="button" onClick={() => setViewId(v => (v === p.id ? null : p.id))} aria-expanded={viewId === p.id} className="min-h-11 rounded-lg bg-secondary px-3 text-xs font-bold cursor-pointer">{viewId === p.id ? 'Ẩn' : 'Xem'}</button>
                    <button type="button" onClick={() => startEdit(p)} className="min-h-11 rounded-lg bg-secondary px-3 text-xs font-bold cursor-pointer">Sửa</button>
                    <button type="button" onClick={() => handleDelete(p)} aria-label={`Xóa thực đơn ${p.name}`} className="inline-flex size-11 items-center justify-center text-destructive cursor-pointer"><Trash2 className="size-4" aria-hidden /></button>
                  </div>
                </div>
                {viewId === p.id && <MealPlanView plan={p} />}
              </li>
            ))}
          </ul>
        </>
      )}

      {draft && (
        <section aria-label="Soạn thực đơn" className="space-y-4">
          <div className="bg-card border border-border rounded-3xl p-4 sm:p-6 space-y-2">
            <label htmlFor="plan-name" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tên thực đơn</label>
            <input id="plan-name" className={field} maxLength={100} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="bg-card border border-border rounded-3xl p-4 sm:p-6">
            <MealPlanView plan={draft} editable onChange={days => setDraft({ ...draft, days })} />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleSave} disabled={saving} className="min-h-11 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50 cursor-pointer">
              {saving ? 'Đang lưu...' : 'Lưu thực đơn'}
            </button>
            <button type="button" onClick={closeEditor} disabled={saving} className="min-h-11 rounded-full bg-secondary px-6 text-sm font-semibold cursor-pointer">Hủy</button>
          </div>
        </section>
      )}
    </AppShell>
  );
}
