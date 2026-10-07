// Pure helpers for the body-measurement page: validation of the entry form, change over time, and chart geometry.

export interface BodyMetric {
  date: string; // YYYY-MM-DD
  weight: number;
  bodyFat: number | null;
  waist: number | null;
}

export interface MetricForm {
  weight: string;
  bodyFat: string;
  waist: string;
}

const num = (s: string) => (s.trim() === '' ? undefined : Number(s));
const outside = (n: number | undefined, min: number, max: number) => n === undefined || !Number.isFinite(n) || n < min || n > max;

/** Error message for the entry form, or null when it can be sent. Mirrors the backend limits. */
export function validateMetricForm(f: MetricForm): string | null {
  if (outside(num(f.weight), 10, 500)) return 'Cân nặng phải là số từ 10kg đến 500kg.';
  const fat = num(f.bodyFat);
  if (fat !== undefined && outside(fat, 2, 70)) return 'Tỷ lệ mỡ phải từ 2% đến 70%.';
  const waist = num(f.waist);
  if (waist !== undefined && outside(waist, 30, 250)) return 'Vòng eo phải từ 30cm đến 250cm.';
  return null;
}

/** Body for POST /api/body-metrics (blank optional fields are left out). */
export function metricBody(date: string, f: MetricForm) {
  return {
    date,
    weight: Number(f.weight),
    ...(f.bodyFat.trim() !== '' ? { bodyFat: Number(f.bodyFat) } : {}),
    ...(f.waist.trim() !== '' ? { waist: Number(f.waist) } : {}),
  };
}

export interface MetricSummary {
  latest: BodyMetric;
  first: BodyMetric;
  /** latest.weight - first.weight, rounded to 0.1 (null with a single measurement) */
  change: number | null;
  min: number;
  max: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** `metrics` must be sorted oldest first (as the API returns them). */
export function summarize(metrics: BodyMetric[]): MetricSummary | null {
  if (metrics.length === 0) return null;
  const first = metrics[0];
  const latest = metrics[metrics.length - 1];
  const weights = metrics.map(m => m.weight);
  return {
    latest,
    first,
    change: metrics.length > 1 ? round1(latest.weight - first.weight) : null,
    min: Math.min(...weights),
    max: Math.max(...weights),
  };
}

export interface ChartPoint { x: number; y: number; date: string; weight: number }

const DAY_MS = 86400000;
const dayNumber = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};

/**
 * Positions for a line chart of the weight over time. x follows the real distance between dates (a
 * two-week gap looks like two weeks), y is padded so a flat line sits in the middle. Single point -> centred.
 */
export function chartPoints(metrics: BodyMetric[], width: number, height: number, pad = 12): ChartPoint[] {
  if (metrics.length === 0) return [];
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const days = metrics.map(m => dayNumber(m.date));
  const dMin = days[0];
  const dSpan = days[days.length - 1] - dMin;
  const ws = metrics.map(m => m.weight);
  const wMin = Math.min(...ws);
  const wSpan = Math.max(...ws) - wMin;

  return metrics.map((m, i) => ({
    date: m.date,
    weight: m.weight,
    x: dSpan === 0 ? width / 2 : pad + ((days[i] - dMin) / dSpan) * innerW,
    y: wSpan === 0 ? height / 2 : pad + (1 - (m.weight - wMin) / wSpan) * innerH,
  }));
}

export const pointsToPath = (points: ChartPoint[]): string =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
