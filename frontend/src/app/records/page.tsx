'use client';
import { useEffect } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { fetcher, isUnauthorizedError } from '@/hooks/useApi';
import { chartPoints, pointsToPath } from '@/utils/bodyMetrics';
import { Trophy, Loader2 } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

export interface ExerciseRecord {
  name: string;
  best: { weight: number; date: string };
  last: { weight: number; date: string };
  sessions: { date: string; maxWeight: number; pr: boolean }[];
}

const W = 240;
const H = 70;

function Sparkline({ record }: { record: ExerciseRecord }) {
  const points = chartPoints(record.sessions.map(s => ({ date: s.date, weight: s.maxWeight, bodyFat: null, waist: null })), W, H, 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Mức tạ ${record.name} theo thời gian`} className="w-full h-auto">
      {points.length > 1 && <path d={pointsToPath(points)} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" className="text-primary" />}
      {points.map((p, i) => (
        <circle key={p.date} cx={p.x} cy={p.y} r={record.sessions[i].pr ? 4.5 : 3} className={record.sessions[i].pr ? 'fill-warning' : 'fill-primary'}>
          <title>{`${p.date}: ${p.weight} kg${record.sessions[i].pr ? ' (kỷ lục)' : ''}`}</title>
        </circle>
      ))}
    </svg>
  );
}

export default function RecordsPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<ExerciseRecord[]>('/api/workouts/records', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  useEffect(() => {
    if (isUnauthorizedError(error)) {
      localStorage.removeItem('token');
      router.push('/login');
    }
  }, [error, router]);

  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground font-sans">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    );
  }

  const records = data ?? [];

  return (
    <AppShell
      title="Kỷ lục cá nhân"
      icon={<Trophy className="size-6 text-primary" />}
      subtitle="Mức tạ nặng nhất bạn đã hoàn thành ở mỗi bài tập. Nhập mức tạ cho từng hiệp trong trang Tập luyện để theo dõi tiến bộ sức mạnh."
    >
      {error && !isUnauthorizedError(error) && (
        <div role="alert" className="p-4 rounded-2xl border bg-destructive/10 border-destructive/30 text-destructive text-xs font-semibold flex items-center justify-between gap-3">
          <span>Không tải được kỷ lục.</span>
          <button type="button" onClick={() => mutate()} className="underline cursor-pointer">Thử lại</button>
        </div>
      )}

      {!error && records.length === 0 && (
        <EmptyState icon={<Trophy className="size-7" />} title="Chưa có kỷ lục nào" hint="Nhập mức tạ (kg) cho một hiệp và đánh dấu hoàn thành để bắt đầu." action={{ label: "Đến trang tập luyện", href: "/workouts" }} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {records.map(r => (
          <section key={r.name} aria-label={r.name} className="bg-card border border-border rounded-3xl p-4 sm:p-5 space-y-3" data-testid="record-card">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-black">{r.name}</h2>
              <span className="text-xs font-bold text-muted-foreground">{r.sessions.length} buổi</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kỷ lục</p>
                <p className="text-2xl font-black text-warning">{r.best.weight} kg</p>
                <p className="text-xs text-muted-foreground">{r.best.date}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gần nhất</p>
                <p className="text-2xl font-black">{r.last.weight} kg</p>
                <p className="text-xs text-muted-foreground">{r.last.date}</p>
              </div>
            </div>
            <Sparkline record={r} />
          </section>
        ))}
      </div>
    </AppShell>
  );
}
