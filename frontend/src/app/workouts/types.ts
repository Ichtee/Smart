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
}

export type ExerciseDetailsMap = Record<string, ExerciseDetail>;
