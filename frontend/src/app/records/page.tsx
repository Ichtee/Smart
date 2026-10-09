'use client';
import { useEffect } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
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
    <div suppressHydrationWarning className="min-h-screen bg-background text-foreground flex font-sans overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 p-4 md:p-8 lg:p-10 space-y-8 overflow-y-auto pb-28 md:pb-10">
        <div className="max-w-[1200px] w-full mx-auto space-y-6">
          <div className="border-b border-border pb-6">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              <Trophy className="size-8 text-primary" /> Kỷ lục cá nhân
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-semibold mt-1">
              Mức tạ nặng nhất bạn đã hoàn thành ở mỗi bài tập. Nhập mức tạ cho từng hiệp trong trang Tập luyện để theo dõi tiến bộ sức mạnh.
            </p>
          </div>

          {error && !isUnauthorizedError(error) && (
            <div role="alert" className="p-4 rounded-2xl border bg-destructive/10 border-destructive/30 text-destructive text-xs font-semibold flex items-center justify-between gap-3">
              <span>Không tải được kỷ lục.</span>
              <button type="button" onClick={() => mutate()} className="underline cursor-pointer">Thử lại</button>
            </div>
          )}

          {!error && records.length === 0 && (
            <EmptyState icon={<Trophy className="size-7" />} title="Chưa có kỷ lục nào" hint="Nhập mức tạ (kg) cho một hiệp và đánh dấu hoàn thành để bắt đầu." action={{ label: "Đến trang tập luyện", href: "/workouts" }} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {records.map(r => (
              <section key={r.name} aria-label={r.name} className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-3" data-testid="record-card">
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
        </div>
      </main>
    </div>
  );
}
