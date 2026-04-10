import { useState } from 'react';
import { BookOpen, Trash2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useGTDStore } from '../store/gtdStore';
import { format } from 'date-fns';

export default function Reference() {
  const { items, deleteItem } = useGTDStore();
  const reference = items.filter((i) => i.status === 'reference');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = search.trim()
    ? reference.filter(
        (i) =>
          i.title.toLowerCase().includes(search.toLowerCase()) ||
          i.notes?.toLowerCase().includes(search.toLowerCase())
      )
    : reference;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <BookOpen size={20} className="text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reference</h1>
          <p className="text-sm text-gray-500">Non-actionable information worth keeping</p>
        </div>
        <span className="ml-auto badge bg-teal-100 text-teal-700 font-semibold text-sm px-3 py-1">
          {reference.length}
        </span>
      </div>

      {/* Search */}
      {reference.length > 0 && (
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search reference items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">
            {reference.length === 0 ? 'No reference items' : 'No results found'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {reference.length === 0
              ? 'Save useful non-actionable information here during Clarify'
              : 'Try a different search term'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div key={item.id} className="card overflow-hidden">
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <BookOpen size={16} className="text-teal-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    {item.notes && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.notes}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(item.createdAt), 'MMM d, yyyy')}
                    </p>
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

                {isExpanded && item.notes && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs text-gray-600 whitespace-pre-wrap">{item.notes}</p>
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
