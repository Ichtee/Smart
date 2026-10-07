// Body-fat helpers: the US Navy circumference estimate, ACE categories and the change over time.
import type { BodyMetric } from './bodyMetrics';
import { calcLeanMass } from './nutritionCalc';

export interface NavyInput {
  gender?: string | null;
  height?: number | string | null; // cm
  waist?: number | string | null;  // cm, at the navel
  neck?: number | string | null;   // cm
  hip?: number | string | null;    // cm, women only
}

const pos = (v: unknown) => {
  const n = Number(v);
  return v !== null && v !== undefined && v !== '' && Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * % body fat from circumferences (Hodgdon & Beckett 1984, Naval Health Research Center; standard
 * error about 3.5 %), metric form:
 *   men:   495 / (1.0324 - 0.19077 log10(waist - neck) + 0.15456 log10(height)) - 450
 *   women: 495 / (1.29579 - 0.35004 log10(waist + hip - neck) + 0.22100 log10(height)) - 450
 * Only for "Nam" / "Nữ"; null when a measurement is missing or the result is outside 2-70 %.
 */
export function navyBodyFat({ gender, height, waist, neck, hip }: NavyInput): number | null {
  const h = pos(height), w = pos(waist), n = pos(neck);
  if (h === null || w === null || n === null) return null;
  let density: number;
  if (gender === 'Nam') {
    if (w - n <= 0) return null;
    density = 1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h);
  } else if (gender === 'Nữ') {
    const hp = pos(hip);
    if (hp === null || w + hp - n <= 0) return null;
    density = 1.29579 - 0.35004 * Math.log10(w + hp - n) + 0.221 * Math.log10(h);
  } else return null;
  const bf = Math.round((495 / density - 450) * 10) / 10;
  return bf >= 2 && bf <= 70 ? bf : null;
}

export type BodyFatLabel = 'Mỡ thiết yếu' | 'Vận động viên' | 'Thể hình tốt' | 'Trung bình' | 'Béo phì';

/** American Council on Exercise categories. Women: 10-13 / 14-20 / 21-24 / 25-31 / 32+; men: 2-5 / 6-13 / 14-17 / 18-24 / 25+. */
export function bodyFatCategory(bf: number, gender?: string | null): BodyFatLabel {
  const [athlete, fitness, average, obese] = gender === 'Nữ' ? [14, 21, 25, 32] : [6, 14, 18, 25];
  if (bf < athlete) return 'Mỡ thiết yếu';
  if (bf < fitness) return 'Vận động viên';
  if (bf < average) return 'Thể hình tốt';
  if (bf < obese) return 'Trung bình';
  return 'Béo phì';
}

export interface BodyFatSummary {
  latest: { date: string; bodyFat: number; leanMass: number; fatMass: number };
  /** change in % body fat since the first measurement that has it (null with a single one) */
  change: number | null;
}

/** Latest body composition from the measurements that have a body fat (metrics sorted oldest first). */
export function bodyFatSummary(metrics: BodyMetric[]): BodyFatSummary | null {
  const withFat = metrics.filter(m => m.bodyFat != null);
  if (withFat.length === 0) return null;
  const first = withFat[0];
  const last = withFat[withFat.length - 1];
  const leanMass = calcLeanMass(last.weight, last.bodyFat) ?? 0;
  return {
    latest: { date: last.date, bodyFat: last.bodyFat!, leanMass, fatMass: Math.round((last.weight - leanMass) * 10) / 10 },
    change: withFat.length > 1 ? Math.round((last.bodyFat! - first.bodyFat!) * 10) / 10 : null,
  };
}
