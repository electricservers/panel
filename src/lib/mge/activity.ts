export type WeekdayHistogram = number[]; // length 7, 0=Sun..6=Sat (JS getDay)
export type HourHistogram = number[]; // length 24, hour 0..23

export interface ActivityHistograms {
  byWeekday: WeekdayHistogram;
  byHour: HourHistogram;
}

export function computeActivityHistograms(gametimes: Array<string | number | Date>): ActivityHistograms {
  const byWeekday: WeekdayHistogram = Array(7).fill(0);
  const byHour: HourHistogram = Array(24).fill(0);

  for (const t of gametimes) {
    if (t == null) continue;
    const n = typeof t === 'string' ? Number(t) : t instanceof Date ? t.getTime() / 1000 : t;
    if (!Number.isFinite(n)) continue;
    // gametime appears to be seconds since epoch in DB
    const d = new Date(Number(n) * 1000);
    const wd = d.getDay(); // 0..6 Sun..Sat
    const hr = d.getHours(); // 0..23 local timezone
    if (wd >= 0 && wd <= 6) byWeekday[wd]++;
    if (hr >= 0 && hr <= 23) byHour[hr]++;
  }

  return { byWeekday, byHour };
}

export function normalize(values: number[]): { max: number; sum: number; percents: number[] } {
  const max = values.reduce((m, v) => Math.max(m, v), 0);
  const sum = values.reduce((s, v) => s + v, 0);
  const percents = values.map((v) => (max > 0 ? (v / max) * 100 : 0));
  return { max, sum, percents };
}

export function reorderWeekdayToMondayFirst(values: number[]): number[] {
  if (values.length !== 7) return values.slice();
  return [values[1], values[2], values[3], values[4], values[5], values[6], values[0]];
}

// Removed hour-of-day helpers and labels as we dropped that chart for now
