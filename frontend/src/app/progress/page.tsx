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

  // Daily Nutrition & Calorie Tracking State
  const [dailyCalories, setDailyCalories] = useState<number>(1850);
  const [dailyProtein, setDailyProtein] = useState<number>(120);
  const [dailyCarbs, setDailyCarbs] = useState<number>(210);
  const [dailyFat, setDailyFat] = useState<number>(55);
  const [isEditingCalories, setIsEditingCalories] = useState(false);
  const [tempCalories, setTempCalories] = useState('1850');

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
      } catch (err) {
        console.error('Failed to fetch progress data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Read workout streak history & structured logs from localStorage
    try {
      const history: string[] = JSON.parse(localStorage.getItem('smart_streak_history') || '[]');
      setStreakHistory(history);

      const logs = JSON.parse(localStorage.getItem('smart_workout_logs') || '{}');
      setWorkoutLogs(logs);

      // Default select today or most recent completed workout day
      const todayStr = new Date().toISOString().split('T')[0];
      if (history.includes(todayStr) || logs[todayStr]) {
        setSelectedCalendarDate(todayStr);
      } else if (history.length > 0) {
        setSelectedCalendarDate(history[history.length - 1]);
      } else {
        setSelectedCalendarDate(todayStr);
      }
    } catch (e) { }

    // Read saved daily calories if present
    const todayStr = new Date().toISOString().split('T')[0];
    const savedCal = localStorage.getItem(`smart_daily_cal_${todayStr}`);
    if (savedCal) {
      const val = parseInt(savedCal, 10);
      if (!isNaN(val)) {
        setDailyCalories(val);
        setTempCalories(val.toString());
      }
    }
  }, [router]);

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

  // Current Month Days Matrix
  const monthDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isCompleted = streakHistory.includes(dateStr) || Boolean(workoutLogs[dateStr]);
      const isToday = day === now.getDate();
      const isPast = day <= now.getDate();
      const logData = workoutLogs[dateStr];

      days.push({ day, dateStr, isCompleted, isToday, isPast, logData });
    }
    return days;
  }, [streakHistory, workoutLogs]);

  const monthCompletedCount = useMemo(() => {
    return monthDays.filter(d => d.isCompleted).length;
  }, [monthDays]);

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  }, []);

  const handleSaveCalories = () => {
    const val = parseInt(tempCalories, 10);
    if (!isNaN(val) && val >= 0) {
      setDailyCalories(val);
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem(`smart_daily_cal_${todayStr}`, val.toString());
    }
    setIsEditingCalories(false);
  };

  const caloriePercent = Math.min(100, Math.round((dailyCalories / targetCalories) * 100));

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
              <span className="text-xs text-slate-400 font-semibold">/ {monthDays.length} ngày</span>
            </div>
            <p className="text-[11px] text-emerald-400 font-bold">
              ✓ Đạt {Math.round((monthCompletedCount / monthDays.length) * 100)}% chỉ tiêu tháng
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
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">CALO HÔM NAY</span>
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
                {monthDays.map((item) => {
                  const isSelected = selectedCalendarDate === item.dateStr;
                  return (
                    <button
                      key={item.day}
                      onClick={() => setSelectedCalendarDate(item.dateStr)}
                      className={`p-2.5 sm:p-4 rounded-2xl flex flex-col items-center justify-between transition-all border cursor-pointer ${
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
                      <span className="text-xs sm:text-sm font-extrabold">{item.day}</span>
                      <span className="text-xs mt-1">
                        {item.isCompleted ? '✓' : item.isToday ? '🎯' : '•'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Legend Footer */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-3 border-t border-slate-800/80 text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#00FF87]" />
                  <span>Đã tập luyện</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#00E5FF]" />
                  <span>Hôm nay</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-slate-800" />
                  <span>Ngày nghỉ / Chưa tới</span>
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
                  {/* Routine & Day Schedule Badge */}
                  <div className="p-4 bg-[#0B101D] rounded-2xl border border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">LỊCH TẬP ĐÃ CHỌN (ROUTINE & SỬ DỤNG):</span>
                    <div className="flex items-center gap-2 text-sm font-extrabold text-white">
                      <span className="text-[#00E5FF]">🏋️ {selectedDayLog.routineName}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[#00FF87]">{selectedDayLog.dayName}</span>
                    </div>
                  </div>

                  {/* Exercises Done List */}
                  <div className="space-y-2.5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">DANH SÁCH BÀI TẬP ĐÃ THỰC HIỆN ({selectedDayLog.exercises?.length || 0} BÀI):</span>

                    {selectedDayLog.exercises && selectedDayLog.exercises.length > 0 ? (
                      <div className="space-y-2">
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
                    )}
                  </div>
                </div>
              ) : streakHistory.includes(selectedCalendarDate || '') ? (
                <div className="p-4 bg-[#0B101D] rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-[#00FF87] font-bold">
                    <span>✓</span> Ngày này bạn đã ghi nhận hoàn thành buổi tập!
                  </div>
                  <p className="text-slate-400">
                    Lịch tập mặc định: Push - Pull - Leg (Theo lịch tập luyện được chọn ở trang Workouts).
                  </p>
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs space-y-2">
                  <p className="font-bold text-slate-300">Không có nhật ký tập luyện cho ngày {selectedCalendarDate}.</p>
                  <p className="text-[11px]">Hãy bấm vào trang Lịch tập luyện để chốt danh sách bài tập và đánh dấu hoàn thành nhé!</p>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Daily Calorie & Macro Tracker */}
          <div className="lg:col-span-5 space-y-6">

            {/* Calorie & Macro Card */}
            <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🥗</span> Calo & Dinh Dưỡng Hôm Nay
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
                  <label className="block text-xs font-bold text-slate-300">Cập nhật Calo tiêu thụ hôm nay (kcal):</label>
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
    </div>
  );
}
