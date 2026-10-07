import type { ExerciseDetail } from './types';

// Weight lifted in each set, kept in the exercise's details as { [setIndex]: kg } (strings while typing).

export const MAX_SET_WEIGHT = 1000;

/** What the input of one set shows. */
export const setWeightText = (detail: ExerciseDetail | undefined, setIndex: number): string => {
  const v = detail?.setWeights?.[String(setIndex)];
  return v === undefined || v === null ? '' : String(v);
};

/**
 * The details with one set's weight changed. Text is kept as typed ("62." must survive until the next
 * keystroke); an empty text removes the weight. Invalid input (not a non-negative number, above 1000, or
 * more than two decimals) leaves the details unchanged so the box simply refuses the key.
 */
export function withSetWeight(detail: ExerciseDetail, setIndex: number, text: string): ExerciseDetail {
  const rest = { ...(detail.setWeights || {}) };
  delete rest[String(setIndex)];

  if (text.trim() === '') return { ...detail, setWeights: rest };
  if (!/^\d{0,4}([.,]\d{0,2})?$/.test(text.trim())) return detail;
  const normalized = text.trim().replace(',', '.');
  const n = Number(normalized);
  if (Number.isFinite(n) && n > MAX_SET_WEIGHT) return detail;
  return { ...detail, setWeights: { ...rest, [String(setIndex)]: normalized } };
}

/** Weights of the sets that are done, as numbers (for summaries). */
export function completedWeights(detail: ExerciseDetail | undefined, completedSets: number[]): number[] {
  return completedSets
    .map(i => Number(detail?.setWeights?.[String(i)]))
    .filter(n => Number.isFinite(n) && n > 0);
}
