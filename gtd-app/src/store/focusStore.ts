import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../lib/dates';

export interface FocusSession {
  id: string;
  title: string;
  dailyItemId?: string;
  gtdItemId?: string;
  startedAt: string;
  endedAt: string;
  plannedMinutes: number;
  focusedMinutes: number;
  /** Ran to the end of the timer rather than being stopped early. */
  completed: boolean;
}

export interface ActiveTimer {
  mode: 'focus' | 'break';
  title: string;
  dailyItemId?: string;
  gtdItemId?: string;
  startedAt: number;
  durationMs: number;
  pausedAt?: number;
  pausedTotalMs: number;
  /** Set when the timer reaches zero, until the user picks what's next. */
  finished?: boolean;
  parked: number;
}

interface StartInput {
  mode: 'focus' | 'break';
  title: string;
  minutes: number;
  dailyItemId?: string;
  gtdItemId?: string;
}

interface FocusStore {
  sessions: FocusSession[];
  active: ActiveTimer | null;
  start: (input: StartInput) => void;
  pause: () => void;
  resume: () => void;
  /** Mark the running timer as finished; returns the recorded session (focus mode only). */
  finish: () => FocusSession | null;
  /** Stop early; records the partial session if at least a minute was focused. */
  stop: () => FocusSession | null;
  dismiss: () => void;
  addMinutes: (minutes: number) => void;
  incrementParked: () => void;
  importData: (data: { sessions?: FocusSession[] }) => void;
}

export function elapsedMs(t: ActiveTimer, now: number): number {
  const paused = t.pausedTotalMs + (t.pausedAt ? now - t.pausedAt : 0);
  return Math.min(t.durationMs, Math.max(0, now - t.startedAt - paused));
}

export function remainingMs(t: ActiveTimer, now: number): number {
  return Math.max(0, t.durationMs - elapsedMs(t, now));
}

function toSession(t: ActiveTimer, completed: boolean): FocusSession {
  const now = Date.now();
  return {
    id: generateId('focus'),
    title: t.title,
    dailyItemId: t.dailyItemId,
    gtdItemId: t.gtdItemId,
    startedAt: new Date(t.startedAt).toISOString(),
    endedAt: new Date(now).toISOString(),
    plannedMinutes: Math.round(t.durationMs / 60000),
    focusedMinutes: Math.round((elapsedMs(t, now) / 60000) * 10) / 10,
    completed,
  };
}

export const useFocusStore = create<FocusStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      active: null,

      start: ({ mode, title, minutes, dailyItemId, gtdItemId }) => {
        set({
          active: {
            mode,
            title,
            dailyItemId,
            gtdItemId,
            startedAt: Date.now(),
            durationMs: Math.max(1, minutes) * 60000,
            pausedTotalMs: 0,
            parked: 0,
          },
        });
      },

      pause: () => {
        const t = get().active;
        if (!t || t.pausedAt || t.finished) return;
        set({ active: { ...t, pausedAt: Date.now() } });
      },

      resume: () => {
        const t = get().active;
        if (!t || !t.pausedAt) return;
        set({
          active: { ...t, pausedAt: undefined, pausedTotalMs: t.pausedTotalMs + (Date.now() - t.pausedAt) },
        });
      },

      finish: () => {
        const t = get().active;
        if (!t || t.finished) return null;
        const session = t.mode === 'focus' ? toSession(t, true) : null;
        set((s) => ({
          active: { ...t, finished: true, pausedAt: undefined },
          sessions: session ? [...s.sessions, session] : s.sessions,
        }));
        return session;
      },

      stop: () => {
        const t = get().active;
        if (!t) return null;
        let session: FocusSession | null = null;
        if (t.mode === 'focus' && !t.finished) {
          const s = toSession(t, false);
          if (s.focusedMinutes >= 1) session = s;
        }
        set((s) => ({
          active: null,
          sessions: session ? [...s.sessions, session] : s.sessions,
        }));
        return session;
      },

      dismiss: () => set({ active: null }),

      addMinutes: (minutes) => {
        const t = get().active;
        if (!t) return;
        set({ active: { ...t, durationMs: t.durationMs + minutes * 60000 } });
      },

      incrementParked: () => {
        const t = get().active;
        if (!t) return;
        set({ active: { ...t, parked: t.parked + 1 } });
      },

      importData: ({ sessions }) => set({ sessions: sessions ?? [], active: null }),
    }),
    { name: 'gtd-focus' }
  )
);
