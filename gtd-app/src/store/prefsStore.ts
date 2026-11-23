import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Prefs {
  dayStartHour: number;
  dayEndHour: number;
  defaultFocusMinutes: number;
  /** 'MM-dd' — used for a fresh-start prompt on your birthday. */
  birthday: string;
  partnerName: string;
  /** Link to a virtual co-working / body-doubling room. */
  coworkingUrl: string;
  freshStartEnabled: boolean;
  /** Day key the fresh-start banner was last dismissed on. */
  freshStartDismissed: string;
  /** Weekdays your priority streak counts (0 = Sunday). Other days never break it. */
  streakWeekdays: number[];
  soundEnabled: boolean;
  /** Hour of the day after which the Dashboard nudges you to do the evening shutdown. */
  shutdownHour: number;
  /** Weekday the Guide suggests your Weekly Review (0 = Sunday). */
  weeklyReviewDay: number;
  /** Which page the app opens on. */
  startPage: 'dashboard' | 'guide';
}

export const DEFAULT_PREFS: Prefs = {
  dayStartHour: 7,
  dayEndHour: 22,
  defaultFocusMinutes: 10,
  birthday: '',
  partnerName: '',
  coworkingUrl: '',
  freshStartEnabled: true,
  freshStartDismissed: '',
  streakWeekdays: [1, 2, 3, 4, 5],
  soundEnabled: true,
  shutdownHour: 17,
  weeklyReviewDay: 5,
  startPage: 'dashboard',
};

interface PrefsStore extends Prefs {
  setPrefs: (updates: Partial<Prefs>) => void;
  importData: (data: Partial<Prefs>) => void;
}

export const usePrefsStore = create<PrefsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFS,
      setPrefs: (updates) => set(updates),
      importData: (data) => set({ ...DEFAULT_PREFS, ...data }),
    }),
    { name: 'gtd-prefs' }
  )
);

export function pickPrefs(s: Prefs): Prefs {
  const out = {} as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_PREFS)) out[key] = s[key as keyof Prefs];
  return out as unknown as Prefs;
}
