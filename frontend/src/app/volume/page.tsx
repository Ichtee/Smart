'use client';
import { useEffect } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { fetcher, isUnauthorizedError } from '@/hooks/useApi';
import { MUSCLE_NAMES_VI } from '../workouts/utils';
import { BarChart3, Loader2 } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

export interface WeeklyVolume {
  from: string;
  to: string;
  weeks: string[]; // Monday of each week, oldest first
  muscles: { muscle: string; total: number; weekly: number[] }[]; // sets done per week
}

const WEEKS_SHOWN = 12;
const BAR_W = 14;
const GAP = 4;
const H = 64;

/** "2026-09-07" -> "07/09" */
const shortDate = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

function WeekBars({ name, weeks, values, max }: { name: string; weeks: string[]; values: number[]; max: number }) {
  const width = weeks.length * (BAR_W + GAP) - GAP;
  return (
    <svg viewBox={`0 0 ${width} ${H}`} role="img" aria-label={`Số hiệp ${name} theo tuần`} className="w-full h-auto">
      {values.map((v, i) => {
        const h = v === 0 ? 2 : Math.max(4, Math.round((v / max) * (H - 4)));
        return (
          <rect key={weeks[i]} x={i * (BAR_W + GAP)} y={H - h} width={BAR_W} height={h} rx={3} className={v === 0 ? 'fill-border' : 'fill-primary'}>
            <title>{`Tuần ${shortDate(weeks[i])}: ${v} hiệp`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

export default function VolumePage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<WeeklyVolume>('/api/workouts/volume', fetcher, {
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

  // Only the most recent weeks; muscles with no sets in them are left out.
  const weeks = (data?.weeks ?? []).slice(-WEEKS_SHOWN);
  const skipped = (data?.weeks.length ?? 0) - weeks.length;
  const rows = (data?.muscles ?? [])
    .map(m => {
      const weekly = m.weekly.slice(skipped);
      return { muscle: m.muscle, weekly, total: weekly.reduce((a, b) => a + b, 0) };
    })
    .filter(m => m.total > 0)
    .sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...rows.flatMap(r => r.weekly));

  return (
    <AppShell
      title="Khối lượng tập theo tuần"
      icon={<BarChart3 className="size-6 text-primary" />}
      subtitle={`Số hiệp bạn đã hoàn thành cho từng nhóm cơ trong ${WEEKS_SHOWN} tuần gần nhất (tuần bắt đầu từ thứ Hai).`}
    >
      {error && !isUnauthorizedError(error) && (
        <div role="alert" className="p-4 rounded-2xl border bg-destructive/10 border-destructive/30 text-destructive text-xs font-semibold flex items-center justify-between gap-3">
          <span>Không tải được khối lượng tập.</span>
          <button type="button" onClick={() => mutate()} className="underline cursor-pointer">Thử lại</button>
        </div>
      )}

      {!error && rows.length === 0 && (
        <EmptyState icon={<BarChart3 className="size-7" />} title="Chưa có hiệp nào được hoàn thành trong thời gian này." hint="Hoàn thành một hiệp ở trang Tập luyện để xem khối lượng theo nhóm cơ." action={{ label: "Đến trang tập luyện", href: "/workouts" }} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {rows.map(r => {
          const name = MUSCLE_NAMES_VI[r.muscle] || r.muscle;
          const average = r.total / weeks.length;
          return (
            <section key={r.muscle} aria-label={name} className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-3" data-testid="volume-card">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-black">{name}</h2>
                <span className="text-xs font-bold text-muted-foreground">{r.total} hiệp</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tuần này: <span className="font-bold text-foreground">{r.weekly[r.weekly.length - 1]}</span> hiệp · Trung bình {average.toFixed(1)} hiệp/tuần
              </p>
              <WeekBars name={name} weeks={weeks} values={r.weekly} max={max} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{shortDate(weeks[0])}</span>
                <span>{shortDate(weeks[weeks.length - 1])}</span>
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
