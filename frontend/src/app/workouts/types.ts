// Per-exercise training parameters for a day (from the routine template, editable before saving).
export interface ExerciseDetail {
  sets: number;
  reps: string;
  rir?: string;
  restTimeSeconds?: number;
  isOptional?: boolean;
  requiresWarmup?: boolean;
  warmupNotes?: string;
  notes?: string;
  /** kg lifted per set, keyed by set index (see setWeights.ts) */
  setWeights?: Record<string, number | string>;
  /** per-set completion saved with the day (see the workouts page) */
  completedSets?: number[];
}

export type ExerciseDetailsMap = Record<string, ExerciseDetail>;

/** A library exercise as the workouts page uses it (mapped from /api/exercises). */
export interface WorkoutExercise {
  id: string;
  _id?: string;
  name: string;
  muscle: string;
  normMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  description: string;
  videoUrl: string;
  images: string[];
  defaultSets: number;
  defaultReps: string;
}

/** An exercise ticked for the current day, with its training parameters. */
export interface ActiveExercise extends WorkoutExercise {
  sets: number;
  reps: string;
  rir: string;
  restTimeSeconds: number;
  isOptional: boolean;
  requiresWarmup: boolean;
  warmupNotes: string;
  notes: string;
  completed: boolean;
}

/** The saved log of a day, as `GET /api/workouts?date=` returns it. */
export interface SavedWorkoutLog {
  routineId?: string;
  isSaved?: boolean;
  selectedIds?: string[];
  completedIds?: string[];
  detailsMap?: ExerciseDetailsMap;
}

/** What the detail modal shows: a library exercise, with its day parameters when it is ticked for the day. */
export type DetailExercise = WorkoutExercise & Partial<ActiveExercise>;
