/**
 * The Guide's decision engine.
 *
 * Looks at everything the app knows — time of day and week, the focus timer,
 * the Inbox, Next Actions, today's GTD Ivy Lee list, habits, goals, the last
 * Weekly Review — and returns an ordered list of steps. The first step that
 * hasn't been skipped is "what you should do next". Pure: no React, no stores.
 */
import { format } from 'date-fns';
import type { GTDItem, Project, WeeklyReview } from '../types';
import { activeForDay, itemsForDay, type DailyItem, type DayLog } from '../store/dailyStore';
import { remainingMs, type ActiveTimer } from '../store/focusStore';
import type { Habit } from '../store/habitStore';
import type { Goal } from '../store/horizonsStore';
import type { Prefs } from '../store/prefsStore';
import { daysOnList, habitStreak, priorityStreak, stuckItems } from './selectors';
import { canRepair, repairAvailable } from './streaks';
import { daysBetween, formatClock, hhmmLabel, isoToDayKey, minutesToLabel, prettyDay, shiftDay } from './dates';

export type Phase = 'night' | 'morning' | 'afternoon' | 'evening';

export type FeatureKey =
  | 'focus'
  | 'gtd-ivy-lee'
  | 'inbox'
  | 'next-actions'
  | 'projects'
  | 'waiting-for'
  | 'weekly-review'
  | 'shutdown'
  | 'unstuck'
  | 'progress'
  | 'goals'
  | 'rest';

export interface GuideStep {
  /** Stable id — used to remember skips and to notice when a step is done. */
  id: string;
  feature: FeatureKey;
  title: string;
  why: string;
  cta: string;
  to: string;
  /** Something to do before navigating (e.g. start the focus timer). */
  action?: { type: 'start-focus'; title: string; minutes: number; dailyItemId?: string; gtdItemId?: string };
  skippable: boolean;
  /** How long "Not now" hides this step. */
  skipFor?: 'short' | 'day';
  tone?: 'normal' | 'rest';
  /** Inline helper shown on the Guide card. */
  extra?: 'habits';
}

export interface Forecast {
  when: string;
  title: string;
  feature: FeatureKey;
}

export interface GuideContext {
  now: Date;
  prefs: Prefs;
  gtdItems: GTDItem[];
  projects: Project[];
  weeklyReviews: WeeklyReview[];
  daily: DailyItem[];
  days: Record<string, DayLog>;
  repairs: string[];
  timer: ActiveTimer | null;
  habits: Habit[];
  goals: Goal[];
}

export interface GuideSnapshot {
  today: string;
  phase: Phase;
  isWorkday: boolean;
  timeLabel: string;
  inbox: number;
  nextActions: number;
  planned: number;
  done: number;
  shutdownDone: boolean;
  daysSinceReview: number | null;
  streak: number;
  landmark: string | null;
}

export interface GuideResult {
  steps: GuideStep[];
  forecast: Forecast[];
  snapshot: GuideSnapshot;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_BLOCK = 30;

export function phaseOf(hour: number, prefs: Prefs): Phase {
  if (hour < prefs.dayStartHour || hour >= prefs.dayEndHour) return 'night';
  if (hour >= prefs.shutdownHour) return 'evening';
  if (hour < 12) return 'morning';
  return 'afternoon';
}

function landmarkOf(date: Date, birthday: string): string | null {
  const md = format(date, 'MM-dd');
  if (birthday && md === birthday) return 'birthday';
  if (md === '01-01') return 'year';
  if (date.getDate() === 1) return 'month';
  if (date.getDay() === 1) return 'week';
  return null;
}

const plural = (n: number, word: string, pluralWord = `${word}s`) => `${n} ${n === 1 ? word : pluralWord}`;

export function buildGuide(ctx: GuideContext): GuideResult {
  const { now, prefs } = ctx;
  const today = format(now, 'yyyy-MM-dd');
  const tomorrow = shiftDay(today, 1);
  const hour = now.getHours();
  const nowMin = hour * 60 + now.getMinutes();
  const weekday = now.getDay();
  const phase = phaseOf(hour, prefs);
  const isWorkday = prefs.streakWeekdays.includes(weekday);
  const earlyMorning = hour < prefs.dayStartHour;

  // ── Facts ──────────────────────────────────────────────────────────────────
  const live = ctx.gtdItems.filter((i) => i.status !== 'trash');
  const inboxItems = live.filter((i) => i.status === 'inbox');
  const nextActions = live.filter((i) => i.status === 'next-action');
  const todays = itemsForDay(ctx.daily, today);
  const active = todays.filter((i) => i.status === 'active');
  const doneToday = todays.length - active.length;
  const top = active[0];
  const tomorrowTop = activeForDay(ctx.daily, tomorrow)[0];
  const shutdownDone = Boolean(ctx.days[today]?.shutdownAt);
  const stuck = stuckItems(ctx.daily, today);
  const streak = priorityStreak(ctx.daily, ctx.days, prefs.streakWeekdays, today);
  const landmark = landmarkOf(now, prefs.birthday);
  const lastReview = [...ctx.weeklyReviews].sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
  const daysSinceReview = lastReview ? daysBetween(isoToDayKey(lastReview.completedAt), today) : null;
  const habitsDue = ctx.habits.filter(
    (h) => !h.archived && h.days.includes(weekday) && !h.checkIns.includes(today)
  );
  const stalledHabits = ctx.habits.filter((h) => !h.archived && h.checkIns.length > 0 && habitStreak(h, today).current === 0);
  const activeGoals = ctx.goals.filter((g) => g.status === 'active');
  const orphanGoals = activeGoals.filter((g) => !ctx.projects.some((p) => p.goalId === g.id && p.status === 'active'));
  const staleWaiting = live.filter(
    (i) => i.status === 'waiting-for' && daysBetween(isoToDayKey(i.delegatedDate ?? i.createdAt), today) >= 7
  );
  const stalledProjects = ctx.projects.filter(
    (p) => p.status === 'active' && !live.some((i) => i.projectId === p.id && i.status === 'next-action')
  );
  const oldestInboxDays = inboxItems.length
    ? Math.max(...inboxItems.map((i) => daysBetween(isoToDayKey(i.createdAt), today)))
    : 0;
  const remainingWork = active.reduce((n, i) => n + (i.estimateMinutes ?? DEFAULT_BLOCK), 0);
  const freeLeft = Math.max(0, prefs.dayEndHour * 60 - Math.max(nowMin, prefs.dayStartHour * 60));
  const systemEmpty = live.length === 0 && ctx.projects.length === 0 && ctx.daily.length === 0;
  const minutes = prefs.defaultFocusMinutes;

  const steps: GuideStep[] = [];
  const add = (s: GuideStep | false | null | undefined) => {
    if (s) steps.push(s);
  };

  // ── 1. A running timer always comes first ──────────────────────────────────
  const t = ctx.timer;
  if (t) {
    if (t.finished) {
      add({
        id: 'timer-finished',
        feature: 'focus',
        title: t.mode === 'focus' ? 'Your session finished — wrap it up' : 'Break over',
        why:
          t.mode === 'focus'
            ? `Mark “${t.title}” done, keep going for another round, or take a short break.`
            : 'Ready for another round? Momentum is easier to keep than to restart.',
        cta: t.mode === 'focus' ? 'Wrap up the session' : 'Back to focus',
        to: '/focus',
        skippable: false,
      });
    } else if (t.mode === 'break') {
      add({
        id: 'timer-break',
        feature: 'focus',
        title: "You're on a break",
        why: `Stand up, stretch, drink some water. ${formatClock(remainingMs(t, now.getTime()))} left.`,
        cta: 'See the break timer',
        to: '/focus',
        skippable: false,
      });
    } else {
      add({
        id: 'timer-running',
        feature: 'focus',
        title: t.pausedAt ? 'Your focus timer is paused' : "You're in a focus session",
        why: `“${t.title}” — ${formatClock(remainingMs(t, now.getTime()))} left. Stay with it; park stray thoughts instead of acting on them.`,
        cta: t.pausedAt ? 'Resume the timer' : 'Back to the timer',
        to: '/focus',
        skippable: false,
      });
    }
  }

  // ── 2. Brand-new, empty system ─────────────────────────────────────────────
  if (systemEmpty) {
    add({
      id: 'mind-sweep',
      feature: 'inbox',
      title: 'Start by emptying your head',
      why:
        "Your system is empty. Write down everything on your mind — tasks, worries, ideas, errands. Don't sort anything yet; just capture. Aim for 15 or more.",
      cta: 'Open the Inbox',
      to: '/inbox?sweep=1',
      skippable: false,
    });
  }

  // ── 3. Night: wind down ────────────────────────────────────────────────────
  if (phase === 'night') {
    add(
      !earlyMorning &&
        !shutdownDone &&
        todays.length > 0 && {
          id: 'shutdown-late',
          feature: 'shutdown',
          title: 'A quick shutdown before bed',
          why: `${doneToday}/${todays.length} priorities done. Roll the rest forward and pick tomorrow's #1 so your brain can switch off.`,
          cta: 'Start the shutdown',
          to: '/shutdown',
          skippable: true,
          skipFor: 'day',
        }
    );
    const next = earlyMorning ? top : tomorrowTop;
    add({
      id: 'rest',
      feature: 'rest',
      tone: 'rest',
      title: earlyMorning ? "It's early — rest is productive too" : "You're done for today. Rest.",
      why: next
        ? `${earlyMorning ? 'Today' : 'Tomorrow'} starts with “${next.title}”${next.firstStep ? ` — first step: ${next.firstStep}` : ''}. Nothing else needs you right now.`
        : "Nothing needs you right now. In the morning I'll help you pick your priorities.",
      cta: `See ${earlyMorning ? "today's" : "tomorrow's"} plan`,
      to: '/gtd-ivy-lee',
      skippable: true,
    });
  }

  // ── 4. Evening: close the day ──────────────────────────────────────────────
  if (phase === 'evening') {
    add(
      !shutdownDone && {
        id: 'shutdown',
        feature: 'shutdown',
        title: 'Time for your evening shutdown',
        why: todays.length
          ? `${doneToday}/${todays.length} priorities done today. Close the loop, forgive what slipped, and set up tomorrow's six — about 5 minutes.`
          : "You didn't have a plan today — picking tomorrow's six now makes tomorrow far easier to start.",
        cta: 'Start the shutdown',
        to: '/shutdown',
        skippable: true,
      }
    );
    add(
      habitsDue.length > 0 && {
        id: 'habits-evening',
        feature: 'progress',
        title: "Check off today's habits",
        why: `Still open: ${habitsDue.map((h) => h.name).join(', ')}. Even a tiny version counts.`,
        cta: 'Open habits',
        to: '/progress?tab=habits',
        skippable: true,
        extra: 'habits',
      }
    );
    add(
      shutdownDone && {
        id: 'evening-rest',
        feature: 'rest',
        tone: 'rest',
        title: 'Shutdown complete — enjoy your evening',
        why: tomorrowTop
          ? `Tomorrow starts with “${tomorrowTop.title}”. It's written down, so you don't have to hold it in your head.`
          : "Work is done for today. You've earned the rest.",
        cta: "See tomorrow's plan",
        to: '/gtd-ivy-lee',
        skippable: true,
      }
    );
  }

  // ── 5. Daytime: plan → unblock → do (also reached by skipping evening/night) ─
  const afternoon = phase === 'afternoon' || phase === 'evening';

  if (nextActions.length === 0 && inboxItems.length > 0) {
    add({
      id: 'clarify-first',
      feature: 'inbox',
      title: 'Turn your Inbox into Next Actions',
      why: `${plural(inboxItems.length, 'captured item')} waiting. For each one: is it actionable, and what's the very next physical step? Then you'll have Next Actions to choose today's priorities from.`,
      cta: 'Process the Inbox',
      to: '/inbox?process=1',
      skippable: false,
    });
  } else if (!systemEmpty && nextActions.length === 0 && active.length === 0) {
    add({
      id: 'capture-more',
      feature: 'inbox',
      title: "Capture what's next",
      why: "You've got no Next Actions left. What's on your mind? Capture it, then clarify it into the next steps.",
      cta: 'Open the Inbox',
      to: '/inbox?sweep=1',
      skippable: true,
    });
  }

  add(
    todays.length === 0 &&
      nextActions.length > 0 &&
      (phase === 'morning' || phase === 'afternoon') && {
        id: 'plan-today',
        feature: 'gtd-ivy-lee',
        title: "Pick today's six",
        why: isWorkday
          ? `You haven't chosen today's priorities yet. Ivy Lee: up to six, most important first. You have ${plural(nextActions.length, 'Next Action')} to choose from.`
          : `It's ${DAY_NAMES[weekday]} — not a streak day, so this is optional. Even two or three priorities keep a day off from drifting.`,
        cta: 'Choose priorities',
        to: '/gtd-ivy-lee?pick=1',
        skippable: true,
        skipFor: 'day',
      }
  );

  const reviewDue = daysSinceReview === null || daysSinceReview >= 5;
  add(
    weekday === prefs.weeklyReviewDay &&
      hour >= 13 &&
      reviewDue &&
      !systemEmpty && {
        id: 'weekly-review-day',
        feature: 'weekly-review',
        title: `It's ${DAY_NAMES[weekday]} afternoon — Weekly Review time`,
        why: 'David Allen calls it the critical success factor: get clear, get current, get creative. 20–30 minutes and next week starts clean.',
        cta: 'Start the Weekly Review',
        to: '/weekly-review?start=1',
        skippable: true,
        skipFor: 'day',
      }
  );

  if (landmark && phase === 'morning') {
    const label = landmark === 'birthday' ? 'year of you' : landmark;
    add(
      activeGoals.length === 0 &&
        !systemEmpty && {
          id: 'fresh-goals',
          feature: 'goals',
          title: `New ${label} — set a direction`,
          why: "You don't have any goals yet. Goals give your Next Actions a reason, which makes them easier to start. A 2-minute WOOP is enough.",
          cta: 'Set a goal',
          to: '/goals',
          skippable: true,
          skipFor: 'day',
        }
    );
    add(
      stalledHabits.length > 0 && {
        id: 'fresh-habits',
        feature: 'progress',
        title: `New ${label} — restart ${stalledHabits.length === 1 ? `“${stalledHabits[0].name}”` : 'a stalled habit'}`,
        why: "Fresh starts make it easier to begin again. Last week's misses belong to last week.",
        cta: 'Open habits',
        to: '/progress?tab=habits',
        skippable: true,
        skipFor: 'day',
      }
    );
  }

  add(
    phase === 'morning' &&
      streak.repairHelps &&
      canRepair(streak.brokenOn, today) &&
      repairAvailable(ctx.repairs, today) && {
        id: 'repair-streak',
        feature: 'progress',
        title: 'Repair your streak',
        why: `You missed ${prettyDay(streak.brokenOn!)}. One repair a week means a single slip doesn't cost you your momentum.`,
        cta: 'Repair it',
        to: '/progress',
        skippable: true,
        skipFor: 'day',
      }
  );

  add(
    phase === 'morning' &&
      nextActions.length > 0 &&
      (inboxItems.length >= 8 || (inboxItems.length > 0 && oldestInboxDays >= 2)) && {
        id: 'inbox-overflow',
        feature: 'inbox',
        title: `Clear your Inbox (${inboxItems.length})`,
        why: `${plural(inboxItems.length, 'item')} waiting${oldestInboxDays >= 2 ? `, the oldest for ${oldestInboxDays} days` : ''}. An unprocessed Inbox nags at the back of your mind — each one takes about a minute.`,
        cta: 'Process the Inbox',
        to: '/inbox?process=1',
        skippable: true,
      }
  );

  if (stuck[0]) {
    const s = stuck[0];
    add({
      id: `unstuck:${s.id}`,
      feature: 'unstuck',
      title: `“${s.title}” has been on your list ${daysOnList(s, today)} days`,
      why: "That usually means it's unclear, too big, or not worth doing. Two minutes of honest diagnosis beats another day of avoiding it.",
      cta: 'Get unstuck',
      to: `/unstuck?daily=${s.id}`,
      skippable: true,
    });
  }

  const reviewOverdue = (daysSinceReview !== null && daysSinceReview >= 9) || (daysSinceReview === null && live.length >= 10);
  const reviewOverdueStep: GuideStep | false = reviewOverdue &&
    !steps.some((s) => s.id === 'weekly-review-day') && {
      id: 'weekly-review-overdue',
      feature: 'weekly-review',
      title: daysSinceReview === null ? 'Do your first Weekly Review' : 'Your Weekly Review is overdue',
      why:
        daysSinceReview === null
          ? 'Your system has enough in it now that a weekly reset will keep it trustworthy. 20–30 minutes.'
          : `Last done ${daysSinceReview} days ago. Without it, lists go stale and stop feeling trustworthy — which is when procrastination creeps in.`,
      cta: 'Start the Weekly Review',
      to: '/weekly-review?start=1',
      skippable: true,
      skipFor: 'day',
    };
  if (afternoon) add(reviewOverdueStep);

  if (top) {
    add(
      !top.firstStep &&
        !top.whenWhere && {
          id: `plan-top:${top.id}`,
          feature: 'gtd-ivy-lee',
          title: 'Decide exactly how you’ll start #1',
          why: `“${top.title}” has no first step yet. Deciding when, where and how you'll start is one of the best-tested ways to follow through.`,
          cta: 'Add an if-then plan',
          to: `/gtd-ivy-lee?open=${top.id}`,
          skippable: true,
          skipFor: 'day',
        }
    );
    add(
      remainingWork > freeLeft &&
        active.length > 1 &&
        (phase === 'morning' || phase === 'afternoon') && {
          id: 'trim-day',
          feature: 'gtd-ivy-lee',
          title: "Today won't fit — trim it",
          why: `${minutesToLabel(remainingWork)} of work planned and ${minutesToLabel(freeLeft)} left. Move something to tomorrow now, rather than feel behind all day.`,
          cta: 'Open the timeline',
          to: '/gtd-ivy-lee?view=timeline',
          skippable: true,
          skipFor: 'day',
        }
    );
    const bits = [
      top.firstStep && `First step: ${top.firstStep}.`,
      top.whenWhere && `You planned: ${top.whenWhere}.`,
      top.treat && `Treat: ${top.treat}.`,
      `Just ${minutes} minutes — you can stop when the timer ends.`,
    ].filter(Boolean);
    add({
      id: `start:${top.id}`,
      feature: 'focus',
      title: top.isFrog ? `Eat the frog: ${top.title}` : `Start #1: ${top.title}`,
      why: bits.join(' '),
      cta: `Start ${minutes} minutes`,
      to: '/focus',
      action: { type: 'start-focus', title: top.title, minutes, dailyItemId: top.id, gtdItemId: top.gtdItemId },
      skippable: true,
    });
    // Only reached if "Start #1" was skipped — avoidance is the signal.
    add({
      id: `avoiding:${top.id}`,
      feature: 'unstuck',
      title: `Avoiding “${top.title}”?`,
      why: "That's normal — it's a feeling, not a flaw. Name what's going on and you'll get a specific way in.",
      cta: "Figure out why I'm stuck",
      to: `/unstuck?daily=${top.id}`,
      skippable: true,
    });
  }

  if (!afternoon) add(reviewOverdueStep);

  // ── 6. Bonus rounds (all priorities done, or later in the list) ────────────
  add(
    phase !== 'evening' &&
      habitsDue.length > 0 && {
        id: 'habits-day',
        feature: 'progress',
        title: "Check off today's habits",
        why: `Still open: ${habitsDue.map((h) => h.name).join(', ')}.`,
        cta: 'Open habits',
        to: '/progress?tab=habits',
        skippable: true,
        extra: 'habits',
      }
  );
  add(
    staleWaiting.length > 0 && {
      id: 'follow-up',
      feature: 'waiting-for',
      title: `Follow up on ${plural(staleWaiting.length, 'delegated item')}`,
      why: `Waiting a week or more: ${staleWaiting
        .slice(0, 3)
        .map((i) => `“${i.title}”${i.delegatedTo ? ` (${i.delegatedTo})` : ''}`)
        .join(', ')}. A quick nudge keeps things moving.`,
      cta: 'Open Waiting For',
      to: '/waiting-for',
      skippable: true,
      skipFor: 'day',
    }
  );
  add(
    stalledProjects.length > 0 && {
      id: 'stalled-projects',
      feature: 'projects',
      title: `Give ${plural(stalledProjects.length, 'project')} a next action`,
      why: `${stalledProjects
        .slice(0, 3)
        .map((p) => `“${p.title}”`)
        .join(', ')} ${stalledProjects.length === 1 ? 'has' : 'have'} no next action, so ${stalledProjects.length === 1 ? "it's" : "they're"} stalled. What's the very next step?`,
      cta: 'Open Projects',
      to: '/projects',
      skippable: true,
      skipFor: 'day',
    }
  );
  add(
    orphanGoals.length > 0 && {
      id: 'orphan-goals',
      feature: 'goals',
      title: `Give “${orphanGoals[0].title}” a project`,
      why: 'A goal with no project never gets worked on. Link an existing project or create one.',
      cta: 'Open Goals',
      to: '/goals',
      skippable: true,
      skipFor: 'day',
    }
  );
  add(
    todays.length > 0 &&
      active.length === 0 &&
      nextActions.length > 0 &&
      phase !== 'night' && {
        id: 'bonus',
        feature: 'next-actions',
        title: 'All priorities done — bonus round?',
        why: `${plural(doneToday, 'priority', 'priorities')} finished today. If you have energy left, pick something that fits the time you have. Or stop — that's allowed.`,
        cta: 'Pick by time & energy',
        to: '/next-actions?whatnow=1',
        skippable: true,
      }
  );
  add(
    phase !== 'night' &&
      phase !== 'evening' &&
      !shutdownDone &&
      todays.length > 0 &&
      active.length === 0 && {
        id: 'early-shutdown',
        feature: 'shutdown',
        title: 'Set up tomorrow early',
        why: "With today's list done, a shutdown now means tomorrow starts the moment you sit down.",
        cta: 'Start the shutdown',
        to: '/shutdown',
        skippable: true,
      }
  );

  // De-duplicate by id (a rule can be reached from two phases).
  const seen = new Set<string>();
  const unique = steps.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));

  // ── Forecast ───────────────────────────────────────────────────────────────
  const forecast: Forecast[] = [];
  if ((phase === 'morning' || phase === 'afternoon') && !shutdownDone)
    forecast.push({ when: hhmmLabel(`${prefs.shutdownHour}:00`), title: 'Evening shutdown', feature: 'shutdown' });
  if (phase !== 'night')
    forecast.push({ when: hhmmLabel(`${prefs.dayEndHour}:00`), title: 'Switch off for the night', feature: 'rest' });
  if (reviewDue && weekday !== prefs.weeklyReviewDay)
    forecast.push({ when: `${DAY_NAMES[prefs.weeklyReviewDay]} afternoon`, title: 'Weekly Review', feature: 'weekly-review' });

  return {
    steps: unique,
    forecast,
    snapshot: {
      today,
      phase,
      isWorkday,
      timeLabel: format(now, 'EEEE · h:mmaaa'),
      inbox: inboxItems.length,
      nextActions: nextActions.length,
      planned: todays.length,
      done: doneToday,
      shutdownDone,
      daysSinceReview,
      streak: streak.current,
      landmark,
    },
  };
}
