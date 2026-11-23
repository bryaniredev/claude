import type { GTDItem, Project } from '../types';
import type { DailyItem, DayLog } from '../store/dailyStore';
import type { Goal } from '../store/horizonsStore';
import type { Habit } from '../store/habitStore';
import type { Win } from '../store/progressStore';
import { computeStreak, repairHelps, type StreakInput, type StreakResult } from './streaks';
import { daysBetween, isoToDayKey, todayKey, weekdayOf } from './dates';

// ─── Goals ────────────────────────────────────────────────────────────────────

export function goalForGtdItem(
  gtdItemId: string | undefined,
  items: GTDItem[],
  projects: Project[],
  goals: Goal[]
): { project?: Project; goal?: Goal } {
  if (!gtdItemId) return {};
  const item = items.find((i) => i.id === gtdItemId);
  const project = item?.projectId ? projects.find((p) => p.id === item.projectId) : undefined;
  const goal = project?.goalId ? goals.find((g) => g.id === project.goalId) : undefined;
  return { project, goal };
}

// ─── Streaks ──────────────────────────────────────────────────────────────────

export function daysWithCompletedPriority(items: DailyItem[]): Set<string> {
  const set = new Set<string>();
  for (const i of items) if (i.status === 'done' && i.completedAt) set.add(isoToDayKey(i.completedAt));
  return set;
}

function priorityStreakInput(
  items: DailyItem[],
  days: Record<string, DayLog>,
  streakWeekdays: number[],
  today: string
): StreakInput {
  const done = daysWithCompletedPriority(items);
  const candidates = [
    ...items.map((i) => isoToDayKey(i.createdAt)),
    ...Object.keys(days),
  ].filter((k) => k <= today);
  const startKey = candidates.length ? candidates.sort()[0] : today;
  return {
    today,
    startKey,
    isDone: (k) => done.has(k),
    isRest: (k) => Boolean(days[k]?.rest),
    isScheduled: (k) => streakWeekdays.includes(weekdayOf(k)),
  };
}

export function priorityStreak(
  items: DailyItem[],
  days: Record<string, DayLog>,
  streakWeekdays: number[],
  today = todayKey()
): StreakResult & { repairHelps: boolean } {
  const input = priorityStreakInput(items, days, streakWeekdays, today);
  const result = computeStreak(input);
  return { ...result, repairHelps: repairHelps(input, result.brokenOn) };
}

function habitStreakInput(habit: Habit, today: string): StreakInput {
  const checks = new Set(habit.checkIns);
  const rests = new Set(habit.rests);
  return {
    today,
    startKey: isoToDayKey(habit.createdAt),
    isDone: (k) => checks.has(k),
    isRest: (k) => rests.has(k),
    isScheduled: (k) => habit.days.includes(weekdayOf(k)),
  };
}

export function habitStreak(habit: Habit, today = todayKey()): StreakResult & { repairHelps: boolean } {
  const input = habitStreakInput(habit, today);
  const result = computeStreak(input);
  return { ...result, repairHelps: repairHelps(input, result.brokenOn) };
}

// ─── Stuck items ──────────────────────────────────────────────────────────────

/** How many days a priority has been sitting on your list unfinished. */
export function daysOnList(item: DailyItem, today = todayKey()): number {
  const until = item.date > today ? item.date : today;
  return daysBetween(item.firstPlannedDate, until) + 1;
}

export const STUCK_THRESHOLD_DAYS = 3;

export function stuckItems(items: DailyItem[], today = todayKey()): DailyItem[] {
  return items
    .filter((i) => i.status === 'active' && daysOnList(i, today) >= STUCK_THRESHOLD_DAYS)
    .sort((a, b) => daysOnList(b, today) - daysOnList(a, today));
}

// ─── Done list ────────────────────────────────────────────────────────────────

export interface DoneEntry {
  key: string;
  date: string;
  at: string;
  title: string;
  kind: 'priority' | 'action' | 'project' | 'win';
  frog?: boolean;
  winId?: string;
}

export function doneEntries(
  gtdItems: GTDItem[],
  projects: Project[],
  daily: DailyItem[],
  wins: Win[]
): DoneEntry[] {
  const out: DoneEntry[] = [];
  const dailyByGtd = new Map<string, DailyItem>();
  for (const d of daily) if (d.status === 'done' && d.gtdItemId) dailyByGtd.set(d.gtdItemId, d);
  const seenGtd = new Set<string>();

  for (const g of gtdItems) {
    if (g.status !== 'done' || !g.completedAt) continue;
    const d = dailyByGtd.get(g.id);
    seenGtd.add(g.id);
    out.push({
      key: `g-${g.id}`,
      date: isoToDayKey(g.completedAt),
      at: g.completedAt,
      title: g.title,
      kind: d ? 'priority' : 'action',
      frog: d?.isFrog,
    });
  }
  // Priorities whose GTD item no longer exists
  for (const d of daily) {
    if (d.status !== 'done' || !d.completedAt) continue;
    if (d.gtdItemId && seenGtd.has(d.gtdItemId)) continue;
    out.push({
      key: `d-${d.id}`,
      date: isoToDayKey(d.completedAt),
      at: d.completedAt,
      title: d.title,
      kind: 'priority',
      frog: d.isFrog,
    });
  }
  for (const p of projects) {
    if (p.status !== 'completed' || !p.completedAt) continue;
    out.push({
      key: `p-${p.id}`,
      date: isoToDayKey(p.completedAt),
      at: p.completedAt,
      title: p.title,
      kind: 'project',
    });
  }
  for (const w of wins) {
    out.push({ key: `w-${w.id}`, date: w.date, at: w.createdAt, title: w.text, kind: 'win', winId: w.id });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

// ─── Planning fallacy ─────────────────────────────────────────────────────────

export function estimateAccuracy(items: DailyItem[]) {
  const samples = items.filter(
    (i) => i.status === 'done' && (i.estimateMinutes ?? 0) > 0 && (i.actualMinutes ?? 0) > 0
  );
  if (!samples.length) return null;
  const ratios = samples.map((i) => (i.actualMinutes as number) / (i.estimateMinutes as number));
  const sorted = [...ratios].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const totalEst = samples.reduce((n, i) => n + (i.estimateMinutes ?? 0), 0);
  const totalAct = samples.reduce((n, i) => n + (i.actualMinutes ?? 0), 0);
  return { count: samples.length, median, totalEst, totalAct, samples };
}
