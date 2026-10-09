// Pure constants and helpers for the workouts page (no React state).
import type { Routine, RoutineExercise } from '@/types/domain';
import type { WorkoutExercise } from './types';
import type { Muscle } from 'react-body-highlighter';

export const DEFAULT_ROUTINES: Record<string, Routine> = {
  none: {
    id: 'none',
    name: 'Tự do (Không theo lịch)',
    schedule: []
  }
};

export const VALID_MODEL_MUSCLES = new Set([
  'trapezius', 'upper-back', 'lower-back', 'chest', 'biceps', 'triceps',
  'forearm', 'back-deltoids', 'front-deltoids', 'abs', 'obliques',
  'adductor', 'abductors', 'hamstring', 'quadriceps', 'calves',
  'gluteal', 'head', 'neck', 'knees', 'left-soleus', 'right-soleus'
]);

// narrows a muscle id to what the body-map library can draw
export const isModelMuscle = (id: string): id is Muscle => VALID_MODEL_MUSCLES.has(id);

export const normalizeMuscleId = (id: string): string => {
  if (!id) return '';
  const s = id.toLowerCase().trim();
  if (s === 'adductors' || s === 'adductor' || s === 'cơ khép') return 'adductor';
  if (s === 'delts' || s === 'deltoids' || s === 'front-deltoids' || s === 'front deltoids' || s === 'shoulders' || s === 'vai' || s === 'vai trước') return 'front-deltoids';
  if (s === 'rear delts' || s === 'back-deltoids' || s === 'back deltoids' || s === 'vai sau' || s === 'rear deltoids') return 'back-deltoids';
  if (s === 'upper back' || s === 'upper-back' || s === 'lưng trên' || s === 'lưng') return 'upper-back';
  if (s === 'lower back' || s === 'lower-back' || s === 'lưng dưới') return 'lower-back';
  if (s === 'lats' || s === 'latissimus' || s === 'cơ xô' || s === 'xô') return 'lats';
  if (s === 'traps' || s === 'trapezius' || s === 'cầu vai') return 'trapezius';
  if (s === 'chest' || s === 'ngực') return 'chest';
  if (s === 'biceps' || s === 'tay trước') return 'biceps';
  if (s === 'triceps' || s === 'tay sau') return 'triceps';
  if (s === 'forearm' || s === 'forearms' || s === 'cẳng tay') return 'forearm';
  if (s === 'quads' || s === 'quadriceps' || s === 'đùi trước') return 'quadriceps';
  if (s === 'hamstrings' || s === 'hamstring' || s === 'đùi sau') return 'hamstring';
  if (s === 'glutes' || s === 'gluteal' || s === 'mông') return 'gluteal';
  if (s === 'calves' || s === 'bắp chân') return 'calves';
  if (s === 'abs' || s === 'bụng' || s === 'cơ bụng') return 'abs';
  if (s === 'obliques' || s === 'cơ liên sườn') return 'obliques';
  return s;
};

// Match a routine template exercise to the library: by exerciseId first (survives renames), then by name
export const findLibraryExercise = (library: WorkoutExercise[], tmplEx: RoutineExercise): WorkoutExercise | undefined => {
  if (tmplEx.exerciseId) {
    const byId = library.find(item => item.id === tmplEx.exerciseId || item._id === tmplEx.exerciseId);
    if (byId) return byId;
  }
  const nm = (tmplEx.exerciseName || '').toLowerCase().trim();
  return library.find(item => item.name && item.name.toLowerCase().trim() === nm);
};

export const toModelMuscle = (m: string): string => (m === 'lats' ? 'upper-back' : m);

export const toFixedReps = (val: string | number | undefined | null): string => {
  if (!val) return '10';
  const str = String(val).trim();
  const match = str.match(/\d+/);
  return match ? match[0] : '10';
};

export const MUSCLE_NAMES_VI: Record<string, string> = {
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

export const getYouTubeEmbedUrl = (url?: string): string => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?autoplay=0&rel=0&enablejsapi=1` : '';
};

export const getYouTubeSearchUrl = (exerciseName: string): string => {
  const query = encodeURIComponent(exerciseName);
  return `https://www.youtube.com/results?search_query=${query}`;
};

export const formatWorkoutDayTitle = (dayObj: { day: string; name: string } | null | undefined, lang: string): { day: string; name: string } => {
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

export const DAY_ORDER: Record<string, number> = {
  'Thứ 2': 1,
  'Thứ 3': 2,
  'Thứ 4': 3,
  'Thứ 5': 4,
  'Thứ 6': 5,
  'Thứ 7': 6,
  'Chủ nhật': 7,
};
