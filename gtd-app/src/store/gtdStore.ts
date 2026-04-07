import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GTDItem, Project, WeeklyReview, GTDStatus } from '../types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function now(): string {
  return new Date().toISOString();
}

interface GTDStore {
  items: GTDItem[];
  projects: Project[];
  weeklyReviews: WeeklyReview[];

  // Item actions
  addItem: (title: string, notes?: string) => GTDItem;
  updateItem: (id: string, updates: Partial<GTDItem>) => void;
  deleteItem: (id: string) => void;
  moveItem: (id: string, status: GTDStatus) => void;
  clarifyItem: (id: string, updates: Partial<GTDItem>) => void;
  completeItem: (id: string) => void;

  // Project actions
  addProject: (title: string, notes?: string, outcome?: string) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  completeProject: (id: string) => void;

  // Weekly review
  addWeeklyReview: (notes: string) => WeeklyReview;
  getLastReview: () => WeeklyReview | undefined;

  // Selectors
  getItemsByStatus: (status: GTDStatus) => GTDItem[];
  getItemsByProject: (projectId: string) => GTDItem[];
  getInboxCount: () => number;
}

export const useGTDStore = create<GTDStore>()(
  persist(
    (set, get) => ({
      items: [],
      projects: [],
      weeklyReviews: [],

      addItem: (title, notes = '') => {
        const item: GTDItem = {
          id: generateId(),
          title,
          notes,
          status: 'inbox',
          createdAt: now(),
          updatedAt: now(),
        };
        set((state) => ({ items: [...state.items, item] }));
        return item;
      },

      updateItem: (id, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates, updatedAt: now() } : item
          ),
        }));
      },

      deleteItem: (id) => {
        set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
      },

      moveItem: (id, status) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, status, updatedAt: now() } : item
          ),
        }));
      },

      clarifyItem: (id, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates, updatedAt: now() } : item
          ),
        }));
      },

      completeItem: (id) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, status: 'done', completedAt: now(), updatedAt: now() }
              : item
          ),
        }));
      },

      addProject: (title, notes = '', outcome = '') => {
        const project: Project = {
          id: generateId(),
          title,
          notes,
          outcome,
          status: 'active',
          createdAt: now(),
          updatedAt: now(),
        };
        set((state) => ({ projects: [...state.projects, project] }));
        return project;
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: now() } : p
          ),
        }));
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          // Remove project linkage from items
          items: state.items.map((item) =>
            item.projectId === id ? { ...item, projectId: undefined } : item
          ),
        }));
      },

      completeProject: (id) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, status: 'completed', completedAt: now(), updatedAt: now() }
              : p
          ),
        }));
      },

      addWeeklyReview: (notes) => {
        const review: WeeklyReview = {
          id: generateId(),
          completedAt: now(),
          notes,
        };
        set((state) => ({ weeklyReviews: [...state.weeklyReviews, review] }));
        return review;
      },

      getLastReview: () => {
        const { weeklyReviews } = get();
        if (!weeklyReviews.length) return undefined;
        return [...weeklyReviews].sort((a, b) =>
          b.completedAt.localeCompare(a.completedAt)
        )[0];
      },

      getItemsByStatus: (status) => {
        return get().items.filter((item) => item.status === status);
      },

      getItemsByProject: (projectId) => {
        return get().items.filter(
          (item) => item.projectId === projectId && item.status !== 'done' && item.status !== 'trash'
        );
      },

      getInboxCount: () => {
        return get().items.filter((item) => item.status === 'inbox').length;
      },
    }),
    {
      name: 'lets-get-things-done',
    }
  )
);
