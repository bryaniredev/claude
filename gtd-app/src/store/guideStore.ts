import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GuideStep } from '../lib/guide';

interface GuideStore {
  /** Guided mode: the user followed a step and the bar follows them around. */
  active: boolean;
  stepId?: string;
  stepTitle?: string;
  /** stepId → epoch ms until which it's hidden. */
  skipped: Record<string, number>;
  follow: (step: GuideStep) => void;
  exit: () => void;
  skip: (step: GuideStep) => void;
  clearSkips: () => void;
}

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export const useGuideStore = create<GuideStore>()(
  persist(
    (set) => ({
      active: false,
      skipped: {},
      follow: (step) => set({ active: true, stepId: step.id, stepTitle: step.title }),
      exit: () => set({ active: false, stepId: undefined, stepTitle: undefined }),
      skip: (step) =>
        set((s) => {
          const now = Date.now();
          const until = step.skipFor === 'day' ? endOfToday() : now + 90 * 60 * 1000;
          // Drop expired skips while we're here.
          const kept = Object.fromEntries(Object.entries(s.skipped).filter(([, t]) => t > now));
          return { skipped: { ...kept, [step.id]: until } };
        }),
      clearSkips: () => set({ skipped: {} }),
    }),
    { name: 'gtd-guide' }
  )
);
