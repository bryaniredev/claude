import type { GTDItem } from '../types';

export type Quadrant = 'do' | 'schedule' | 'delegate' | 'drop' | 'unsorted';

export function quadrantOf(item: GTDItem): Quadrant {
  if (item.urgent === undefined && item.important === undefined) return 'unsorted';
  if (item.urgent && item.important) return 'do';
  if (item.important) return 'schedule';
  if (item.urgent) return 'delegate';
  return 'drop';
}

/** Lower = pick first when choosing the day's priorities. */
export function quadrantRank(item: GTDItem): number {
  return { do: 0, schedule: 1, unsorted: 2, delegate: 3, drop: 4 }[quadrantOf(item)];
}

export const QUADRANTS: Record<
  Exclude<Quadrant, 'unsorted'>,
  { title: string; hint: string; box: string; head: string }
> = {
  do: {
    title: 'Do first',
    hint: 'Urgent & important',
    box: 'bg-red-50 border-red-200',
    head: 'text-red-700',
  },
  schedule: {
    title: 'Schedule',
    hint: 'Important, not urgent — where real progress happens',
    box: 'bg-blue-50 border-blue-200',
    head: 'text-blue-700',
  },
  delegate: {
    title: 'Delegate',
    hint: 'Urgent, not important',
    box: 'bg-amber-50 border-amber-200',
    head: 'text-amber-700',
  },
  drop: {
    title: 'Drop',
    hint: 'Neither — Someday/Maybe or delete',
    box: 'bg-gray-50 border-gray-200',
    head: 'text-gray-600',
  },
};
