import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId, todayKey } from '../lib/dates';

export type StuckReason =
  | 'unclear'
  | 'too-big'
  | 'boring'
  | 'fear'
  | 'tired'
  | 'distracted'
  | 'not-worth-it';

export interface Win {
  id: string;
  text: string;
  date: string;
  createdAt: string;
}

export interface StuckEntry {
  id: string;
  date: string;
  reason: StuckReason;
  title: string;
  createdAt: string;
}

interface ProgressStore {
  wins: Win[];
  stuckLog: StuckEntry[];
  addWin: (text: string, date?: string) => void;
  deleteWin: (id: string) => void;
  logStuck: (reason: StuckReason, title: string) => void;
  importData: (data: { wins?: Win[]; stuckLog?: StuckEntry[] }) => void;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set) => ({
      wins: [],
      stuckLog: [],

      addWin: (text, date = todayKey()) => {
        const win: Win = { id: generateId('win'), text, date, createdAt: new Date().toISOString() };
        set((s) => ({ wins: [...s.wins, win] }));
      },

      deleteWin: (id) => set((s) => ({ wins: s.wins.filter((w) => w.id !== id) })),

      logStuck: (reason, title) => {
        const entry: StuckEntry = {
          id: generateId('stuck'),
          date: todayKey(),
          reason,
          title,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ stuckLog: [...s.stuckLog, entry] }));
      },

      importData: ({ wins, stuckLog }) => set({ wins: wins ?? [], stuckLog: stuckLog ?? [] }),
    }),
    { name: 'gtd-progress' }
  )
);
