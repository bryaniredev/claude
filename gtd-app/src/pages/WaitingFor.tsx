import { useState } from 'react';
import { Clock, Trash2, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { useGTDStore } from '../store/gtdStore';
import { format, formatDistanceToNow } from 'date-fns';

export default function WaitingFor() {
  const { items, deleteItem, moveItem } = useGTDStore();
  const waiting = items.filter((i) => i.status === 'waiting-for');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <Clock size={20} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Waiting For</h1>
          <p className="text-sm text-gray-500">Items delegated to others</p>
        </div>
        <span className="ml-auto badge bg-amber-100 text-amber-700 font-semibold text-sm px-3 py-1">
          {waiting.length}
        </span>
      </div>

      {waiting.length === 0 ? (
        <div className="text-center py-16">
          <Clock size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Nothing delegated right now</p>
          <p className="text-gray-400 text-sm mt-1">
            Delegate items during the Clarify step in your Inbox
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {waiting.map((item) => {
            const isExpanded = expandedId === item.id;
            const waitingDays = item.delegatedDate
              ? formatDistanceToNow(new Date(item.delegatedDate), { addSuffix: true })
              : null;

            return (
              <div key={item.id} className="card overflow-hidden">
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <Clock size={18} className="text-amber-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    {item.delegatedTo && (
                      <p className="text-xs text-amber-600 mt-0.5 font-medium">
                        → {item.delegatedTo}
                      </p>
                    )}
                    {waitingDays && (
                      <p className="text-xs text-gray-400 mt-0.5">Delegated {waitingDays}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
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
                    {item.notes && (
                      <p className="text-xs text-gray-600">{item.notes}</p>
                    )}
                    {item.delegatedDate && (
                      <p className="text-xs text-gray-400">
                        Delegated on{' '}
                        {format(new Date(item.delegatedDate), 'MMMM d, yyyy')}
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button
                        className="btn-ghost py-1 px-3 text-xs text-green-600 hover:bg-green-50"
                        onClick={() => moveItem(item.id, 'next-action')}
                      >
                        <Zap size={12} /> Back to Next Actions
                      </button>
                      <button
                        className="btn-ghost py-1 px-3 text-xs text-red-500 hover:bg-red-50"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
