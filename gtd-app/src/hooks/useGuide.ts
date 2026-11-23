import { useGTDStore } from '../store/gtdStore';
import { useDailyStore } from '../store/dailyStore';
import { useFocusStore } from '../store/focusStore';
import { useHabitStore } from '../store/habitStore';
import { useHorizonsStore } from '../store/horizonsStore';
import { usePrefsStore, pickPrefs } from '../store/prefsStore';
import { useGuideStore } from '../store/guideStore';
import { buildGuide, type GuideResult, type GuideStep } from '../lib/guide';
import { useNow } from './useNow';

export interface UseGuide extends GuideResult {
  current?: GuideStep;
  upcoming: GuideStep[];
  skippedCount: number;
}

/** Live guide decision, recomputed whenever app data changes (and every 30s). */
export function useGuide(): UseGuide {
  const timer = useFocusStore((s) => s.active);
  const now = useNow(timer && !timer.finished && !timer.pausedAt ? 1000 : 30_000);
  const gtdItems = useGTDStore((s) => s.items);
  const projects = useGTDStore((s) => s.projects);
  const weeklyReviews = useGTDStore((s) => s.weeklyReviews);
  const daily = useDailyStore((s) => s.items);
  const days = useDailyStore((s) => s.days);
  const repairs = useDailyStore((s) => s.repairs);
  const habits = useHabitStore((s) => s.habits);
  const goals = useHorizonsStore((s) => s.goals);
  const prefsState = usePrefsStore();
  const skipped = useGuideStore((s) => s.skipped);

  const result = buildGuide({
    now: new Date(now),
    prefs: pickPrefs(prefsState),
    gtdItems,
    projects,
    weeklyReviews,
    daily,
    days,
    repairs,
    timer,
    habits,
    goals,
  });

  const isSkipped = (s: GuideStep) => s.skippable && (skipped[s.id] ?? 0) > now;
  const visible = result.steps.filter((s) => !isSkipped(s));
  return {
    ...result,
    current: visible[0],
    upcoming: visible.slice(1, 4),
    skippedCount: result.steps.length - visible.length,
  };
}
