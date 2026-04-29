import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ResearchTask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface IvyLeeItem {
  id: string;
  title: string;
  status: 'active' | 'done' | 'backlog';
  order: number;
  createdAt: string;
  completedAt?: string;
  researchTasks: ResearchTask[];
}

function generateId(prefix = 'ivy'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
  // Research tasks
  addResearchTask: (itemId: string, title: string) => void;
  toggleResearchTask: (itemId: string, taskId: string) => void;
  deleteResearchTask: (itemId: string, taskId: string) => void;
  // Selectors
  getListItems: () => IvyLeeItem[];
  getBacklogItems: () => IvyLeeItem[];
}

function updateItem(
  items: IvyLeeItem[],
  id: string,
  fn: (item: IvyLeeItem) => IvyLeeItem
): IvyLeeItem[] {
  return items.map((item) => (item.id === id ? fn(item) : item));
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
          researchTasks: [],
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
          items: updateItem(s.items, id, (item) => ({
            ...item,
            status: 'done',
            completedAt: new Date().toISOString(),
          })),
        }));
      },

      undoDone: (id) => {
        set((s) => ({
          items: updateItem(s.items, id, (item) => ({
            ...item,
            status: 'active',
            completedAt: undefined,
          })),
        }));
      },

      moveToBacklog: (id) => {
        set((s) => {
          const target = s.items.find((i) => i.id === id);
          if (!target) return s;
          return {
            items: s.items.map((item) => {
              if (item.id === id) return { ...item, status: 'backlog' as const };
              if (item.status !== 'backlog' && item.order > target.order)
                return { ...item, order: item.order - 1 };
              return item;
            }),
          };
        });
      },

      restoreFromBacklog: (id) => {
        set((s) => {
          const listCount = s.items.filter((i) => i.status !== 'backlog').length;
          if (listCount >= 6) return s;
          return {
            items: updateItem(s.items, id, (item) => ({
              ...item,
              status: 'active' as const,
              order: listCount,
            })),
          };
        });
      },

      deleteItem: (id) => {
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      },

      clearDoneItems: () => {
        set((s) => {
          const kept = s.items.filter((i) => i.status !== 'done');
          let order = 0;
          return {
            items: kept.map((item) =>
              item.status === 'active' ? { ...item, order: order++ } : item
            ),
          };
        });
      },

      addResearchTask: (itemId, title) => {
        const task: ResearchTask = {
          id: generateId('rt'),
          title,
          completed: false,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          items: updateItem(s.items, itemId, (item) => ({
            ...item,
            researchTasks: [...(item.researchTasks ?? []), task],
          })),
        }));
      },

      toggleResearchTask: (itemId, taskId) => {
        set((s) => ({
          items: updateItem(s.items, itemId, (item) => ({
            ...item,
            researchTasks: (item.researchTasks ?? []).map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    completed: !t.completed,
                    completedAt: !t.completed ? new Date().toISOString() : undefined,
                  }
                : t
            ),
          })),
        }));
      },

      deleteResearchTask: (itemId, taskId) => {
        set((s) => ({
          items: updateItem(s.items, itemId, (item) => ({
            ...item,
            researchTasks: (item.researchTasks ?? []).filter((t) => t.id !== taskId),
          })),
        }));
      },

      getListItems: () =>
        get()
          .items.filter((i) => i.status !== 'backlog')
          .sort((a, b) => a.order - b.order),

      getBacklogItems: () => get().items.filter((i) => i.status === 'backlog'),
    }),
    { name: 'ivy-lee-method' }
  )
);
