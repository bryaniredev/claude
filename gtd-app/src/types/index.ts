export type GTDStatus =
  | 'inbox'
  | 'next-action'
  | 'project'
  | 'waiting-for'
  | 'someday-maybe'
  | 'reference'
  | 'calendar'
  | 'done'
  | 'trash';

export type EnergyLevel = 'low' | 'medium' | 'high';

export type ReviewFrequency = 'daily' | 'weekly';

export interface GTDItem {
  id: string;
  title: string;
  notes: string;
  status: GTDStatus;
  createdAt: string;
  updatedAt: string;

  // Next action context (@ contexts)
  context?: string;
  energyLevel?: EnergyLevel;
  timeEstimate?: number; // minutes

  // Project linkage
  projectId?: string;

  // Waiting For
  delegatedTo?: string;
  delegatedDate?: string;

  // Calendar / Scheduled
  scheduledDate?: string;

  // Reference tags
  tags?: string[];

  // Completion
  completedAt?: string;
}

export interface Project {
  id: string;
  title: string;
  notes: string;
  outcome: string; // What does "done" look like?
  status: 'active' | 'completed' | 'someday-maybe';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface WeeklyReview {
  id: string;
  completedAt: string;
  notes: string;
}

export type ViewType =
  | 'dashboard'
  | 'inbox'
  | 'next-actions'
  | 'projects'
  | 'waiting-for'
  | 'someday-maybe'
  | 'reference'
  | 'calendar'
  | 'weekly-review';

export const CONTEXTS = [
  '@home',
  '@office',
  '@computer',
  '@phone',
  '@errands',
  '@anywhere',
];

export const STATUS_META: Record<GTDStatus, { label: string; color: string }> = {
  inbox: { label: 'Inbox', color: 'blue' },
  'next-action': { label: 'Next Action', color: 'green' },
  project: { label: 'Project', color: 'purple' },
  'waiting-for': { label: 'Waiting For', color: 'amber' },
  'someday-maybe': { label: 'Someday/Maybe', color: 'gray' },
  reference: { label: 'Reference', color: 'teal' },
  calendar: { label: 'Calendar', color: 'red' },
  done: { label: 'Done', color: 'green' },
  trash: { label: 'Trash', color: 'gray' },
};
