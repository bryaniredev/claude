import { Link } from 'react-router-dom';
import {
  Inbox,
  Zap,
  FolderKanban,
  Clock,
  Star,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ArrowRight,
} from 'lucide-react';
import { useGTDStore } from '../store/gtdStore';
import { differenceInDays } from 'date-fns';

export default function Dashboard() {
  const { items, projects, getLastReview } = useGTDStore();
  const lastReview = getLastReview();

  const stats = {
    inbox: items.filter((i) => i.status === 'inbox').length,
    nextActions: items.filter((i) => i.status === 'next-action').length,
    projects: projects.filter((p) => p.status === 'active').length,
    waitingFor: items.filter((i) => i.status === 'waiting-for').length,
    somedayMaybe: items.filter((i) => i.status === 'someday-maybe').length,
    reference: items.filter((i) => i.status === 'reference').length,
    calendar: items.filter((i) => i.status === 'calendar').length,
    done: items.filter((i) => i.status === 'done').length,
  };

  const daysSinceReview = lastReview
    ? differenceInDays(new Date(), new Date(lastReview.completedAt))
    : null;

  const reviewDue = daysSinceReview === null || daysSinceReview >= 7;

  const tiles = [
    {
      to: '/inbox',
      label: 'Inbox',
      count: stats.inbox,
      icon: Inbox,
      color: 'blue',
      urgent: stats.inbox > 0,
      description: 'Items to process',
    },
    {
      to: '/next-actions',
      label: 'Next Actions',
      count: stats.nextActions,
      icon: Zap,
      color: 'green',
      description: 'Things to do now',
    },
    {
      to: '/projects',
      label: 'Projects',
      count: stats.projects,
      icon: FolderKanban,
      color: 'purple',
      description: 'Active outcomes',
    },
    {
      to: '/waiting-for',
      label: 'Waiting For',
      count: stats.waitingFor,
      icon: Clock,
      color: 'amber',
      description: 'Delegated items',
    },
    {
      to: '/someday-maybe',
      label: 'Someday / Maybe',
      count: stats.somedayMaybe,
      icon: Star,
      color: 'yellow',
      description: 'Future possibilities',
    },
    {
      to: '/reference',
      label: 'Reference',
      count: stats.reference,
      icon: BookOpen,
      color: 'teal',
      description: 'Saved information',
    },
    {
      to: '/calendar',
      label: 'Calendar',
      count: stats.calendar,
      icon: CalendarDays,
      color: 'red',
      description: 'Scheduled items',
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; badge: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
    green: { bg: 'bg-green-50', text: 'text-green-600', badge: 'bg-green-100 text-green-700' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', badge: 'bg-teal-100 text-teal-700' },
    red: { bg: 'bg-red-50', text: 'text-red-600', badge: 'bg-red-100 text-red-700' },
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Let's Get Things Done
        </h1>
        <p className="text-gray-500 mt-1">
          Your GTD system at a glance — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Weekly Review nudge */}
      {reviewDue && (
        <Link
          to="/weekly-review"
          className={`flex items-center gap-3 p-4 rounded-xl mb-6 border transition-colors ${
            daysSinceReview === null
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}
        >
          <CheckSquare size={20} className="shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {daysSinceReview === null
                ? 'Start your first Weekly Review'
                : `Weekly Review overdue — last done ${daysSinceReview} days ago`}
            </p>
            <p className="text-xs opacity-75 mt-0.5">
              David Allen calls it "the critical success factor" — keep your system trusted
            </p>
          </div>
          <ArrowRight size={16} className="shrink-0" />
        </Link>
      )}

      {/* Inbox needs attention */}
      {stats.inbox > 0 && (
        <Link
          to="/inbox"
          className="flex items-center gap-3 p-4 rounded-xl mb-6 bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Inbox size={20} className="shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {stats.inbox} item{stats.inbox !== 1 ? 's' : ''} in your Inbox
            </p>
            <p className="text-blue-200 text-xs mt-0.5">
              Clarify and organize your captures
            </p>
          </div>
          <ArrowRight size={16} className="shrink-0" />
        </Link>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {tiles.map(({ to, label, count, icon: Icon, color, description }) => {
          const c = colorMap[color];
          return (
            <Link
              key={to}
              to={to}
              className="card p-4 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center`}>
                  <Icon size={18} className={c.text} />
                </div>
                <span className={`badge ${c.badge} font-bold text-base px-2.5 py-0.5`}>
                  {count}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{description}</p>
            </Link>
          );
        })}
      </div>

      {/* GTD Steps reminder */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">
          The 5 Steps of GTD
        </h2>
        <div className="space-y-3">
          {[
            {
              step: '1',
              name: 'Capture',
              desc: 'Collect anything that has your attention into the Inbox',
              action: '/inbox',
              color: 'blue',
            },
            {
              step: '2',
              name: 'Clarify',
              desc: 'Process each item — is it actionable? What\'s the next step?',
              action: '/inbox',
              color: 'indigo',
            },
            {
              step: '3',
              name: 'Organize',
              desc: 'Put items in the right lists: Next Actions, Projects, Waiting For, etc.',
              action: '/next-actions',
              color: 'purple',
            },
            {
              step: '4',
              name: 'Reflect',
              desc: 'Review your lists regularly — especially the Weekly Review',
              action: '/weekly-review',
              color: 'amber',
            },
            {
              step: '5',
              name: 'Engage',
              desc: 'Do the work with confidence, guided by your trusted system',
              action: '/next-actions',
              color: 'green',
            },
          ].map(({ step, name, desc, action, color }) => (
            <Link
              key={step}
              to={action}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  color === 'blue'
                    ? 'bg-blue-100 text-blue-700'
                    : color === 'indigo'
                    ? 'bg-indigo-100 text-indigo-700'
                    : color === 'purple'
                    ? 'bg-purple-100 text-purple-700'
                    : color === 'amber'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {step}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
              <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-400 mt-1 shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {stats.done > 0 && (
        <p className="text-center text-xs text-gray-400 mt-6">
          {stats.done} item{stats.done !== 1 ? 's' : ''} completed — great work!
        </p>
      )}
    </div>
  );
}
