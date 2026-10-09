'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiFetch } from '@/utils/api';
import { fetcher, useProfile, useStreak, isUnauthorizedError } from '@/hooks/useApi';
import { monthAndWeekRange, monthRange, monthKey } from '@/utils/dateUtils';
import { waterGoalMl } from '@/utils/waterGoal';
import { calcTargetCalories, macroTargets, sumMacros } from '@/utils/nutritionCalc';
import MetabolismCard from './MetabolismCard';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ShieldCheck, Flame, Droplets, Calendar, Dumbbell, ChevronDown, ChevronUp, Trash2, CheckCircle2, Play, ClipboardList, Utensils, Target } from 'lucide-react';
import Card from '@/components/ui/Card';
import ProgressRing from '@/components/ui/ProgressRing';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useConfirm, useToast } from '@/components/ui/feedback';
import type { MealItem } from '@/app/nutrition/types';

const MUSCLE_NAMES_VI: Record<string, string> = {
  chest: 'Ngực (Chest)', 'upper-back': 'Lưng trên', 'lower-back': 'Lưng dưới', lats: 'Cơ xô (Lats)',
  trapezius: 'Cầu vai (Traps)', 'front-deltoids': 'Vai trước (Delts)', 'back-deltoids': 'Vai sau',
  biceps: 'Tay trước (Biceps)', triceps: 'Tay sau (Triceps)', forearm: 'Cẳng tay',
  quadriceps: 'Đùi trước (Quads)', hamstring: 'Đùi sau', adductor: 'Cơ khép', adductors: 'Cơ khép',
  calves: 'Bắp chân', gluteal: 'Mông (Glutes)', abs: 'Bụng (Abs)', obliques: 'Cơ liên sườn', neck: 'Cổ'
};

interface ProfileData {
  name?: string;
  role?: string;
  height?: number;
  weight?: number;
  age?: number;
  gender?: string;
  activityLevel?: string;
  goal?: string;
  goalPace?: string;
  targetWeight?: number | null;
  bodyFat?: number | null;
  calorieAdjustment?: number;
  lastActiveRoutineName?: string;
  lastActiveRoutineId?: string;
}

// What the log endpoints return for one day
interface LoggedExercise {
  name: string;
  muscle?: string;
  sets?: number;
  reps?: string | number;
  completed?: boolean;
}
interface WorkoutLogEntry {
  routineName?: string;
  dayName?: string;
  exercises?: LoggedExercise[];
}
interface NutritionDay {
  meals?: Record<string, MealItem[]>;
  waterGlasses?: number;
  dayCalories?: number;
  photoCount?: number;
}

const EMPTY_MEALS: Record<string, MealItem[]> = { 'Bữa Sáng': [], 'Bữa Trưa': [], 'Bữa Tối': [], 'Ăn Vặt': [] };

export default function Dashboard() {
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();


  // Calendar Month State
  const [calendarDate, setCalendarDate] = useState(new Date());

  // ── Diary (from progress page) ──────────────────────────────────────────
  const [selectedDiaryDate, setSelectedDiaryDate] = useState<string | null>(null);
  const [isExerciseListCollapsed, setIsExerciseListCollapsed] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const getWeekDaysMonToSun = useCallback((refDate: Date = new Date()) => {
    const d = new Date(refDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));

    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      const y = dayDate.getFullYear();
      const m = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dayNum = String(dayDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${dayNum}`;
    });
  }, []);

  // ── Data layer: shared SWR cache, the server is the only source of truth ─────────────
  const { profile: profileData, error: profileError, isLoading: profileLoading, mutate: mutateProfile } = useProfile();
  const profile: ProfileData = useMemo(() => profileData ?? {}, [profileData]);
  const userName = profile.name || '';
  const userRole = profile.role || '';
  const isLoading = profileLoading && !profileData;

  useEffect(() => {
    if (isUnauthorizedError(profileError)) {
      localStorage.removeItem('token');
      router.push('/login');
    }
  }, [profileError, router]);

  const { streak, mutate: mutateStreak } = useStreak();
  const streakDates: string[] = useMemo(() => streak?.streakDates ?? [], [streak]);
  // The "streak" is the run of CONSECUTIVE days (what the Workouts page shows), not the number of days ever trained
  const streakCount: number = streak?.current ?? 0;

  // Logs are date-ranged: the current month + week are always loaded (today and the streak),
  // other months load on demand when the calendar navigates there. SWR caches each range.
  const currentRange = monthAndWeekRange();
  const viewedRange = monthRange(calendarDate);
  const viewingCurrentMonth = monthKey(calendarDate) === monthKey(new Date());
  const logsOpts = { revalidateOnFocus: false, shouldRetryOnError: false };
  const currentQs = `?from=${currentRange.from}&to=${currentRange.to}`;
  const viewedQs = `?from=${viewedRange.from}&to=${viewedRange.to}`;

  const { data: wCurrent, mutate: mutateWCurrent } = useSWR<Record<string, WorkoutLogEntry>>(`/api/workouts/logs${currentQs}`, fetcher, logsOpts);
  const { data: nCurrent } = useSWR<Record<string, NutritionDay>>(`/api/nutrition/logs${currentQs}`, fetcher, logsOpts);
  const { data: wViewed, mutate: mutateWViewed } = useSWR<Record<string, WorkoutLogEntry>>(viewingCurrentMonth ? null : `/api/workouts/logs${viewedQs}`, fetcher, logsOpts);
  const { data: nViewed } = useSWR<Record<string, NutritionDay>>(viewingCurrentMonth ? null : `/api/nutrition/logs${viewedQs}`, fetcher, logsOpts);

  const workoutLogs: Record<string, WorkoutLogEntry> = useMemo(() => ({ ...(wViewed || {}), ...(wCurrent || {}) }), [wViewed, wCurrent]);
  const nutritionLogs: Record<string, NutritionDay> = useMemo(() => ({ ...(nViewed || {}), ...(nCurrent || {}) }), [nViewed, nCurrent]);

  const { data: todayNutrition } = useSWR<NutritionDay>(`/api/nutrition?date=${todayStr}`, fetcher, logsOpts);
  const todayMeals: MealItem[] = useMemo(() => Object.values(todayNutrition?.meals || {}).flat(), [todayNutrition]);
  const todayWaterGlasses: number = todayNutrition?.waterGlasses || 0;
  const waterGoal = waterGoalMl(profile.weight, profile.age);

  const { data: diaryNutrition } = useSWR<NutritionDay>(
    selectedDiaryDate ? `/api/nutrition?date=${selectedDiaryDate}` : null,
    fetcher,
    logsOpts
  );
  const selectedDateMeals: Record<string, MealItem[]> = diaryNutrition?.meals || EMPTY_MEALS;
  const selectedDateWater: number = diaryNutrition?.waterGlasses || 0;

  const handleDeleteWorkoutLog = useCallback(async (targetDate: string) => {
    if (!(await confirm({ message: `Xóa nhật ký tập ngày ${targetDate}?`, tone: 'danger' }))) return;
    try {
      const res = await apiFetch(`/api/workouts?date=${targetDate}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await Promise.all([mutateWCurrent(), mutateWViewed(), mutateStreak()]);
    } catch {
      toast.error('Không xóa được nhật ký tập. Vui lòng thử lại.');
    }
  }, [confirm, toast, mutateWCurrent, mutateWViewed, mutateStreak]);

  const targetCalories = useMemo(() => calcTargetCalories(profile), [profile]);

  const consumed = useMemo(() => sumMacros(todayMeals), [todayMeals]);
  const consumedCalories = consumed.calories;

  const { protein: targetProteinGrams } = macroTargets(targetCalories, profile);
  const consumedProteinGrams = consumed.protein;

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let startDayIdx = firstDay.getDay() - 1;
    if (startDayIdx === -1) startDayIdx = 6;
    const days: Array<{ day: number | null; dateStr: string; isActive: boolean; isToday: boolean }> = [];
    for (let i = 0; i < startDayIdx; i++) {
      days.push({ day: null, dateStr: '', isActive: false, isToday: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isActive = streakDates.includes(dStr);
      const isToday = dStr === todayStr;
      days.push({ day: d, dateStr: dStr, isActive, isToday });
    }
    return days;
  }, [calendarDate, streakDates, todayStr]);

  const monthYearLabel = calendarDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  const prevMonth = () => { setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)); };
  const nextMonth = () => { setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)); };

  const completedThisWeek = useMemo(() => {
    const weekDates = getWeekDaysMonToSun(new Date());
    let count = 0;
    for (const dStr of weekDates) {
      if (streakDates.includes(dStr)) count++;
    }
    return count;
  }, [streakDates, getWeekDaysMonToSun]);

  const trainedToday = streakDates.includes(todayStr);
  const todayLabel = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto max-w-5xl p-4 md:p-8"><PageSkeleton rows={3} /></main>
      </div>
    );
  }

  return (
    <AppShell title="Tổng quan" subtitle={`Xin chào, ${userName}!`} actions={userRole === 'admin' && (
              <button onClick={() => router.push('/dashboard/admin')} className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-bold text-xs hover:bg-primary/20 transition cursor-pointer">
                <ShieldCheck className="size-5" /> Admin Panel
              </button>
            )}>
        {!!profileError && !isUnauthorizedError(profileError) && (
          <div className="bg-destructive/10 border border-destructive/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-destructive">
            <p className="font-extrabold text-white">Không tải được hồ sơ. Một số chỉ số đang hiển thị giá trị mặc định.</p>
            <button onClick={() => { mutateProfile(); }} className="px-4 py-2 bg-primary text-primary-foreground font-black rounded-xl text-xs shrink-0 cursor-pointer">🔄 Thử lại</button>
          </div>
        )}

        {/* three columns on a wide screen, each one scrolls on its own if it has to; stacked below that */}

        {/* Today: what to do now, and how the day is going */}
        <div className="flex flex-col gap-4 2xl:min-h-0 2xl:flex-1">
        <section aria-label="Hôm nay" className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card tone="highlight" className="flex flex-col justify-between gap-3 xl:col-span-5 2xl:col-span-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{todayLabel}</p>
              <h2 className="mt-1 font-display text-3xl font-bold">Buổi tập hôm nay</h2>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Dumbbell className="size-5 text-primary shrink-0" />
                <span className="truncate">{profile.lastActiveRoutineName || 'Lịch tập tự do'}</span>
              </p>
            </div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Chuỗi ngày tập</p>
                <p className="flex items-center gap-2 font-display text-5xl font-bold leading-none text-pr">
                  <Flame className="size-8 shrink-0" aria-hidden="true" />
                  <span>{streakCount}</span>
                  <span className="text-xl font-semibold text-muted-foreground"> ngày</span>
                </p>
              </div>
              {trainedToday ? (
                <span className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-5 text-base font-bold text-success">
                  <CheckCircle2 className="size-5" /> Đã tập hôm nay
                </span>
              ) : (
                <Link href="/workouts" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90 active:scale-[0.98]">
                  <Play className="size-5 fill-current" /> Bắt đầu
                </Link>
              )}
            </div>
          </Card>

          <Card className="xl:col-span-7 2xl:col-span-8">
            <h2 className="mb-3 font-display text-xl font-bold">Hôm nay bạn đã đạt</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-sm font-semibold text-muted-foreground">Calo</p>
                <ProgressRing value={consumedCalories} max={targetCalories} label="Calo hôm nay" colorClass="text-primary" size={88}>
                  <span className="font-display text-xl font-bold leading-none">{consumedCalories}</span>
                  <span className="text-xs text-muted-foreground">/ {targetCalories} kcal</span>
                </ProgressRing>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-sm font-semibold text-muted-foreground">Protein</p>
                <ProgressRing value={consumedProteinGrams} max={targetProteinGrams} label="Protein hôm nay" colorClass="text-protein" size={88}>
                  <span className="font-display text-xl font-bold leading-none">{Math.round(consumedProteinGrams)}</span>
                  <span className="text-xs text-muted-foreground">/ {targetProteinGrams} g</span>
                </ProgressRing>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-sm font-semibold text-muted-foreground">Uống nước</p>
                <ProgressRing value={todayWaterGlasses * 250} max={waterGoal} label="Nước uống hôm nay" colorClass="text-fat" size={88}>
                  <span className="font-display text-xl font-bold leading-none">{todayWaterGlasses * 250}</span>
                  <span className="text-xs text-muted-foreground">/ {waterGoal} ml</span>
                </ProgressRing>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-sm font-semibold text-muted-foreground">Buổi tập tuần này</p>
                <ProgressRing value={completedThisWeek} max={7} label="Buổi tập tuần này" colorClass="text-success" size={88}>
                  <span className="font-display text-xl font-bold leading-none">{completedThisWeek}</span>
                  <span className="text-xs text-muted-foreground">/ 7 buổi</span>
                </ProgressRing>
              </div>
            </div>
          </Card>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:min-h-0 2xl:flex-1 2xl:grid-cols-3">
          {/* CARD 1: UNIFIED INTERACTIVE WORKOUT & NUTRITION CALENDAR */}
            <div className="bg-card border border-border p-4 md:p-5 rounded-3xl space-y-3 2xl:min-h-0 2xl:overflow-y-auto">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-base md:text-lg font-black text-foreground flex items-center gap-2">
                  <Calendar className="size-5 text-primary" /> Lịch tập & ăn uống
                </h2>
                <div className="flex items-center gap-3 text-sm md:text-base font-bold text-muted-foreground">
                  <button onClick={prevMonth} className="p-1.5 hover:text-foreground cursor-pointer rounded-lg hover:bg-secondary transition"><ChevronLeft className="size-5" /></button>
                  <span className="font-extrabold text-foreground">{monthYearLabel}</span>
                  <button onClick={nextMonth} className="p-1.5 hover:text-foreground cursor-pointer rounded-lg hover:bg-secondary transition"><ChevronRight className="size-5" /></button>
                </div>
              </div>

              {/* Days Header */}
              <div className="grid grid-cols-7 gap-1.5 text-center text-xs md:text-sm font-bold text-muted-foreground uppercase">
                <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
              </div>

              {/* Interactive Date Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((item, idx) => {
                  if (item.day === null) {
                    return <div key={`empty-${idx}`} className="min-h-10 rounded-xl bg-secondary/10 border border-border/20 opacity-30" />;
                  }

                  const isSelected = selectedDiaryDate === item.dateStr;
                  const nutLog = nutritionLogs[item.dateStr];
                  const dayCal = nutLog ? (nutLog.dayCalories || 0) : 0;
                  const hasPhoto = nutLog ? (nutLog.photoCount || 0) > 0 : false;

                  return (
                    <button
                      key={item.dateStr}
                      onClick={() => { setSelectedDiaryDate(item.dateStr); setIsExerciseListCollapsed(false); }}
                      className={`p-1.5 rounded-xl flex flex-col items-center justify-between transition-all border cursor-pointer min-h-11 ${
                        isSelected ? 'ring-2 ring-primary shadow-[0_0_15px_rgba(var(--primary-rgb,0,229,255),0.4)] scale-105 z-10' : ''
                      } ${
                        item.isToday
                          ? 'bg-primary/10 border-primary text-primary font-black'
                          : item.isActive
                            ? 'bg-primary/10 border-primary/50 text-primary'
                            : 'bg-secondary/40 border-border text-foreground hover:bg-secondary/70'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full text-xs md:text-sm">
                        <span className="font-extrabold">{item.day}</span>
                        <div className="flex items-center gap-0.5">
                          {hasPhoto && <span className="text-xs" title="Có ảnh món ăn">📷</span>}
                          <span className="text-xs">{item.isActive ? '✓' : item.isToday ? '🎯' : ''}</span>
                        </div>
                      </div>

                      {dayCal > 0 ? (
                        <span className="text-xs md:text-xs font-black text-primary mt-1">{dayCal} kcal</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40 mt-1">-</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border text-xs md:text-sm text-muted-foreground font-semibold">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-primary" />
                  <span>Đã tập</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-lg bg-primary/20 border border-primary text-primary flex items-center justify-center text-xs font-bold">🎯</span>
                  <span>Hôm nay</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">📷</span>
                  <span>Có ảnh bữa ăn</span>
                </div>
              </div>
            </div>

          <div className="2xl:order-last 2xl:min-h-0 2xl:overflow-y-auto">
            <MetabolismCard profile={profile} />
          </div>
            {selectedDiaryDate ? (
              <div className="bg-card border border-border rounded-3xl p-4 md:p-5 space-y-4 animate-in fade-in duration-300 xl:col-span-2 2xl:col-span-1 2xl:min-h-0 2xl:overflow-y-auto">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-4">
                  <h3 className="text-base md:text-xl font-black text-foreground flex items-center gap-2">
                    <ClipboardList className="size-5 text-primary" aria-hidden="true" /> Chi tiết nhật ký ngày <span className="text-primary">{selectedDiaryDate}</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    {streakDates.includes(selectedDiaryDate) && (
                      <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/30 text-xs font-bold rounded-xl">✓ Đã hoàn thành buổi tập</span>
                    )}
                    {workoutLogs[selectedDiaryDate] && (
                      <button
                        onClick={() => handleDeleteWorkoutLog(selectedDiaryDate)}
                        className="px-3 py-1 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="size-3.5" /> Xóa nhật ký
                      </button>
                    )}
                  </div>
                </div>

                {/* Workout Details */}
                {(() => {
                  const log = workoutLogs[selectedDiaryDate];
                  if (!log) return (
                    <div className="p-5 text-center bg-secondary/40 rounded-2xl border border-border text-muted-foreground text-sm">
                      {streakDates.includes(selectedDiaryDate)
                        ? <p>✓ Ngày này bạn đã hoàn thành buổi tập!</p>
                        : <p>🧘 Không có buổi tập nào được ghi nhận cho ngày này.</p>}
                    </div>
                  );
                  const completedEx = (log.exercises || []).filter(ex => ex.completed !== false);
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-secondary/50 p-4 rounded-2xl border border-border">
                          <span className="text-xs text-muted-foreground font-medium block">Lịch tập (Routine)</span>
                          <strong className="text-primary font-black text-sm md:text-base mt-0.5 flex items-center gap-1.5"><Dumbbell className="size-4" aria-hidden="true" /> {log.routineName || 'Tự do'}</strong>
                        </div>
                        <div className="bg-secondary/50 p-4 rounded-2xl border border-border">
                          <span className="text-xs text-muted-foreground font-medium block">Buổi tập (Day)</span>
                          <strong className="text-success font-black text-sm md:text-base mt-0.5 flex items-center gap-1.5"><Target className="size-4" aria-hidden="true" /> {log.dayName || '-'}</strong>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bài tập đã thực hiện ({completedEx.length})</span>
                          <button
                            onClick={() => setIsExerciseListCollapsed(p => !p)}
                            className="px-3 py-1 bg-secondary hover:bg-secondary/80 rounded-xl text-xs font-bold text-primary border border-border transition flex items-center gap-1 cursor-pointer"
                          >
                            {isExerciseListCollapsed ? <><ChevronDown className="size-3.5" />Mở rộng</> : <><ChevronUp className="size-3.5" />Thu gọn</>}
                          </button>
                        </div>
                        {!isExerciseListCollapsed && (
                          completedEx.length > 0 ? (
                            <div className="space-y-2">
                              {completedEx.map((ex, idx) => (
                                <div key={idx} className="p-3.5 bg-secondary/50 border border-border rounded-2xl flex items-center justify-between gap-3 text-sm">
                                  <div className="space-y-0.5 min-w-0">
                                    <span className="font-extrabold text-foreground block truncate">{idx+1}. {ex.name}</span>
                                    {ex.muscle && <span className="text-primary text-xs font-semibold flex items-center gap-1"><Target className="size-3.5" aria-hidden="true" /> {MUSCLE_NAMES_VI[ex.muscle.toLowerCase()] || ex.muscle}</span>}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 text-xs">
                                    <span className="bg-background px-3 py-1 rounded-xl border border-border font-bold">Hiệp: <strong className="text-primary">{ex.sets}</strong></span>
                                    <span className="bg-background px-3 py-1 rounded-xl border border-border font-bold">Lần: <strong className="text-success">{String(ex.reps || '10').match(/\d+/)?.[0] || '10'}</strong></span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : <p className="text-sm text-muted-foreground italic">Chưa hoàn thành bài tập nào.</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Nutrition Details for Selected Day */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-foreground flex items-center gap-2"><Utensils className="size-4 text-primary" aria-hidden="true" /> Nhật ký ăn uống ngày <span className="text-primary">{selectedDiaryDate}</span></h4>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20">
                      {Object.values(selectedDateMeals).flat().reduce((s, i) => s + (i.calories || 0), 0)} kcal
                    </span>
                  </div>
                  {selectedDateWater > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                      <Droplets className="size-4 text-primary" /> Nước uống: <strong className="text-primary">{selectedDateWater * 250} ml</strong> ({selectedDateWater} ly)
                    </div>
                  )}
                  {Object.values(selectedDateMeals).flat().length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[{name:'Bữa Sáng',icon:'🍳'},{name:'Bữa Trưa',icon:'🍱'},{name:'Bữa Tối',icon:'🥩'},{name:'Ăn Vặt',icon:'🍎'}].map(cat => {
                        const list = selectedDateMeals[cat.name] || [];
                        if (list.length === 0) return null;
                        const catCal = list.reduce((s, i) => s + (i.calories || 0), 0);
                        return (
                          <div key={cat.name} className="bg-secondary/50 p-4 rounded-2xl border border-border space-y-2">
                            <div className="flex items-center justify-between text-sm font-bold border-b border-border pb-2">
                              <span>{cat.icon} {cat.name}</span>
                              <span className="text-primary">{catCal} kcal</span>
                            </div>
                            <div className="space-y-1.5">
                              {list.map(item => (
                                <div key={item.id} className="flex items-center justify-between bg-background p-2 rounded-xl text-xs">
                                  <div className="flex items-center gap-2">
                                    {item.image && (
                                      <img src={item.image} alt={item.name} onClick={() => setPreviewImage(item.image ?? null)} className="w-8 h-8 rounded-lg object-cover cursor-pointer border border-border hover:border-primary transition" />
                                    )}
                                    <span className="text-foreground font-medium">{item.name}</span>
                                  </div>
                                  <span className="font-bold text-primary">{item.calories} kcal</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center bg-secondary/40 rounded-2xl border border-border text-muted-foreground text-sm">
                      Chưa ghi nhận khẩu phần ăn nào cho ngày này.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="hidden items-center justify-center rounded-3xl border border-dashed border-border p-6 text-center text-sm font-semibold text-muted-foreground 2xl:flex">
                Chọn một ngày trên lịch để xem chi tiết tập luyện và ăn uống.
              </div>
            )}
          </div>
        </div>


      {/* Image preview modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setPreviewImage(null)} />
          <div className="relative bg-card border border-border rounded-3xl p-4 max-w-xl w-full shadow-2xl z-10">
            <button onClick={() => setPreviewImage(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-xl font-bold bg-secondary rounded-full w-8 h-8 flex items-center justify-center border border-border">&times;</button>
            <img src={previewImage} alt="Ảnh món ăn" className="w-full h-auto max-h-[75vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </AppShell>
  );
}
