'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/utils/api';

const MUSCLE_NAMES_VI: Record<string, string> = {
  chest: 'Ngực (Chest)',
  'upper-back': 'Lưng trên (Upper Back)',
  'lower-back': 'Lưng dưới (Lower Back)',
  lats: 'Cơ xô (Lats)',
  trapezius: 'Cầu vai (Traps)',
  'front-deltoids': 'Vai trước/giữa (Delts)',
  'back-deltoids': 'Vai sau (Rear Delts)',
  biceps: 'Tay trước (Biceps)',
  triceps: 'Tay sau (Triceps)',
  forearm: 'Cẳng tay (Forearms)',
  quadriceps: 'Đùi trước (Quads)',
  hamstring: 'Đùi sau (Hamstrings)',
  adductor: 'Cơ khép (Adductors)',
  adductors: 'Cơ khép (Adductors)',
  calves: 'Bắp chân (Calves)',
  gluteal: 'Mông (Glutes)',
  abs: 'Bụng (Abs)',
  obliques: 'Cơ liên sườn (Obliques)',
  neck: 'Cổ (Neck)'
};

export default function ProgressPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // User Profile State
  const [userProfile, setUserProfile] = useState({
    name: 'Người dùng',
    age: 25,
    gender: 'Nam',
    height: 170,
    weight: 65,
    goal: 'Tăng cơ'
  });

  // Workout History & Logs State
  const [streakHistory, setStreakHistory] = useState<string[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<Record<string, {
    date: string;
    routineId?: string;
    routineName: string;
    dayName: string;
    exercises: Array<{ name: string; sets: number; reps: string; muscle?: string }>;
  }>>({});

  // Selected Day Tile State for Detailed View
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [isExerciseListCollapsed, setIsExerciseListCollapsed] = useState<boolean>(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  // Daily Nutrition & Calorie Tracking State
  const [dailyCalories, setDailyCalories] = useState<number>(0);
  const [dailyProtein, setDailyProtein] = useState<number>(0);
  const [dailyCarbs, setDailyCarbs] = useState<number>(0);
  const [dailyFat, setDailyFat] = useState<number>(0);
  const [isEditingCalories, setIsEditingCalories] = useState(false);
  const [tempCalories, setTempCalories] = useState('0');

  // Selected date nutrition data helper state
  const [selectedDateMeals, setSelectedDateMeals] = useState<Record<string, Array<{ id: string; name: string; calories: number; image?: string }>>>({
    'Bữa Sáng': [],
    'Bữa Trưa': [],
    'Bữa Tối': [],
    'Ăn Vặt': []
  });
  const [selectedDateWater, setSelectedDateWater] = useState<number>(0);

  // Helper for local YYYY-MM-DD date string (prevents UTC timezone shift bug)
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Fetch User Profile for BMR & TDEE calculation
        const res = await fetch(`${API_URL}/api/users/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setUserProfile({
            name: data.name || 'Người dùng',
            age: Number(data.age) || 25,
            gender: data.gender || 'Nam',
            height: Number(data.height) || 170,
            weight: Number(data.weight) || 65,
            goal: data.goal || 'Tăng cơ'
          });
        }

        // Fetch Streak History & Workout Logs from Backend API
        const [streakRes, logsRes] = await Promise.all([
          fetch(`${API_URL}/api/workouts/streak`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_URL}/api/workouts/logs`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (streakRes.ok && logsRes.ok) {
          const streakData = await streakRes.json();
          const logsData = await logsRes.json();

          if (streakData.streakDates) {
            setStreakHistory(streakData.streakDates);
          }
          if (logsData && Object.keys(logsData).length > 0) {
            setWorkoutLogs(logsData);
          }
        }
      } catch (err) {
        console.error('Failed to fetch progress data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Read workout streak history & structured logs from localStorage
    try {
      const todayStr = getTodayStr();
      setSelectedCalendarDate(todayStr);

      let history: string[] = JSON.parse(localStorage.getItem('smart_streak_history') || '[]');
      let logs = JSON.parse(localStorage.getItem('smart_workout_logs') || '{}');

      if (history.length > 0) {
        setStreakHistory(prev => prev.length > 0 ? prev : history);
      }
      if (Object.keys(logs).length > 0) {
        setWorkoutLogs(prev => Object.keys(prev).length > 0 ? prev : logs);
      }
    } catch (e) { }
  }, [router]);

  // Synchronize calories, macros, meals, workout logs & streak history with real-time event bus
  useEffect(() => {
    let isCancelled = false;

    const syncAllData = async () => {
      const targetDateStr = selectedCalendarDate || getTodayStr();

      const token = localStorage.getItem('token');
      if (token) {
        try {
          const nutRes = await fetch(`${API_URL}/api/nutrition?date=${targetDateStr}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (nutRes.ok) {
            const nutLog = await nutRes.json();
            if (nutLog) {
              const mealsObj = nutLog.meals || { 'Bữa Sáng': [], 'Bữa Trưa': [], 'Bữa Tối': [], 'Ăn Vặt': [] };
              if (!isCancelled) {
                setSelectedDateMeals(mealsObj);
                const allItems = Object.values(mealsObj).flat() as Array<{ calories?: number }>;
                const activeCal = allItems.reduce((sum, item) => sum + (item.calories || 0), 0);
                setDailyCalories(activeCal);
                setTempCalories(activeCal.toString());
                setSelectedDateWater(nutLog.waterGlasses || 0);
              }
              return;
            }
          }
        } catch (e) { }
      }

      try {
        const savedMeals = localStorage.getItem(`smart_meals_${targetDateStr}`);
        if (savedMeals) {
          const parsed = JSON.parse(savedMeals);
          if (!isCancelled) {
            setSelectedDateMeals(parsed);
            const allItems = Object.values(parsed).flat() as Array<{ calories: number }>;
            const activeCal = allItems.reduce((sum, item) => sum + (item.calories || 0), 0);
            setDailyCalories(activeCal);
            setTempCalories(activeCal.toString());
          }
        } else {
          if (!isCancelled) {
            setSelectedDateMeals({ 'Bữa Sáng': [], 'Bữa Trưa': [], 'Bữa Tối': [], 'Ăn Vặt': [] });
            const savedCal = localStorage.getItem(`smart_daily_cal_${targetDateStr}`);
            const activeCal = savedCal ? (parseInt(savedCal, 10) || 0) : 0;
            setDailyCalories(activeCal);
            setTempCalories(activeCal.toString());
          }
        }

        const savedWater = localStorage.getItem(`smart_water_${targetDateStr}`);
        if (!isCancelled) {
          setSelectedDateWater(savedWater ? (parseInt(savedWater, 10) || 0) : 0);
        }
      } catch (e) { }
    };

    syncAllData();

    window.addEventListener('storage', syncAllData);
    window.addEventListener('smart_nutrition_updated', syncAllData);
    window.addEventListener('smart_workout_updated', syncAllData);
    window.addEventListener('focus', syncAllData);

    return () => {
      isCancelled = true;
      window.removeEventListener('storage', syncAllData);
      window.removeEventListener('smart_nutrition_updated', syncAllData);
      window.removeEventListener('smart_workout_updated', syncAllData);
      window.removeEventListener('focus', syncAllData);
    };
  }, [selectedCalendarDate]);

  // Update dynamic macros whenever dailyCalories changes
  useEffect(() => {
    if (dailyCalories > 0) {
      setDailyProtein(Math.round((dailyCalories * 0.30) / 4));
      setDailyCarbs(Math.round((dailyCalories * 0.50) / 4));
      setDailyFat(Math.round((dailyCalories * 0.20) / 9));
    } else {
      setDailyProtein(0);
      setDailyCarbs(0);
      setDailyFat(0);
    }
  }, [dailyCalories]);

  // BMR Calculation (Mifflin-St Jeor Equation)
  const bmr = useMemo(() => {
    const { weight, height, age, gender } = userProfile;
    if (!weight || !height || !age) return 1600;
    if (gender === 'Nữ') {
      return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
    }
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  }, [userProfile]);

  // TDEE Calculation (Moderate Activity Factor 1.375)
  const tdee = useMemo(() => Math.round(bmr * 1.375), [bmr]);

  // Calorie Target based on User Goal
  const targetCalories = useMemo(() => {
    const goal = userProfile.goal;
    if (goal === 'Giảm mỡ') return Math.max(1200, tdee - 500);
    if (goal === 'Tăng cơ' || goal === 'Tăng cân') return tdee + 300;
    return tdee;
  }, [tdee, userProfile.goal]);

  // Current Month Days Matrix with Synchronized Calorie & Photo Data + Day of Week Padding Offset
  const monthDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Get starting day index (0 = Monday / T2, ..., 6 = Sunday / CN)
    let startDayIndex = firstDayOfMonth.getDay() - 1;
    if (startDayIndex === -1) startDayIndex = 6;

    const days: any[] = [];

    // Padding empty cells for days before the 1st of the month
    for (let i = 0; i < startDayIndex; i++) {
      days.push({ isPadding: true, key: `pad-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isCompleted = streakHistory.includes(dateStr) || Boolean(workoutLogs[dateStr]);
      const isToday = day === now.getDate();
      const isPast = day <= now.getDate();
      const logData = workoutLogs[dateStr];

      let dayCalories = 0;
      let photoCount = 0;

      if (typeof window !== 'undefined') {
        try {
          const savedMeals = localStorage.getItem(`smart_meals_${dateStr}`);
          if (savedMeals) {
            const parsed = JSON.parse(savedMeals);
            const allItems = Object.values(parsed).flat() as Array<{ calories?: number; image?: string }>;
            dayCalories = allItems.reduce((sum, item) => sum + (item.calories || 0), 0);
            photoCount = allItems.filter(item => Boolean(item.image)).length;
          } else {
            const savedCal = localStorage.getItem(`smart_daily_cal_${dateStr}`);
            if (savedCal) dayCalories = parseInt(savedCal, 10) || 0;
          }
        } catch (e) { }
      }

      days.push({
        isPadding: false,
        key: dateStr,
        day,
        dateStr,
        isCompleted,
        isToday,
        isPast,
        logData,
        dayCalories,
        photoCount,
        hasMeals: dayCalories > 0
      });
    }
    return days;
  }, [streakHistory, workoutLogs, selectedCalendarDate, dailyCalories]);

  const actualDaysInMonth = useMemo(() => {
    return monthDays.filter(d => !d.isPadding).length;
  }, [monthDays]);

  const monthCompletedCount = useMemo(() => {
    return monthDays.filter(d => !d.isPadding && d.isCompleted).length;
  }, [monthDays]);

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  }, []);

  const handleSaveCalories = () => {
    const val = parseInt(tempCalories, 10);
    if (isNaN(val) || val < 0 || val > 20000) {
      alert('Số Calo nạp vào phải là số không âm (từ 0 đến 20,000 kcal)!');
      return;
    }
    setDailyCalories(val);
    if (val > 0) {
      setDailyProtein(Math.round((val * 0.30) / 4));
      setDailyCarbs(Math.round((val * 0.50) / 4));
      setDailyFat(Math.round((val * 0.20) / 9));
    } else {
      setDailyProtein(0);
      setDailyCarbs(0);
      setDailyFat(0);
    }
    const targetDateStr = selectedCalendarDate || getTodayStr();
    localStorage.setItem(`smart_daily_cal_${targetDateStr}`, val.toString());
    setIsEditingCalories(false);
  };

  const caloriePercent = Math.min(100, Math.round((dailyCalories / targetCalories) * 100));

  const activeRoutineName = useMemo(() => {
    if (typeof window === 'undefined') return 'Lịch tập luyện';
    return (
      localStorage.getItem('smart_last_trained_routine_name') ||
      localStorage.getItem('smart_last_active_routine_name') ||
      'Lịch tập luyện'
    );
  }, []);

  // Selected Day Log Entry Details
  const selectedDayLog = useMemo(() => {
    if (!selectedCalendarDate) return null;
    return workoutLogs[selectedCalendarDate] || null;
  }, [selectedCalendarDate, workoutLogs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-400">Đang tải báo cáo tiến độ...</span>
        </div>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-[#0B0F19] text-white p-3 sm:p-6 md:p-8 relative overflow-x-hidden font-sans">
      {/* Ambient Neon Glow Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00E5FF]/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[#00FF87]/10 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-6">
        <Header />

        {/* Top Header Banner */}
        <div className="p-6 bg-[#131B2E]/90 backdrop-blur-2xl border border-slate-800/80 rounded-3xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-1 bg-emerald-950/80 text-[#00FF87] border border-emerald-500/40 rounded-full text-xs font-black uppercase tracking-wider">
                BÁO CÁO TỔNG QUAN
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <span>📈</span> Báo Cáo Tiến Độ & Thống Kê
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Theo dõi lịch tập luyện trong tháng, danh sách bài tập đã thực hiện và chỉ số dinh dưỡng Calo.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => router.push('/workouts')}
              className="px-4 py-2.5 bg-[#00E5FF] hover:bg-cyan-300 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-[#00E5FF]/20 transition active:scale-95 flex items-center gap-1.5"
            >
              <span>🏋️</span> Vào tập luyện
            </button>
          </div>
        </div>

        {/* High-Level Key Performance Indicators (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* KPI 1: Monthly Workouts */}
          <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-5 rounded-3xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">BUỔI TẬP THÁNG NÀY</span>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[#00E5FF] flex items-center justify-center text-lg">
                📅
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{monthCompletedCount}</span>
              <span className="text-xs text-slate-400 font-semibold">/ {actualDaysInMonth} ngày</span>
            </div>
            <p className="text-[11px] text-emerald-400 font-bold">
              ✓ Đạt {Math.round((monthCompletedCount / (actualDaysInMonth || 1)) * 100)}% chỉ tiêu tháng
            </p>
          </div>

          {/* KPI 2: Active Streak */}
          <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-5 rounded-3xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">CHUỖI STREAK</span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-lg">
                🔥
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{streakHistory.length}</span>
              <span className="text-xs text-slate-400 font-semibold">ngày liên tục</span>
            </div>
            <p className="text-[11px] text-amber-300 font-bold">
              ⚡ Kỷ lục rèn luyện cá nhân
            </p>
          </div>

          {/* KPI 3: Daily Calorie Progress */}
          <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-5 rounded-3xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                CALO NGÀY {selectedCalendarDate ? selectedCalendarDate.split('-').reverse().join('/') : 'HÔM NAY'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#00FF87] flex items-center justify-center text-lg">
                🥗
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#00FF87]">{dailyCalories}</span>
              <span className="text-xs text-slate-400 font-semibold">/ {targetCalories} kcal</span>
            </div>
            <div className="w-full h-2 bg-[#0B101D] rounded-full overflow-hidden border border-slate-800">
              <div className="h-full bg-gradient-to-r from-[#00E5FF] to-[#00FF87] transition-all duration-500" style={{ width: `${caloriePercent}%` }} />
            </div>
          </div>

          {/* KPI 4: Energy Expenditure (TDEE) */}
          <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-5 rounded-3xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">TDEE CHUYỂN HÓA</span>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center text-lg">
                ⚡
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-purple-300">{tdee}</span>
              <span className="text-xs text-slate-400 font-semibold">kcal/ngày</span>
            </div>
            <p className="text-[11px] text-purple-300 font-bold">
              BMR Cơ bản: {bmr} kcal
            </p>
          </div>

        </div>

        {/* Main Section Grid: Monthly Calendar Matrix (Left) + Daily Calorie & Detail Log (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

          {/* Left Column: Monthly Workout Attendance Matrix & Selected Day Details */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Calendar Card */}
            <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-wrap gap-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🗓️</span> Lịch Tập Luyện Trong Tháng ({currentMonthName})
                </h2>

                <span className="text-xs text-[#00FF87] bg-emerald-950/80 px-3 py-1 rounded-xl border border-emerald-500/40 font-bold">
                  {monthCompletedCount} buổi hoàn thành
                </span>
              </div>

              {/* Calendar Grid Header */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase">
                <span>T2</span>
                <span>T3</span>
                <span>T4</span>
                <span>T5</span>
                <span>T6</span>
                <span>T7</span>
                <span>CN</span>
              </div>

              {/* Monthly Day Tiles */}
              <div className="grid grid-cols-7 gap-2">
                {monthDays.map((item: any) => {
                  if (item.isPadding) {
                    return <div key={item.key} className="min-h-[64px] rounded-2xl bg-[#0B101D]/20 border border-slate-900/40 opacity-40" />;
                  }

                  const isSelected = selectedCalendarDate === item.dateStr;
                  return (
                    <button
                      key={item.day}
                      onClick={() => setSelectedCalendarDate(item.dateStr)}
                      className={`p-2.5 sm:p-3 rounded-2xl flex flex-col items-center justify-between transition-all border cursor-pointer min-h-[64px] ${
                        isSelected
                          ? 'ring-2 ring-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.4)] scale-105 z-10'
                          : ''
                      } ${
                        item.isCompleted
                          ? 'bg-[#00FF87]/10 border-[#00FF87]/60 text-[#00FF87]'
                          : item.isToday
                            ? 'bg-[#00E5FF]/10 border-[#00E5FF] text-[#00E5FF]'
                            : item.isPast
                              ? 'bg-[#0B101D] border-slate-800 text-slate-400'
                              : 'bg-[#0B101D]/40 border-slate-800/50 text-slate-600 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full text-xs">
                        <span className="font-extrabold">{item.day}</span>
                        <div className="flex items-center gap-1">
                          {item.photoCount > 0 && <span className="text-[10px]" title={`${item.photoCount} ảnh món ăn`}>📷</span>}
                          <span className="text-xs font-bold">
                            {item.isCompleted ? '✓' : item.isToday ? '🎯' : ''}
                          </span>
                        </div>
                      </div>

                      {item.hasMeals ? (
                        <span className="text-[11px] font-black text-[#00FF87] drop-shadow-sm mt-1">
                          {item.dayCalories}k
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-600 mt-1">-</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend Footer */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-3 border-t border-slate-800/80 text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#00FF87]" />
                  <span>Đã tập (✓)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#00E5FF]" />
                  <span>Hôm nay</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#00FF87]">1850k</span>
                  <span>Lượng Calo đã nạp</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">📷</span>
                  <span>Có ảnh món ăn</span>
                </div>
              </div>
            </div>

            {/* Selected Calendar Day Log Detail Card (TẬP GÌ, THUỘC LỊCH TẬP NÀO) */}
            <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📋</span> Chi tiết buổi tập ngày: <span className="text-[#00E5FF] font-black">{selectedCalendarDate}</span>
                </h3>

                {streakHistory.includes(selectedCalendarDate || '') && (
                  <span className="px-3 py-1 bg-emerald-950/80 text-[#00FF87] border border-emerald-500/40 text-xs font-bold rounded-xl">
                    ✓ Đã hoàn thành
                  </span>
                )}
              </div>

              {selectedDayLog ? (
                <div className="space-y-4">
                  {/* Routine & Day Schedule Badges */}
                  <div className="p-4 bg-[#0B101D] rounded-2xl border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">THÔNG TIN LỊCH TẬP & BUỔI TẬP:</span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-[#131B2E] p-3 rounded-xl border border-slate-800 flex flex-col justify-center">
                        <span className="text-slate-400 font-medium text-[11px] block">Lịch tập (Routine):</span>
                        <strong className="text-[#00E5FF] font-extrabold text-sm mt-0.5">🏋️ {selectedDayLog.routineName}</strong>
                      </div>
                      <div className="bg-[#131B2E] p-3 rounded-xl border border-slate-800 flex flex-col justify-center">
                        <span className="text-slate-400 font-medium text-[11px] block">Buổi tập trong lịch (Day):</span>
                        <strong className="text-[#00FF87] font-extrabold text-sm mt-0.5">🎯 {selectedDayLog.dayName}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Exercises Done List */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        DANH SÁCH BÀI TẬP ĐÃ THỰC HIỆN ({selectedDayLog.exercises?.length || 0} BÀI):
                      </span>

                      <button
                        onClick={() => setIsExerciseListCollapsed(prev => !prev)}
                        className="px-3 py-1 bg-[#18233C] hover:bg-slate-800 rounded-xl text-xs font-bold text-[#00E5FF] border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {isExerciseListCollapsed ? (
                          <>
                            <span>👁️ Mở rộng danh sách</span>
                            <svg className="w-3.5 h-3.5 text-[#00E5FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </>
                        ) : (
                          <>
                            <span>Thu gọn ✕</span>
                            <svg className="w-3.5 h-3.5 text-[#00E5FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>

                    {!isExerciseListCollapsed && (
                      selectedDayLog.exercises && selectedDayLog.exercises.length > 0 ? (
                        <div className="space-y-2 animate-in fade-in duration-300">
                          {selectedDayLog.exercises.map((ex, idx) => (
                            <div key={idx} className="p-3.5 bg-[#0E1526] border border-slate-800/90 rounded-2xl flex items-center justify-between gap-3 text-xs">
                              <div className="space-y-1 min-w-0">
                                <span className="font-extrabold text-white text-sm block truncate">
                                  {idx + 1}. {ex.name}
                                </span>
                                {ex.muscle && (
                                  <span className="text-emerald-400 font-semibold block text-[11px]">
                                    🎯 Nhóm cơ: {MUSCLE_NAMES_VI[ex.muscle.toLowerCase()] || ex.muscle}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="bg-[#0B101D] px-3 py-1 rounded-xl border border-slate-800 text-slate-200 font-bold">
                                  Hiệp: <strong className="text-[#00E5FF]">{ex.sets}</strong>
                                </span>
                                <span className="bg-[#0B101D] px-3 py-1 rounded-xl border border-slate-800 text-slate-200 font-bold">
                                  Lần: <strong className="text-[#00FF87]">{ex.reps}</strong>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic py-2">Chưa ghi nhận danh sách chi tiết các bài tập.</p>
                      )
                    )}
                  </div>
                </div>
              ) : streakHistory.includes(selectedCalendarDate || '') ? (
                <div className="p-5 bg-[#0B101D] rounded-2xl border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-[#00FF87] font-bold text-sm">
                    <span>✓</span> Ngày này bạn đã ghi nhận hoàn thành buổi tập!
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#131B2E] p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 font-medium text-[11px] block">Lịch tập đã chọn:</span>
                      <strong className="text-[#00E5FF] font-extrabold text-sm mt-0.5">🏋️ {activeRoutineName}</strong>
                    </div>
                    <div className="bg-[#131B2E] p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 font-medium text-[11px] block">Buổi tập trong tuần:</span>
                      <strong className="text-[#00FF87] font-extrabold text-sm mt-0.5">
                        🎯 {selectedCalendarDate ? ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][new Date(selectedCalendarDate).getDay()] : 'Buổi tập'}
                      </strong>
                    </div>
                  </div>

                  <p className="text-slate-400 text-[11px] pt-1">
                    💡 Ghi chú: Buổi tập này đã được chốt và tích xanh hoàn thành ở trang Lịch tập luyện (Workouts).
                  </p>
                </div>
              ) : (
                (() => {
                  const dayOfWeekName = selectedCalendarDate
                    ? ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][new Date(selectedCalendarDate).getDay()]
                    : 'Hôm nay';

                  return (
                    <div className="p-6 text-center bg-[#0B101D] border border-cyan-500/30 rounded-2xl space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-[#00E5FF] flex items-center justify-center text-2xl mx-auto">
                        🧘
                      </div>
                      <div>
                        <h4 className="font-extrabold text-white text-base">
                          {selectedCalendarDate} ({dayOfWeekName}) là Ngày Nghỉ Ngơi & Phục Hồi (Rest Day)
                        </h4>
                        <p className="text-slate-300 text-xs max-w-md mx-auto leading-relaxed mt-1">
                          Không có bài tập nào được thực hiện cho <strong className="text-[#00E5FF]">{dayOfWeekName} (ngày {selectedCalendarDate})</strong>. Đây là ngày nghỉ xả cơ để các nhóm cơ phục hồi hoàn toàn.
                        </p>
                      </div>
                      <div className="pt-1">
                        <button
                          onClick={() => router.push('/workouts')}
                          className="px-4 py-2 bg-[#18233C] hover:bg-slate-800 text-[#00E5FF] border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          🏋️ Xem danh sách lịch tập các ngày
                        </button>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Synchronized Daily Nutrition Log Section */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🥗</span> Nhật ký Dinh dưỡng ngày <span className="text-[#00E5FF]">{selectedCalendarDate}</span>
                  </h4>
                  <span className="text-xs font-bold text-[#00E5FF] bg-[#0B101D] px-3 py-1 rounded-xl border border-slate-800">
                    Tổng: {dailyCalories} / {targetCalories} kcal
                  </span>
                </div>

                {Object.values(selectedDateMeals).flat().length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                      { name: 'Bữa Sáng', icon: '🍳' },
                      { name: 'Bữa Trưa', icon: '🍱' },
                      { name: 'Bữa Tối', icon: '🥩' },
                      { name: 'Ăn Vặt', icon: '🍎' }
                    ].map(cat => {
                      const list = selectedDateMeals[cat.name] || [];
                      if (list.length === 0) return null;
                      const catCal = list.reduce((s, i) => s + (i.calories || 0), 0);

                      return (
                        <div key={cat.name} className="bg-[#0B101D] p-3 rounded-2xl border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-slate-300 font-bold border-b border-slate-800 pb-1.5 text-[11px]">
                            <span>{cat.icon} {cat.name}</span>
                            <span className="text-[#00E5FF]">{catCal} kcal</span>
                          </div>
                          <div className="space-y-1.5">
                            {list.map(item => (
                              <div key={item.id} className="flex items-center justify-between bg-[#131B2E] p-2 rounded-xl text-[11px]">
                                <div className="flex items-center gap-2">
                                  {item.image && (
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      onClick={() => setSelectedPreviewImage(item.image!)}
                                      className="w-8 h-8 rounded-lg object-cover cursor-pointer border border-slate-700 hover:border-[#00E5FF] transition-all"
                                      title="Bấm để xem ảnh"
                                    />
                                  )}
                                  <span className="text-slate-200 font-medium">{item.name}</span>
                                </div>
                                <span className="font-bold text-[#00E5FF]">{item.calories} kcal</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center bg-[#0B101D] rounded-2xl border border-slate-800 text-slate-400 text-xs">
                    Chưa ghi nhận khẩu phần ăn nào cho ngày này trên mục <span className="text-[#00E5FF] font-bold">Nhật ký ăn uống</span>.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Daily Calorie & Macro Tracker */}
          <div className="lg:col-span-5 space-y-6">

            {/* Calorie & Macro Card */}
            <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🥗</span> Calo & Dinh Dưỡng Ngày <span className="text-[#00E5FF]">{selectedCalendarDate ? selectedCalendarDate.split('-').reverse().join('/') : 'Hôm Nay'}</span>
                </h2>

                <button
                  onClick={() => setIsEditingCalories(prev => !prev)}
                  className="px-3 py-1.5 bg-[#18233C] hover:bg-slate-800 rounded-xl text-xs font-bold text-[#00E5FF] border border-slate-700 transition"
                >
                  {isEditingCalories ? 'Hủy' : '✏️ Nhập Calo'}
                </button>
              </div>

              {/* Edit Calorie Form */}
              {isEditingCalories && (
                <div className="p-4 bg-[#0B101D] rounded-2xl border border-cyan-500/30 space-y-3">
                  <label className="block text-xs font-bold text-slate-300">
                    Cập nhật Calo tiêu thụ ngày {selectedCalendarDate ? selectedCalendarDate.split('-').reverse().join('/') : 'hôm nay'} (kcal):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={tempCalories}
                      onChange={(e) => setTempCalories(e.target.value)}
                      className="flex-1 bg-[#131B2E] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#00E5FF]"
                    />
                    <button
                      onClick={handleSaveCalories}
                      className="px-4 py-2 bg-[#00E5FF] hover:bg-cyan-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition"
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              )}

              {/* Progress Circle & Target Comparison */}
              <div className="bg-[#0B101D] p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase">Mục tiêu Calo ({userProfile.goal}):</span>
                  <strong className="text-[#00FF87] font-black text-sm">{targetCalories} kcal</strong>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-white">Đã nạp: {dailyCalories} kcal</span>
                    <span className="text-cyan-400">{caloriePercent}%</span>
                  </div>
                  <div className="w-full h-3 bg-[#131B2E] rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-gradient-to-r from-[#00E5FF] to-[#00FF87] transition-all duration-500" style={{ width: `${caloriePercent}%` }} />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  <span>Còn lại cho phép:</span>
                  <strong className={targetCalories - dailyCalories >= 0 ? 'text-cyan-400' : 'text-rose-400'}>
                    {targetCalories - dailyCalories >= 0 ? `${targetCalories - dailyCalories} kcal` : `Vượt quá ${Math.abs(targetCalories - dailyCalories)} kcal`}
                  </strong>
                </div>
              </div>

              {/* Macro Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phân bổ chất dinh dưỡng (Macros):</h3>

                <div className="space-y-2.5">
                  {/* Protein */}
                  <div className="p-3 bg-[#0B101D] rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-cyan-400" />
                      <span className="font-bold text-white">Đạm (Protein):</span>
                    </div>
                    <strong className="text-cyan-400 font-black">{dailyProtein}g</strong>
                  </div>

                  {/* Carbs */}
                  <div className="p-3 bg-[#0B101D] rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-400" />
                      <span className="font-bold text-white">Tinh bột (Carbs):</span>
                    </div>
                    <strong className="text-amber-400 font-black">{dailyCarbs}g</strong>
                  </div>

                  {/* Fat */}
                  <div className="p-3 bg-[#0B101D] rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-400" />
                      <span className="font-bold text-white">Chất béo (Fat):</span>
                    </div>
                    <strong className="text-rose-400 font-black">{dailyFat}g</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Body Metrics & BMR Recommendations Card */}
            <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📊</span> Chỉ Số Chuyển Hóa Cá Nhân
                </h2>
                <button
                  onClick={() => router.push('/profile')}
                  className="text-xs text-[#00E5FF] hover:underline font-bold"
                >
                  Cập nhật Hồ sơ ↗
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#0B101D] p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block font-medium">Chiều cao / Cân nặng:</span>
                  <strong className="text-white text-sm font-black mt-1 block">{userProfile.height} cm / {userProfile.weight} kg</strong>
                </div>
                <div className="bg-[#0B101D] p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block font-medium">Mục tiêu hiện tại:</span>
                  <strong className="text-[#00FF87] text-sm font-black mt-1 block">{userProfile.goal}</strong>
                </div>
              </div>

              <div className="p-4 bg-[#0B101D] rounded-2xl border border-slate-800 space-y-2 text-xs">
                <h4 className="font-bold text-[#00E5FF] uppercase tracking-wider">Đề xuất mức Calo theo mục tiêu:</h4>
                <div className="space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span>🏋️ Tăng cơ (Lean Bulk):</span>
                    <strong className="text-emerald-400 font-black">{tdee + 300} kcal</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>🔥 Giảm mỡ (Fat Loss):</span>
                    <strong className="text-cyan-400 font-black">{Math.max(1200, tdee - 500)} kcal</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>⚖️ Giữ dáng (Maintenance):</span>
                    <strong className="text-amber-400 font-black">{tdee} kcal</strong>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Full Image Preview Modal Lightbox */}
      {selectedPreviewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedPreviewImage(null)}></div>
          <div className="relative bg-[#131B2E] border border-slate-800 rounded-3xl p-4 max-w-xl w-full shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute top-3 right-3 text-slate-300 hover:text-white text-xl font-bold bg-slate-900/80 rounded-full w-8 h-8 flex items-center justify-center border border-slate-700"
            >
              &times;
            </button>
            <img src={selectedPreviewImage} alt="Ảnh món ăn đầy đủ" className="w-full h-auto max-h-[75vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
