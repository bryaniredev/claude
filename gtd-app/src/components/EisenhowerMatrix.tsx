import type { GTDItem } from '../types';
import { useGTDStore } from '../store/gtdStore';
import { QUADRANTS, quadrantOf, type Quadrant } from '../lib/quadrants';

export function FlagToggles({ item }: { item: GTDItem }) {
  const updateItem = useGTDStore((s) => s.updateItem);
  const base = 'h-7 px-2 rounded-md text-[11px] font-semibold border transition-colors';
  return (
    <div className="flex gap-1 shrink-0">
      <button
        className={`${base} ${item.urgent ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-400 border-gray-200'}`}
        onClick={(e) => {
          e.stopPropagation();
          updateItem(item.id, { urgent: !item.urgent, important: item.important ?? false });
        }}
        aria-pressed={Boolean(item.urgent)}
      >
        Urgent
      </button>
      <button
        className={`${base} ${item.important ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-200'}`}
        onClick={(e) => {
          e.stopPropagation();
          updateItem(item.id, { important: !item.important, urgent: item.urgent ?? false });
        }}
        aria-pressed={Boolean(item.important)}
      >
        Important
      </button>
    </div>
  );
}

export default function EisenhowerMatrix({
  items,
  renderAction,
}: {
  items: GTDItem[];
  renderAction?: (item: GTDItem) => React.ReactNode;
}) {
  const by = (q: Quadrant) => items.filter((i) => quadrantOf(i) === q);
  const unsorted = by('unsorted');

  return (
    <div className="space-y-3">
      {unsorted.length > 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            To triage ({unsorted.length}) — tag each one
          </p>
          <div className="space-y-1.5">
            {unsorted.map((i) => (
              <MatrixRow key={i.id} item={i} action={renderAction?.(i)} />
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(Object.keys(QUADRANTS) as (keyof typeof QUADRANTS)[]).map((q) => {
          const meta = QUADRANTS[q];
          const list = by(q);
          return (
            <div key={q} className={`rounded-xl border p-3 ${meta.box}`}>
              <p className={`text-sm font-bold ${meta.head}`}>
                {meta.title} <span className="font-normal opacity-70">({list.length})</span>
              </p>
              <p className="text-xs text-gray-500 mb-2">{meta.hint}</p>
              <div className="space-y-1.5">
                {list.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nothing here</p>
                ) : (
                  list.map((i) => <MatrixRow key={i.id} item={i} action={renderAction?.(i)} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatrixRow({ item, action }: { item: GTDItem; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-2.5 py-2">
      <p className="flex-1 min-w-0 text-sm text-gray-800 leading-snug">{item.title}</p>
      <FlagToggles item={item} />
      {action}
    </div>
  );
}
