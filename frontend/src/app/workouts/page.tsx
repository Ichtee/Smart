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
  const { t, lang } = useLanguage();

  const updateExercise = (id: string, field: string, value: any) => {
    setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
  };

  useEffect(() => {
    // Fetch routines from backend
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

    // Fetch exercises from backend
    fetch('http://localhost:5000/api/exercises', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        // Map database exercises to include UI state (selected: false initially)
        const mappedData = data.map((ex: any) => ({
          id: ex._id,
          muscle: ex.muscle,
          name: ex.name,
          sets: ex.defaultSets || 3,
          reps: ex.defaultReps || '10-12',
          selected: false
        }));
        setExercises(mappedData);
      })
      .catch(err => console.error('Failed to fetch exercises', err));


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

  // Auto-select the tab that matches today's real day name when routine loads/changes
  useEffect(() => {
    if (sortedSchedule.length > 0) {
      const todayString = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][new Date().getDay()];
      const matchIndex = sortedSchedule.findIndex((s: any) => s.day === todayString);

      if (matchIndex !== -1) {
        setCurrentDayIndex(matchIndex);
      } else if (currentDayIndex >= sortedSchedule.length) {
        setCurrentDayIndex(0);
      }
    }
  }, [activeRoutineId, routinesMap]);

  // Ensure currentDayIndex is within bounds for the active routine during transitions
  const safeDayIndex = sortedSchedule.length && currentDayIndex >= sortedSchedule.length
    ? 0
    : currentDayIndex;

  const todaysWorkout = sortedSchedule.length ? sortedSchedule[safeDayIndex] : null;

  const handleClick = (muscle: any) => {
    const muscleId = muscle && muscle.muscle ? muscle.muscle : (typeof muscle === 'string' ? muscle : null);
    if (muscleId) {
      setSelectedMuscle(prev => prev === muscleId ? null : muscleId);
    }
  };

  let highlighterData: any[] = [];
  let modelColors = ['#10b981', '#22d3ee'];

  if (todaysWorkout && todaysWorkout.targets && todaysWorkout.targets.length > 0) {
    const rawMuscles = todaysWorkout.targets.map((t: any) => normalizeMuscleId(t.id));
    const allMuscles = Array.from(new Set(rawMuscles)).filter(m => VALID_MODEL_MUSCLES.has(m)) as string[];
    const safeSelected = selectedMuscle ? normalizeMuscleId(selectedMuscle) : null;

    if (safeSelected && VALID_MODEL_MUSCLES.has(safeSelected)) {
      highlighterData = [
        { name: 'All', muscles: allMuscles },
        { name: 'Selected', muscles: [safeSelected] }
      ];
      modelColors = ['#10b981', '#22d3ee'];
    } else {
      highlighterData = [
        { name: todaysWorkout.name, muscles: allMuscles }
      ];
      modelColors = ['#10b981'];
    }
  } else if (selectedMuscle) {
    const safeSelected = normalizeMuscleId(selectedMuscle);
    if (VALID_MODEL_MUSCLES.has(safeSelected)) {
      highlighterData = [
        { name: 'Selected', muscles: [safeSelected] }
      ];
      modelColors = ['#22d3ee'];
    }
  }

  const formattedTime = currentTime ? currentTime.toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
  const formattedDate = currentTime ? currentTime.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <div suppressHydrationWarning className="min-h-screen bg-zinc-950 text-white p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <Header />

        {/* Top Control Bar: Routine Selection & Clock */}
        <div className="mb-8 p-6 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl shadow-black/50 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-white/10 transition-colors">

          <div className="flex flex-col">
            <h2 className="text-xl font-bold mb-3 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{t('workouts.manageRoutine')}</h2>
            <div className="flex flex-wrap items-center gap-4">
              <select
                value={activeRoutineId}
                onChange={(e) => setActiveRoutineId(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
              >
                {Object.values(routinesMap).map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>

              {todaysWorkout && activeRoutineId !== 'none' && (
                <div className="flex items-center gap-2 bg-black/30 px-4 py-2 rounded-lg border border-white/5">
                  <span className="text-zinc-500 text-sm">{t('workouts.today')}:</span>
                  <span className="text-emerald-400 font-bold text-sm drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">{todaysWorkout.name}</span>
                </div>
              )}
            </div>
          </div>

          <div suppressHydrationWarning className="flex flex-col md:items-end text-left md:text-right border-t border-white/5 md:border-t-0 pt-4 md:pt-0">
            {currentTime ? (
              <>
                <div className="text-zinc-400 text-sm uppercase tracking-wider mb-1">{formattedDate}</div>
                <div className="text-3xl font-mono font-bold text-white tabular-nums drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">{formattedTime}</div>
              </>
            ) : (
              <div className="text-zinc-500 text-sm">{t('workouts.loading')}</div>
            )}
          </div>

        </div>

        {/* Day Selector Tabs */}
        {sortedSchedule.length > 0 && activeRoutineId !== 'none' && (
          <div className="flex overflow-x-auto gap-3 mb-8 pb-2 custom-scrollbar">
            {sortedSchedule.map((dayObj: any, index: number) => {
              const realTodayString = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][new Date().getDay()];
              const isRealToday = dayObj.day === realTodayString;
              return (
                <button
                  key={index}
                  onClick={() => setCurrentDayIndex(index)}
                  className={`relative px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-md flex flex-col items-start min-w-[120px] ${
                    safeDayIndex === index
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-emerald-500/20 ring-2 ring-emerald-400/30'
                      : 'bg-zinc-900/60 border border-white/5 text-zinc-400 hover:bg-zinc-800 hover:text-white hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="text-[10px] uppercase tracking-wider opacity-80">{dayObj.day}</span>
                    {isRealToday && (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full animate-pulse shadow-sm shadow-rose-500/30 flex items-center gap-1">
                        📌 Hôm nay
                      </span>
                    )}
                  </div>
                  <span className="text-sm mt-0.5">{dayObj.name}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8">
          {/* Left side: Body model */}
          <div className="flex-1 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-8 flex flex-col items-center shadow-xl shadow-black/50 hover:border-white/10 transition-colors">
            <div className="flex justify-between items-center w-full mb-6">
              <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{t('workouts.bodyMap')}</h2>
              <button
                onClick={() => setModelType(prev => prev === 'anterior' ? 'posterior' : 'anterior')}
                className="px-5 py-2 bg-zinc-800/80 hover:bg-zinc-700 rounded-xl text-sm font-medium transition text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/50 shadow-lg shadow-black/20"
              >
                {modelType === 'anterior' ? t('workouts.rotateBack') : t('workouts.rotateFront')}
              </button>
            </div>

            <div className="w-full max-w-sm mx-auto">
              <Model
                type={modelType}
                data={highlighterData}
                style={{ width: '100%' }}
                onClick={handleClick}
                highlightedColors={modelColors}
              />
            </div>
            <p className="text-zinc-400 text-sm mt-4 text-center">
              {t('workouts.bodyMapHint')}
            </p>
          </div>

          {/* Right side: Exercises list */}
          <div className="flex-1 flex flex-col gap-6">

            {/* Top Bar: Today's Plan */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl shadow-black/50 hover:border-white/10 transition-colors flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  {t('workouts.title')}
                </h1>
              </div>

              <div className="mb-6">
                <p className="text-sm text-zinc-500 mb-3">{t('workouts.muscleFilter')}</p>
                {todaysWorkout && todaysWorkout.targets && todaysWorkout.targets.length > 0 && activeRoutineId !== 'none' ? (
                  <div className="flex flex-wrap gap-2">
                    {todaysWorkout.targets.map((target: any, index: number) => (
                      <button
                        key={`${target.id}-${index}`}
                        onClick={() => setSelectedMuscle(selectedMuscle === target.id ? null : target.id)}
                        className={`px-3 py-1.5 text-sm rounded-full transition border capitalize flex items-center gap-2 ${selectedMuscle === target.id
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white'
                          }`}
                      >
                        <span>{t(`muscles.${target.id}`)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${selectedMuscle === target.id ? 'bg-emerald-600/50' : 'bg-zinc-700'}`}>
                          {target.count} bài
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  sortedSchedule[safeDayIndex]?.name === 'Nghỉ ngơi' ? (
                    <p className="text-emerald-400">{t('workouts.restDay')}</p>
                  ) : (
                    <p className="text-sm text-zinc-500">{t('workouts.emptyMuscleSelection')}</p>
                  )
                )}
              </div>

              {/* Selected Exercises (Editable) */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-emerald-400 border-b border-white/5 pb-2">
                  {t('workouts.today')} - {sortedSchedule[safeDayIndex]?.day || t('workouts.unknownDay')}
                </p>
                {exercises.filter(ex => ex.selected).length > 0 ? (
                  exercises.filter(ex => ex.selected).map(ex => (
                    <div key={ex.id} className="p-4 rounded-xl bg-zinc-900/80 border border-emerald-500/30 flex flex-col gap-3 shadow-lg shadow-black/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">{ex.muscle}</span>
                          <h3 className="font-semibold text-white">{ex.name}</h3>
                        </div>
                        <button
                          onClick={() => updateExercise(ex.id, 'selected', false)}
                          className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition"
                        >
                          {t('workouts.removeBtn')}
                        </button>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500">{t('workouts.sets')}</span>
                          <input
                            type="number"
                            value={ex.sets}
                            onChange={(e) => updateExercise(ex.id, 'sets', Number(e.target.value))}
                            className="w-12 bg-black/50 border border-zinc-700 rounded px-2 py-1 text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <span className="text-zinc-600">x</span>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500">{t('workouts.reps')}</span>
                          <input
                            type="text"
                            value={ex.reps}
                            onChange={(e) => updateExercise(ex.id, 'reps', e.target.value)}
                            className="w-24 bg-black/50 border border-zinc-700 rounded px-2 py-1 text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500 italic py-4 border-t border-white/5">{t('workouts.emptySelected')}</p>
                )}
              </div>

            </div>

            {/* Bottom Bar: Exercise Library */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col flex-1 shadow-xl shadow-black/50 hover:border-white/10 transition-colors">
              <h2 className="text-xl font-bold capitalize bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-6">
                {selectedMuscle ? `${t('workouts.libraryTitle')}: ${t(`muscles.${selectedMuscle}`)}` : t('workouts.libraryPlaceholder')}
              </h2>

              {selectedMuscle ? (
                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                  {exercises.filter(ex => ex.muscle.toLowerCase() === selectedMuscle.toLowerCase()).length > 0 ? (
                    exercises.filter(ex => ex.muscle.toLowerCase() === selectedMuscle.toLowerCase()).map(ex => (
                      <div key={ex.id} className="p-4 rounded-xl bg-zinc-900/40 border border-white/5 flex items-center justify-between group hover:bg-zinc-800/80 transition-colors">
                        <div>
                          <h3 className="font-semibold text-zinc-300 group-hover:text-white transition-colors">{ex.name}</h3>
                        </div>
                        <button
                          onClick={() => updateExercise(ex.id, 'selected', true)}
                          disabled={ex.selected}
                          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${ex.selected
                              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                              : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white shadow-lg shadow-emerald-500/10'
                            }`}
                        >
                          {ex.selected ? 'Đã thêm' : '+ Thêm'}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-8 bg-zinc-900/30 rounded-xl border border-white/5">
                      <p className="text-zinc-400">{t('workouts.emptyLibrary')} {t(`muscles.${selectedMuscle}`)}.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-white/10 rounded-2xl min-h-[200px] bg-zinc-900/20">
                  <div className="text-5xl mb-4 opacity-50 drop-shadow-xl">💪</div>
                  <p className="font-medium text-zinc-400">Vui lòng chọn nhóm cơ ở trên</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
