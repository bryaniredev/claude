import { useState } from 'react';
import { Plus, Inbox as InboxIcon, ArrowRight, Trash2 } from 'lucide-react';
import { useGTDStore } from '../store/gtdStore';
import type { GTDItem } from '../types';
import ClarifyModal from '../components/ClarifyModal';
import { format } from 'date-fns';

export default function Inbox() {
  const { items, addItem, deleteItem } = useGTDStore();
  const inboxItems = items.filter((i) => i.status === 'inbox');

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [clarifyItem, setClarifyItem] = useState<GTDItem | null>(null);

  function handleCapture(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    addItem(title.trim(), notes.trim());
    setTitle('');
    setNotes('');
    setShowNotes(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <InboxIcon size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
          <p className="text-sm text-gray-500">Capture everything — process it later</p>
        </div>
        {inboxItems.length > 0 && (
          <span className="ml-auto badge bg-blue-100 text-blue-700 font-semibold text-sm px-3 py-1">
            {inboxItems.length}
          </span>
        )}
      </div>

      {/* Capture form */}
      <div className="card p-4 mb-6">
        <form onSubmit={handleCapture}>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="What's on your mind? Capture it here..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-primary" disabled={!title.trim()}>
              <Plus size={16} />
              Add
            </button>
          </div>
          {showNotes ? (
            <textarea
              className="textarea mt-2 h-20"
              placeholder="Additional notes (optional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          ) : (
            <button
              type="button"
              className="text-xs text-gray-400 hover:text-gray-600 mt-2 transition-colors"
              onClick={() => setShowNotes(true)}
            >
              + Add notes
            </button>
          )}
        </form>
      </div>

      {/* Inbox list */}
      {inboxItems.length === 0 ? (
        <div className="text-center py-16">
          <InboxIcon size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Inbox is empty</p>
          <p className="text-gray-400 text-sm mt-1">
            Great job! Everything has been clarified and organized.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            To process ({inboxItems.length})
          </p>
          {inboxItems.map((item) => (
            <div
              key={item.id}
              className="card p-4 flex items-start gap-3 group hover:border-blue-200 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                {item.notes && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.notes}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {format(new Date(item.createdAt), 'MMM d, h:mm a')}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => deleteItem(item.id)}
                  className="btn-ghost p-1.5 text-gray-400 hover:text-red-500"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={() => setClarifyItem(item)}
                  className="btn-primary py-1.5 px-3 text-xs"
                >
                  Clarify <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}

          {inboxItems.length > 1 && (
            <button
              onClick={() => setClarifyItem(inboxItems[0])}
              className="btn-primary w-full mt-4 justify-center"
            >
              Process next item <ArrowRight size={16} />
            </button>
          )}
        </div>
      )}

      {/* Clarify Modal */}
      {clarifyItem && (
        <ClarifyModal item={clarifyItem} onClose={() => setClarifyItem(null)} />
      )}
    </div>
  );
}
