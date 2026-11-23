import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Zap, Check, Trash2, ChevronDown, ChevronUp, Filter, LayoutGrid, List, Compass, Plus } from 'lucide-react';
import { useGTDStore } from '../store/gtdStore';
import { useDailyStore, itemsForDay, DAILY_LIMIT } from '../store/dailyStore';
import { useToday } from '../hooks/useNow';
import { completeNextAction, planNextAction } from '../lib/tasks';
import EisenhowerMatrix, { FlagToggles } from '../components/EisenhowerMatrix';
import WhatNowPicker from '../components/WhatNowPicker';
import type { GTDItem, EnergyLevel } from '../types';
import { CONTEXTS } from '../types';
import { format } from 'date-fns';

const ENERGY_COLORS: Record<EnergyLevel, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

export default function NextActions() {
  const { items, projects, deleteItem } = useGTDStore();
  const actions = items.filter((i) => i.status === 'next-action');
  const today = useToday();
  const daily = useDailyStore((s) => s.items);
  const plannedIds = new Set(daily.filter((d) => d.status === 'active').map((d) => d.gtdItemId));
  const todayFull = itemsForDay(daily, today).length >= DAILY_LIMIT;
  const [view, setView] = useState<'list' | 'matrix'>('list');
  const [params] = useSearchParams();
  const [showWhatNow, setShowWhatNow] = useState(params.get('whatnow') === '1');

  const [filterContext, setFilterContext] = useState('');
  const [filterEnergy, setFilterEnergy] = useState<EnergyLevel | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = actions.filter((a) => {
    if (filterContext && a.context !== filterContext) return false;
    if (filterEnergy && a.energyLevel !== filterEnergy) return false;
    return true;
  });

  const grouped = filtered.reduce<Record<string, GTDItem[]>>((acc, item) => {
    const key = item.context ?? 'No Context';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  function getProjectTitle(projectId?: string) {
    if (!projectId) return null;
    return projects.find((p) => p.id === projectId)?.title ?? null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <Zap size={20} className="text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Next Actions</h1>
          <p className="text-sm text-gray-500">Your physical, visible next steps</p>
        </div>
        <span className="ml-auto badge bg-green-100 text-green-700 font-semibold text-sm px-3 py-1">
          {actions.length}
        </span>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <div className="flex items-center gap-1 flex-wrap">
        <button
          className="btn-ghost py-1.5 px-3 text-xs gap-1"
          onClick={() => setShowFilters((v) => !v)}
        >
          <Filter size={14} />
          Filters
          {(filterContext || filterEnergy) && (
            <span className="badge bg-blue-100 text-blue-700 ml-1">active</span>
          )}
        </button>
        <button
          className={`btn-ghost py-1.5 px-3 text-xs gap-1 ${showWhatNow ? 'bg-teal-50 text-teal-700' : ''}`}
          onClick={() => setShowWhatNow((v) => !v)}
        >
          <Compass size={14} /> What now?
        </button>
        <div className="ml-auto flex p-0.5 bg-gray-100 rounded-lg">
          {(
            [
              ['list', 'List', List],
              ['matrix', 'Matrix', LayoutGrid],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`h-8 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1 ${
                view === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
        </div>
        {showWhatNow && (
          <div className="mt-2">
            <WhatNowPicker />
          </div>
        )}
        {showFilters && (
          <div className="mt-2 flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <select
              className="input w-auto text-xs py-1"
              value={filterContext}
              onChange={(e) => setFilterContext(e.target.value)}
            >
              <option value="">All contexts</option>
              {CONTEXTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="input w-auto text-xs py-1"
              value={filterEnergy}
              onChange={(e) => setFilterEnergy(e.target.value as EnergyLevel | '')}
            >
              <option value="">All energy levels</option>
              <option value="low">Low energy</option>
              <option value="medium">Medium energy</option>
              <option value="high">High energy</option>
            </select>
            {(filterContext || filterEnergy) && (
              <button
                className="text-xs text-red-500 hover:text-red-700"
                onClick={() => {
                  setFilterContext('');
                  setFilterEnergy('');
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* List */}
      {view === 'matrix' && filtered.length > 0 ? (
        <>
          <p className="text-xs text-gray-500 mb-3">
            Tag each action Urgent and/or Important. Pick today's priorities from <b>Do first</b> and <b>Schedule</b>.
          </p>
          <EisenhowerMatrix
            items={filtered}
            renderAction={(item) => (
              <PlanButton
                planned={plannedIds.has(item.id)}
                canPlan={!todayFull}
                onPlan={() => planNextAction(item.id, today)}
              />
            )}
          />
        </>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Zap size={48} className="text-gray-200 mx-auto mb-4" />}
          title={actions.length === 0 ? 'No next actions' : 'No results for this filter'}
          subtitle={
            actions.length === 0
              ? 'Process items from your Inbox to populate this list'
              : 'Try changing or clearing the filters'
          }
        />
      ) : filterContext ? (
        // Flat list when filtering by context
        <div className="space-y-2">
          {filtered.map((item) => (
            <ActionItem
              key={item.id}
              item={item}
              projectTitle={getProjectTitle(item.projectId)}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onComplete={() => completeNextAction(item.id)}
              onDelete={() => deleteItem(item.id)}
              planned={plannedIds.has(item.id)}
              canPlan={!todayFull}
              onPlan={() => planNextAction(item.id, today)}
            />
          ))}
        </div>
      ) : (
        // Grouped by context
        <div className="space-y-6">
          {Object.entries(grouped).map(([ctx, ctxItems]) => (
            <div key={ctx}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {ctx}
              </p>
              <div className="space-y-2">
                {ctxItems.map((item) => (
                  <ActionItem
                    key={item.id}
                    item={item}
                    projectTitle={getProjectTitle(item.projectId)}
                    expanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    onComplete={() => completeNextAction(item.id)}
                    onDelete={() => deleteItem(item.id)}
                    planned={plannedIds.has(item.id)}
                    canPlan={!todayFull}
                    onPlan={() => planNextAction(item.id, today)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanButton({ planned, canPlan, onPlan }: { planned: boolean; canPlan: boolean; onPlan: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!planned) onPlan();
      }}
      disabled={planned || !canPlan}
      className={`h-8 px-2 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 ${
        planned ? 'bg-green-50 text-green-600' : canPlan ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-gray-50 text-gray-300'
      }`}
      title={planned ? "On today's GTD Ivy Lee list" : canPlan ? "Add to today's GTD Ivy Lee list" : "Today's list is full (6)"}
    >
      {planned ? <Check size={13} /> : <Plus size={13} />} Today
    </button>
  );
}

function ActionItem({
  item,
  projectTitle,
  expanded,
  onToggle,
  onComplete,
  onDelete,
  planned,
  canPlan,
  onPlan,
}: {
  item: GTDItem;
  projectTitle: string | null;
  expanded: boolean;
  onToggle: () => void;
  onComplete: () => void;
  onDelete: () => void;
  planned: boolean;
  canPlan: boolean;
  onPlan: () => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <button
          onClick={onComplete}
          className="w-5 h-5 mt-0.5 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 shrink-0 transition-colors"
          title="Mark complete"
        />
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
          <p className="text-sm font-medium text-gray-900">{item.title}</p>
          {projectTitle && (
            <p className="text-xs text-purple-600 mt-0.5">↳ {projectTitle}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {item.energyLevel && (
              <span className={`badge ${ENERGY_COLORS[item.energyLevel]} capitalize`}>
                {item.energyLevel} energy
              </span>
            )}
            {item.timeEstimate && (
              <span className="badge bg-gray-100 text-gray-600">{item.timeEstimate} min</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <PlanButton planned={planned} canPlan={canPlan} onPlan={onPlan} />
          <button
            onClick={onDelete}
            className="btn-ghost p-1.5 text-gray-300 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
          <button onClick={onToggle} className="btn-ghost p-1.5 text-gray-300">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100 text-xs text-gray-500 space-y-1 bg-gray-50">
          {item.notes && <p className="mt-2">{item.notes}</p>}
          <p className={item.notes ? '' : 'mt-2'}>Added {format(new Date(item.createdAt), 'MMM d, yyyy')}</p>
          <div className="pt-1">
            <FlagToggles item={item} />
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={onComplete}
              className="btn-primary py-1 px-3 text-xs gap-1"
            >
              <Check size={12} /> Mark done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center py-16">
      {icon}
      <p className="text-gray-500 font-medium">{title}</p>
      <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
    </div>
  );
}
