'use client';
import { useState, useEffect, useMemo } from 'react';
import Model from 'react-body-highlighter';
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
  const s = id.toLowerCase().trim();
  if (s === 'adductors' || s === 'adductor') return 'adductor';
  if (s === 'delts' || s === 'deltoids' || s === 'front-deltoids' || s === 'front deltoids') return 'front-deltoids';
  if (s === 'rear delts' || s === 'back-deltoids' || s === 'back deltoids') return 'back-deltoids';
  if (s === 'upper back' || s === 'upper-back') return 'upper-back';
  if (s === 'lower back' || s === 'lower-back') return 'lower-back';
  return s;
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

  const [allExercises, setAllExercises] = useState<any[]>([]);
  const [daySelections, setDaySelections] = useState<Record<string, string[]>>({});
  const [dayCompleted, setDayCompleted] = useState<Record<string, string[]>>({});
  const [daySavedStatus, setDaySavedStatus] = useState<Record<string, boolean>>({});
  const [exerciseDetails, setExerciseDetails] = useState<Record<string, { sets: number; reps: string }>>({});

  const [streakDays, setStreakDays] = useState<number>(1);
  const [noticeMessage, setNoticeMessage] = useState<string>('');
  const { t, lang } = useLanguage();

  useEffect(() => {
    fetch(`${API_URL}/api/routines`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const newMap: Record<string, any> = { ...DEFAULT_ROUTINES };
        data.forEach((r: any) => {
          newMap[r.id] = r;
        });
        setRoutinesMap(newMap);
      })
      .catch(err => console.error('Failed to fetch routines', err));

    fetch(`${API_URL}/api/exercises`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const mapped = data.map((ex: any) => ({
          id: ex._id,
          muscle: ex.muscle,
          normMuscle: normalizeMuscleId(ex.muscle),
          name: ex.name,
          defaultSets: ex.defaultSets || 3,
          defaultReps: ex.defaultReps || '10-12',
        }));
        setAllExercises(mapped);
      })
      .catch(err => console.error('Failed to fetch exercises', err));

    try {
      const history = JSON.parse(localStorage.getItem('smart_streak_history') || '[]');
      setStreakDays(Math.max(1, history.length));
    } catch (e) { }

    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeRoutine = routinesMap[activeRoutineId];

  const sortedSchedule = useMemo(() => {
    return (activeRoutine?.schedule || []).slice().sort((a: any, b: any) => {
      const orderA = DAY_ORDER[a.day] || 99;
      const orderB = DAY_ORDER[b.day] || 99;
      return orderA - orderB;
    });
  }, [activeRoutine]);

  const realTodayString = useMemo(() => {
    return ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][new Date().getDay()];
  }, []);

  const realTodayWorkout = useMemo(() => {
    return sortedSchedule.find((s: any) => s.day === realTodayString);
  }, [sortedSchedule, realTodayString]);

  useEffect(() => {
    if (sortedSchedule.length > 0) {
      const matchIndex = sortedSchedule.findIndex((s: any) => s.day === realTodayString);
      if (matchIndex !== -1) {
        setCurrentDayIndex(matchIndex);
      } else if (currentDayIndex >= sortedSchedule.length) {
        setCurrentDayIndex(0);
      }
    }
  }, [activeRoutineId, sortedSchedule, realTodayString]);

  const safeDayIndex = sortedSchedule.length && currentDayIndex >= sortedSchedule.length ? 0 : currentDayIndex;
  const currentTabWorkout = sortedSchedule.length ? sortedSchedule[safeDayIndex] : null;
  const currentDayKey = `${activeRoutineId}_${currentTabWorkout?.day || 'day'}`;
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Load / Initialize Day Selections per Day Tab
  useEffect(() => {
    if (!currentTabWorkout || allExercises.length === 0) return;

    const savedSel = localStorage.getItem(`smart_sel_${todayDateStr}_${currentDayKey}`);
    const savedComp = localStorage.getItem(`smart_comp_${todayDateStr}_${currentDayKey}`);
    const savedSaved = localStorage.getItem(`smart_saved_${todayDateStr}_${currentDayKey}`);

    let selectedIds: string[] = [];
    if (savedSel) {
      try { selectedIds = JSON.parse(savedSel); } catch (e) { }
    }

    let completedIds: string[] = [];
    if (savedComp) {
      try { completedIds = JSON.parse(savedComp); } catch (e) { }
    }

    setDaySelections(prev => ({ ...prev, [currentDayKey]: selectedIds }));
    setDayCompleted(prev => ({ ...prev, [currentDayKey]: completedIds }));
    setDaySavedStatus(prev => ({ ...prev, [currentDayKey]: savedSaved === 'true' }));
  }, [currentDayKey, allExercises, todayDateStr, currentTabWorkout]);

  const currentSelectedIds = daySelections[currentDayKey] || [];
  const currentCompletedIds = dayCompleted[currentDayKey] || [];
  const isWorkoutSaved = !!daySavedStatus[currentDayKey];

  // Active exercises list for the current day tab
  const activeSelectedExercises = useMemo(() => {
    return currentSelectedIds.map(id => {
      const ex = allExercises.find(item => item.id === id);
      const detail = exerciseDetails[id] || { sets: ex?.defaultSets || 3, reps: ex?.defaultReps || '10-12' };
      return {
        ...ex,
        sets: detail.sets,
        reps: detail.reps,
        completed: currentCompletedIds.includes(id)
      };
    }).filter(Boolean);
  }, [currentSelectedIds, allExercises, exerciseDetails, currentCompletedIds]);

  const updateExerciseSets = (id: string, sets: number) => {
    setExerciseDetails(prev => ({
      ...prev,
      [id]: { ...(prev[id] || { sets: 3, reps: '10-12' }), sets: Math.max(1, sets) }
    }));
  };

  const adjustExerciseReps = (id: string, delta: number) => {
    setExerciseDetails(prev => {
      const currentReps = prev[id]?.reps || '10-12';
      const numMatch = currentReps.match(/\d+/);
      const baseNum = numMatch ? parseInt(numMatch[0]) : 10;
      const newNum = Math.max(1, baseNum + delta);
      return {
        ...prev,
        [id]: { ...(prev[id] || { sets: 3, reps: '10-12' }), reps: `${newNum}` }
      };
    });
  };

  const handleAddExerciseFromLibrary = (exId: string) => {
    if (isWorkoutSaved) return;
    const newSel = Array.from(new Set([...currentSelectedIds, exId]));
    setDaySelections(prev => ({ ...prev, [currentDayKey]: newSel }));
    localStorage.setItem(`smart_sel_${todayDateStr}_${currentDayKey}`, JSON.stringify(newSel));
  };

  const handleRemoveExercise = (exId: string) => {
    if (isWorkoutSaved) return;
    const newSel = currentSelectedIds.filter(id => id !== exId);
    setDaySelections(prev => ({ ...prev, [currentDayKey]: newSel }));
    localStorage.setItem(`smart_sel_${todayDateStr}_${currentDayKey}`, JSON.stringify(newSel));
  };

  const handleSaveWorkout = () => {
    if (currentSelectedIds.length === 0) {
      setNoticeMessage('Vui lòng chọn ít nhất 1 bài tập từ thư viện bên dưới trước khi chốt lịch!');
      setTimeout(() => setNoticeMessage(''), 4000);
      return;
    }

    setDaySavedStatus(prev => ({ ...prev, [currentDayKey]: true }));
    localStorage.setItem(`smart_saved_${todayDateStr}_${currentDayKey}`, 'true');
    setNoticeMessage('');
  };

  const handleUnlockWorkout = () => {
    setDaySavedStatus(prev => ({ ...prev, [currentDayKey]: false }));
    localStorage.setItem(`smart_saved_${todayDateStr}_${currentDayKey}`, 'false');
  };

  const toggleCompleteExercise = (id: string) => {
    if (!isWorkoutSaved) {
      setNoticeMessage('Vui lòng nhấn "💾 LƯU & BẮT ĐẦU TẬP" ở trên để chốt danh sách bài tập trước!');
      setTimeout(() => setNoticeMessage(''), 4000);
      return;
    }

    const isAlreadyComp = currentCompletedIds.includes(id);
    const newComp = isAlreadyComp ? currentCompletedIds.filter(i => i !== id) : [...currentCompletedIds, id];

    setDayCompleted(prev => ({ ...prev, [currentDayKey]: newComp }));
    localStorage.setItem(`smart_comp_${todayDateStr}_${currentDayKey}`, JSON.stringify(newComp));

    if (newComp.length > 0) {
      const history: string[] = JSON.parse(localStorage.getItem('smart_streak_history') || '[]');
      if (!history.includes(todayDateStr)) {
        const newHistory = [...history, todayDateStr];
        localStorage.setItem('smart_streak_history', JSON.stringify(newHistory));
        setStreakDays(newHistory.length);
      }
    }
  };

  const handleClickBodyMuscle = (muscle: any) => {
    const muscleId = muscle && muscle.muscle ? muscle.muscle : (typeof muscle === 'string' ? muscle : null);
    if (muscleId) {
      const norm = normalizeMuscleId(muscleId);
      setSelectedMuscle(prev => prev === norm ? null : norm);
    }
  };

  let highlighterData: any[] = [];
  let modelColors = ['#00E5FF', '#00FF87'];

  if (currentTabWorkout && currentTabWorkout.targets && currentTabWorkout.targets.length > 0) {
    const rawMuscles: string[] = currentTabWorkout.targets.map((t: any) => normalizeMuscleId(t.id));
    const allMuscles = Array.from(new Set(rawMuscles)).filter((m: string) => VALID_MODEL_MUSCLES.has(m));
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

  const completedCount = activeSelectedExercises.filter(ex => ex.completed).length;
  const progressPercent = (isWorkoutSaved && activeSelectedExercises.length > 0)
    ? Math.round((completedCount / activeSelectedExercises.length) * 100)
    : 0;

  // Calculate Exceeded Muscle Target Warnings
  const exceededTargetMuscles = (currentTabWorkout?.targets || []).map((target: any) => {
    const normTargetId = normalizeMuscleId(target.id);
    const targetCount = target.count || 2;
    const currentCount = activeSelectedExercises.filter(ex => ex.normMuscle === normTargetId).length;
    return {
      id: target.id,
      normId: normTargetId,
      targetCount,
      currentCount,
      isExceeded: currentCount > targetCount
    };
  }).filter((t: any) => t.isExceeded);

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
              <span className="text-xl font-extrabold text-white">
                {isWorkoutSaved ? `${progressPercent}% Hoàn Thành` : 'Đang chọn bài...'}
              </span>
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
            <div className="flex overflow-x-auto gap-3 pt-5 pb-3 custom-scrollbar">
              {sortedSchedule.map((dayObj: any, index: number) => {
                const isRealToday = dayObj.day === realTodayString;
                const isActive = safeDayIndex === index;

                return (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentDayIndex(index);
                      setSelectedMuscle(null);
                    }}
                    className={`relative px-6 py-3.5 rounded-2xl text-xs font-extrabold transition-all duration-300 flex flex-col items-center min-w-[130px] ${isActive
                        ? 'bg-[#00E5FF] text-slate-950 shadow-[0_0_20px_rgba(0,229,255,0.4)] scale-105 z-10'
                        : 'bg-[#18233C] border border-slate-800/90 text-slate-400 hover:bg-[#1E2C4F] hover:text-white'
                      }`}
                  >
                    {isRealToday && (
                      <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 text-[9px] font-black rounded-full shadow-lg uppercase tracking-wider whitespace-nowrap z-20 ${isActive
                          ? 'bg-[#00FF87] text-slate-950 border border-emerald-950 shadow-[#00FF87]/40'
                          : 'bg-[#00FF87] text-slate-950 border border-emerald-400 animate-pulse'
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
                onClick={handleClickBodyMuscle}
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

              {/* Header with Save / Locked Action */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 flex-wrap gap-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📅</span> Danh sách bài tập - <span className="text-[#00E5FF]">{currentTabWorkout?.day} ({currentTabWorkout?.name})</span>
                </h2>

                {isWorkoutSaved ? (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-500/40 text-[#00FF87] text-xs font-extrabold rounded-xl shadow-md">
                      🔒 ĐÃ CHỐT LỊCH
                    </span>
                    <button
                      onClick={handleUnlockWorkout}
                      className="px-3 py-1 bg-[#18233C] hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition"
                    >
                      ✏️ Sửa lại
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSaveWorkout}
                    className="px-4 py-2 bg-[#00E5FF] hover:bg-cyan-300 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-[#00E5FF]/20 transition active:scale-95"
                  >
                    💾 LƯU & BẮT ĐẦU TẬP
                  </button>
                )}
              </div>

              {/* Inline Notice Message Banner */}
              {noticeMessage && (
                <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-300 shadow-md">
                  <span className="text-lg">💡</span>
                  <span className="font-bold">{noticeMessage}</span>
                </div>
              )}

              {/* Dynamic Over-Target Warning Banner */}
              {exceededTargetMuscles.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/40 rounded-2xl p-4 flex items-start gap-3 text-xs text-rose-300 shadow-lg">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="font-black text-rose-400 uppercase tracking-wider">CẢNH BÁO VƯỢT QUÁ LỊCH TẬP ĐỀ XUẤT!</p>
                    <p className="mt-1 leading-relaxed">
                      Bạn đã chọn vượt quá số bài so với mục tiêu đề xuất cho các nhóm cơ:{' '}
                      <strong className="text-white underline">
                        {exceededTargetMuscles.map((tInfo: any) => `${t(`muscles.${tInfo.id}`) || tInfo.id} (${tInfo.currentCount}/${tInfo.targetCount} bài)`).join(', ')}
                      </strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Targets / Muscles Bar */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('workouts.muscleFilter')}</p>
                {currentTabWorkout && currentTabWorkout.targets && currentTabWorkout.targets.length > 0 && activeRoutineId !== 'none' ? (
                  <div className="flex flex-wrap gap-2">
                    {currentTabWorkout.targets.map((target: any, index: number) => {
                      const normTargetId = normalizeMuscleId(target.id);
                      const targetCount = target.count || 2;
                      const currentCount = activeSelectedExercises.filter(ex => ex.normMuscle === normTargetId).length;
                      const isExceeded = currentCount > targetCount;
                      const isMatched = currentCount === targetCount;

                      return (
                        <button
                          key={`${target.id}-${index}`}
                          onClick={() => setSelectedMuscle(selectedMuscle === normTargetId ? null : normTargetId)}
                          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all border flex items-center gap-2 ${selectedMuscle === normTargetId
                              ? 'bg-[#00E5FF] text-slate-950 border-[#00E5FF] shadow-lg shadow-[#00E5FF]/20'
                              : isExceeded
                                ? 'bg-rose-950/40 text-rose-300 border-rose-500/50 hover:bg-rose-900/50'
                                : isMatched
                                  ? 'bg-emerald-950/40 text-[#00FF87] border-emerald-500/40 hover:bg-emerald-900/50'
                                  : 'bg-[#18233C] text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                            }`}
                        >
                          <span>{t(`muscles.${target.id}`) || target.id}</span>

                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${selectedMuscle === normTargetId
                              ? 'bg-slate-950 text-[#00E5FF]'
                              : isExceeded
                                ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                                : isMatched
                                  ? 'bg-emerald-500/30 text-[#00FF87] border border-emerald-500/40'
                                  : 'bg-[#0B101D] text-slate-400'
                            }`}>
                            {currentCount}/{targetCount} Bài {isExceeded ? '⚠️' : isMatched ? '✓' : ''}
                          </span>
                        </button>
                      );
                    })}
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
                    Các bài đã chọn ({activeSelectedExercises.length})
                  </p>
                  <span className="text-xs text-slate-400 font-semibold">
                    {isWorkoutSaved ? 'Tích chọn để đánh dấu hoàn thành' : 'Chỉnh số Hiệp/Lần rồi bấm LƯU ở trên'}
                  </span>
                </div>

                {activeSelectedExercises.length > 0 ? (
                  activeSelectedExercises.map((ex, i) => (
                    <div key={ex.id} className="p-5 rounded-2xl bg-[#0E1526] border border-slate-800/90 hover:border-cyan-500/40 transition-all flex items-center justify-between gap-4 shadow-lg group">

                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-extrabold text-white text-base group-hover:text-[#00E5FF] transition-colors">
                            {i + 1}. {ex.name}
                          </h3>
                          {!isWorkoutSaved && (
                            <button
                              onClick={() => handleRemoveExercise(ex.id)}
                              className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                            >
                              Xóa khỏi danh sách
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-[#00E5FF] border border-cyan-800/50 font-black text-[10px]">
                            EXERCISE
                          </span>

                          {/* Sets adjustment buttons & direct numeric input */}
                          {!isWorkoutSaved ? (
                            <div className="flex items-center gap-2 bg-[#0B101D] px-2.5 py-1 rounded-xl border border-slate-800">
                              <span className="text-slate-400 font-semibold">Hiệp:</span>
                              <button
                                onClick={() => updateExerciseSets(ex.id, ex.sets - 1)}
                                className="w-6 h-6 rounded-lg bg-[#18233C] hover:bg-slate-700 text-[#00E5FF] font-black flex items-center justify-center text-sm border border-slate-700"
                              >-</button>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={ex.sets}
                                onChange={(e) => {
                                  const clean = e.target.value.replace(/[^0-9]/g, '');
                                  updateExerciseSets(ex.id, parseInt(clean) || 1);
                                }}
                                className="w-8 bg-transparent text-[#00E5FF] font-black text-center focus:outline-none focus:border-b focus:border-[#00E5FF]"
                              />
                              <button
                                onClick={() => updateExerciseSets(ex.id, ex.sets + 1)}
                                className="w-6 h-6 rounded-lg bg-[#18233C] hover:bg-slate-700 text-[#00E5FF] font-black flex items-center justify-center text-sm border border-slate-700"
                              >+</button>
                            </div>
                          ) : (
                            <span className="bg-[#0B101D] px-2.5 py-1 rounded-xl border border-slate-800 text-slate-300 font-bold">
                              Hiệp: <strong className="text-[#00E5FF]">{ex.sets}</strong>
                            </span>
                          )}

                          {/* Reps adjustment buttons & direct numeric input */}
                          {!isWorkoutSaved ? (
                            <div className="flex items-center gap-2 bg-[#0B101D] px-2.5 py-1 rounded-xl border border-slate-800">
                              <span className="text-slate-400 font-semibold">Lần:</span>
                              <button
                                onClick={() => adjustExerciseReps(ex.id, -1)}
                                className="w-6 h-6 rounded-lg bg-[#18233C] hover:bg-slate-700 text-[#00E5FF] font-black flex items-center justify-center text-sm border border-slate-700"
                              >-</button>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={ex.reps}
                                onChange={(e) => {
                                  const cleanVal = e.target.value.replace(/[^0-9]/g, '');
                                  setExerciseDetails(prev => ({
                                    ...prev,
                                    [ex.id]: { ...(prev[ex.id] || { sets: ex.sets, reps: '10' }), reps: cleanVal }
                                  }));
                                }}
                                className="w-10 bg-transparent text-[#00E5FF] font-black text-center focus:outline-none focus:border-b focus:border-[#00E5FF]"
                              />
                              <button
                                onClick={() => adjustExerciseReps(ex.id, 1)}
                                className="w-6 h-6 rounded-lg bg-[#18233C] hover:bg-slate-700 text-[#00E5FF] font-black flex items-center justify-center text-sm border border-slate-700"
                              >+</button>
                            </div>
                          ) : (
                            <span className="bg-[#0B101D] px-2.5 py-1 rounded-xl border border-slate-800 text-slate-300 font-bold">
                              Lần: <strong className="text-[#00E5FF]">{ex.reps}</strong>
                            </span>
                          )}

                          <span className="text-emerald-400 font-semibold">
                            🎯 Cơ chính: {t(`muscles.${ex.normMuscle}`) || ex.muscle}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Checkbox */}
                      <button
                        onClick={() => toggleCompleteExercise(ex.id)}
                        disabled={!isWorkoutSaved}
                        title={!isWorkoutSaved ? 'Vui lòng bấm LƯU ở trên để bắt đầu tập' : 'Đánh dấu hoàn thành'}
                        className={`w-9 h-9 rounded-xl border-2 transition-all flex items-center justify-center shrink-0 ${ex.completed
                            ? 'bg-[#00FF87] border-[#00FF87] text-slate-950 shadow-lg shadow-[#00FF87]/30 scale-105'
                            : isWorkoutSaved
                              ? 'border-cyan-500/60 hover:border-[#00E5FF] bg-[#0B101D] text-slate-600'
                              : 'border-slate-800 bg-[#0B101D]/50 text-slate-700 cursor-not-allowed'
                          }`}
                      >
                        {ex.completed ? (
                          <span className="font-black text-base">✓</span>
                        ) : !isWorkoutSaved ? (
                          <span className="text-[10px] text-slate-600">🔒</span>
                        ) : null}
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
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📚</span> {selectedMuscle ? `${t('workouts.libraryTitle')}: ${t(`muscles.${selectedMuscle}`) || selectedMuscle}` : t('workouts.libraryPlaceholder')}
                </h3>
                {isWorkoutSaved && (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                    🔒 Lịch hôm nay đã chốt
                  </span>
                )}
              </div>

              {selectedMuscle ? (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {allExercises.filter(ex => ex.normMuscle === normalizeMuscleId(selectedMuscle)).length > 0 ? (
                    allExercises.filter(ex => ex.normMuscle === normalizeMuscleId(selectedMuscle)).map(ex => {
                      const isAlreadySelected = currentSelectedIds.includes(ex.id);

                      return (
                        <div key={ex.id} className="p-4 rounded-2xl bg-[#0E1526] border border-slate-800/80 flex items-center justify-between hover:bg-[#18233C] transition-colors">
                          <span className="font-bold text-sm text-slate-200">{ex.name}</span>
                          <button
                            onClick={() => handleAddExerciseFromLibrary(ex.id)}
                            disabled={isAlreadySelected || isWorkoutSaved}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${isAlreadySelected || isWorkoutSaved
                                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                : 'bg-[#00E5FF] text-slate-950 hover:bg-cyan-300 shadow-md shadow-[#00E5FF]/20'
                              }`}
                          >
                            {isAlreadySelected ? 'Đã thêm' : isWorkoutSaved ? '🔒 Đã chốt' : '+ Thêm bài này'}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-6">{t('workouts.emptyLibrary')} {t(`muscles.${selectedMuscle}`) || selectedMuscle}.</p>
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
