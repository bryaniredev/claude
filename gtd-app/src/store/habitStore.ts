import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../lib/dates';

export interface Habit {
  id: string;
  name: string;
  /** Implementation intention cue, e.g. "After I pour my morning coffee". */
  cue?: string;
  /** Weekdays it's scheduled on (0 = Sunday … 6 = Saturday). */
  days: number[];
  createdAt: string;
  archived?: boolean;
  checkIns: string[];
  /** Repaired days — don't break the streak. */
  rests: string[];
  /** Days a repair was used on (limit: one per rolling week). */
  repairs: string[];
}

interface HabitStore {
  habits: Habit[];
  addHabit: (name: string, days: number[], cue?: string) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleCheckIn: (id: string, date: string) => void;
  repair: (id: string, missedDate: string, today: string) => void;
  importData: (data: { habits?: Habit[] }) => void;
}

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export const useHabitStore = create<HabitStore>()(
  persist(
    (set) => ({
      habits: [],

      addHabit: (name, days, cue) => {
        const habit: Habit = {
          id: generateId('habit'),
          name,
          cue: cue || undefined,
          days: days.length ? days : ALL_DAYS,
          createdAt: new Date().toISOString(),
          checkIns: [],
          rests: [],
          repairs: [],
        };
        set((s) => ({ habits: [...s.habits, habit] }));
      },

      updateHabit: (id, updates) => {
        set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)) }));
      },

      deleteHabit: (id) => {
        set((s) => ({ habits: s.habits.filter((h) => h.id !== id) }));
      },

      toggleCheckIn: (id, date) => {
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== id) return h;
            const has = h.checkIns.includes(date);
            return {
              ...h,
              checkIns: has ? h.checkIns.filter((d) => d !== date) : [...h.checkIns, date],
            };
          }),
        }));
      },

      repair: (id, missedDate, today) => {
        set((s) => ({
          habits: s.habits.map((h) =>
            h.id === id
              ? { ...h, rests: [...h.rests, missedDate], repairs: [...h.repairs, today] }
              : h
          ),
        }));
      },

      importData: ({ habits }) => set({ habits: habits ?? [] }),
    }),
    { name: 'gtd-habits' }
  )
);
