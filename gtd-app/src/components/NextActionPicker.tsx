import { useMemo, useState } from 'react';
import { Plus, Check, Search, LayoutGrid, List } from 'lucide-react';
import BottomSheet from './BottomSheet';
import EisenhowerMatrix, { FlagToggles } from './EisenhowerMatrix';
import { quadrantRank } from '../lib/quadrants';
import { useGTDStore } from '../store/gtdStore';
import { useDailyStore, DAILY_LIMIT, itemsForDay } from '../store/dailyStore';
import { planNextAction } from '../lib/tasks';
import { prettyDay } from '../lib/dates';
import { CONTEXTS, type GTDItem } from '../types';

/** Pick priorities for a day straight from your GTD Next Actions. */
export default function NextActionPicker({ date, onClose }: { date: string; onClose: () => void }) {
  const gtdItems = useGTDStore((s) => s.items);
  const projects = useGTDStore((s) => s.projects);
  const daily = useDailyStore((s) => s.items);
  const [query, setQuery] = useState('');
  const [context, setContext] = useState('');
  const [view, setView] = useState<'list' | 'matrix'>('list');

  const dayCount = itemsForDay(daily, date).length;
  const slotsLeft = DAILY_LIMIT - dayCount;
  const plannedIds = new Set(daily.filter((d) => d.status === 'active').map((d) => d.gtdItemId));

  const candidates = useMemo(
    () =>
      gtdItems
        .filter((i) => i.status === 'next-action')
        .filter((i) => !context || i.context === context)
        .filter((i) => !query || i.title.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => quadrantRank(a) - quadrantRank(b) || a.createdAt.localeCompare(b.createdAt)),
    [gtdItems, context, query]
  );

  function addButton(item: GTDItem) {
    const planned = plannedIds.has(item.id);
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!planned) planNextAction(item.id, date);
        }}
        disabled={planned || slotsLeft <= 0}
        className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-lg ${
          planned
            ? 'bg-green-100 text-green-600'
            : slotsLeft <= 0
            ? 'bg-gray-100 text-gray-300'
            : 'bg-blue-600 text-white active:bg-blue-700'
        }`}
        aria-label={planned ? 'Already planned' : 'Add to list'}
      >
        {planned ? <Check size={16} /> : <Plus size={18} />}
      </button>
    );
  }

  const projectTitle = (id?: string) => projects.find((p) => p.id === id)?.title;

  return (
    <BottomSheet
      eyebrow={`Pick for ${prettyDay(date).toLowerCase()}`}
      title={
        <span>
          From Next Actions{' '}
          <span className={`text-sm font-medium ${slotsLeft > 0 ? 'text-blue-600' : 'text-green-600'}`}>
            · {slotsLeft > 0 ? `${slotsLeft} slot${slotsLeft !== 1 ? 's' : ''} left` : 'list full'}
          </span>
        </span>
      }
      onClose={onClose}
      footer={
        <button className="btn-primary w-full justify-center h-12" onClick={onClose}>
          Done
        </button>
      }
    >
      <p className="text-xs text-gray-500 mb-3">
        Ivy Lee: pick the <b>most important</b> things, not the easiest. Tag items Urgent/Important
        — important ones float to the top.
      </p>
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 h-10"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="input w-auto h-10 text-xs" value={context} onChange={(e) => setContext(e.target.value)}>
          <option value="">All</option>
          {CONTEXTS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          className="btn-secondary h-10 px-2.5"
          onClick={() => setView((v) => (v === 'list' ? 'matrix' : 'list'))}
          aria-label={view === 'list' ? 'Matrix view' : 'List view'}
          title={view === 'list' ? 'Urgent/Important matrix' : 'List'}
        >
          {view === 'list' ? <LayoutGrid size={16} /> : <List size={16} />}
        </button>
      </div>

      {candidates.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          {gtdItems.some((i) => i.status === 'next-action')
            ? 'No matching Next Actions.'
            : 'No Next Actions yet — capture in the Inbox and clarify, or type a priority directly.'}
        </p>
      ) : view === 'matrix' ? (
        <EisenhowerMatrix items={candidates} renderAction={addButton} />
      ) : (
        <ul className="space-y-1.5">
          {candidates.map((item) => (
            <li key={item.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 leading-snug">{item.title}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.context && <span className="badge bg-gray-100 text-gray-500">{item.context}</span>}
                  {item.timeEstimate && <span className="badge bg-gray-100 text-gray-500">{item.timeEstimate} min</span>}
                  {projectTitle(item.projectId) && (
                    <span className="badge bg-purple-50 text-purple-600">{projectTitle(item.projectId)}</span>
                  )}
                </div>
              </div>
              <div className="hidden sm:block">
                <FlagToggles item={item} />
              </div>
              {addButton(item)}
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}
