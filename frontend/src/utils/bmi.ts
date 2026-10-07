// Body-mass index helpers (WHO adult categories), shared by onboarding and the profile page.

/** BMI = kg / m^2. Returns 0 when height or weight is missing/invalid, so callers can hide the card. */
export function calcBmi(weightKg: number | string | null | undefined, heightCm: number | string | null | undefined): number {
  const w = Number(weightKg);
  const h = Number(heightCm) / 100;
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return 0;
  return w / (h * h);
}

export interface BmiCategory {
  label: 'Thiếu cân' | 'Bình thường' | 'Thừa cân' | 'Béo phì';
  /** Tailwind text colour class used by the UI */
  color: string;
}

/**
 * <18.5 underweight, 18.5-<25 normal, 25-<30 overweight, >=30 obese.
 * Every value belongs to exactly one band (the old code left gaps at 24.9-25 and 29.9-30 that fell
 * through to "obese").
 */
export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return { label: 'Thiếu cân', color: 'text-blue-400' };
  if (bmi < 25) return { label: 'Bình thường', color: 'text-success' };
  if (bmi < 30) return { label: 'Thừa cân', color: 'text-warning' };
  return { label: 'Béo phì', color: 'text-destructive' };
}
