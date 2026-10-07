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
}

export type ExerciseDetailsMap = Record<string, ExerciseDetail>;
