'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { apiFetch, isUnauthorized } from '@/utils/api';
import { useRoutines, useExercises, useProfile, useStreak, isUnauthorizedError } from '@/hooks/useApi';
import { useServerSave } from '@/hooks/useServerSave';
import SaveStatusBanner from '@/components/SaveStatusBanner';
import WorkoutTopBar from './WorkoutTopBar';
import WorkoutStatsRow from './WorkoutStatsRow';
import DaySelector from './DaySelector';
import BodyMapPanel from './BodyMapPanel';
import WorkoutActionBar from './WorkoutActionBar';
import MuscleTargetsBar from './MuscleTargetsBar';
import ExerciseChecklist from './ExerciseChecklist';
import type { ExerciseDetailsMap } from './types';
import ExerciseLibrary from './ExerciseLibrary';
import ExerciseDetailModal from './ExerciseDetailModal';
import { DEFAULT_ROUTINES, VALID_MODEL_MUSCLES, normalizeMuscleId, findLibraryExercise, toModelMuscle, toFixedReps, MUSCLE_NAMES_VI, DAY_ORDER } from './utils';


export default function Workouts() {
  const router = useRouter();
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [modelType, setModelType] = useState<'anterior' | 'posterior'>('anterior');
  // The user's explicit routine choice; until they pick one we derive it (see data layer below)
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  // Date whose log failed to load: editing that day is blocked so we never overwrite unread data
  const [dayLoadErrorDate, setDayLoadErrorDate] = useState<string | null>(null);
  const [dayRetryTick, setDayRetryTick] = useState(0);
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(0);

  const [showMobileBodyModel, setShowMobileBodyModel] = useState<boolean>(false);

  const [daySelections, setDaySelections] = useState<Record<string, string[]>>({});
  const [dayCompleted, setDayCompleted] = useState<Record<string, string[]>>({});
  const [completedSetsMap, setCompletedSetsMap] = useState<Record<string, number[]>>({});
  const [daySavedStatus, setDaySavedStatus] = useState<Record<string, boolean>>({});
  const [exerciseDetails, setExerciseDetails] = useState<ExerciseDetailsMap>({});

  const [selectedDetailExercise, setSelectedDetailExercise] = useState<any | null>(null);

  const [noticeMessage, setNoticeMessage] = useState<string>('');
  const [librarySearchTerm, setLibrarySearchTerm] = useState<string>('');

  // ═══ REST TIMER STATE ═══
  const REST_DURATION = 180; // 3 minutes in seconds
  const [restTimerActive, setRestTimerActive] = useState<boolean>(false);
  const [restTimerPaused, setRestTimerPaused] = useState<boolean>(false);
  const [restTimerSeconds, setRestTimerSeconds] = useState<number>(REST_DURATION);
  const [restTimerTotal, setRestTimerTotal] = useState<number>(REST_DURATION);
  const [restTimerExerciseName, setRestTimerExerciseName] = useState<string>('');
  const [restTimerExerciseId, setRestTimerExerciseId] = useState<string | null>(null);
  const restTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const savedDayIndexRef = useRef<number | null>(null);

  // Rest Timer tick logic
  useEffect(() => {
    if (restTimerActive && !restTimerPaused && restTimerSeconds > 0) {
      restTimerIntervalRef.current = setInterval(() => {
        setRestTimerSeconds(prev => {
          if (prev <= 1) {
            // Timer finished
            clearInterval(restTimerIntervalRef.current!);
            setRestTimerActive(false);
            setRestTimerPaused(false);
            setRestTimerExerciseId(null);
            // Vibrate on mobile if supported
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([200, 100, 200, 100, 200]);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (restTimerIntervalRef.current) clearInterval(restTimerIntervalRef.current);
    };
  }, [restTimerActive, restTimerPaused, restTimerSeconds]);

  const startRestTimer = useCallback((exerciseId: string, exerciseName: string, durationSeconds: number = REST_DURATION) => {
    if (restTimerIntervalRef.current) clearInterval(restTimerIntervalRef.current);
    setRestTimerExerciseId(exerciseId);
    setRestTimerExerciseName(exerciseName);
    setRestTimerTotal(durationSeconds);
    setRestTimerSeconds(durationSeconds);
    setRestTimerPaused(false);
    setRestTimerActive(true);
  }, []);

  const skipRestTimer = useCallback(() => {
    if (restTimerIntervalRef.current) clearInterval(restTimerIntervalRef.current);
    setRestTimerActive(false);
    setRestTimerPaused(false);
    setRestTimerExerciseId(null);
    setRestTimerSeconds(0);
  }, []);

  const toggleRestTimerPause = useCallback(() => {
    setRestTimerPaused(prev => !prev);
  }, []);

  // ── Data layer: shared SWR cache; the server is the only source of truth ─────────────
  const { routines: routinesData, error: routinesError, isLoading: routinesLoading, mutate: mutateRoutines } = useRoutines();
  const { exercises: exercisesData, error: exercisesError, isLoading: exercisesLoading, mutate: mutateExercises } = useExercises();
  const { profile, error: profileError, isLoading: profileLoading, mutate: mutateProfile } = useProfile();
  const { streak, mutate: mutateStreak } = useStreak();
  const streakDays: number = streak?.current ?? 0;

  useEffect(() => {
    if (isUnauthorizedError(routinesError) || isUnauthorizedError(exercisesError) || isUnauthorizedError(profileError)) {
      localStorage.removeItem('token');
      router.push('/login');
    }
  }, [routinesError, exercisesError, profileError, router]);

  useEffect(() => {
    savedDayIndexRef.current = typeof profile?.lastActiveDayIndex === 'number' ? profile.lastActiveDayIndex : null;
  }, [profile]);

  const isFetching = routinesLoading || exercisesLoading || profileLoading;
  const fetchError = !isFetching && (!!routinesError || !!exercisesError);
  const fetchInitialData = () => {
    mutateRoutines();
    mutateExercises();
    mutateProfile();
  };

  const routinesMap: Record<string, any> = useMemo(() => {
    const map: Record<string, any> = { ...DEFAULT_ROUTINES };
    if (Array.isArray(routinesData)) {
      routinesData.forEach((r: any) => {
        if (r && r.id) map[r.id] = r;
      });
    }
    return map;
  }, [routinesData]);

  const allExercises: any[] = useMemo(() => {
    if (!Array.isArray(exercisesData)) return [];
    return exercisesData.map((ex: any) => ({
      id: ex._id,
      muscle: ex.muscle,
      secondaryMuscles: ex.secondaryMuscles || [],
      equipment: ex.equipment || 'Tạ đơn / Cáp / Máy',
      description: ex.description || 'Bài tập giúp cô lập và phát triển nhóm cơ hiệu quả.',
      videoUrl: ex.videoUrl || '',
      normMuscle: normalizeMuscleId(ex.muscle),
      name: ex.name,
      defaultSets: ex.defaultSets || 1,
      defaultReps: ex.defaultReps || '10',
    }));
  }, [exercisesData]);

  // Active routine: the user's explicit choice, else the one saved on their profile, else the first routine
  const defaultRoutineId = useMemo(() => {
    const saved = profile?.lastActiveRoutineId;
    if (saved && routinesMap[saved]) return saved;
    if (Array.isArray(routinesData) && routinesData.length > 0) return routinesData[0].id as string;
    return 'ppl';
  }, [profile, routinesMap, routinesData]);
  const activeRoutineId: string = selectedRoutineId && routinesMap[selectedRoutineId] ? selectedRoutineId : defaultRoutineId;

  const pushUserProfileUpdate = async (data: Record<string, any>) => {
    try {
      const res = await apiFetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) mutateProfile();
    } catch (e) {
      console.error('Failed to update active routine profile:', e);
    }
  };

  const handleRoutineChange = (newId: string) => {
    setSelectedRoutineId(newId);
    const selectedRoutine = routinesMap[newId];
    if (selectedRoutine && selectedRoutine.name) {
      pushUserProfileUpdate({
        lastActiveRoutineId: newId,
        lastActiveRoutineName: selectedRoutine.name
      });
    } else {
      pushUserProfileUpdate({ lastActiveRoutineId: newId });
    }
  };

  const activeRoutine = routinesMap[activeRoutineId];

  const handleSelectDayTab = (index: number) => {
    // No profile PUT here: it fired on every tab click and burned rate limit.
    // lastActiveDayIndex is persisted when the workout is saved (handleSaveWorkout).
    setCurrentDayIndex(index);
    setSelectedMuscle(null);
  };

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
      } else {
        // No tab for today (e.g. routine skips today): restore the last tab the user saved
        const saved = savedDayIndexRef.current;
        setCurrentDayIndex(saved !== null && saved >= 0 && saved < sortedSchedule.length ? saved : 0);
      }
    }
  }, [activeRoutineId, sortedSchedule, realTodayString]);

  const safeDayIndex = sortedSchedule.length && currentDayIndex >= sortedSchedule.length ? 0 : currentDayIndex;
  const currentTabWorkout = sortedSchedule.length ? sortedSchedule[safeDayIndex] : null;
  const currentDayKey = `${activeRoutineId}_${currentTabWorkout?.day || 'day'}`;
  // Auto-refresh todayDateStr at midnight so it stays correct across day boundaries
  const formatDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [todayDateStr, setTodayDateStr] = useState(() => formatDateStr(new Date()));
  useEffect(() => {
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timer = setTimeout(() => {
      setTodayDateStr(formatDateStr(new Date()));
    }, msUntilMidnight + 500);
    return () => clearTimeout(timer);
  }, [todayDateStr]);

  // Calculate exact YYYY-MM-DD date for current tab in current week using exact day name mapping
  const DAY_TO_WEEK_OFFSET: Record<string, number> = {
    'Thứ 2': 0,     // Monday
    'Thứ 3': 1,     // Tuesday
    'Thứ 4': 2,     // Wednesday
    'Thứ 5': 3,     // Thursday
    'Thứ 6': 4,     // Friday
    'Thứ 7': 5,     // Saturday
    'Chủ nhật': 6,  // Sunday
  };
  const activeTabDateStr = useMemo(() => {
    if (!currentTabWorkout || !currentTabWorkout.day) return todayDateStr;

    const offset = DAY_TO_WEEK_OFFSET[currentTabWorkout.day];
    if (offset === undefined) return todayDateStr;

    const today = new Date();
    const currentDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDayOfWeek - 1));

    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + offset);

    return formatDateStr(targetDate);
  }, [currentTabWorkout, todayDateStr]);

  const dayBlocked = dayLoadErrorDate === activeTabDateStr;
  const { save: saveToServer, retry: retrySave, status: saveStatus } = useServerSave();

  // The day's snapshot is built now (not when the queued request runs); requests are serialized and a
  // failure is shown in the SaveStatusBanner. Resolves to whether the server accepted the save.
  const pushWorkoutToBackend = (payload: {
    selectedIds: string[];
    completedIds: string[];
    detailsMap: Record<string, any>;
    isSaved: boolean;
    setsMap?: Record<string, number[]>;
  }) => {
    const completedExercises = (payload.selectedIds || [])
      .map(id => {
        const ex = allExercises.find(item => item.id === id || item._id === id || item._id?.toString() === id);
        if (!ex || !ex.name) return null;
        const detail = payload.detailsMap[id] || {};
        return {
          id: ex.id,
          name: ex.name,
          sets: detail.sets || ex.defaultSets || 1,
          reps: detail.reps || ex.defaultReps || '10',
          muscle: ex.muscle,
          normMuscle: ex.normMuscle,
          completed: payload.completedIds.includes(id)
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Persist per-set progress inside detailsMap so it survives reloads / devices
    const setsSource = payload.setsMap || completedSetsMap;
    const mergedDetails: Record<string, any> = { ...payload.detailsMap };
    (payload.selectedIds || []).forEach(id => {
      mergedDetails[id] = { ...(mergedDetails[id] || {}), completedSets: setsSource[id] || [] };
    });

    const body = JSON.stringify({
      date: activeTabDateStr,
      routineId: activeRoutineId,
      routineName: activeRoutine?.name || '',
      dayName: currentTabWorkout ? `${currentTabWorkout.day}: ${currentTabWorkout.name}` : '',
      dayIndex: currentDayIndex,
      selectedIds: payload.selectedIds,
      completedIds: payload.completedIds,
      detailsMap: mergedDetails,
      exercises: completedExercises,
      isSaved: payload.isSaved
    });

    return saveToServer(() => apiFetch('/api/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    })).then(ok => {
      if (ok) mutateStreak();
      return ok;
    });
  };

  // Load / Initialize Day Selections per Day Tab with real-time event synchronization
  useEffect(() => {
    let isCancelled = false;

    const syncWorkoutTab = async () => {
      if (!currentTabWorkout || isFetching) return;

      let selectedIds: string[] = [];
      let completedIds: string[] = [];
      let detailsMap: Record<string, any> = {};
      let isSavedSession = false;
      let loadedFromApi = false;
      const loadedSets: Record<string, number[]> = {};

      // 1. Load the saved log for this date from the server.
      // A failed load must NOT fall through to the template: the user could then "save" over a
      // log we simply failed to read. Show an error (editing is blocked) and let them retry.
      let apiLog: any = null;
      try {
        const res = await apiFetch(`/api/workouts?date=${activeTabDateStr}`);
        if (isCancelled) return;
        if (isUnauthorized(res)) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        apiLog = await res.json();
      } catch (e) {
        if (!isCancelled) setDayLoadErrorDate(activeTabDateStr);
        return;
      }
      if (isCancelled) return;
      setDayLoadErrorDate(null);

      if (apiLog) {
        const logRoutineMatches = !apiLog.routineId || apiLog.routineId === activeRoutineId || activeRoutineId === 'none';
        if (logRoutineMatches && apiLog.isSaved && (apiLog.selectedIds || []).length > 0) {
          selectedIds = apiLog.selectedIds || [];
          completedIds = apiLog.completedIds || [];
          detailsMap = apiLog.detailsMap || {};
          Object.keys(detailsMap).forEach(k => {
            if (Array.isArray(detailsMap[k]?.completedSets)) loadedSets[k] = detailsMap[k].completedSets;
          });
          isSavedSession = true;
        } else {
          isSavedSession = false;
        }
        loadedFromApi = true;
      }

      if ((!isSavedSession || selectedIds.length === 0) && currentTabWorkout.exercises && currentTabWorkout.exercises.length > 0) {
        selectedIds = [];
        detailsMap = {};

        currentTabWorkout.exercises.forEach((tmplEx: any) => {
          if (!tmplEx.exerciseName) return;
          const matched = findLibraryExercise(allExercises, tmplEx);

          const exId = matched ? (matched.id || matched._id?.toString()) : `template_${tmplEx.exerciseName.replace(/\s+/g, '_')}`;

          if (exId) {
            selectedIds.push(exId);
            detailsMap[exId] = {
              sets: tmplEx.sets || 3,
              reps: toFixedReps(tmplEx.repsRange),
              rir: tmplEx.rir || '1',
              restTimeSeconds: tmplEx.restTimeSeconds || 180,
              isOptional: !!tmplEx.isOptional,
              requiresWarmup: !!tmplEx.requiresWarmup,
              warmupNotes: tmplEx.warmupNotes || '',
              notes: tmplEx.notes || ''
            };
          }
        });

      }

      if (isCancelled) return;

      if (loadedFromApi) setCompletedSetsMap(loadedSets);
      setDaySelections(prev => ({ ...prev, [currentDayKey]: selectedIds }));
      setDayCompleted(prev => ({ ...prev, [currentDayKey]: completedIds }));
      setDaySavedStatus(prev => ({ ...prev, [currentDayKey]: isSavedSession }));
      if (Object.keys(detailsMap).length > 0) {
        setExerciseDetails(prev => ({ ...prev, ...detailsMap }));
      }
    };

    syncWorkoutTab();

    return () => {
      isCancelled = true;
    };
  }, [currentDayKey, allExercises, todayDateStr, activeTabDateStr, currentTabWorkout, isFetching, dayRetryTick, router]);

  const currentSelectedIds = daySelections[currentDayKey] || [];
  const currentCompletedIds = dayCompleted[currentDayKey] || [];
  const isWorkoutSaved = !!daySavedStatus[currentDayKey];

  // Active exercises list for the current day tab
  const activeSelectedExercises = useMemo(() => {
    return currentSelectedIds
      .map(id => {
        const ex = allExercises.find(item => item.id === id || item._id === id || item._id?.toString() === id);
        if (!ex || !ex.name) return null;
        const detail = exerciseDetails[id] || { sets: ex.defaultSets || 1, reps: toFixedReps(ex.defaultReps) };
        return {
          ...ex,
          sets: detail.sets,
          reps: toFixedReps(detail.reps),
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
    const newSets = Math.max(1, Math.min(50, sets));
    setExerciseDetails(prev => {
      const updated = {
        ...prev,
        [id]: { ...(prev[id] || { sets: 1, reps: '10' }), sets: newSets }
      };
      return updated;
    });
  };

  const adjustExerciseReps = (id: string, delta: number) => {
    setExerciseDetails(prev => {
      const currentReps = prev[id]?.reps || '10';
      const numMatch = currentReps.match(/\d+/);
      const baseNum = numMatch ? parseInt(numMatch[0]) : 10;
      const newNum = Math.max(1, Math.min(100, baseNum + delta));
      const updated = {
        ...prev,
        [id]: { ...(prev[id] || { sets: 1, reps: '10' }), reps: `${newNum}` }
      };
      return updated;
    });
  };

  const handleAddExerciseFromLibrary = (exId: string) => {
    if (isWorkoutSaved) return;
    const newSel = Array.from(new Set([...currentSelectedIds, exId]));
    setDaySelections(prev => ({ ...prev, [currentDayKey]: newSel }));
  };

  const handleRemoveExercise = (exId: string) => {
    if (isWorkoutSaved) return;
    const newSel = currentSelectedIds.filter(id => id !== exId);
    setDaySelections(prev => ({ ...prev, [currentDayKey]: newSel }));
  };

  const handleResetToTemplate = () => {
    if (isWorkoutSaved) return;
    if (!currentTabWorkout?.exercises || currentTabWorkout.exercises.length === 0) return;

    const selectedIds: string[] = [];
    const detailsMap: Record<string, any> = {};

    currentTabWorkout.exercises.forEach((tmplEx: any) => {
      if (!tmplEx.exerciseName) return;
      const matched = findLibraryExercise(allExercises, tmplEx);
      const exId = matched ? (matched.id || matched._id?.toString()) : `template_${tmplEx.exerciseName.replace(/\s+/g, '_')}`;

      if (exId) {
        selectedIds.push(exId);
        detailsMap[exId] = {
          sets: tmplEx.sets || 3,
          reps: toFixedReps(tmplEx.repsRange),
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
    setNoticeMessage('Đã khôi phục danh sách bài tập về lịch gốc (KA) mặc định!');
    setTimeout(() => setNoticeMessage(''), 4000);
  };

  const handleSaveWorkout = () => {
    if (dayBlocked) {
      setNoticeMessage('Chưa tải được nhật ký ngày này. Bấm "Thử lại" trước khi chỉnh sửa để tránh ghi đè dữ liệu.');
      setTimeout(() => setNoticeMessage(''), 4000);
      return;
    }
    if (currentSelectedIds.length === 0) {
      setNoticeMessage('Vui lòng chọn ít nhất 1 bài tập từ thư viện bên dưới trước khi chốt lịch!');
      setTimeout(() => setNoticeMessage(''), 4000);
      return;
    }

    setDaySavedStatus(prev => ({ ...prev, [currentDayKey]: true }));

    // Save as the last trained routine & day tab to MongoDB User Profile
    pushUserProfileUpdate({
      lastActiveRoutineId: activeRoutineId,
      lastActiveRoutineName: activeRoutine?.name || '',
      lastActiveDayIndex: currentDayIndex
    });

    // Only send exercise details for the current day's selected exercises
    const currentDayDetailsMap: Record<string, any> = {};
    currentSelectedIds.forEach(id => {
      if (exerciseDetails[id]) currentDayDetailsMap[id] = exerciseDetails[id];
    });
    pushWorkoutToBackend({
      selectedIds: currentSelectedIds,
      completedIds: currentCompletedIds,
      detailsMap: currentDayDetailsMap,
      isSaved: true
    });

    setNoticeMessage('Đã chốt lịch tập thành công! Bạn có thể bắt đầu tích chọn hoàn thành các bài tập.');
    setTimeout(() => setNoticeMessage(''), 4000);
  };

  const handleUnlockWorkout = () => {
    if (dayBlocked) {
      setNoticeMessage('Chưa tải được nhật ký ngày này. Bấm "Thử lại" trước khi chỉnh sửa để tránh ghi đè dữ liệu.');
      setTimeout(() => setNoticeMessage(''), 4000);
      return;
    }
    setDaySavedStatus(prev => ({ ...prev, [currentDayKey]: false }));
    pushWorkoutToBackend({
      selectedIds: currentSelectedIds,
      completedIds: currentCompletedIds,
      detailsMap: exerciseDetails,
      isSaved: false
    });
  };

  const toggleCompleteExercise = (id: string, forcedState?: boolean, customSets?: number[], setsMapOverride?: Record<string, number[]>) => {
    if (dayBlocked) {
      setNoticeMessage('Chưa tải được nhật ký ngày này. Bấm "Thử lại" trước khi chỉnh sửa để tránh ghi đè dữ liệu.');
      setTimeout(() => setNoticeMessage(''), 4000);
      return;
    }
    if (activeTabDateStr > todayDateStr) {
      setNoticeMessage('Không thể đánh dấu hoàn thành cho ngày trong tương lai!');
      setTimeout(() => setNoticeMessage(''), 4000);
      return;
    }
    if (!isWorkoutSaved) {
      setNoticeMessage('Vui lòng nhấn "💾 LƯU & BẮT ĐẦU TẬP" ở trên để chốt danh sách bài tập trước!');
      setTimeout(() => setNoticeMessage(''), 4000);
      return;
    }

    const isAlreadyComp = currentCompletedIds.includes(id);
    const shouldBeComp = forcedState !== undefined ? forcedState : !isAlreadyComp;
    const newComp = shouldBeComp 
      ? (isAlreadyComp ? currentCompletedIds : [...currentCompletedIds, id])
      : currentCompletedIds.filter(i => i !== id);

    // 1. Instant UI update for main exercise completion
    setDayCompleted(prev => ({ ...prev, [currentDayKey]: newComp }));

    // Update completedSetsMap if clicking main exercise checkmark directly
    let effectiveSetsMap: Record<string, number[]> = setsMapOverride || completedSetsMap;
    if (customSets === undefined) {
      const targetEx = activeSelectedExercises.find(ex => ex.id === id);
      const totalSets = targetEx ? targetEx.sets : 3;
      const newSets = shouldBeComp ? Array.from({ length: totalSets }, (_, i) => i) : [];
      
      const updatedSetsMap = {
        ...completedSetsMap,
        [id]: newSets
      };
      effectiveSetsMap = updatedSetsMap;
      setCompletedSetsMap(updatedSetsMap);
    }

    // Persist to the server (serialized; the server is the only copy)
    const toggleDayDetailsMap: Record<string, any> = {};
    currentSelectedIds.forEach(exId => {
      if (exerciseDetails[exId]) toggleDayDetailsMap[exId] = exerciseDetails[exId];
    });
    pushWorkoutToBackend({
      selectedIds: currentSelectedIds,
      completedIds: newComp,
      detailsMap: toggleDayDetailsMap,
      isSaved: true,
      setsMap: effectiveSetsMap
    });

    // 4. Start 3-minute rest timer when marking exercise as COMPLETED, stop/hide timer when UNTICKING
    if (shouldBeComp && forcedState === undefined) {
      const completedEx = allExercises.find(ex => ex.id === id || ex._id === id || ex._id?.toString() === id);
      startRestTimer(id, completedEx?.name || 'Bài tập', exerciseDetails[id]?.restTimeSeconds || REST_DURATION);
    } else if (!shouldBeComp && restTimerExerciseId === id) {
      skipRestTimer();
    }
  };

  const toggleCompleteSet = (exId: string, setIndex: number, totalSets: number, exName: string) => {
    if (dayBlocked) {
      setNoticeMessage('Chưa tải được nhật ký ngày này. Bấm "Thử lại" trước khi chỉnh sửa để tránh ghi đè dữ liệu.');
      setTimeout(() => setNoticeMessage(''), 4000);
      return;
    }
    if (activeTabDateStr > todayDateStr) {
      setNoticeMessage('Không thể đánh dấu hoàn thành cho ngày trong tương lai!');
      setTimeout(() => setNoticeMessage(''), 4000);
      return;
    }
    if (!isWorkoutSaved) {
      setNoticeMessage('Vui lòng nhấn "💾 LƯU & BẮT ĐẦU TẬP" ở trên để chốt danh sách bài tập trước!');
      setTimeout(() => setNoticeMessage(''), 4000);
      return;
    }

    const currentSets = completedSetsMap[exId] || [];
    const isSetDone = currentSets.includes(setIndex);
    let newSets: number[];

    if (isSetDone) {
      newSets = currentSets.filter(i => i !== setIndex);
    } else {
      newSets = [...currentSets, setIndex].sort((a, b) => a - b);
    }

    const updatedSetsMap = {
      ...completedSetsMap,
      [exId]: newSets
    };
    setCompletedSetsMap(updatedSetsMap);

    // Trigger clock timer when checking a set, STOP/HIDE timer when UNTICKING set
    if (!isSetDone) {
      startRestTimer(exId, `${exName} #${setIndex + 1}`, exerciseDetails[exId]?.restTimeSeconds || REST_DURATION);
    } else if (restTimerExerciseId === exId) {
      skipRestTimer();
    }

    // Check if ALL sets (0..totalSets-1) are completed
    const allDone = Array.from({ length: totalSets }, (_, i) => i).every(i => newSets.includes(i));
    const isMainDone = currentCompletedIds.includes(exId);

    if (allDone && !isMainDone) {
      toggleCompleteExercise(exId, true, newSets, updatedSetsMap);
    } else if (!allDone && isMainDone) {
      toggleCompleteExercise(exId, false, newSets, updatedSetsMap);
    } else {
      // Main completion unchanged: still persist the per-set progress
      const dayDetails: Record<string, any> = {};
      currentSelectedIds.forEach(id => {
        if (exerciseDetails[id]) dayDetails[id] = exerciseDetails[id];
      });
      pushWorkoutToBackend({
        selectedIds: currentSelectedIds,
        completedIds: currentCompletedIds,
        detailsMap: dayDetails,
        isSaved: true,
        setsMap: updatedSetsMap
      });
    }
  };

  // Weights typed into the set boxes live in exerciseDetails; save them once the box loses focus
  const persistSetWeights = () => {
    if (dayBlocked || !isWorkoutSaved) return;
    const dayDetails: Record<string, any> = {};
    currentSelectedIds.forEach(id => {
      if (exerciseDetails[id]) dayDetails[id] = exerciseDetails[id];
    });
    pushWorkoutToBackend({
      selectedIds: currentSelectedIds,
      completedIds: currentCompletedIds,
      detailsMap: dayDetails,
      isSaved: true
    });
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
        const matched = findLibraryExercise(allExercises, tmplEx);
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

  const { highlighterData, modelColors } = useMemo(() => {
    let data: any[] = [];
    let colors = ['#00E5FF', '#00FF87'];

    if (effectiveTargets.length > 0) {
      const rawMuscles: string[] = effectiveTargets.map((t: any) => toModelMuscle(normalizeMuscleId(t.id)));
      const allMuscles = Array.from(new Set(rawMuscles)).filter((m: string) => VALID_MODEL_MUSCLES.has(m));
      const safeSelected = selectedMuscle ? toModelMuscle(normalizeMuscleId(selectedMuscle)) : null;

      if (safeSelected && VALID_MODEL_MUSCLES.has(safeSelected)) {
        data = [
          { name: 'All', muscles: allMuscles },
          { name: 'Selected', muscles: [safeSelected] }
        ];
        colors = ['#00E5FF', '#00FF87'];
      } else {
        data = [
          { name: currentTabWorkout?.name || 'Workout', muscles: allMuscles }
        ];
        colors = ['#00E5FF'];
      }
    } else if (selectedMuscle) {
      const safeSelected = toModelMuscle(normalizeMuscleId(selectedMuscle));
      if (VALID_MODEL_MUSCLES.has(safeSelected)) {
        data = [
          { name: 'Selected', muscles: [safeSelected] }
        ];
        colors = ['#00FF87'];
      }
    }
    return { highlighterData: data, modelColors: colors };
  }, [effectiveTargets, selectedMuscle, currentTabWorkout?.name]);

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
    <div suppressHydrationWarning className="min-h-screen bg-background text-foreground flex font-sans overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 p-4 md:p-8 lg:p-10 space-y-6 overflow-y-auto pb-28 md:pb-10">
        <div className="max-w-[1600px] w-full mx-auto space-y-6">

        {/* Top Control Bar: Brand / Live Time / Routine Selector */}
        <WorkoutTopBar
          activeRoutineId={activeRoutineId}
          handleRoutineChange={handleRoutineChange}
          routinesMap={routinesMap}
        />

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

        {dayBlocked && (
          <div className="bg-rose-500/10 border border-rose-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rose-300 shadow-xl">
            <p className="font-extrabold text-white">Không tải được nhật ký ngày {activeTabDateStr}. Chỉnh sửa đã bị khóa để tránh ghi đè dữ liệu đã lưu.</p>
            <button
              onClick={() => { setDayLoadErrorDate(null); setDayRetryTick(t => t + 1); }}
              className="w-full sm:w-auto px-4 py-2 bg-[#00E5FF] hover:bg-cyan-300 text-slate-950 font-black rounded-xl text-xs transition shadow-md shrink-0 active:scale-95"
            >
              🔄 Thử lại
            </button>
          </div>
        )}

        <SaveStatusBanner status={saveStatus} onRetry={retrySave} />

        {/* Stats Dashboard Row */}
        <WorkoutStatsRow
          activeRoutine={activeRoutine}
          isWorkoutSaved={isWorkoutSaved}
          progressPercent={progressPercent}
          streakDays={streakDays}
        />

        {/* Day Selector Navigation Row */}
        <DaySelector
          activeRoutineId={activeRoutineId}
          handleSelectDayTab={handleSelectDayTab}
          realTodayString={realTodayString}
          realTodayWorkout={realTodayWorkout}
          safeDayIndex={safeDayIndex}
          sortedSchedule={sortedSchedule}
        />

        {/* Main Workouts Layout: Body Highlighter (Left) + Detailed List (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

          {/* Left Panel: Body Map */}
          <BodyMapPanel
            handleClickBodyMuscle={handleClickBodyMuscle}
            highlighterData={highlighterData}
            modelColors={modelColors}
            modelType={modelType}
            setModelType={setModelType}
            setShowMobileBodyModel={setShowMobileBodyModel}
            showMobileBodyModel={showMobileBodyModel}
          />

          {/* Right Panel: Exercise Details & Checklist */}
          <div className="lg:col-span-7 space-y-6">

            <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-6">

              {/* Header with Save / Locked Action / Reset */}
              <WorkoutActionBar
                currentTabWorkout={currentTabWorkout}
                handleResetToTemplate={handleResetToTemplate}
                handleSaveWorkout={handleSaveWorkout}
                handleUnlockWorkout={handleUnlockWorkout}
                isWorkoutSaved={isWorkoutSaved}
              />

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
              <MuscleTargetsBar
                activeRoutineId={activeRoutineId}
                activeSelectedExercises={activeSelectedExercises}
                effectiveTargets={effectiveTargets}
                safeDayIndex={safeDayIndex}
                selectedMuscle={selectedMuscle}
                setSelectedMuscle={setSelectedMuscle}
                sortedSchedule={sortedSchedule}
              />

              {/* Selected / Checklist Exercises */}
              <ExerciseChecklist
                activeSelectedExercises={activeSelectedExercises}
                adjustExerciseReps={adjustExerciseReps}
                completedSetsMap={completedSetsMap}
                exerciseDetails={exerciseDetails}
                persistSetWeights={persistSetWeights}
                handleRemoveExercise={handleRemoveExercise}
                isWorkoutSaved={isWorkoutSaved}
                REST_DURATION={REST_DURATION}
                restTimerActive={restTimerActive}
                restTimerExerciseId={restTimerExerciseId}
                restTimerPaused={restTimerPaused}
                restTimerSeconds={restTimerSeconds}
                restTimerTotal={restTimerTotal}
                setExerciseDetails={setExerciseDetails}
                setSelectedDetailExercise={setSelectedDetailExercise}
                skipRestTimer={skipRestTimer}
                toggleCompleteExercise={toggleCompleteExercise}
                toggleCompleteSet={toggleCompleteSet}
                toggleRestTimerPause={toggleRestTimerPause}
                updateExerciseSets={updateExerciseSets}
              />

            </div>

            {/* Exercise Library Selection */}
            <ExerciseLibrary
              currentSelectedIds={currentSelectedIds}
              filteredLibraryExercises={filteredLibraryExercises}
              handleAddExerciseFromLibrary={handleAddExerciseFromLibrary}
              isWorkoutSaved={isWorkoutSaved}
              librarySearchTerm={librarySearchTerm}
              selectedMuscle={selectedMuscle}
              setLibrarySearchTerm={setLibrarySearchTerm}
              setSelectedDetailExercise={setSelectedDetailExercise}
            />

          </div>

        </div>

      </div>

      {/* Exercise Detail Modal */}
      <ExerciseDetailModal currentSelectedIds={currentSelectedIds} handleAddExerciseFromLibrary={handleAddExerciseFromLibrary} isWorkoutSaved={isWorkoutSaved} selectedDetailExercise={selectedDetailExercise} setSelectedDetailExercise={setSelectedDetailExercise} />

      {/* Modal End */}
      </main>
    </div>
  );
}
