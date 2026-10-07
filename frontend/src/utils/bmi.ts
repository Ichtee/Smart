// Body-mass index helpers, shared by onboarding and the profile page.
// Bands for Asian adults (IDI & WPRO 2000, used by Viện Dinh dưỡng Quốc gia); WHO Expert Consultation
// 2004 (Lancet 363:157) found health risk in Asian populations rising at lower BMI than the global bands.

/** BMI = kg / m^2. Returns 0 when height or weight is missing/invalid, so callers can hide the card. */
export function calcBmi(weightKg: number | string | null | undefined, heightCm: number | string | null | undefined): number {
  const w = Number(weightKg);
  const h = Number(heightCm) / 100;
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return 0;
  return w / (h * h);
}

export interface BmiCategory {
  label: 'Thiếu cân' | 'Bình thường' | 'Thừa cân' | 'Béo phì độ I' | 'Béo phì độ II';
  /** Tailwind text colour class used by the UI */
  color: string;
}

/** Lowest BMI of the normal band; a goal weight under it is underweight. */
export const BMI_UNDERWEIGHT = 18.5;

/**
 * <18.5 underweight, 18.5-<23 normal, 23-<25 overweight, 25-<30 obese class I, >=30 obese class II.
 * Every value belongs to exactly one band.
 */
export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < BMI_UNDERWEIGHT) return { label: 'Thiếu cân', color: 'text-blue-400' };
  if (bmi < 23) return { label: 'Bình thường', color: 'text-success' };
  if (bmi < 25) return { label: 'Thừa cân', color: 'text-warning' };
  if (bmi < 30) return { label: 'Béo phì độ I', color: 'text-orange-500' };
  return { label: 'Béo phì độ II', color: 'text-destructive' };
}
