// The routine editor works on a "draft" (all fields as the text boxes hold them). These pure helpers convert
// between a draft and the API shape and check it with the same rules (and limits) as the backend.

export const WEEK_DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'] as const;
export const MAX_EXERCISES_PER_DAY = 30;

export type DayMode = 'off' | 'train' | 'rest';

export interface DraftExercise {
  exerciseId: string;
  exerciseName: string;
  muscle: string;
  sets: string;
  repsRange: string;
  restTimeSeconds: string;
}

export interface DraftDay {
  day: string;
  mode: DayMode;
  name: string;
  exercises: DraftExercise[];
}

export interface RoutineDraft {
  name: string;
  description: string;
  days: DraftDay[];
}

export interface LibraryExercise {
  _id: string;
  name: string;
  muscle: string;
  defaultSets?: number;
  defaultReps?: string;
}

export const emptyDraft = (): RoutineDraft => ({
  name: '',
  description: '',
  days: WEEK_DAYS.map(day => ({ day, mode: 'off' as DayMode, name: '', exercises: [] })),
});

/** An API routine -> draft (days the routine does not list stay "off"). */
export function draftFromRoutine(routine: any): RoutineDraft {
  const draft = emptyDraft();
  draft.name = routine?.name ?? '';
  draft.description = routine?.description ?? '';
  for (const d of routine?.schedule ?? []) {
    const slot = draft.days.find(x => x.day === d.day);
    if (!slot) continue;
    slot.mode = d.isRestDay ? 'rest' : 'train';
    slot.name = d.name ?? '';
    slot.exercises = (d.exercises ?? []).map((e: any) => ({
      exerciseId: e.exerciseId ?? '',
      exerciseName: e.exerciseName ?? '',
      muscle: e.muscle ?? '',
      sets: String(e.sets ?? 3),
      repsRange: String(e.repsRange ?? '10'),
      restTimeSeconds: String(e.restTimeSeconds ?? 90),
    }));
  }
  return draft;
}

/** A library exercise as a new row of a day, with its default sets/reps. */
export const exerciseFromLibrary = (ex: LibraryExercise): DraftExercise => ({
  exerciseId: ex._id,
  exerciseName: ex.name,
  muscle: ex.muscle,
  sets: String(ex.defaultSets ?? 3),
  repsRange: String(ex.defaultReps ?? '10'),
  restTimeSeconds: '90',
});

const trimmed = (s: string) => s.trim().replace(/\s+/g, ' ');
const isWhole = (s: string, min: number, max: number) => /^\d+$/.test(s.trim()) && Number(s) >= min && Number(s) <= max;

/** First problem found (a user-facing message) or null. */
export function validateDraft(draft: RoutineDraft): string | null {
  if (trimmed(draft.name).length < 2) return 'Tên lịch tập phải từ 2 đến 100 ký tự.';
  const active = draft.days.filter(d => d.mode !== 'off');
  if (!active.some(d => d.mode === 'train')) return 'Hãy chọn ít nhất một ngày tập.';

  for (const d of active) {
    if (d.mode !== 'train') continue;
    if (!trimmed(d.name)) return `${d.day}: hãy đặt tên cho buổi tập (VD: Push, Chân, Toàn thân).`;
    if (d.exercises.length === 0) return `${d.day}: thêm ít nhất một bài tập, hoặc chuyển thành ngày nghỉ.`;
    if (d.exercises.length > MAX_EXERCISES_PER_DAY) return `${d.day}: tối đa ${MAX_EXERCISES_PER_DAY} bài tập mỗi ngày.`;
    for (const [i, e] of d.exercises.entries()) {
      const where = `${d.day}, ${e.exerciseName || `bài ${i + 1}`}`;
      if (!isWhole(e.sets, 1, 50)) return `${where}: số hiệp phải từ 1 đến 50.`;
      if (!/^\d{1,3}(\s*-\s*\d{1,3})?$/.test(e.repsRange.trim())) return `${where}: số lần phải là một số hoặc khoảng (VD: 8-12).`;
      if (!isWhole(e.restTimeSeconds, 0, 600)) return `${where}: thời gian nghỉ phải từ 0 đến 600 giây.`;
    }
  }
  return null;
}

/** Draft -> request body (only days that are used, numbers as numbers). Call after validateDraft. */
export function draftToBody(draft: RoutineDraft) {
  return {
    name: trimmed(draft.name),
    description: draft.description.trim(),
    schedule: draft.days
      .filter(d => d.mode !== 'off')
      .map(d => ({
        day: d.day,
        name: trimmed(d.name) || 'Nghỉ ngơi',
        isRestDay: d.mode === 'rest',
        exercises: d.mode === 'rest' ? [] : d.exercises.map(e => ({
          exerciseId: e.exerciseId,
          exerciseName: e.exerciseName,
          muscle: e.muscle,
          sets: Number(e.sets),
          repsRange: e.repsRange.trim(),
          restTimeSeconds: Number(e.restTimeSeconds),
        })),
      })),
  };
}

/** One-line summary for the list: "3 ngày tập · 14 bài". */
export function routineSummary(routine: any): string {
  const train = (routine?.schedule ?? []).filter((d: any) => !d.isRestDay);
  const exercises = train.reduce((n: number, d: any) => n + (d.exercises?.length ?? 0), 0);
  return `${train.length} ngày tập · ${exercises} bài`;
}
