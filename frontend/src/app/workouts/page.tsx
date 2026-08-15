'use client';
import { useState, useEffect, useMemo } from 'react';
import Model from 'react-body-highlighter';
import Header from '@/components/Header';
import { API_URL } from '@/utils/api';

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

const getYouTubeEmbedUrl = (url?: string): string => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?autoplay=0&rel=0&enablejsapi=1` : '';
};

const getYouTubeSearchUrl = (exerciseName: string): string => {
  const query = encodeURIComponent(exerciseName);
  return `https://www.youtube.com/results?search_query=${query}`;
};

const formatWorkoutDayTitle = (dayObj: any, lang: string): { day: string; name: string } => {
  if (!dayObj) return { day: '', name: '' };
  if (lang !== 'en') return { day: dayObj.day, name: dayObj.name };

  const dayMap: Record<string, string> = {
    'Thứ 2': 'Mon',
    'Thứ 3': 'Tue',
    'Thứ 4': 'Wed',
    'Thứ 5': 'Thu',
    'Thứ 6': 'Fri',
    'Thứ 7': 'Sat',
    'Chủ nhật': 'Sun'
  };

  const nameMap: Record<string, string> = {
    'Nghỉ ngơi': 'Rest Day',
    'Thân trên A': 'Upper Body A',
    'Thân dưới A': 'Lower Body A',
    'Thân trên B': 'Upper Body B',
    'Thân dưới B': 'Lower Body B',
    'Tăng cường (Optional)': 'Optional Focus',
    'Fullbody Plan A': 'Fullbody Plan A',
    'Fullbody Plan B': 'Fullbody Plan B',
    'Fullbody Plan C': 'Fullbody Plan C',
    'PUSH': 'Push',
    'PULL': 'Pull',
    'LEGS': 'Legs',
    'Upper': 'Upper Body',
    'Lower': 'Lower Body',
    'Push Day 1': 'Push Day 1',
    'Pull Day 1': 'Pull Day 1',
    'Legs Day 1': 'Legs Day 1',
    'Push Day 2': 'Push Day 2',
    'Pull Day 2': 'Pull Day 2',
    'Legs Day 2': 'Legs Day 2',
    'Mặt trước A': 'Front Body A',
    'Mặt sau A': 'Back Body A',
    'Mặt trước B': 'Front Body B',
    'Mặt sau B': 'Back Body B'
  };

  return {
    day: dayMap[dayObj.day] || dayObj.day,
    name: nameMap[dayObj.name] || dayObj.name
  };
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

  const [showMobileBodyModel, setShowMobileBodyModel] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<boolean>(false);

  const [allExercises, setAllExercises] = useState<any[]>([]);
  const [daySelections, setDaySelections] = useState<Record<string, string[]>>({});
  const [dayCompleted, setDayCompleted] = useState<Record<string, string[]>>({});
  const [daySavedStatus, setDaySavedStatus] = useState<Record<string, boolean>>({});
  const [exerciseDetails, setExerciseDetails] = useState<Record<string, {
    sets: number;
    reps: string;
    rir?: string;
    restTimeSeconds?: number;
    isOptional?: boolean;
    requiresWarmup?: boolean;
    warmupNotes?: string;
    notes?: string;
  }>>({});

  const [selectedDetailExercise, setSelectedDetailExercise] = useState<any | null>(null);

  const [streakDays, setStreakDays] = useState<number>(1);
  const [noticeMessage, setNoticeMessage] = useState<string>('');
  const [librarySearchTerm, setLibrarySearchTerm] = useState<string>('');

  const fetchInitialData = async () => {
    setIsFetching(true);
    setFetchError(false);
    try {
      const [routinesRes, exercisesRes] = await Promise.all([
        fetch(`${API_URL}/api/routines`, { cache: 'no-store' }),
        fetch(`${API_URL}/api/exercises`, { cache: 'no-store' })
      ]);

      if (!routinesRes.ok || !exercisesRes.ok) {
        throw new Error('Non-ok HTTP status');
      }

      const routinesData = await routinesRes.json();
      const exercisesData = await exercisesRes.json();

      const newMap: Record<string, any> = { ...DEFAULT_ROUTINES };
      routinesData.forEach((r: any) => {
        newMap[r.id] = r;
      });
      setRoutinesMap(newMap);

      // Restore last selected active routine if present
      const savedRoutineId = localStorage.getItem('smart_last_active_routine_id');
      if (savedRoutineId && newMap[savedRoutineId]) {
        setActiveRoutineId(savedRoutineId);
      } else if (routinesData.length > 0) {
        setActiveRoutineId(routinesData[0].id);
      }

      const mapped = exercisesData.map((ex: any) => ({
        id: ex._id,
        muscle: ex.muscle,
        secondaryMuscles: ex.secondaryMuscles || [],
        equipment: ex.equipment || 'Tạ đơn / Cáp / Máy',
        description: ex.description || 'Bài tập giúp cô lập và phát triển nhóm cơ hiệu quả.',
        videoUrl: ex.videoUrl || '',
        normMuscle: normalizeMuscleId(ex.muscle),
        name: ex.name,
        defaultSets: ex.defaultSets || 3,
        defaultReps: ex.defaultReps || '10-12',
      }));
      setAllExercises(mapped);
      setIsFetching(false);
    } catch (err) {
      console.error('Failed to fetch routines/exercises:', err);
      setFetchError(true);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchInitialData();

    try {
      const history = JSON.parse(localStorage.getItem('smart_streak_history') || '[]');
      setStreakDays(Math.max(1, history.length));
    } catch (e) { }

    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRoutineChange = (newId: string) => {
    setActiveRoutineId(newId);
    localStorage.setItem('smart_last_active_routine_id', newId);
  };

  const handleSelectDayTab = (index: number) => {
    setCurrentDayIndex(index);
    localStorage.setItem(`smart_last_day_index_${activeRoutineId}`, index.toString());
    setSelectedMuscle(null);
  };

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
      const savedDayIdxStr = localStorage.getItem(`smart_last_day_index_${activeRoutineId}`);
      if (savedDayIdxStr !== null) {
        const savedIdx = parseInt(savedDayIdxStr, 10);
        if (!isNaN(savedIdx) && savedIdx >= 0 && savedIdx < sortedSchedule.length) {
          setCurrentDayIndex(savedIdx);
          return;
        }
      }

      const matchIndex = sortedSchedule.findIndex((s: any) => s.day === realTodayString);
      if (matchIndex !== -1) {
        setCurrentDayIndex(matchIndex);
      } else {
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
    if (!currentTabWorkout) return;

    const savedSel = localStorage.getItem(`smart_sel_${todayDateStr}_${currentDayKey}`);
    const savedComp = localStorage.getItem(`smart_comp_${todayDateStr}_${currentDayKey}`);
    const savedSaved = localStorage.getItem(`smart_saved_${todayDateStr}_${currentDayKey}`);
    const savedDet = localStorage.getItem(`smart_det_${todayDateStr}_${currentDayKey}`);

    let selectedIds: string[] = [];
    let detailsMap: Record<string, any> = {};

    if (savedDet) {
      try { detailsMap = JSON.parse(savedDet); } catch (e) { }
    }

    const isSavedSession = savedSaved === 'true';

    if (savedSel && isSavedSession) {
      try {
        const rawIds: string[] = JSON.parse(savedSel);
        if (allExercises.length > 0) {
          selectedIds = rawIds.filter(id => 
            allExercises.some(ex => ex.id === id || ex._id === id || ex._id?.toString() === id || (ex.name && id.includes(ex.name)))
          );
        } else {
          selectedIds = rawIds;
        }
      } catch (e) { }
    }

    if ((!isSavedSession || selectedIds.length === 0) && currentTabWorkout.exercises && currentTabWorkout.exercises.length > 0) {
      selectedIds = [];
      detailsMap = {};

      currentTabWorkout.exercises.forEach((tmplEx: any) => {
        if (!tmplEx.exerciseName) return;
        let matched = allExercises.find(
          item => item.name && item.name.toLowerCase().trim() === tmplEx.exerciseName.toLowerCase().trim()
        );

        const exId = matched ? (matched.id || matched._id?.toString()) : `template_${tmplEx.exerciseName.replace(/\s+/g, '_')}`;

        if (exId) {
          selectedIds.push(exId);
          detailsMap[exId] = {
            sets: tmplEx.sets || 3,
            reps: tmplEx.repsRange || '8-12',
            rir: tmplEx.rir || '1',
            restTimeSeconds: tmplEx.restTimeSeconds || 180,
            isOptional: !!tmplEx.isOptional,
            requiresWarmup: !!tmplEx.requiresWarmup,
            warmupNotes: tmplEx.warmupNotes || '',
            notes: tmplEx.notes || ''
          };
        }
      });

      localStorage.setItem(`smart_sel_${todayDateStr}_${currentDayKey}`, JSON.stringify(selectedIds));
      localStorage.setItem(`smart_det_${todayDateStr}_${currentDayKey}`, JSON.stringify(detailsMap));
    }

    let completedIds: string[] = [];
    if (savedComp) {
      try { completedIds = JSON.parse(savedComp); } catch (e) { }
    }

    setDaySelections(prev => ({ ...prev, [currentDayKey]: selectedIds }));
    setDayCompleted(prev => ({ ...prev, [currentDayKey]: completedIds }));
    setDaySavedStatus(prev => ({ ...prev, [currentDayKey]: savedSaved === 'true' }));
    if (Object.keys(detailsMap).length > 0) {
      setExerciseDetails(prev => ({ ...prev, ...detailsMap }));
    }
  }, [currentDayKey, allExercises, todayDateStr, currentTabWorkout]);

  const currentSelectedIds = daySelections[currentDayKey] || [];
  const currentCompletedIds = dayCompleted[currentDayKey] || [];
  const isWorkoutSaved = !!daySavedStatus[currentDayKey];

  // Active exercises list for the current day tab
  const activeSelectedExercises = useMemo(() => {
    return currentSelectedIds
      .map(id => {
        const ex = allExercises.find(item => item.id === id || item._id === id || item._id?.toString() === id);
        if (!ex || !ex.name) return null;
        const detail = exerciseDetails[id] || { sets: ex.defaultSets || 3, reps: ex.defaultReps || '10-12' };
        return {
          ...ex,
          sets: detail.sets,
          reps: detail.reps,
          rir: detail.rir || '1',
          restTimeSeconds: detail.restTimeSeconds || 180,
          isOptional: !!detail.isOptional,
          requiresWarmup: !!detail.requiresWarmup,
          warmupNotes: detail.warmupNotes || '',
          notes: detail.notes || '',
          completed: currentCompletedIds.includes(id)
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null && Boolean(item.name));
  }, [currentSelectedIds, allExercises, exerciseDetails, currentCompletedIds]);

  const updateExerciseSets = (id: string, sets: number) => {
    const newSets = Math.max(1, sets);
    setExerciseDetails(prev => {
      const updated = {
        ...prev,
        [id]: { ...(prev[id] || { sets: 3, reps: '10-12' }), sets: newSets }
      };
      localStorage.setItem(`smart_det_${todayDateStr}_${currentDayKey}`, JSON.stringify(updated));
      return updated;
    });
  };

  const adjustExerciseReps = (id: string, delta: number) => {
    setExerciseDetails(prev => {
      const currentReps = prev[id]?.reps || '10-12';
      const numMatch = currentReps.match(/\d+/);
      const baseNum = numMatch ? parseInt(numMatch[0]) : 10;
      const newNum = Math.max(1, baseNum + delta);
      const updated = {
        ...prev,
        [id]: { ...(prev[id] || { sets: 3, reps: '10-12' }), reps: `${newNum}` }
      };
      localStorage.setItem(`smart_det_${todayDateStr}_${currentDayKey}`, JSON.stringify(updated));
      return updated;
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

  const handleResetToTemplate = () => {
    if (isWorkoutSaved) return;
    if (!currentTabWorkout?.exercises || currentTabWorkout.exercises.length === 0) return;

    const selectedIds: string[] = [];
    const detailsMap: Record<string, any> = {};

    currentTabWorkout.exercises.forEach((tmplEx: any) => {
      if (!tmplEx.exerciseName) return;
      let matched = allExercises.find(
        item => item.name && item.name.toLowerCase().trim() === tmplEx.exerciseName.toLowerCase().trim()
      );
      const exId = matched ? (matched.id || matched._id?.toString()) : `template_${tmplEx.exerciseName.replace(/\s+/g, '_')}`;

      if (exId) {
        selectedIds.push(exId);
        detailsMap[exId] = {
          sets: tmplEx.sets || 3,
          reps: tmplEx.repsRange || '8-12',
          rir: tmplEx.rir || '1',
          restTimeSeconds: tmplEx.restTimeSeconds || 180,
          isOptional: !!tmplEx.isOptional,
          requiresWarmup: !!tmplEx.requiresWarmup,
          warmupNotes: tmplEx.warmupNotes || '',
          notes: tmplEx.notes || ''
        };
      }
    });

    setDaySelections(prev => ({ ...prev, [currentDayKey]: selectedIds }));
    setExerciseDetails(prev => ({ ...prev, ...detailsMap }));
    localStorage.setItem(`smart_sel_${todayDateStr}_${currentDayKey}`, JSON.stringify(selectedIds));
    localStorage.setItem(`smart_det_${todayDateStr}_${currentDayKey}`, JSON.stringify(detailsMap));
    setNoticeMessage('Đã khôi phục danh sách bài tập về lịch gốc (KA) mặc định!');
    setTimeout(() => setNoticeMessage(''), 4000);
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

      // Save rich workout log entry to smart_workout_logs
      try {
        const logsMap = JSON.parse(localStorage.getItem('smart_workout_logs') || '{}');
        const completedExercises = activeSelectedExercises
          .filter(ex => newComp.includes(ex.id))
          .map(ex => ({
            id: ex.id,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            muscle: ex.muscle,
            normMuscle: ex.normMuscle
          }));

        logsMap[todayDateStr] = {
          date: todayDateStr,
          routineId: activeRoutineId,
          routineName: activeRoutine?.name || 'Lịch tập tự do',
          dayName: currentTabWorkout ? `${currentTabWorkout.day} (${currentTabWorkout.name})` : 'Buổi tập',
          exercises: completedExercises,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('smart_workout_logs', JSON.stringify(logsMap));
      } catch (e) { }
    } else {
      try {
        const logsMap = JSON.parse(localStorage.getItem('smart_workout_logs') || '{}');
        delete logsMap[todayDateStr];
        localStorage.setItem('smart_workout_logs', JSON.stringify(logsMap));
      } catch (e) { }
    }
  };

  const handleClickBodyMuscle = (muscle: any) => {
    const muscleId = muscle && muscle.muscle ? muscle.muscle : (typeof muscle === 'string' ? muscle : null);
    if (muscleId) {
      const norm = normalizeMuscleId(muscleId);
      setSelectedMuscle(prev => prev === norm ? null : norm);
    }
  };

  // Derive muscle target counts directly from template & active selected exercises
  const effectiveTargets = useMemo(() => {
    if (!currentTabWorkout) return [];

    const countsMap: Record<string, { count: number; rawId: string }> = {};

    if (currentTabWorkout.exercises && currentTabWorkout.exercises.length > 0) {
      currentTabWorkout.exercises.forEach((tmplEx: any) => {
        if (!tmplEx.exerciseName) return;
        const matched = allExercises.find(e => e.name && e.name.toLowerCase().trim() === tmplEx.exerciseName.toLowerCase().trim());
        const muscleRaw = matched ? matched.muscle : (tmplEx.muscle || 'chest');
        const muscleKey = normalizeMuscleId(muscleRaw);
        if (!countsMap[muscleKey]) {
          countsMap[muscleKey] = { count: 0, rawId: muscleRaw };
        }
        countsMap[muscleKey].count += 1;
      });
    } else if (currentTabWorkout.targets && Array.isArray(currentTabWorkout.targets)) {
      currentTabWorkout.targets.forEach((tgt: any) => {
        const muscleKey = normalizeMuscleId(tgt.id);
        countsMap[muscleKey] = { count: tgt.count || 1, rawId: tgt.id };
      });
    }

    // Also include any muscle from active selected exercises
    activeSelectedExercises.forEach(ex => {
      const muscleKey = ex.normMuscle || normalizeMuscleId(ex.muscle);
      if (!countsMap[muscleKey]) {
        countsMap[muscleKey] = { count: 1, rawId: ex.muscle };
      }
    });

    return Object.keys(countsMap).map(mKey => ({
      id: countsMap[mKey].rawId,
      label: MUSCLE_NAMES_VI[mKey] || mKey,
      count: countsMap[mKey].count
    }));
  }, [currentTabWorkout, allExercises, activeSelectedExercises]);

  const filteredLibraryExercises = useMemo(() => {
    return allExercises.filter(ex => {
      const matchMuscle = selectedMuscle ? ex.normMuscle === normalizeMuscleId(selectedMuscle) : true;
      const q = librarySearchTerm.toLowerCase().trim();
      const matchSearch = q
        ? (ex.name && ex.name.toLowerCase().includes(q)) ||
          (ex.equipment && ex.equipment.toLowerCase().includes(q)) ||
          (ex.muscle && ex.muscle.toLowerCase().includes(q)) ||
          (MUSCLE_NAMES_VI[ex.normMuscle] && MUSCLE_NAMES_VI[ex.normMuscle].toLowerCase().includes(q))
        : true;
      return matchMuscle && matchSearch;
    });
  }, [allExercises, selectedMuscle, librarySearchTerm]);

  let highlighterData: any[] = [];
  let modelColors = ['#00E5FF', '#00FF87'];

  if (effectiveTargets.length > 0) {
    const rawMuscles: string[] = effectiveTargets.map((t: any) => normalizeMuscleId(t.id));
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
        { name: currentTabWorkout?.name || 'Workout', muscles: allMuscles }
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

  const formattedTime = currentTime ? currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '20:16:36';
  const formattedDate = currentTime ? currentTime.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Thu, Aug 13, 2026';

  const completedCount = activeSelectedExercises.filter(ex => ex.completed).length;
  const progressPercent = (isWorkoutSaved && activeSelectedExercises.length > 0)
    ? Math.round((completedCount / activeSelectedExercises.length) * 100)
    : 0;

  // Calculate Exceeded Muscle Target Warnings
  const exceededTargetMuscles = effectiveTargets.map((target: any) => {
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
    <div suppressHydrationWarning className="min-h-screen bg-[#0B0F19] text-white p-3 sm:p-6 md:p-8 relative overflow-x-hidden font-sans">
      {/* Smart Ambient Glow Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00E5FF]/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[#00FF87]/10 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-4 sm:space-y-6">
        <Header />

        {/* Top Control Bar: Brand / Live Time / Routine Selector */}
        <div className="p-4 sm:p-6 bg-[#131B2E]/90 backdrop-blur-2xl border border-slate-800/80 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/80 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#00E5FF] to-[#00FF87] p-0.5 shadow-lg shadow-[#00E5FF]/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#0B0F19] rounded-[14px] flex items-center justify-center">
                <span className="text-lg sm:text-xl font-black text-[#00E5FF]">⚡</span>
              </div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Smart Workouts
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium">Hệ thống Quản lý & Luyện tập Thông minh</p>
            </div>
          </div>

          {/* Live Time Clock Widget */}
          <div suppressHydrationWarning className="hidden sm:flex items-center gap-3 bg-[#0B101D] px-4 py-2.5 rounded-2xl border border-slate-800/80 shadow-inner">
            <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#00FF87] animate-ping" />
              <span className="text-[10px] font-bold text-[#00FF87] uppercase tracking-wider">LIVE</span>
            </div>
            <span className="text-xl sm:text-2xl font-mono font-black text-[#00E5FF] tracking-tight">{formattedTime}</span>
            <span className="text-xs text-slate-400 font-medium border-l border-slate-800 pl-3">{formattedDate}</span>
          </div>

          {/* Active Routine Selection Dropdown */}
          <div className="w-full md:w-auto flex flex-col sm:flex-row sm:items-center gap-2 bg-[#0B101D] p-3 sm:p-0 rounded-2xl border border-slate-800/80 md:border-none md:bg-transparent">
            <label className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>LỊCH TẬP ĐANG CHỌN:</span>
              <span className="sm:hidden text-[#00E5FF] text-[10px] font-mono">{formattedTime}</span>
            </label>
            <select
              value={activeRoutineId}
              onChange={(e) => handleRoutineChange(e.target.value)}
              className="w-full sm:w-auto bg-[#18233C] md:bg-[#0B101D] border border-slate-700 md:border-slate-800 text-slate-100 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#00E5FF] text-xs sm:text-sm font-bold shadow-sm cursor-pointer"
            >
              {Object.values(routinesMap).map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fetch Error / Cold Start Retry Banner */}
        {fetchError && (
          <div className="bg-rose-500/10 border border-rose-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rose-300 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-extrabold text-white">Không thể kết nối tới máy chủ!</p>
                <p className="text-slate-400 text-[11px]">Server Render có thể đang khởi động nguội hoặc mạng di động vừa ngắt kết nối.</p>
              </div>
            </div>
            <button
              onClick={fetchInitialData}
              disabled={isFetching}
              className="w-full sm:w-auto px-4 py-2 bg-[#00E5FF] hover:bg-cyan-300 text-slate-950 font-black rounded-xl text-xs transition shadow-md shrink-0 active:scale-95"
            >
              {isFetching ? 'Đang kết nối lại...' : '🔄 Thử lại ngay'}
            </button>
          </div>
        )}

        {/* Stats Dashboard Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">

          {/* Stat 1: Progress */}
          <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex items-center gap-3 sm:gap-4 shadow-xl">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-lg sm:text-xl font-bold shrink-0">
              📋
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">TIẾN ĐỘ BÀI TẬP</span>
              <span className="text-base sm:text-xl font-extrabold text-white block truncate">
                {isWorkoutSaved ? `${progressPercent}% Hoàn Thành` : 'Đang chọn bài...'}
              </span>
              <div className="w-full h-1.5 sm:h-2 bg-[#0B101D] rounded-full mt-1.5 overflow-hidden border border-slate-800">
                <div className="h-full bg-gradient-to-r from-[#00E5FF] to-[#00FF87] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>

          {/* Stat 2: Mode */}
          <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex items-center gap-3 sm:gap-4 shadow-xl">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#00FF87] text-lg sm:text-xl font-bold shrink-0">
              🏋️
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">CHẾ ĐỘ TẬP</span>
              <span className="text-base sm:text-xl font-extrabold text-[#00FF87] block truncate">{activeRoutine?.name || 'Push - Pull - Leg'}</span>
            </div>
          </div>

          {/* Stat 3: Streak */}
          <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex items-center gap-3 sm:gap-4 shadow-xl">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-lg sm:text-xl font-bold shrink-0">
              🔥
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">STREAK TẬP</span>
              <span className="text-base sm:text-xl font-extrabold text-white block">{streakDays} Ngày Liên Tục</span>
            </div>
          </div>

        </div>

        {/* Day Selector Navigation Row */}
        <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[#00E5FF] text-base sm:text-lg">🧬</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">Lịch Tập Theo Ngày</h2>
            </div>

            <div className="text-[11px] sm:text-xs font-bold text-slate-400 bg-[#0B101D] px-3 py-1 rounded-xl border border-slate-800/90">
              Hôm nay: <span className="text-[#00E5FF] font-black">
                {realTodayWorkout ? `${realTodayWorkout.day} - ${realTodayWorkout.name}` : realTodayString}
              </span>
            </div>
          </div>

          {/* Day Selector Tabs */}
          {sortedSchedule.length > 0 && activeRoutineId !== 'none' && (
            <div className="flex overflow-x-auto gap-2 sm:gap-3 pt-3 pb-2 custom-scrollbar snap-x">
              {sortedSchedule.map((dayObj: any, index: number) => {
                const isRealToday = dayObj.day === realTodayString;
                const isActive = safeDayIndex === index;

                return (
                  <button
                    key={index}
                    onClick={() => handleSelectDayTab(index)}
                    className={`relative px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-extrabold transition-all duration-300 flex flex-col items-center min-w-[110px] sm:min-w-[130px] shrink-0 snap-start ${isActive
                        ? 'bg-[#00E5FF] text-slate-950 shadow-[0_0_20px_rgba(0,229,255,0.4)] scale-105 z-10'
                        : 'bg-[#18233C] border border-slate-800/90 text-slate-400 hover:bg-[#1E2C4F] hover:text-white'
                      }`}
                  >
                    {isRealToday && (
                      <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[8px] sm:text-[9px] font-black rounded-full shadow-lg uppercase tracking-wider whitespace-nowrap z-20 ${isActive
                          ? 'bg-[#00FF87] text-slate-950 border border-emerald-950'
                          : 'bg-[#00FF87] text-slate-950 border border-emerald-400 animate-pulse'
                        }`}>
                        📌 HÔM NAY
                      </span>
                    )}
                    <span className="uppercase tracking-wider opacity-80 mb-0.5">{dayObj.day}</span>
                    <span className="text-xs sm:text-sm font-black truncate max-w-full">{dayObj.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Main Workouts Layout: Body Highlighter (Left) + Detailed List (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

          {/* Left Panel: Body Map */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 h-fit self-start bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 z-20">
            <div className="flex justify-between items-center w-full border-b border-slate-800/80 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-[#00E5FF] flex items-center gap-2">
                <span>🧘</span> Sơ đồ cơ bắp 3D
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModelType(prev => prev === 'anterior' ? 'posterior' : 'anterior')}
                  className="px-3 py-1.5 bg-[#18233C] hover:bg-[#1E2C4F] rounded-xl text-xs font-bold text-[#00E5FF] border border-cyan-500/30 transition shadow-sm"
                >
                  {modelType === 'anterior' ? 'Mặt sau' : 'Mặt trước'}
                </button>
                <button
                  onClick={() => setShowMobileBodyModel(prev => !prev)}
                  className="lg:hidden px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition border border-slate-700"
                >
                  {showMobileBodyModel ? 'Thu gọn ✕' : 'Mở rộng 👁️'}
                </button>
              </div>
            </div>

            <div className={`${showMobileBodyModel ? 'block' : 'hidden lg:block'} space-y-3`}>
              <div className="w-full max-w-[240px] sm:max-w-xs mx-auto py-2">
                <Model
                  type={modelType}
                  data={highlighterData}
                  style={{ width: '100%' }}
                  onClick={handleClickBodyMuscle}
                  highlightedColors={modelColors}
                />
              </div>

            </div>
          </div>

          {/* Right Panel: Exercise Details & Checklist */}
          <div className="lg:col-span-7 space-y-6">

            <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-6">

              {/* Header with Save / Locked Action / Reset */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 sm:pb-4 flex-wrap gap-3">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>📅</span> <span className="hidden sm:inline">Danh sách bài tập - </span>
                  <span className="text-[#00E5FF]">
                    {currentTabWorkout?.day} ({currentTabWorkout?.name})
                  </span>
                </h2>

                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                  {!isWorkoutSaved && currentTabWorkout?.exercises && currentTabWorkout.exercises.length > 0 && (
                    <button
                      onClick={handleResetToTemplate}
                      title="Khôi phục danh sách bài tập về lịch gốc mặc định"
                      className="px-3 py-1.5 bg-[#18233C] hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition flex-1 sm:flex-none text-center"
                    >
                      🔄 Khôi phục lịch gốc
                    </button>
                  )}

                  {isWorkoutSaved ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                      <span className="px-3 py-1.5 bg-emerald-950/80 border border-emerald-500/40 text-[#00FF87] text-xs font-extrabold rounded-xl shadow-md">
                        🔒 ĐÃ CHỐT LỊCH
                      </span>
                      <button
                        onClick={handleUnlockWorkout}
                        className="px-3 py-1.5 bg-[#18233C] hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition"
                      >
                        ✏️ Sửa lại
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleSaveWorkout}
                      className="w-full sm:w-auto px-4 py-2.5 bg-[#00E5FF] hover:bg-cyan-300 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-[#00E5FF]/20 transition active:scale-95 text-center"
                    >
                      💾 LƯU & BẮT ĐẦU TẬP
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Notice Message Banner */}
              {noticeMessage && (
                <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-amber-300 shadow-md">
                  <span className="text-lg shrink-0">💡</span>
                  <span className="font-bold">{noticeMessage}</span>
                </div>
              )}

              {/* Dynamic Over-Target Warning Banner */}
              {exceededTargetMuscles.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/40 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-rose-300 shadow-lg">
                  <span className="text-xl shrink-0">⚠️</span>
                  <div>
                    <p className="font-black text-rose-400 uppercase tracking-wider">CẢNH BÁO VƯỢT QUÁ LỊCH TẬP ĐỀ XUẤT!</p>
                    <p className="mt-1 leading-relaxed">
                      Bạn đã chọn vượt quá số bài so với mục tiêu đề xuất cho các nhóm cơ:{' '}
                      <strong className="text-white underline">
                        {exceededTargetMuscles.map((tInfo: any) => `${MUSCLE_NAMES_VI[tInfo.id] || tInfo.id} (${tInfo.currentCount}/${tInfo.targetCount})`).join(', ')}
                      </strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Targets / Muscles Bar */}
              <div>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Lọc thư viện bài tập theo nhóm cơ:</p>
                {effectiveTargets.length > 0 && activeRoutineId !== 'none' ? (
                  <div className="flex flex-wrap gap-2">
                    {effectiveTargets.map((target: any, index: number) => {
                      const normTargetId = normalizeMuscleId(target.id);
                      const targetCount = target.count || 2;
                      const currentCount = activeSelectedExercises.filter(ex => ex.normMuscle === normTargetId).length;
                      const isExceeded = currentCount > targetCount;
                      const isMatched = currentCount === targetCount;

                      return (
                        <button
                          key={`${target.id}-${index}`}
                          onClick={() => setSelectedMuscle(selectedMuscle === normTargetId ? null : normTargetId)}
                          className={`px-3 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all border flex items-center gap-1.5 sm:gap-2 ${selectedMuscle === normTargetId
                              ? 'bg-[#00E5FF] text-slate-950 border-[#00E5FF] shadow-lg shadow-[#00E5FF]/20'
                              : isExceeded
                                ? 'bg-rose-950/40 text-rose-300 border-rose-500/50 hover:bg-rose-900/50'
                                : isMatched
                                  ? 'bg-emerald-950/40 text-[#00FF87] border-emerald-500/40 hover:bg-emerald-900/50'
                                  : 'bg-[#18233C] text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                            }`}
                        >
                          <span>{MUSCLE_NAMES_VI[target.id] || target.id}</span>

                          <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-black ${selectedMuscle === normTargetId
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
                    <p className="text-[#00FF87] font-bold text-sm">Hôm nay là ngày nghỉ, hãy để cơ thể phục hồi nhé!</p>
                  ) : (
                    <p className="text-xs text-slate-400">Hôm nay không có nhóm cơ nào được lên lịch.</p>
                  )
                )}
              </div>

              {/* Selected / Checklist Exercises */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                  <p className="text-[11px] sm:text-xs font-bold text-[#00E5FF] uppercase tracking-wider">
                    Các bài đã chọn ({activeSelectedExercises.length})
                  </p>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-semibold hidden sm:inline">
                    {isWorkoutSaved ? 'Tích chọn để đánh dấu hoàn thành' : 'Chỉnh sửa theo ý bạn rồi bấm LƯU để bắt đầu'}
                  </span>
                </div>

                {activeSelectedExercises.length > 0 ? (
                  activeSelectedExercises.map((ex, i) => (
                    <div key={ex.id} className="p-3.5 sm:p-5 rounded-2xl bg-[#0E1526] border border-slate-800/90 hover:border-cyan-500/40 transition-all flex items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-lg group">

                      <div className="flex-1 space-y-2.5 sm:space-y-3 min-w-0">
                        <div className="flex items-start sm:items-center justify-between flex-wrap gap-1.5 sm:gap-2">
                          <h3 
                            onClick={() => setSelectedDetailExercise(ex)}
                            className="font-extrabold text-white text-sm sm:text-base hover:text-[#00E5FF] cursor-pointer transition-colors flex flex-wrap items-center gap-1.5 sm:gap-2"
                            title="Bấm để xem hướng dẫn & chi tiết bài tập"
                          >
                            <span>{i + 1}. {ex.name}</span>
                            <span className="text-[11px] sm:text-xs font-bold text-cyan-400 opacity-80 hover:opacity-100 flex items-center gap-0.5">
                              ℹ️ Chi tiết
                            </span>
                            {ex.requiresWarmup && (
                              <span className="px-2 py-0.5 bg-amber-950/80 text-amber-400 border border-amber-500/40 rounded-full text-[9px] sm:text-[10px] font-extrabold" title={ex.warmupNotes || 'Cần khởi động'}>
                                🔥 Khởi Động
                              </span>
                            )}
                            {ex.isOptional && (
                              <span className="px-2 py-0.5 bg-purple-950/80 text-purple-300 border border-purple-500/40 rounded-full text-[9px] sm:text-[10px] font-extrabold">
                                💡 Tùy Chọn
                              </span>
                            )}
                          </h3>
                          {!isWorkoutSaved && (
                            <button
                              onClick={() => handleRemoveExercise(ex.id)}
                              className="text-[11px] sm:text-xs text-rose-400 hover:text-rose-300 font-bold ml-auto"
                            >
                              ✕ Xóa
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
                          {/* Sets adjustment */}
                          {!isWorkoutSaved ? (
                            <div className="flex items-center gap-1.5 bg-[#0B101D] px-2 py-1 rounded-xl border border-slate-800">
                              <span className="text-slate-400 font-semibold text-[10px] sm:text-xs">Hiệp:</span>
                              <button
                                onClick={() => updateExerciseSets(ex.id, ex.sets - 1)}
                                className="w-6 h-6 rounded-lg bg-[#18233C] hover:bg-slate-700 text-[#00E5FF] font-black flex items-center justify-center text-xs border border-slate-700 active:scale-95"
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
                                className="w-7 bg-transparent text-[#00E5FF] font-black text-center focus:outline-none text-xs"
                              />
                              <button
                                onClick={() => updateExerciseSets(ex.id, ex.sets + 1)}
                                className="w-6 h-6 rounded-lg bg-[#18233C] hover:bg-slate-700 text-[#00E5FF] font-black flex items-center justify-center text-xs border border-slate-700 active:scale-95"
                              >+</button>
                            </div>
                          ) : (
                            <span className="bg-[#0B101D] px-2.5 py-1 rounded-xl border border-slate-800 text-slate-300 font-bold">
                              Hiệp: <strong className="text-[#00E5FF]">{ex.sets}</strong>
                            </span>
                          )}

                          {/* Reps adjustment */}
                          {!isWorkoutSaved ? (
                            <div className="flex items-center gap-1.5 bg-[#0B101D] px-2 py-1 rounded-xl border border-slate-800">
                              <span className="text-slate-400 font-semibold text-[10px] sm:text-xs">Lần:</span>
                              <button
                                onClick={() => adjustExerciseReps(ex.id, -1)}
                                className="w-6 h-6 rounded-lg bg-[#18233C] hover:bg-slate-700 text-[#00E5FF] font-black flex items-center justify-center text-xs border border-slate-700 active:scale-95"
                              >-</button>
                              <input
                                type="text"
                                value={ex.reps}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setExerciseDetails(prev => {
                                    const updated = {
                                      ...prev,
                                      [ex.id]: { ...(prev[ex.id] || { sets: ex.sets, reps: ex.reps }), reps: val }
                                    };
                                    localStorage.setItem(`smart_det_${todayDateStr}_${currentDayKey}`, JSON.stringify(updated));
                                    return updated;
                                  });
                                }}
                                className="w-12 bg-transparent text-[#00E5FF] font-black text-center focus:outline-none text-xs"
                              />
                              <button
                                onClick={() => adjustExerciseReps(ex.id, 1)}
                                className="w-6 h-6 rounded-lg bg-[#18233C] hover:bg-slate-700 text-[#00E5FF] font-black flex items-center justify-center text-xs border border-slate-700 active:scale-95"
                              >+</button>
                            </div>
                          ) : (
                            <span className="bg-[#0B101D] px-2.5 py-1 rounded-xl border border-slate-800 text-slate-300 font-bold">
                              Lần: <strong className="text-[#00E5FF]">{ex.reps}</strong>
                            </span>
                          )}

                          {ex.rir && (
                            <span className="bg-[#0B101D] px-2 py-1 rounded-xl border border-slate-800 text-amber-400 font-bold text-[10px] sm:text-xs">
                              ⚡ RIR: <strong className="text-white">{ex.rir}</strong>
                            </span>
                          )}

                          {ex.restTimeSeconds && (
                            <span className="bg-[#0B101D] px-2 py-1 rounded-xl border border-slate-800 text-cyan-400 font-bold text-[10px] sm:text-xs">
                              ⏱️ Nghỉ: <strong className="text-white">{Math.round(ex.restTimeSeconds / 60)}p</strong>
                            </span>
                          )}

                          <span className="text-emerald-400 font-semibold text-[10px] sm:text-xs">
                            🎯 {MUSCLE_NAMES_VI[ex.normMuscle] || ex.muscle}
                          </span>
                        </div>

                        {/* Warmup or technique notes */}
                        {(ex.warmupNotes || ex.notes) && (
                          <div className="text-[11px] text-slate-300 bg-[#0B101D] p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                            {ex.warmupNotes && (
                              <p className="text-amber-300 font-semibold">🔥 Khởi động: {ex.warmupNotes}</p>
                            )}
                            {ex.notes && (
                              <p className="text-cyan-300 font-medium">📌 Ghi chú: {ex.notes}</p>
                            )}
                          </div>
                        )}
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
                  <p className="text-xs text-slate-400 italic py-4 border-t border-slate-800/80">Chưa có bài tập nào được chọn.</p>
                )}
              </div>

            </div>

            {/* Exercise Library Selection */}
            <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 space-y-4 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📚</span> {selectedMuscle ? `Thư viện bài tập: ${MUSCLE_NAMES_VI[normalizeMuscleId(selectedMuscle)] || selectedMuscle}` : 'Thư viện bài tập (Tất cả)'}
                </h3>

                {/* Real-time Exercise Search Input */}
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs">🔍</span>
                  <input
                    type="text"
                    placeholder="Tìm tên bài tập, dụng cụ..."
                    value={librarySearchTerm}
                    onChange={(e) => setLibrarySearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#0B101D] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00E5FF] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredLibraryExercises.length > 0 ? (
                  filteredLibraryExercises.map(ex => {
                    const isAlreadySelected = currentSelectedIds.includes(ex.id);

                    return (
                      <div key={ex.id} className="p-3.5 rounded-2xl bg-[#0E1526] border border-slate-800/80 flex items-center justify-between hover:bg-[#18233C] transition-colors group gap-3">
                        <div className="space-y-1 overflow-hidden">
                          <span 
                            onClick={() => setSelectedDetailExercise(ex)}
                            className="font-bold text-sm text-slate-200 group-hover:text-[#00E5FF] cursor-pointer transition-colors flex items-center gap-1.5 truncate"
                            title="Bấm để xem hướng dẫn & chi tiết bài tập"
                          >
                            <span className="truncate">{ex.name}</span>
                            <span className="text-[10px] font-semibold text-cyan-400 opacity-70 group-hover:opacity-100 shrink-0">ℹ️</span>
                          </span>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-cyan-400 font-semibold">{MUSCLE_NAMES_VI[ex.normMuscle] || ex.muscle}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-400 font-medium">{ex.equipment || 'Tạ / Máy'}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAddExerciseFromLibrary(ex.id)}
                          disabled={isAlreadySelected || isWorkoutSaved}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${isAlreadySelected || isWorkoutSaved
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
                  <div className="p-6 text-center border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs">
                    {librarySearchTerm 
                      ? `Không tìm thấy bài tập nào khớp từ khóa "${librarySearchTerm}"` 
                      : selectedMuscle 
                        ? `Chưa có bài tập nào thuộc nhóm cơ ${MUSCLE_NAMES_VI[normalizeMuscleId(selectedMuscle)] || selectedMuscle}.` 
                        : 'Không có bài tập nào.'}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Exercise Detail Modal */}
      {selectedDetailExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedDetailExercise(null)}></div>
          <div className="relative bg-[#131B2E] border border-cyan-500/30 rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col space-y-5 animate-in fade-in zoom-in duration-200">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <span className="px-3 py-1 bg-cyan-950 text-[#00E5FF] border border-cyan-500/40 rounded-full text-xs font-black uppercase tracking-wider">
                  Chi Tiết Bài Tập
                </span>
                <h3 className="text-2xl font-black text-white mt-2 flex items-center gap-2">
                  <span>💪</span> {selectedDetailExercise.name}
                </h3>

                {/* Muscle & Equipment Badges */}
                <div className="flex flex-wrap gap-2 text-xs mt-3">
                  <span className="px-3 py-1 bg-emerald-950/80 text-[#00FF87] border border-emerald-500/40 rounded-xl font-extrabold flex items-center gap-1">
                    🎯 Cơ chính: {MUSCLE_NAMES_VI[normalizeMuscleId(selectedDetailExercise.muscle)] || selectedDetailExercise.muscle}
                  </span>

                  {selectedDetailExercise.secondaryMuscles && selectedDetailExercise.secondaryMuscles.length > 0 && (
                    <span className="px-3 py-1 bg-purple-950/80 text-purple-300 border border-purple-500/40 rounded-xl font-extrabold flex items-center gap-1">
                      ✨ Cơ phụ: {selectedDetailExercise.secondaryMuscles.map((m: string) => MUSCLE_NAMES_VI[normalizeMuscleId(m)] || m).join(', ')}
                    </span>
                  )}

                  {selectedDetailExercise.equipment && (
                    <span className="px-3 py-1 bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 rounded-xl font-extrabold flex items-center gap-1">
                      🏋️ Dụng cụ: {selectedDetailExercise.equipment}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedDetailExercise(null)}
                className="w-9 h-9 rounded-full bg-[#18233C] hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xl font-bold transition border border-slate-700 shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto custom-scrollbar pr-3 flex-1">

              {/* YouTube Video Demonstration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-2">
                    <span>▶️</span> Video minh họa bài tập (YouTube)
                  </h4>
                  <a
                    href={getYouTubeSearchUrl(selectedDetailExercise.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl transition flex items-center gap-1 shadow-md shadow-rose-900/40 shrink-0"
                  >
                    <span>Xem thêm ↗</span>
                  </a>
                </div>

                {(() => {
                  const embedUrl = getYouTubeEmbedUrl(selectedDetailExercise.videoUrl);
                  if (embedUrl) {
                    return (
                      <div className="rounded-2xl overflow-hidden border border-rose-500/30 shadow-xl aspect-video bg-black">
                        <iframe
                          src={embedUrl}
                          title={`Video ${selectedDetailExercise.name}`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    );
                  }

                  return (
                    <div className="p-4 bg-[#0B101D] rounded-2xl border border-slate-800 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-500 font-bold flex items-center justify-center text-xl shrink-0">
                        ▶️
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white">Video Hướng Dẫn YouTube</h5>
                        <p className="text-[11px] text-slate-400">Xem clip minh họa kỹ thuật chuẩn form trên YouTube</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Prescribed Training Parameters */}
              <div className="bg-[#0B101D] p-4 rounded-2xl border border-slate-800/90 space-y-3">
                <h4 className="text-xs font-black text-[#00E5FF] uppercase tracking-wider flex items-center gap-2">
                  <span>📊</span> Thông số tập luyện đề xuất
                </h4>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#131B2E] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-medium">Số Hiệp (Sets):</span>
                    <strong className="text-white text-base font-black">{selectedDetailExercise.sets || selectedDetailExercise.defaultSets || 3} Hiệp</strong>
                  </div>
                  <div className="bg-[#131B2E] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-medium">Số Lần (Reps):</span>
                    <strong className="text-[#00E5FF] text-base font-black">{selectedDetailExercise.reps || selectedDetailExercise.defaultReps || '8-12'} Lần</strong>
                  </div>
                  <div className="bg-[#131B2E] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-medium">Ngưỡng RIR:</span>
                    <strong className="text-amber-400 text-sm font-black">⚡ RIR {selectedDetailExercise.rir || '1'}</strong>
                  </div>
                  <div className="bg-[#131B2E] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-medium">Thời gian nghỉ:</span>
                    <strong className="text-cyan-400 text-sm font-black">⏱️ {Math.round((selectedDetailExercise.restTimeSeconds || 180) / 60)} phút</strong>
                  </div>
                </div>

                {selectedDetailExercise.warmupNotes && (
                  <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-300 font-semibold flex items-start gap-2">
                    <span>🔥</span>
                    <div>
                      <strong className="block text-amber-400 uppercase text-[10px] font-black">Yêu cầu Khởi Động:</strong>
                      <p className="mt-0.5">{selectedDetailExercise.warmupNotes}</p>
                    </div>
                  </div>
                )}

                {selectedDetailExercise.notes && (
                  <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-xs text-cyan-300 font-semibold flex items-start gap-2">
                    <span>📌</span>
                    <div>
                      <strong className="block text-cyan-400 uppercase text-[10px] font-black">Ghi Chú Kỹ Thuật:</strong>
                      <p className="mt-0.5">{selectedDetailExercise.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Technical Description & Execution Guide */}
              <div className="bg-[#0B101D] p-4 rounded-2xl border border-slate-800/90 space-y-2">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>📖</span> Hướng dẫn kỹ thuật
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedDetailExercise.description || 'Bài tập này giúp cô lập và phát triển nhóm cơ mục tiêu hiệu quả. Hãy giữ tư thế chuẩn, kiểm soát đà rơi tạ và siết chặt cơ ở đỉnh chuyển động.'}
                </p>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              {!currentSelectedIds.includes(selectedDetailExercise.id) && !isWorkoutSaved && (
                <button
                  onClick={() => {
                    handleAddExerciseFromLibrary(selectedDetailExercise.id);
                    setSelectedDetailExercise(null);
                  }}
                  className="px-4 py-2 bg-[#00E5FF] hover:bg-cyan-300 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-[#00E5FF]/20 transition"
                >
                  + Thêm Bài Tập Này Vào Lịch
                </button>
              )}

              <button
                onClick={() => setSelectedDetailExercise(null)}
                className="px-5 py-2 bg-[#18233C] hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition ml-auto"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
