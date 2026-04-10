import { useState } from 'react';
import {
  CalendarDays,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useGTDStore } from '../store/gtdStore';
import { format, isToday, isPast, isFuture, parseISO } from 'date-fns';

export default function CalendarView() {
  const { items, completeItem, deleteItem, moveItem } = useGTDStore();
  const calItems = items.filter((i) => i.status === 'calendar');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...calItems].sort((a, b) => {
    if (!a.scheduledDate && !b.scheduledDate) return 0;
    if (!a.scheduledDate) return 1;
    if (!b.scheduledDate) return -1;
    return a.scheduledDate.localeCompare(b.scheduledDate);
  });

  const overdue = sorted.filter(
    (i) => i.scheduledDate && isPast(parseISO(i.scheduledDate)) && !isToday(parseISO(i.scheduledDate))
  );
  const today = sorted.filter((i) => i.scheduledDate && isToday(parseISO(i.scheduledDate)));
  const upcoming = sorted.filter(
    (i) => i.scheduledDate && isFuture(parseISO(i.scheduledDate))
  );
  const unscheduled = sorted.filter((i) => !i.scheduledDate);

  function DateBadge({ date }: { date?: string }) {
    if (!date) return null;
    const d = parseISO(date);
    if (isToday(d))
      return <span className="badge bg-blue-100 text-blue-700">Today</span>;
    if (isPast(d))
      return <span className="badge bg-red-100 text-red-700">Overdue</span>;
    return <span className="badge bg-gray-100 text-gray-600">{format(d, 'MMM d')}</span>;
  }

  function ItemCard({ item }: { item: typeof sorted[0] }) {
    const isExpanded = expandedId === item.id;
    return (
      <div className="card overflow-hidden">
        <div
          className="flex items-start gap-3 p-4 cursor-pointer"
          onClick={() => setExpandedId(isExpanded ? null : item.id)}
        >
          <CalendarDays size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{item.title}</p>
            {item.scheduledDate && (
              <p className="text-xs text-gray-500 mt-0.5">
                {format(parseISO(item.scheduledDate), 'EEEE, MMMM d, yyyy')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DateBadge date={item.scheduledDate} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteItem(item.id);
              }}
              className="btn-ghost p-1.5 text-gray-300 hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
            {isExpanded ? (
              <ChevronUp size={14} className="text-gray-400" />
            ) : (
              <ChevronDown size={14} className="text-gray-400" />
            )}
          </div>
        </div>
        {isExpanded && (
          <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-2">
            {item.notes && <p className="text-xs text-gray-600">{item.notes}</p>}
            <div className="flex gap-2 pt-1">
              <button
                className="btn-ghost py-1 px-3 text-xs text-green-600 hover:bg-green-50"
                onClick={() => completeItem(item.id)}
              >
                <Check size={12} /> Mark done
              </button>
              <button
                className="btn-ghost py-1 px-3 text-xs text-blue-600 hover:bg-blue-50"
                onClick={() => moveItem(item.id, 'next-action')}
              >
                Move to Next Actions
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <CalendarDays size={20} className="text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500">Date and time specific commitments</p>
        </div>
        <span className="ml-auto badge bg-red-100 text-red-700 font-semibold text-sm px-3 py-1">
          {calItems.length}
        </span>
      </div>

      {calItems.length === 0 ? (
        <div className="text-center py-16">
          <CalendarDays size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No scheduled items</p>
          <p className="text-gray-400 text-sm mt-1">
            Schedule items during the Clarify step in your Inbox
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wider">
                  Overdue ({overdue.length})
                </p>
              </div>
              <div className="space-y-2">
                {overdue.map((i) => <ItemCard key={i.id} item={i} />)}
              </div>
            </section>
          )}

          {today.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                Today ({today.length})
              </p>
              <div className="space-y-2">
                {today.map((i) => <ItemCard key={i.id} item={i} />)}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Upcoming
              </p>
              <div className="space-y-2">
                {upcoming.map((i) => <ItemCard key={i.id} item={i} />)}
              </div>
            </section>
          )}

          {unscheduled.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Unscheduled
              </p>
              <div className="space-y-2">
                {unscheduled.map((i) => <ItemCard key={i.id} item={i} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
