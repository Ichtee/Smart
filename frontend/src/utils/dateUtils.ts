// Local-timezone YYYY-MM-DD helpers (avoid toISOString(), which shifts the date to UTC).

export const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayStr = (): string => toDateStr(new Date());

/** First and last day (inclusive) of the month containing `d`. */
export const monthRange = (d: Date): { from: string; to: string } => ({
  from: toDateStr(new Date(d.getFullYear(), d.getMonth(), 1)),
  to: toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
});

/** Stable key for a month, e.g. "2026-10". */
export const monthKey = (d: Date): string => toDateStr(d).slice(0, 7);

/** The 7 dates (Mon..Sun) of the week containing `ref`. */
export const weekDatesMonToSun = (ref: Date = new Date()): string[] => {
  const monday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dow = monday.getDay();
  monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return toDateStr(day);
  });
};

/** Smallest range covering the current month and the current week (they can straddle two months). */
export const monthAndWeekRange = (ref: Date = new Date()): { from: string; to: string } => {
  const m = monthRange(ref);
  const w = weekDatesMonToSun(ref);
  return {
    from: [m.from, w[0]].sort()[0],
    to: [m.to, w[6]].sort()[1],
  };
};
