import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId, todayKey } from '../lib/dates';

/**
 * GTD Ivy Lee — a day-based Ivy Lee list wired into GTD.
 * Every priority belongs to a calendar day, links to a GTD Next Action,
 * and unfinished priorities roll forward to the next day (the Ivy Lee rule).
 * Finished priorities are kept, so history, streaks and the done list work.
 */

export const DAILY_LIMIT = 6;

export interface DailyItem {
  id: string;
  title: string;
  gtdItemId?: string;
  /** The day this priority is planned for ('yyyy-MM-dd'). Done items keep the day they were finished. */
  date: string;
  /** The first day it was planned — used to spot items that keep getting carried over. */
  firstPlannedDate: string;
  order: number;
  status: 'active' | 'done';
  createdAt: string;
  completedAt?: string;

  // Implementation intention ("if-then plan")
  whenWhere?: string;
  firstStep?: string;
  ifObstacle?: string;
  thenResponse?: string;

  isFrog?: boolean;
  /** Temptation bundle — a treat you only allow yourself while doing this task. */
  treat?: string;
  estimateMinutes?: number;
  actualMinutes?: number;
  /** Time block start, 'HH:mm'. */
  blockStart?: string;
}

export interface DayLog {
  date: string;
  /** Every priority that was on this day's list at some point. */
  plannedIds: string[];
  shutdownAt?: string;
  forgiveness?: string;
  /** Rest day — doesn't break the priority streak. */
  rest?: boolean;
}

interface AddInput {
  title: string;
  date: string;
  gtdItemId?: string;
  estimateMinutes?: number;
}

interface DailyStore {
  items: DailyItem[];
  days: Record<string, DayLog>;
  /** Days on which a streak repair was used. */
  repairs: string[];

  addItem: (input: AddInput) => DailyItem | null;
  updateItem: (id: string, updates: Partial<DailyItem>) => void;
  removeItem: (id: string) => void;
  markDone: (id: string) => void;
  undoDone: (id: string) => void;
  reorder: (date: string, orderedActiveIds: string[]) => void;
  moveToDate: (id: string, date: string) => void;
  toggleFrog: (id: string) => void;
  rollover: (today: string) => number;
  addActualMinutes: (id: string, minutes: number) => void;
  markDoneByGtdId: (gtdItemId: string) => void;
  completeShutdown: (date: string, forgiveness: string) => void;
  setRest: (date: string, rest: boolean) => void;
  repairStreak: (today: string, missedDate: string) => void;
  importData: (data: Partial<Pick<DailyStore, 'items' | 'days' | 'repairs'>>) => void;
}

function ensureDay(days: Record<string, DayLog>, date: string): DayLog {
  return days[date] ?? { date, plannedIds: [] };
}

function withPlanned(days: Record<string, DayLog>, date: string, ids: string[]) {
  const day = ensureDay(days, date);
  const set = new Set(day.plannedIds);
  ids.forEach((id) => set.add(id));
  return { ...days, [date]: { ...day, plannedIds: [...set] } };
}

function nextOrder(items: DailyItem[], date: string): number {
  const orders = items.filter((i) => i.date === date).map((i) => i.order);
  return orders.length ? Math.max(...orders) + 1 : 0;
}

/** Re-number orders for one day so they're 0..n-1 in the given sequence. */
function renumber(items: DailyItem[], date: string, sequence: string[]): DailyItem[] {
  return items.map((item) => {
    if (item.date !== date) return item;
    const idx = sequence.indexOf(item.id);
    return idx === -1 ? item : { ...item, order: idx };
  });
}

/** Items for a day: active (by order) first, then done (by completion time). */
export function itemsForDay(items: DailyItem[], date: string): DailyItem[] {
  const day = items.filter((i) => i.date === date);
  const active = day.filter((i) => i.status === 'active').sort((a, b) => a.order - b.order);
  const done = day
    .filter((i) => i.status === 'done')
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''));
  return [...active, ...done];
}

export function activeForDay(items: DailyItem[], date: string): DailyItem[] {
  return itemsForDay(items, date).filter((i) => i.status === 'active');
}

export const useDailyStore = create<DailyStore>()(
  persist(
    (set, get) => ({
      items: [],
      days: {},
      repairs: [],

      addItem: ({ title, date, gtdItemId, estimateMinutes }) => {
        const { items } = get();
        if (items.filter((i) => i.date === date).length >= DAILY_LIMIT) return null;
        if (gtdItemId && items.some((i) => i.gtdItemId === gtdItemId && i.status === 'active'))
          return null;
        const item: DailyItem = {
          id: generateId('day'),
          title,
          gtdItemId,
          date,
          firstPlannedDate: date,
          order: nextOrder(items, date),
          status: 'active',
          createdAt: new Date().toISOString(),
          estimateMinutes,
        };
        set((s) => ({ items: [...s.items, item], days: withPlanned(s.days, date, [item.id]) }));
        return item;
      },

      updateItem: (id, updates) => {
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)) }));
      },

      removeItem: (id) => {
        set((s) => ({
          items: s.items.filter((i) => i.id !== id),
          days: Object.fromEntries(
            Object.entries(s.days).map(([k, d]) => [
              k,
              { ...d, plannedIds: d.plannedIds.filter((p) => p !== id) },
            ])
          ),
        }));
      },

      markDone: (id) => {
        const today = todayKey();
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id
              ? { ...i, status: 'done', completedAt: new Date().toISOString(), date: today }
              : i
          ),
          days: withPlanned(s.days, today, [id]),
        }));
      },

      undoDone: (id) => {
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id
              ? { ...i, status: 'active', completedAt: undefined, order: nextOrder(s.items, i.date) }
              : i
          ),
        }));
      },

      reorder: (date, orderedActiveIds) => {
        set((s) => ({ items: renumber(s.items, date, orderedActiveIds) }));
      },

      moveToDate: (id, date) => {
        set((s) => {
          const target = s.items.find((i) => i.id === id);
          if (!target || target.date === date) return s;
          return {
            items: s.items.map((i) =>
              i.id === id ? { ...i, date, order: nextOrder(s.items, date) } : i
            ),
            days: withPlanned(s.days, date, [id]),
          };
        });
      },

      toggleFrog: (id) => {
        set((s) => {
          const target = s.items.find((i) => i.id === id);
          if (!target) return s;
          if (target.isFrog) {
            return { items: s.items.map((i) => (i.id === id ? { ...i, isFrog: false } : i)) };
          }
          // One frog per day, and the frog goes to #1 — eat it first.
          const cleared = s.items.map((i) =>
            i.date === target.date ? { ...i, isFrog: i.id === id } : i
          );
          const sequence = [
            id,
            ...activeForDay(cleared, target.date)
              .map((i) => i.id)
              .filter((x) => x !== id),
          ];
          return { items: renumber(cleared, target.date, sequence) };
        });
      },

      rollover: (today) => {
        const { items } = get();
        const carried = items
          .filter((i) => i.status === 'active' && i.date < today)
          .sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
        if (!carried.length) return 0;
        const carriedIds = new Set(carried.map((i) => i.id));
        const existing = activeForDay(items, today).map((i) => i.id);
        set((s) => {
          // Only one frog per day survives the move.
          const hasFrogToday = s.items.some((i) => i.date === today && i.isFrog);
          let frogKept = hasFrogToday;
          const moved = s.items.map((i) => {
            if (!carriedIds.has(i.id)) return i;
            const keepFrog = Boolean(i.isFrog) && !frogKept;
            if (keepFrog) frogKept = true;
            return { ...i, date: today, isFrog: keepFrog, blockStart: undefined };
          });
          return {
            items: renumber(moved, today, [...carried.map((i) => i.id), ...existing]),
            days: withPlanned(s.days, today, [...carriedIds]),
          };
        });
        return carried.length;
      },

      addActualMinutes: (id, minutes) => {
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, actualMinutes: Math.round((i.actualMinutes ?? 0) + minutes) } : i
          ),
        }));
      },

      markDoneByGtdId: (gtdItemId) => {
        const match = get().items.find((i) => i.gtdItemId === gtdItemId && i.status === 'active');
        if (match) get().markDone(match.id);
      },

      completeShutdown: (date, forgiveness) => {
        set((s) => ({
          days: {
            ...s.days,
            [date]: { ...ensureDay(s.days, date), shutdownAt: new Date().toISOString(), forgiveness },
          },
        }));
      },

      setRest: (date, rest) => {
        set((s) => ({ days: { ...s.days, [date]: { ...ensureDay(s.days, date), rest } } }));
      },

      repairStreak: (today, missedDate) => {
        set((s) => ({
          repairs: [...s.repairs, today],
          days: { ...s.days, [missedDate]: { ...ensureDay(s.days, missedDate), rest: true } },
        }));
      },

      importData: (data) => {
        set({
          items: data.items ?? [],
          days: data.days ?? {},
          repairs: data.repairs ?? [],
        });
      },
    }),
    { name: 'gtd-ivy-lee' }
  )
);
