// Shapes of the records the backend returns, shared by the pages that list and edit them.
// Fields the backend may omit are optional.

/** An exercise in the library (`/api/exercises`). */
export interface Exercise {
  _id: string;
  /** some code paths key exercises by `id` (routine templates), others by `_id` */
  id?: string;
  name: string;
  muscle: string;
  secondaryMuscles?: string[];
  defaultSets?: number;
  defaultReps?: string;
  equipment?: string;
  description?: string;
  videoUrl?: string;
}

/** One exercise inside a routine day. */
export interface RoutineExercise {
  exerciseId?: string;
  exerciseName: string;
  muscle: string;
  secondaryMuscles?: string[];
  sets: number;
  repsRange: string;
  rir?: string;
  restTimeSeconds?: number;
  isOptional?: boolean;
  requiresWarmup?: boolean;
  warmupNotes?: string;
  notes?: string;
}

/** How many exercises a day should hit a muscle group. */
export interface MuscleTarget {
  id: string;
  label: string;
  count: number;
}

export interface RoutineDay {
  day: string;
  name: string;
  isRestDay?: boolean;
  targets?: MuscleTarget[];
  exercises?: RoutineExercise[];
}

/** A training routine (`/api/routines`): built-in, or created by the user (`isMine`). */
export interface Routine {
  _id?: string;
  id: string;
  name: string;
  type?: string;
  description?: string;
  isMine?: boolean;
  frequencyDaysPerWeek?: number;
  generalNotes?: string[];
  schedule: RoutineDay[];
}

/** An account as the admin user list shows it (`/api/users`). */
export interface AdminUser {
  _id: string;
  name?: string;
  username?: string;
  email: string;
  role?: string;
  age?: number | null;
  gender?: string;
  height?: number | null;
  weight?: number | null;
  goal?: string;
  activityLevel?: string;
  isEmailVerified?: boolean;
  createdAt?: string;
}
