import type {Day, Range, Stats} from '../src/types.ts';

const DAY_MS = 86_400_000;

const dayIndex = (iso: string) => Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);

/**
 * Computes profile stats from a flat, date-sorted list of calendar days.
 * `today` is the last day of the calendar unless given; a streak counts as
 * "current" if it reaches today or yesterday (today may simply not have
 * commits yet).
 */
export function computeStats(days: Day[], today = days.at(-1)?.date): Stats {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));

  let longest = 0;
  let longestRange: Range = null;
  let run = 0;
  let runStart = '';
  let prevIdx = Number.NaN;

  for (const d of sorted) {
    const idx = dayIndex(d.date);
    if (d.count > 0) {
      if (run > 0 && idx === prevIdx + 1) {
        run++;
      } else {
        run = 1;
        runStart = d.date;
      }
      if (run > longest) {
        longest = run;
        longestRange = {start: runStart, end: d.date};
      }
    } else {
      run = 0;
    }
    prevIdx = idx;
  }

  // Current streak: walk back from today, allowing today itself to be empty.
  let current = 0;
  let currentRange: Range = null;
  if (today) {
    const byDate = new Map(sorted.map((d) => [d.date, d.count]));
    const iso = (i: number) => new Date(i * DAY_MS).toISOString().slice(0, 10);
    let i = dayIndex(today);
    if (!byDate.get(iso(i))) i--;
    const end = i;
    while ((byDate.get(iso(i)) ?? 0) > 0) {
      current++;
      i--;
    }
    if (current > 0) currentRange = {start: iso(i + 1), end: iso(end)};
  }

  const active = sorted.filter((d) => d.count > 0);
  const total = sorted.reduce((s, d) => s + d.count, 0);
  const best = sorted.reduce<Day | null>((b, d) => (!b || d.count > b.count ? d : b), null);

  const weekly: number[] = [];
  for (let i = 0; i < sorted.length; i += 7) {
    weekly.push(sorted.slice(i, i + 7).reduce((s, d) => s + d.count, 0));
  }

  return {
    total,
    currentStreak: current,
    currentRange,
    longestStreak: longest,
    longestRange,
    activeDays: active.length,
    totalDays: sorted.length,
    bestDay: best && best.count > 0 ? {date: best.date, count: best.count} : null,
    avgPerActiveDay: active.length ? Math.round((total / active.length) * 10) / 10 : 0,
    weekly,
  };
}
