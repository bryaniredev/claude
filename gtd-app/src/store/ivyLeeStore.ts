import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface IvyLeeItem {
  id: string;
  title: string;
  status: 'active' | 'done' | 'backlog';
  order: number;
  createdAt: string;
  completedAt?: string;
}

function generateId(): string {
  return `ivy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface IvyLeeStore {
  items: IvyLeeItem[];
  addItem: (title: string) => void;
  reorderItems: (orderedIds: string[]) => void;
  markDone: (id: string) => void;
  undoDone: (id: string) => void;
  moveToBacklog: (id: string) => void;
  restoreFromBacklog: (id: string) => void;
  deleteItem: (id: string) => void;
  clearDoneItems: () => void;
  getListItems: () => IvyLeeItem[];
  getBacklogItems: () => IvyLeeItem[];
}

export const useIvyLeeStore = create<IvyLeeStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (title) => {
        const listItems = get().getListItems();
        if (listItems.length >= 6) return;
        const newItem: IvyLeeItem = {
          id: generateId(),
          title,
          status: 'active',
          order: listItems.length,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ items: [...s.items, newItem] }));
      },

      reorderItems: (orderedIds) => {
        set((s) => ({
          items: s.items.map((item) => {
            const idx = orderedIds.indexOf(item.id);
            return idx !== -1 ? { ...item, order: idx } : item;
          }),
        }));
      },

      markDone: (id) => {
        set((s) => ({
          items: s.items.map((item) =>
            item.id === id
              ? { ...item, status: 'done', completedAt: new Date().toISOString() }
              : item
          ),
        }));
      },

      undoDone: (id) => {
        set((s) => ({
          items: s.items.map((item) =>
            item.id === id ? { ...item, status: 'active', completedAt: undefined } : item
          ),
        }));
      },

      moveToBacklog: (id) => {
        set((s) => {
          const target = s.items.find((i) => i.id === id);
          if (!target) return s;
          const updatedItems = s.items.map((item) => {
            if (item.id === id) return { ...item, status: 'backlog' as const };
            if (item.status !== 'backlog' && item.order > target.order)
              return { ...item, order: item.order - 1 };
            return item;
          });
          return { items: updatedItems };
        });
      },

      restoreFromBacklog: (id) => {
        set((s) => {
          const listCount = s.items.filter((i) => i.status !== 'backlog').length;
          if (listCount >= 6) return s;
          return {
            items: s.items.map((item) =>
              item.id === id
                ? { ...item, status: 'active' as const, order: listCount }
                : item
            ),
          };
        });
      },

      deleteItem: (id) => {
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      },

      clearDoneItems: () => {
        set((s) => {
          const kept = s.items.filter((i) => i.status !== 'done');
          // Re-number active items
          let activeOrder = 0;
          return {
            items: kept.map((item) =>
              item.status === 'active' ? { ...item, order: activeOrder++ } : item
            ),
          };
        });
      },

      getListItems: () =>
        get()
          .items.filter((i) => i.status !== 'backlog')
          .sort((a, b) => a.order - b.order),

      getBacklogItems: () =>
        get().items.filter((i) => i.status === 'backlog'),
    }),
    { name: 'ivy-lee-method' }
  )
);
