'use client';
import { useState, useEffect } from 'react';
import Model from 'react-body-highlighter';
import Link from 'next/link';
import Header from '@/components/Header';
import { useLanguage } from '@/contexts/LanguageContext';

const DEFAULT_ROUTINES = {
  none: {
    id: 'none',
    name: 'Tự do (Không theo lịch)',
    schedule: []
  }
};

const VALID_MODEL_MUSCLES = new Set([
  'trapezius', 'upper-back', 'lower-back', 'chest', 'biceps', 'triceps',
  'forearm', 'back-deltoids', 'front-deltoids', 'abs', 'obliques',
  'adductor', 'abductors', 'hamstring', 'quadriceps', 'calves',
  'gluteal', 'head', 'neck', 'knees', 'left-soleus', 'right-soleus'
]);

const normalizeMuscleId = (id: string): string => {
  if (!id) return '';
  if (id === 'adductors') return 'adductor';
  return id;
};

const DAY_ORDER: Record<string, number> = {
  'Thứ 2': 1,
  'Thứ 3': 2,
  'Thứ 4': 3,
  'Thứ 5': 4,
  'Thứ 6': 5,
  'Thứ 7': 6,
  'Chủ nhật': 7,
};

export default function Workouts() {
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [modelType, setModelType] = useState<'anterior' | 'posterior'>('anterior');
  const [activeRoutineId, setActiveRoutineId] = useState<string>('ppl');
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(0);
  const [routinesMap, setRoutinesMap] = useState<Record<string, any>>(DEFAULT_ROUTINES);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const [exercises, setExercises] = useState<any[]>([]);
  const [streakDays, setStreakDays] = useState<number>(1);
  const { t, lang } = useLanguage();

  const updateExercise = (id: string, field: string, value: any) => {
    setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
  };

  useEffect(() => {
    fetch('http://localhost:5000/api/routines', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const newMap: Record<string, any> = { ...DEFAULT_ROUTINES };
        data.forEach((r: any) => {
          newMap[r.id] = r;
        });
        setRoutinesMap(newMap);
      })
      .catch(err => console.error('Failed to fetch routines', err));

    fetch('http://localhost:5000/api/exercises', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const todayDateStr = new Date().toISOString().split('T')[0];
        let savedCompletedIds: string[] = [];
        try {
          const savedStr = localStorage.getItem(`completed_ex_${todayDateStr}`);
          if (savedStr) savedCompletedIds = JSON.parse(savedStr);
        } catch (e) {}

        const mappedData = data.map((ex: any) => ({
          id: ex._id,
          muscle: ex.muscle,
          name: ex.name,
          sets: ex.defaultSets || 3,
          reps: ex.defaultReps || '10-12',
          selected: false,
          completed: savedCompletedIds.includes(ex._id)
        }));
        setExercises(mappedData);
      })
      .catch(err => console.error('Failed to fetch exercises', err));

    // Load streak data
    try {
      const history = JSON.parse(localStorage.getItem('smart_streak_history') || '[]');
      setStreakDays(Math.max(1, history.length));
    } catch (e) {}

    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeRoutine = routinesMap[activeRoutineId];

  const sortedSchedule = (activeRoutine?.schedule || []).slice().sort((a: any, b: any) => {
    const orderA = DAY_ORDER[a.day] || 99;
    const orderB = DAY_ORDER[b.day] || 99;
    return orderA - orderB;
  });

  // Real-time Today calendar info
  const realTodayString = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][new Date().getDay()];
  const realTodayWorkout = sortedSchedule.find((s: any) => s.day === realTodayString);

  useEffect(() => {
    if (sortedSchedule.length > 0) {
      const matchIndex = sortedSchedule.findIndex((s: any) => s.day === realTodayString);

      if (matchIndex !== -1) {
        setCurrentDayIndex(matchIndex);
      } else if (currentDayIndex >= sortedSchedule.length) {
        setCurrentDayIndex(0);
      }
    }
  }, [activeRoutineId, routinesMap]);

  const safeDayIndex = sortedSchedule.length && currentDayIndex >= sortedSchedule.length
    ? 0
    : currentDayIndex;

  const currentTabWorkout = sortedSchedule.length ? sortedSchedule[safeDayIndex] : null;

  const handleClick = (muscle: any) => {
    const muscleId = muscle && muscle.muscle ? muscle.muscle : (typeof muscle === 'string' ? muscle : null);
    if (muscleId) {
      setSelectedMuscle(prev => prev === muscleId ? null : muscleId);
    }
  };

  const toggleCompleteExercise = (id: string) => {
    const todayDateStr = new Date().toISOString().split('T')[0];
    setExercises(prev => {
      const updated = prev.map(ex => ex.id === id ? { ...ex, completed: !ex.completed } : ex);
      const completedIds = updated.filter(ex => ex.completed).map(ex => ex.id);
      localStorage.setItem(`completed_ex_${todayDateStr}`, JSON.stringify(completedIds));

      if (completedIds.length > 0) {
        const history: string[] = JSON.parse(localStorage.getItem('smart_streak_history') || '[]');
        if (!history.includes(todayDateStr)) {
          const newHistory = [...history, todayDateStr];
          localStorage.setItem('smart_streak_history', JSON.stringify(newHistory));
          setStreakDays(newHistory.length);
        }
      }
      return updated;
    });
  };

  let highlighterData: any[] = [];
  let modelColors = ['#00E5FF', '#00FF87'];

  if (currentTabWorkout && currentTabWorkout.targets && currentTabWorkout.targets.length > 0) {
    const rawMuscles = currentTabWorkout.targets.map((t: any) => normalizeMuscleId(t.id));
    const allMuscles = Array.from(new Set(rawMuscles)).filter(m => VALID_MODEL_MUSCLES.has(m)) as string[];
    const safeSelected = selectedMuscle ? normalizeMuscleId(selectedMuscle) : null;

    if (safeSelected && VALID_MODEL_MUSCLES.has(safeSelected)) {
      highlighterData = [
        { name: 'All', muscles: allMuscles },
        { name: 'Selected', muscles: [safeSelected] }
      ];
      modelColors = ['#00E5FF', '#00FF87'];
    } else {
      highlighterData = [
        { name: currentTabWorkout.name, muscles: allMuscles }
      ];
      modelColors = ['#00E5FF'];
    }
  } else if (selectedMuscle) {
    const safeSelected = normalizeMuscleId(selectedMuscle);
    if (VALID_MODEL_MUSCLES.has(safeSelected)) {
      highlighterData = [
        { name: 'Selected', muscles: [safeSelected] }
      ];
      modelColors = ['#00FF87'];
    }
  }

  const formattedTime = currentTime ? currentTime.toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '20:16:36';
  const formattedDate = currentTime ? currentTime.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Thu, Aug 13, 2026';

  const selectedExList = exercises.filter(ex => ex.selected);
  const completedCount = selectedExList.filter(ex => ex.completed).length;
  const progressPercent = selectedExList.length > 0 ? Math.round((completedCount / selectedExList.length) * 100) : 0;

  return (
    <div suppressHydrationWarning className="min-h-screen bg-[#0B0F19] text-white p-4 md:p-8 relative overflow-hidden font-sans">
      {/* Smart Ambient Glow Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00E5FF]/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[#00FF87]/10 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-6">
        <Header />

        {/* Top Control Bar: Brand / Live Time / Routine Selector */}
        <div className="p-6 bg-[#131B2E]/90 backdrop-blur-2xl border border-slate-800/80 rounded-3xl shadow-2xl shadow-black/80 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00E5FF] to-[#00FF87] p-0.5 shadow-lg shadow-[#00E5FF]/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#0B0F19] rounded-[14px] flex items-center justify-center">
                <span className="text-xl font-black text-[#00E5FF]">⚡</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Smart
              </h1>
              <p className="text-xs text-slate-400 font-medium">Hệ thống Quản lý & Luyện tập Thông minh</p>
            </div>
          </div>

          {/* Live Time Clock Widget */}
          <div suppressHydrationWarning className="flex items-center gap-3 bg-[#0B101D] px-5 py-3 rounded-2xl border border-slate-800/80 shadow-inner">
            <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#00FF87] animate-ping" />
              <span className="text-[10px] font-bold text-[#00FF87] uppercase tracking-wider">LIVE</span>
            </div>
            <span className="text-2xl font-mono font-black text-[#00E5FF] tracking-tight">{formattedTime}</span>
            <span className="text-xs text-slate-400 font-medium border-l border-slate-800 pl-3">{formattedDate}</span>
          </div>

          {/* Active Routine Selection */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Lịch tập:</label>
            <select
              value={activeRoutineId}
              onChange={(e) => setActiveRoutineId(e.target.value)}
              className="bg-[#0B101D] border border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#00E5FF] text-sm font-semibold shadow-sm"
            >
              {Object.values(routinesMap).map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Dashboard Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Stat 1: Progress */}
          <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-5 rounded-3xl flex items-center gap-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-xl font-bold">
              📋
            </div>
            <div className="flex-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">TIẾN ĐỘ BÀI TẬP TRONG NGÀY</span>
              <span className="text-xl font-extrabold text-white">{progressPercent}% Hoàn Thành</span>
              <div className="w-full h-2 bg-[#0B101D] rounded-full mt-2 overflow-hidden border border-slate-800">
                <div className="h-full bg-gradient-to-r from-[#00E5FF] to-[#00FF87] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>

          {/* Stat 2: Mode */}
          <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-5 rounded-3xl flex items-center gap-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#00FF87] text-xl font-bold">
              🏋️
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">CHẾ ĐỘ TẬP LUYỆN</span>
              <span className="text-xl font-extrabold text-[#00FF87]">{activeRoutine?.name || 'Push - Pull - Leg'}</span>
            </div>
          </div>

          {/* Stat 3: Streak */}
          <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-5 rounded-3xl flex items-center gap-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xl font-bold">
              🔥
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">CHUỖI NGÀY TẬP (STREAK)</span>
              <span className="text-xl font-extrabold text-white">{streakDays} Ngày Liên Tục</span>
            </div>
          </div>

        </div>

        {/* Day Selector Navigation Row */}
        <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[#00E5FF] text-lg">🧬</span>
              <h2 className="text-lg font-bold text-white tracking-wide">Lịch Tập Theo Ngày</h2>
            </div>
            
            {/* Real-time calendar today indicator */}
            <div className="text-xs font-bold text-slate-400 bg-[#0B101D] px-3.5 py-1.5 rounded-xl border border-slate-800/90">
              Hôm nay: <span className="text-[#00E5FF] font-black">
                {realTodayWorkout ? `${realTodayWorkout.day} - ${realTodayWorkout.name}` : realTodayString}
              </span>
            </div>
          </div>

          {/* Day Selector Tabs */}
          {sortedSchedule.length > 0 && activeRoutineId !== 'none' && (
            <div className="flex overflow-x-auto gap-3 pb-2 custom-scrollbar">
              {sortedSchedule.map((dayObj: any, index: number) => {
                const isRealToday = dayObj.day === realTodayString;
                const isActive = safeDayIndex === index;

                return (
                  <button
                    key={index}
                    onClick={() => setCurrentDayIndex(index)}
                    className={`relative px-6 py-3 rounded-2xl text-xs font-extrabold transition-all duration-300 flex flex-col items-center min-w-[125px] ${
                      isActive
                        ? 'bg-[#00E5FF] text-slate-950 shadow-[0_0_20px_rgba(0,229,255,0.4)] scale-105 z-10'
                        : 'bg-[#18233C] border border-slate-800/90 text-slate-400 hover:bg-[#1E2C4F] hover:text-white'
                    }`}
                  >
                    {isRealToday && (
                      <span className={`absolute -top-2.5 px-2 py-0.5 text-[9px] font-black rounded-full shadow-md uppercase tracking-wider ${
                        isActive
                          ? 'bg-[#00FF87] text-slate-950 border border-emerald-950 animate-bounce'
                          : 'bg-emerald-500 text-slate-950 border border-emerald-400 animate-pulse'
                      }`}>
                        📌 HÔM NAY
                      </span>
                    )}
                    <span className="uppercase tracking-wider opacity-80 mb-0.5">{dayObj.day}</span>
                    <span className="text-sm font-black">{dayObj.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Main Workouts Layout: Body Highlighter (Left) + Detailed List (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Body Map */}
          <div className="lg:col-span-5 bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-between">
            <div className="flex justify-between items-center w-full mb-6 border-b border-slate-800/80 pb-4">
              <h2 className="text-lg font-bold text-[#00E5FF] flex items-center gap-2">
                <span>🧘</span> {t('workouts.bodyMap')}
              </h2>
              <button
                onClick={() => setModelType(prev => prev === 'anterior' ? 'posterior' : 'anterior')}
                className="px-4 py-2 bg-[#18233C] hover:bg-[#1E2C4F] rounded-xl text-xs font-bold text-[#00E5FF] border border-cyan-500/30 transition shadow-sm"
              >
                {modelType === 'anterior' ? t('workouts.rotateBack') : t('workouts.rotateFront')}
              </button>
            </div>

            <div className="w-full max-w-xs mx-auto py-4">
              <Model
                type={modelType}
                data={highlighterData}
                style={{ width: '100%' }}
                onClick={handleClick}
                highlightedColors={modelColors}
              />
            </div>

            <p className="text-slate-400 text-xs mt-4 text-center bg-[#0B101D] px-4 py-2 rounded-xl border border-slate-800 w-full">
              {t('workouts.bodyMapHint')}
            </p>
          </div>

          {/* Right Panel: Exercise Details & Checklist */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📅</span> Danh sách bài tập - <span className="text-[#00E5FF]">{currentTabWorkout?.day} ({currentTabWorkout?.name})</span>
                </h2>
              </div>

              {/* Targets / Muscles Bar */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('workouts.muscleFilter')}</p>
                {currentTabWorkout && currentTabWorkout.targets && currentTabWorkout.targets.length > 0 && activeRoutineId !== 'none' ? (
                  <div className="flex flex-wrap gap-2">
                    {currentTabWorkout.targets.map((target: any, index: number) => (
                      <button
                        key={`${target.id}-${index}`}
                        onClick={() => setSelectedMuscle(selectedMuscle === target.id ? null : target.id)}
                        className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all border flex items-center gap-2 ${
                          selectedMuscle === target.id
                            ? 'bg-[#00E5FF] text-slate-950 border-[#00E5FF] shadow-lg shadow-[#00E5FF]/20'
                            : 'bg-[#18233C] text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <span>{t(`muscles.${target.id}`)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedMuscle === target.id ? 'bg-slate-950 text-[#00E5FF]' : 'bg-[#0B101D] text-slate-400'}`}>
                          {target.count} Bài
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  sortedSchedule[safeDayIndex]?.name === 'Nghỉ ngơi' ? (
                    <p className="text-[#00FF87] font-bold text-sm">{t('workouts.restDay')}</p>
                  ) : (
                    <p className="text-xs text-slate-400">{t('workouts.emptyMuscleSelection')}</p>
                  )
                )}
              </div>

              {/* Selected / Checklist Exercises */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                  <p className="text-xs font-bold text-[#00E5FF] uppercase tracking-wider">
                    Các bài đã chọn ({selectedExList.length})
                  </p>
                  {selectedExList.length > 0 && (
                    <span className="text-xs text-slate-400">Tích chọn để đánh dấu hoàn thành</span>
                  )}
                </div>

                {selectedExList.length > 0 ? (
                  selectedExList.map((ex, i) => (
                    <div key={ex.id} className="p-5 rounded-2xl bg-[#0E1526] border border-slate-800/90 hover:border-cyan-500/40 transition-all flex items-center justify-between gap-4 shadow-lg group">
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-extrabold text-white text-base group-hover:text-[#00E5FF] transition-colors">
                            {i + 1}. {ex.name}
                          </h3>
                          <button
                            onClick={() => updateExercise(ex.id, 'selected', false)}
                            className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                          >
                            Xóa khỏi danh sách
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-[#00E5FF] border border-cyan-800/50 font-black text-[10px]">
                            EXERCISE
                          </span>
                          
                          <div className="flex items-center gap-1 bg-[#0B101D] px-2 py-1 rounded-lg border border-slate-800">
                            <span className="text-slate-400">Hiệp:</span>
                            <input
                              type="number"
                              min="1"
                              value={ex.sets}
                              onChange={(e) => updateExercise(ex.id, 'sets', Number(e.target.value) || 1)}
                              className="w-10 bg-transparent text-[#00E5FF] font-bold text-center focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-1 bg-[#0B101D] px-2 py-1 rounded-lg border border-slate-800">
                            <span className="text-slate-400">Lần:</span>
                            <input
                              type="text"
                              value={ex.reps}
                              onChange={(e) => updateExercise(ex.id, 'reps', e.target.value)}
                              className="w-16 bg-transparent text-[#00E5FF] font-bold text-center focus:outline-none"
                            />
                          </div>

                          <span className="text-emerald-400 font-semibold">
                            🎯 Cơ chính: {ex.muscle}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Checkbox */}
                      <button
                        onClick={() => toggleCompleteExercise(ex.id)}
                        className={`w-8 h-8 rounded-xl border-2 transition-all flex items-center justify-center shrink-0 ${
                          ex.completed 
                            ? 'bg-[#00FF87] border-[#00FF87] text-slate-950 shadow-lg shadow-[#00FF87]/30 scale-105' 
                            : 'border-cyan-500/40 hover:border-[#00E5FF] bg-[#0B101D]'
                        }`}
                      >
                        {ex.completed && <span className="font-black text-base">✓</span>}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic py-4 border-t border-slate-800/80">{t('workouts.emptySelected')}</p>
                )}
              </div>

            </div>

            {/* Exercise Library Selection */}
            <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📚</span> {selectedMuscle ? `${t('workouts.libraryTitle')}: ${t(`muscles.${selectedMuscle}`)}` : t('workouts.libraryPlaceholder')}
              </h3>

              {selectedMuscle ? (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {exercises.filter(ex => ex.muscle.toLowerCase() === selectedMuscle.toLowerCase()).length > 0 ? (
                    exercises.filter(ex => ex.muscle.toLowerCase() === selectedMuscle.toLowerCase()).map(ex => (
                      <div key={ex.id} className="p-4 rounded-2xl bg-[#0E1526] border border-slate-800/80 flex items-center justify-between hover:bg-[#18233C] transition-colors">
                        <span className="font-bold text-sm text-slate-200">{ex.name}</span>
                        <button
                          onClick={() => updateExercise(ex.id, 'selected', true)}
                          disabled={ex.selected}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            ex.selected
                              ? 'bg-slate-800 text-slate-500 border border-slate-700'
                              : 'bg-[#00E5FF] text-slate-950 hover:bg-cyan-300 shadow-md shadow-[#00E5FF]/20'
                          }`}
                        >
                          {ex.selected ? 'Đã thêm' : '+ Thêm bài này'}
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-6">{t('workouts.emptyLibrary')} {t(`muscles.${selectedMuscle}`)}.</p>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                  Vui lòng chọn một Nhóm Cơ ở trên để xem danh sách bài tập gợi ý.
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
