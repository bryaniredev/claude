import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../lib/dates';

/**
 * GTD Horizons of Focus above the project level:
 *   20,000 ft — Areas of focus & responsibility
 *   30,000 ft — Goals (1–2 years)
 *   40,000 ft — Vision (3–5 years)
 *   50,000 ft — Purpose & principles
 */

export interface Area {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

/** WOOP — Wish, Outcome, Obstacle, Plan (mental contrasting + implementation intentions). */
export interface Woop {
  wish: string;
  outcome: string;
  obstacle: string;
  plan: string;
}

export interface Goal {
  id: string;
  title: string;
  why: string;
  areaId?: string;
  targetDate?: string;
  status: 'active' | 'achieved' | 'dropped';
  woop?: Woop;
  createdAt: string;
  updatedAt: string;
  achievedAt?: string;
}

interface HorizonsState {
  purpose: string;
  principles: string;
  vision: string;
  areas: Area[];
  goals: Goal[];
}

interface HorizonsStore extends HorizonsState {
  setText: (field: 'purpose' | 'principles' | 'vision', value: string) => void;
  addArea: (name: string, description?: string) => void;
  updateArea: (id: string, updates: Partial<Area>) => void;
  deleteArea: (id: string) => void;
  addGoal: (input: { title: string; why?: string; areaId?: string; targetDate?: string }) => Goal;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  importData: (data: Partial<HorizonsState>) => void;
}

export const EMPTY_WOOP: Woop = { wish: '', outcome: '', obstacle: '', plan: '' };

export const useHorizonsStore = create<HorizonsStore>()(
  persist(
    (set) => ({
      purpose: '',
      principles: '',
      vision: '',
      areas: [],
      goals: [],

      setText: (field, value) => set({ [field]: value } as Pick<HorizonsState, typeof field>),

      addArea: (name, description = '') => {
        const area: Area = { id: generateId('area'), name, description, createdAt: new Date().toISOString() };
        set((s) => ({ areas: [...s.areas, area] }));
      },

      updateArea: (id, updates) =>
        set((s) => ({ areas: s.areas.map((a) => (a.id === id ? { ...a, ...updates } : a)) })),

      deleteArea: (id) =>
        set((s) => ({
          areas: s.areas.filter((a) => a.id !== id),
          goals: s.goals.map((g) => (g.areaId === id ? { ...g, areaId: undefined } : g)),
        })),

      addGoal: ({ title, why = '', areaId, targetDate }) => {
        const now = new Date().toISOString();
        const goal: Goal = {
          id: generateId('goal'),
          title,
          why,
          areaId,
          targetDate,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ goals: [...s.goals, goal] }));
        return goal;
      },

      updateGoal: (id, updates) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g
          ),
        })),

      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      importData: (data) =>
        set({
          purpose: data.purpose ?? '',
          principles: data.principles ?? '',
          vision: data.vision ?? '',
          areas: data.areas ?? [],
          goals: data.goals ?? [],
        }),
    }),
    { name: 'gtd-horizons' }
  )
);
