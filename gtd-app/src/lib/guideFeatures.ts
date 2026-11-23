import {
  Timer,
  ListChecks,
  Inbox,
  Zap,
  FolderKanban,
  Clock,
  CheckSquare,
  Moon,
  LifeBuoy,
  TrendingUp,
  Mountain,
  BedDouble,
} from 'lucide-react';
import type { FeatureKey } from './guide';

export const FEATURES: Record<
  FeatureKey,
  { label: string; icon: typeof Timer; chip: string; button: string; tint: string }
> = {
  focus: { label: 'Focus', icon: Timer, chip: 'bg-blue-50 text-blue-700', button: 'bg-blue-600 hover:bg-blue-700', tint: 'from-blue-50' },
  'gtd-ivy-lee': { label: 'GTD Ivy Lee', icon: ListChecks, chip: 'bg-blue-50 text-blue-700', button: 'bg-blue-600 hover:bg-blue-700', tint: 'from-blue-50' },
  inbox: { label: 'Inbox', icon: Inbox, chip: 'bg-sky-50 text-sky-700', button: 'bg-sky-600 hover:bg-sky-700', tint: 'from-sky-50' },
  'next-actions': { label: 'Next Actions', icon: Zap, chip: 'bg-green-50 text-green-700', button: 'bg-green-600 hover:bg-green-700', tint: 'from-green-50' },
  projects: { label: 'Projects', icon: FolderKanban, chip: 'bg-purple-50 text-purple-700', button: 'bg-purple-600 hover:bg-purple-700', tint: 'from-purple-50' },
  'waiting-for': { label: 'Waiting For', icon: Clock, chip: 'bg-amber-50 text-amber-700', button: 'bg-amber-600 hover:bg-amber-700', tint: 'from-amber-50' },
  'weekly-review': { label: 'Weekly Review', icon: CheckSquare, chip: 'bg-indigo-50 text-indigo-700', button: 'bg-indigo-600 hover:bg-indigo-700', tint: 'from-indigo-50' },
  shutdown: { label: 'Evening Shutdown', icon: Moon, chip: 'bg-indigo-50 text-indigo-700', button: 'bg-indigo-600 hover:bg-indigo-700', tint: 'from-indigo-50' },
  unstuck: { label: "I'm Stuck", icon: LifeBuoy, chip: 'bg-rose-50 text-rose-700', button: 'bg-rose-600 hover:bg-rose-700', tint: 'from-rose-50' },
  progress: { label: 'Progress', icon: TrendingUp, chip: 'bg-orange-50 text-orange-700', button: 'bg-orange-600 hover:bg-orange-700', tint: 'from-orange-50' },
  goals: { label: 'Goals & Horizons', icon: Mountain, chip: 'bg-emerald-50 text-emerald-700', button: 'bg-emerald-600 hover:bg-emerald-700', tint: 'from-emerald-50' },
  rest: { label: 'Rest', icon: BedDouble, chip: 'bg-slate-100 text-slate-600', button: 'bg-slate-700 hover:bg-slate-800', tint: 'from-slate-100' },
};
