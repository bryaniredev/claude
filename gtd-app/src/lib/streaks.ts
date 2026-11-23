import { daysBetween, shiftDay } from './dates';

export interface StreakInput {
  today: string;
  /** Earliest day to consider (e.g. when tracking started). */
  startKey: string;
  isDone: (key: string) => boolean;
  /** Rest / repaired days: they don't add to the streak, but don't break it either. */
  isRest: (key: string) => boolean;
  /** Days that "count". A missed unscheduled day never breaks a streak. */
  isScheduled: (key: string) => boolean;
}

export interface StreakResult {
  current: number;
  best: number;
  /** The most recent missed day that ended the streak (if any). */
  brokenOn?: string;
}

const MAX_DAYS = 3 * 366;

/**
 * Forgiving streaks: research on streaks (Silverman & Barasch, 2023) shows a
 * broken streak saps motivation, especially when you blame yourself, and that
 * being able to "repair" one softens the blow. So rest days and non-scheduled
 * days never break a streak, and today never breaks it (the day isn't over).
 */
export function computeStreak({
  today,
  startKey,
  isDone,
  isRest,
  isScheduled,
}: StreakInput): StreakResult {
  const span = Math.min(Math.max(daysBetween(startKey, today), 0), MAX_DAYS);

  // Current streak — walk backwards from today.
  let current = 0;
  let brokenOn: string | undefined;
  for (let i = 0; i <= span; i++) {
    const key = shiftDay(today, -i);
    if (isDone(key)) {
      current++;
      continue;
    }
    if (i === 0) continue; // today is still in progress
    if (!isScheduled(key) || isRest(key)) continue;
    brokenOn = key;
    break;
  }

  // Best streak — walk forwards from the start.
  let best = 0;
  let run = 0;
  for (let i = span; i >= 0; i--) {
    const key = shiftDay(today, -i);
    if (isDone(key)) {
      run++;
      best = Math.max(best, run);
      continue;
    }
    if (i === 0) continue;
    if (!isScheduled(key) || isRest(key)) continue;
    run = 0;
  }

  return { current, best: Math.max(best, current), brokenOn };
}

/** A broken streak can be repaired if the miss was within the last 7 days. */
export function canRepair(brokenOn: string | undefined, today: string): boolean {
  if (!brokenOn) return false;
  const ago = daysBetween(brokenOn, today);
  return ago >= 1 && ago <= 7;
}

/** One repair per rolling 7 days keeps repairs meaningful. */
export function repairAvailable(repairsUsedOn: string[], today: string): boolean {
  return !repairsUsedOn.some((d) => {
    const ago = daysBetween(d, today);
    return ago >= 0 && ago < 7;
  });
}

/** Would marking `missedDate` as a rest day actually restore a longer streak? */
export function repairHelps(input: StreakInput, missedDate: string | undefined): boolean {
  if (!missedDate) return false;
  const before = computeStreak(input).current;
  const after = computeStreak({ ...input, isRest: (k) => k === missedDate || input.isRest(k) }).current;
  return after > before;
}
