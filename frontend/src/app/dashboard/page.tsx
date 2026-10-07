'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import GoogleTranslate from '@/components/GoogleTranslate';
import { apiFetch } from '@/utils/api';
import { fetcher, useProfile, useStreak, isUnauthorizedError } from '@/hooks/useApi';
import { monthAndWeekRange, monthRange, monthKey } from '@/utils/dateUtils';
import { calcBmr, calcTdee, calcTargetCalories, macroTargets, sumMacros } from '@/utils/nutritionCalc';
import { Bell, ChevronLeft, ChevronRight, User, ShieldCheck, Flame, Droplets, Calendar, Trophy, Dumbbell, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

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
  lastActiveRoutineName?: string;
  lastActiveRoutineId?: string;
}

const EMPTY_MEALS: Record<string, any[]> = { 'Bữa Sáng': [], 'Bữa Trưa': [], 'Bữa Tối': [], 'Ăn Vặt': [] };

export default function Dashboard() {
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

  // Logs are date-ranged: the current month + week are always loaded (weekly chart, today),
  // other months load on demand when the calendar navigates there. SWR caches each range.
  const weekDates = useMemo(() => getWeekDaysMonToSun(new Date()), [getWeekDaysMonToSun]);
  const currentRange = monthAndWeekRange();
  const viewedRange = monthRange(calendarDate);
  const viewingCurrentMonth = monthKey(calendarDate) === monthKey(new Date());
  const logsOpts = { revalidateOnFocus: false, shouldRetryOnError: false };
  const currentQs = `?from=${currentRange.from}&to=${currentRange.to}`;
  const viewedQs = `?from=${viewedRange.from}&to=${viewedRange.to}`;

  const { data: wCurrent, mutate: mutateWCurrent } = useSWR(`/api/workouts/logs${currentQs}`, fetcher, logsOpts);
  const { data: nCurrent } = useSWR(`/api/nutrition/logs${currentQs}`, fetcher, logsOpts);
  const { data: wViewed, mutate: mutateWViewed } = useSWR(viewingCurrentMonth ? null : `/api/workouts/logs${viewedQs}`, fetcher, logsOpts);
  const { data: nViewed } = useSWR(viewingCurrentMonth ? null : `/api/nutrition/logs${viewedQs}`, fetcher, logsOpts);

  const workoutLogs: Record<string, any> = useMemo(() => ({ ...(wViewed || {}), ...(wCurrent || {}) }), [wViewed, wCurrent]);
  const nutritionLogs: Record<string, any> = useMemo(() => ({ ...(nViewed || {}), ...(nCurrent || {}) }), [nViewed, nCurrent]);

  const { data: todayNutrition } = useSWR(`/api/nutrition?date=${todayStr}`, fetcher, logsOpts);
  const todayMeals: any[] = useMemo(() => Object.values(todayNutrition?.meals || {}).flat() as any[], [todayNutrition]);
  const todayWaterGlasses: number = todayNutrition?.waterGlasses || 0;

  const weeklyCalories: number[] = useMemo(
    () => weekDates.map(d => nutritionLogs[d]?.dayCalories || 0),
    [weekDates, nutritionLogs]
  );

  const { data: diaryNutrition } = useSWR(
    selectedDiaryDate ? `/api/nutrition?date=${selectedDiaryDate}` : null,
    fetcher,
    logsOpts
  );
  const selectedDateMeals: Record<string, any[]> = diaryNutrition?.meals || EMPTY_MEALS;
  const selectedDateWater: number = diaryNutrition?.waterGlasses || 0;

  const handleDeleteWorkoutLog = useCallback(async (targetDate: string) => {
    if (!confirm(`Xóa nhật ký tập ngày ${targetDate}?`)) return;
    try {
      const res = await apiFetch(`/api/workouts?date=${targetDate}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await Promise.all([mutateWCurrent(), mutateWViewed(), mutateStreak()]);
    } catch {
      alert('Không xóa được nhật ký tập. Vui lòng thử lại.');
    }
  }, [mutateWCurrent, mutateWViewed, mutateStreak]);

  const targetCalories = useMemo(() => calcTargetCalories(profile), [profile]);

  const consumed = useMemo(() => sumMacros(todayMeals), [todayMeals]);
  const consumedCalories = consumed.calories;

  const { protein: targetProteinGrams, carbs: targetCarbsGrams, fat: targetFatGrams } = macroTargets(targetCalories);
  const consumedProteinGrams = consumed.protein;
  const consumedCarbsGrams = consumed.carbs;
  const consumedFatGrams = consumed.fat;
  const proteinPct = Math.min(100, Math.round((consumedProteinGrams / (targetProteinGrams || 1)) * 100));
  const carbsPct = Math.min(100, Math.round((consumedCarbsGrams / (targetCarbsGrams || 1)) * 100));
  const fatPct = Math.min(100, Math.round((consumedFatGrams / (targetFatGrams || 1)) * 100));

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

  const monthYearLabel = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground font-sans">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-base font-bold text-muted-foreground">Đang tải Dashboard...</span>
        </div>
      </div>
    );
  }

  const todayDateString = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  const maxCalInWeek = Math.max(targetCalories, ...weeklyCalories, 100);
  const svgPoints = weeklyCalories.map((val, idx) => {
    const x = (idx / 6) * 460 + 20;
    const y = 120 - (val / maxCalInWeek) * 90;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 p-4 md:p-8 lg:p-10 space-y-8 overflow-y-auto pb-28 md:pb-10">
        {!!profileError && !isUnauthorizedError(profileError) && (
          <div className="bg-rose-500/10 border border-rose-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rose-300">
            <p className="font-extrabold text-white">Không tải được hồ sơ. Một số chỉ số đang hiển thị giá trị mặc định.</p>
            <button onClick={() => { mutateProfile(); }} className="px-4 py-2 bg-primary text-primary-foreground font-black rounded-xl text-xs shrink-0 cursor-pointer">🔄 Thử lại</button>
          </div>
        )}

        <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Dashboard</h1>
            <span className="text-muted-foreground text-base md:text-lg font-semibold">| Welcome Back, {userName}!</span>
          </div>
          <div className="flex items-center gap-4">
            <GoogleTranslate />
            {userRole === 'admin' && (
              <button onClick={() => router.push('/dashboard/admin')} className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary font-bold text-sm hover:bg-primary/20 transition cursor-pointer">
                <ShieldCheck className="size-5" /> Admin Panel
              </button>
            )}
            <button className="relative p-3 rounded-full bg-card hover:bg-surface-elevated border border-border transition text-foreground cursor-pointer">
              <Bell className="size-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 size-2.5 rounded-full bg-primary animate-pulse" />
            </button>
            <button onClick={() => router.push('/profile')} className="size-11 rounded-full bg-primary/15 border border-primary/30 text-primary flex items-center justify-center font-extrabold text-base cursor-pointer hover:scale-105 transition">
              <User className="size-5" />
            </button>
          </div>
        </header>

        <div className="bg-card border border-border p-6 md:p-8 rounded-3xl shadow-2xl space-y-6">
          <h2 className="text-lg md:text-2xl font-black text-foreground">Activity & Training Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-secondary/50 p-5 rounded-2xl border border-border space-y-3">
              <div className="flex items-center justify-between text-sm md:text-base font-bold">
                <span className="text-muted-foreground flex items-center gap-2"><Dumbbell className="size-5 text-primary" /> Workouts (Tuần)</span>
                <span className="text-foreground font-black">{completedThisWeek} / 7</span>
              </div>
              <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, Math.round((completedThisWeek / 7) * 100))}%` }} />
              </div>
            </div>
            <div className="bg-secondary/50 p-5 rounded-2xl border border-border space-y-3">
              <div className="flex items-center justify-between text-sm md:text-base font-bold">
                <span className="text-muted-foreground flex items-center gap-2"><Flame className="size-5 text-primary" /> Workout Streak</span>
                <span className="text-primary font-black">{streakDates.length} ngày</span>
              </div>
              <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, streakDates.length * 10)}%` }} />
              </div>
            </div>
            <div className="bg-secondary/50 p-5 rounded-2xl border border-border flex items-center justify-between">
              <div>
                <p className="text-sm md:text-base font-bold text-muted-foreground flex items-center gap-2"><Droplets className="size-5 text-primary" /> Uống Nước</p>
                <p className="text-2xl md:text-3xl font-black text-foreground mt-1">{todayWaterGlasses * 250} <span className="text-xs md:text-sm font-semibold text-muted-foreground">ml</span></p>
              </div>
              <div className="relative size-14 flex items-center justify-center">
                <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                  <path className="text-secondary" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-primary" strokeDasharray={`${Math.min(100, Math.round(((todayWaterGlasses * 250) / 2000) * 100))}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>
            </div>
            <div className="bg-secondary/50 p-5 rounded-2xl border border-border flex items-center justify-between">
              <div>
                <p className="text-sm md:text-base font-bold text-muted-foreground flex items-center gap-2"><Trophy className="size-5 text-primary" /> Lịch Tập Hiện Tại</p>
                <p className="text-base md:text-lg font-black text-foreground mt-1 truncate max-w-[180px]">{profile.lastActiveRoutineName || 'Lịch tập tự do'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Column (Columns 1-7) */}
          <div className="lg:col-span-7 space-y-8">

            {/* CARD 1: UNIFIED INTERACTIVE WORKOUT & NUTRITION CALENDAR */}
            <div className="bg-card border border-border p-6 md:p-8 rounded-3xl shadow-2xl space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg md:text-2xl font-black text-foreground flex items-center gap-3">
                  <Calendar className="size-6 text-primary" /> Workout & Nutrition Calendar
                </h2>
                <div className="flex items-center gap-3 text-sm md:text-base font-bold text-muted-foreground">
                  <button onClick={prevMonth} className="p-1.5 hover:text-foreground cursor-pointer rounded-lg hover:bg-secondary transition"><ChevronLeft className="size-5" /></button>
                  <span className="font-extrabold text-foreground">{monthYearLabel}</span>
                  <button onClick={nextMonth} className="p-1.5 hover:text-foreground cursor-pointer rounded-lg hover:bg-secondary transition"><ChevronRight className="size-5" /></button>
                </div>
              </div>

              {/* Days Header */}
              <div className="grid grid-cols-7 gap-1.5 text-center text-xs md:text-sm font-bold text-muted-foreground uppercase">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>

              {/* Interactive Date Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((item, idx) => {
                  if (item.day === null) {
                    return <div key={`empty-${idx}`} className="min-h-[56px] rounded-2xl bg-secondary/10 border border-border/20 opacity-30" />;
                  }

                  const isSelected = selectedDiaryDate === item.dateStr;
                  const nutLog = nutritionLogs[item.dateStr];
                  const dayCal = nutLog ? (nutLog.dayCalories || 0) : 0;
                  const hasPhoto = nutLog ? (nutLog.photoCount || 0) > 0 : false;

                  return (
                    <button
                      key={item.dateStr}
                      onClick={() => { setSelectedDiaryDate(item.dateStr); setIsExerciseListCollapsed(false); }}
                      className={`p-2 rounded-2xl flex flex-col items-center justify-between transition-all border cursor-pointer min-h-[58px] ${
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
                          {hasPhoto && <span className="text-[10px]" title="Có ảnh món ăn">📷</span>}
                          <span className="text-xs">{item.isActive ? '✓' : item.isToday ? '🎯' : ''}</span>
                        </div>
                      </div>

                      {dayCal > 0 ? (
                        <span className="text-[10px] md:text-xs font-black text-primary mt-1">{dayCal} kcal</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40 mt-1">-</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-border text-xs md:text-sm text-muted-foreground font-semibold">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-primary" />
                  <span>Đã tập (Logged workout)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-lg bg-primary/20 border border-primary text-primary flex items-center justify-center text-[10px] font-bold">🎯</span>
                  <span>Hôm nay (Today)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">📷</span>
                  <span>Có ảnh bữa ăn</span>
                </div>
              </div>
            </div>

            {/* SELECTED DAY DETAIL LOG BLOCK */}
            {selectedDiaryDate ? (
              <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-4">
                  <h3 className="text-base md:text-xl font-black text-foreground flex items-center gap-2">
                    📋 Chi tiết nhật ký ngày <span className="text-primary">{selectedDiaryDate}</span>
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
                  const completedEx = (log.exercises || []).filter((ex: any) => ex.completed !== false);
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-secondary/50 p-4 rounded-2xl border border-border">
                          <span className="text-xs text-muted-foreground font-medium block">Lịch tập (Routine)</span>
                          <strong className="text-primary font-black text-sm md:text-base mt-0.5 block">🏋️ {log.routineName || 'Tự do'}</strong>
                        </div>
                        <div className="bg-secondary/50 p-4 rounded-2xl border border-border">
                          <span className="text-xs text-muted-foreground font-medium block">Buổi tập (Day)</span>
                          <strong className="text-green-400 font-black text-sm md:text-base mt-0.5 block">🎯 {log.dayName || '-'}</strong>
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
                              {completedEx.map((ex: any, idx: number) => (
                                <div key={idx} className="p-3.5 bg-secondary/50 border border-border rounded-2xl flex items-center justify-between gap-3 text-sm">
                                  <div className="space-y-0.5 min-w-0">
                                    <span className="font-extrabold text-foreground block truncate">{idx+1}. {ex.name}</span>
                                    {ex.muscle && <span className="text-primary text-xs font-semibold block">🎯 {MUSCLE_NAMES_VI[ex.muscle.toLowerCase()] || ex.muscle}</span>}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 text-xs">
                                    <span className="bg-background px-3 py-1 rounded-xl border border-border font-bold">Hiệp: <strong className="text-primary">{ex.sets}</strong></span>
                                    <span className="bg-background px-3 py-1 rounded-xl border border-border font-bold">Lần: <strong className="text-green-400">{String(ex.reps || '10').match(/\d+/)?.[0] || '10'}</strong></span>
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
                    <h4 className="text-sm font-black text-foreground flex items-center gap-2">🥗 Nhật ký ăn uống ngày <span className="text-primary">{selectedDiaryDate}</span></h4>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20">
                      {Object.values(selectedDateMeals).flat().reduce((s: number, i: any) => s + (i.calories || 0), 0)} kcal
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
                        const catCal = list.reduce((s: number, i: any) => s + (i.calories || 0), 0);
                        return (
                          <div key={cat.name} className="bg-secondary/50 p-4 rounded-2xl border border-border space-y-2">
                            <div className="flex items-center justify-between text-sm font-bold border-b border-border pb-2">
                              <span>{cat.icon} {cat.name}</span>
                              <span className="text-primary">{catCal} kcal</span>
                            </div>
                            <div className="space-y-1.5">
                              {list.map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between bg-background p-2 rounded-xl text-xs">
                                  <div className="flex items-center gap-2">
                                    {item.image && (
                                      <img src={item.image} alt={item.name} onClick={() => setPreviewImage(item.image)} className="w-8 h-8 rounded-lg object-cover cursor-pointer border border-border hover:border-primary transition" />
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
            ) : null}

          </div>

          {/* Right Column (Columns 8-12) */}
          <div className="lg:col-span-5 space-y-8">

            {/* CARD 5: BMR / TDEE & GOAL ADVICE */}
            <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-base md:text-lg font-black text-foreground flex items-center gap-2">📊 Chỉ Số Chuyển Hóa</h3>
                <button onClick={() => router.push('/profile')} className="text-xs text-primary hover:underline font-bold">Cập nhật Hồ sơ ↗</button>
              </div>
              {(() => {
                const w = Number(profile.weight) || 65;
                const h = Number(profile.height) || 170;
                const bmr = calcBmr(profile);
                const tdee = calcTdee(profile);
                const goal = profile.goal || 'Giữ dáng';
                const target = calcTargetCalories(profile);
                const pct = Math.min(100, Math.round((consumedCalories / target) * 100));
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-secondary/50 p-4 rounded-2xl border border-border">
                        <span className="text-xs text-muted-foreground block">Chiều cao / Cân nặng</span>
                        <strong className="text-foreground text-base font-black mt-1 block">{h} cm / {w} kg</strong>
                      </div>
                      <div className="bg-secondary/50 p-4 rounded-2xl border border-border">
                        <span className="text-xs text-muted-foreground block">Mục tiêu</span>
                        <strong className="text-primary text-base font-black mt-1 block">{goal}</strong>
                      </div>
                    </div>

                    <div className="bg-secondary/50 p-5 rounded-2xl border border-border space-y-2">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Gợi ý Calo theo mục tiêu</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">🏋️ Tăng cơ</span><strong className="text-green-400">{tdee + 300} kcal</strong></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">🔥 Giảm mỡ</span><strong className="text-primary">{Math.max(1200, tdee - 500)} kcal</strong></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">⚖️ Giữ dáng</span><strong className="text-yellow-400">{tdee} kcal</strong></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-secondary/50 p-4 rounded-2xl border border-border text-center">
                        <span className="text-xs text-muted-foreground block">BMR</span>
                        <strong className="text-foreground text-xl font-black">{bmr.toLocaleString()}</strong>
                        <span className="text-xs text-muted-foreground block">kcal/ngày</span>
                      </div>
                      <div className="bg-secondary/50 p-4 rounded-2xl border border-border text-center">
                        <span className="text-xs text-muted-foreground block">TDEE</span>
                        <strong className="text-primary text-xl font-black">{tdee.toLocaleString()}</strong>
                        <span className="text-xs text-muted-foreground block">kcal/ngày</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>

        </div>

      </main>

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
    </div>
  );
}
