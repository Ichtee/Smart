'use client';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { apiFetch, describeError } from '@/utils/api';
import { fetcher, refreshProfile, useProfile, isUnauthorizedError } from '@/hooks/useApi';
import { toDateStr, todayStr } from '@/utils/dateUtils';
import { metricBody, summarize, validateMetricForm, type BodyMetric } from '@/utils/bodyMetrics';
import BodyChart from './BodyChart';
import CalorieAdvicePanel from './CalorieAdvicePanel';
import { Scale, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const HISTORY_DAYS = 180;

export default function BodyPage() {
  const router = useRouter();
  const today = todayStr();
  const range = useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() - (HISTORY_DAYS - 1));
    return { from: toDateStr(from), to: today };
  }, [today]);

  const { data, error, isLoading, mutate } = useSWR<BodyMetric[]>(
    `/api/body-metrics?from=${range.from}&to=${range.to}`,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );
  const metrics = useMemo(() => data ?? [], [data]);
  const summary = summarize(metrics);
  const { profile } = useProfile();

  const [date, setDate] = useState(today);
  const [form, setForm] = useState({ weight: '', bodyFat: '', waist: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isUnauthorizedError(error)) {
      localStorage.removeItem('token');
      router.push('/login');
    }
  }, [error, router]);

  // Start the form from the most recent weight (people change it by a kilo or two)
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled || !summary) return;
    setForm(f => (f.weight ? f : { ...f, weight: String(summary.latest.weight) }));
    setPrefilled(true);
  }, [summary, prefilled]);

  const setField = (name: 'weight' | 'bodyFat' | 'waist') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setMessage(null);
    if (!date || date > today) {
      setMessage({ text: 'Vui lòng chọn một ngày không nằm trong tương lai.', type: 'error' });
      return;
    }
    const problem = validateMetricForm(form);
    if (problem) {
      setMessage({ text: problem, type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch('/api/body-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metricBody(date, form)),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage({ text: err.message || 'Lưu số đo thất bại. Vui lòng thử lại.', type: 'error' });
        return;
      }
      await Promise.all([mutate(), refreshProfile()]); // the profile weight (and so TDEE) follows the latest entry
      setMessage({ text: 'Đã lưu số đo!', type: 'success' });
      setForm(f => ({ ...f, bodyFat: '', waist: '' }));
    } catch (err) {
      setMessage({ text: describeError(err), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (target: string) => {
    if (!confirm(`Xóa số đo ngày ${target}?`)) return;
    setMessage(null);
    try {
      const res = await apiFetch(`/api/body-metrics?date=${target}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await Promise.all([mutate(), refreshProfile()]);
    } catch {
      setMessage({ text: 'Không xóa được số đo. Vui lòng thử lại.', type: 'error' });
    }
  };

  const history = useMemo(() => [...metrics].reverse(), [metrics]);

  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground font-sans">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    );
  }

  const changeText = summary?.change == null ? '—' : `${summary.change > 0 ? '+' : ''}${summary.change} kg`;
  const inputClass = 'w-full bg-background border border-input rounded-2xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors';
  const labelClass = 'block text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2';

  return (
    <div suppressHydrationWarning className="min-h-screen bg-background text-foreground flex font-sans overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 p-4 md:p-8 lg:p-10 space-y-8 overflow-y-auto pb-28 md:pb-10">
        <div className="max-w-[1200px] w-full mx-auto space-y-6">
          <div className="border-b border-border pb-6">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              <Scale className="size-8 text-primary" /> Số đo cơ thể
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-semibold mt-1">
              Ghi cân nặng theo ngày để theo dõi tiến độ. Cân nặng mới nhất sẽ được dùng để tính lại mục tiêu calo của bạn.
            </p>
          </div>

          {error && !isUnauthorizedError(error) && (
            <div role="alert" className="p-4 rounded-2xl border bg-destructive/10 border-destructive/30 text-destructive text-xs font-semibold flex items-center justify-between gap-3">
              <span>Không tải được lịch sử số đo.</span>
              <button type="button" onClick={() => mutate()} className="underline cursor-pointer">Thử lại</button>
            </div>
          )}

          {message && (
            <div role={message.type === 'error' ? 'alert' : 'status'} className={`p-4 rounded-2xl border flex items-center gap-2 text-xs font-semibold ${message.type === 'success' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
              {message.type === 'success' ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
              <p className={labelClass}>Hiện tại</p>
              <p className="text-xl sm:text-3xl font-black">{summary ? `${summary.latest.weight} kg` : '—'}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
              <p className={labelClass}>Thay đổi</p>
              <p className="text-xl sm:text-3xl font-black" data-testid="weight-change">{changeText}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
              <p className={labelClass}>Thấp / Cao nhất</p>
              <p className="text-xl sm:text-3xl font-black">{summary ? `${summary.min} / ${summary.max}` : '—'}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-5 sm:p-8">
            <h2 className="text-lg font-bold mb-4">Cân nặng theo thời gian</h2>
            <BodyChart metrics={metrics} />
          </div>

          {profile && <CalorieAdvicePanel metrics={metrics} profile={profile} />}

          <form onSubmit={handleSubmit} noValidate className="bg-card border border-border rounded-3xl p-5 sm:p-8 space-y-5">
            <h2 className="text-lg font-bold">Ghi số đo</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <div>
                <label htmlFor="body-date" className={labelClass}>Ngày</label>
                <input id="body-date" type="date" value={date} max={today} onChange={e => setDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="body-weight" className={labelClass}>Cân nặng (kg)</label>
                <input id="body-weight" type="number" inputMode="decimal" step="0.1" value={form.weight} onChange={setField('weight')} className={inputClass} />
              </div>
              <div>
                <label htmlFor="body-fat" className={labelClass}>Tỷ lệ mỡ (%) — tùy chọn</label>
                <input id="body-fat" type="number" inputMode="decimal" step="0.1" value={form.bodyFat} onChange={setField('bodyFat')} className={inputClass} />
              </div>
              <div>
                <label htmlFor="body-waist" className={labelClass}>Vòng eo (cm) — tùy chọn</label>
                <input id="body-waist" type="number" inputMode="decimal" step="0.1" value={form.waist} onChange={setField('waist')} className={inputClass} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Ghi lại cùng một ngày sẽ thay thế số đo của ngày đó.</p>
            <button type="submit" disabled={saving} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer">
              {saving ? 'Đang lưu...' : 'Lưu số đo'}
            </button>
          </form>

          {history.length > 0 && (
            <div className="bg-card border border-border rounded-3xl p-5 sm:p-8">
              <h2 className="text-lg font-bold mb-4">Lịch sử</h2>
              <ul className="divide-y divide-border">
                {history.map(m => (
                  <li key={m.date} className="flex items-center justify-between py-3 text-sm" data-testid="history-row">
                    <span className="font-semibold">{m.date}</span>
                    <span className="flex items-center gap-4">
                      <span className="font-black">{m.weight} kg</span>
                      {m.bodyFat != null && <span className="text-muted-foreground">{m.bodyFat}% mỡ</span>}
                      {m.waist != null && <span className="text-muted-foreground">eo {m.waist} cm</span>}
                      <button type="button" onClick={() => handleDelete(m.date)} aria-label={`Xóa số đo ngày ${m.date}`} className="text-destructive hover:opacity-80 cursor-pointer">
                        <Trash2 className="size-4" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
