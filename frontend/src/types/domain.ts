// Shapes of the records the backend returns, shared by the pages that list and edit them.
// Fields the backend may omit are optional.
import type { MealItem } from '@/app/nutrition/types';

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
  images?: string[];
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

/** One day of a meal plan: foods per meal ('Bữa Sáng', 'Bữa Trưa', 'Bữa Tối', 'Ăn Vặt'). */
export interface MealPlanDay {
  name: string;
  meals: Record<string, MealItem[]>;
}

/** A saved meal plan (`/api/meal-plans`): 1-7 days, repeated by weekday when shorter than a week. */
export interface MealPlan {
  id: string;
  name: string;
  description?: string;
  targetCalories?: number | null;
  days: MealPlanDay[];
}

/** An account as the admin user list shows it (`/api/users`). */
export interface AdminUser {
  _id: string;
  name?: string;
  username?: string;
  email: string;
  role?: string;
  /** free = limited AI use, pro = no AI limits */
  plan?: 'free' | 'pro';
  age?: number | null;
  gender?: string;
  height?: number | null;
  weight?: number | null;
  goal?: string;
  activityLevel?: string;
  isEmailVerified?: boolean;
  createdAt?: string;
}
