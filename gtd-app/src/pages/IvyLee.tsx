import { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Check,
  Archive,
  RotateCcw,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ClipboardList,
  X,
} from 'lucide-react';
import { useIvyLeeStore, type IvyLeeItem } from '../store/ivyLeeStore';

// ─── Research bottom sheet ────────────────────────────────────────────────────

function ResearchModal({ item, onClose }: { item: IvyLeeItem; onClose: () => void }) {
  const { addResearchTask, toggleResearchTask, deleteResearchTask } = useIvyLeeStore();
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const tasks = item.researchTasks ?? [];
  const completedCount = tasks.filter((t) => t.completed).length;

  // Focus input when sheet opens
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    addResearchTask(item.id, input.trim());
    setInput('');
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      {/* Bottom sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-3xl shadow-2xl"
        style={{ maxHeight: '82vh' }}
        role="dialog"
        aria-label={`Research tasks for: ${item.title}`}
      >
        {/* Drag handle bar */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">
                Research Tasks
              </p>
              <p className="font-bold text-gray-900 text-lg leading-snug">{item.title}</p>
              {tasks.length > 0 && (
                <p className="text-sm text-gray-400 mt-1">
                  {completedCount} of {tasks.length} completed
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 active:bg-gray-200 shrink-0 mt-1"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Research progress bar */}
          {tasks.length > 0 && (
            <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(completedCount / tasks.length) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {tasks.length === 0 ? (
            <div className="text-center py-10">
              <ClipboardList size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No research tasks yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Add questions or things you need to figure out below.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className={`flex items-center gap-3 px-3 py-3 rounded-2xl transition-colors ${
                    task.completed ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleResearchTask(item.id, task.id)}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      task.completed
                        ? 'bg-indigo-500 border-indigo-500'
                        : 'border-gray-300 active:border-indigo-400 active:bg-indigo-50'
                    }`}
                    aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {task.completed && (
                      <Check size={13} className="text-white" strokeWidth={3} />
                    )}
                  </button>

                  {/* Title */}
                  <p
                    className={`flex-1 text-base leading-snug ${
                      task.completed ? 'line-through text-gray-400' : 'text-gray-800'
                    }`}
                  >
                    {task.title}
                  </p>

                  {/* Delete */}
                  <button
                    onClick={() => deleteResearchTask(item.id, task.id)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-300 active:text-red-400 active:bg-red-50 transition-colors shrink-0"
                    aria-label="Delete research task"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add input — sticks to bottom */}
        <div className="px-5 pt-3 pb-8 border-t border-gray-100 shrink-0 bg-white">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              ref={inputRef}
              className="input flex-1 text-base h-12 rounded-xl"
              placeholder="Add research task…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="btn-primary h-12 px-4 rounded-xl"
            >
              <Plus size={20} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Sortable task card ───────────────────────────────────────────────────────

function SortableTask({
  item,
  rank,
  onDone,
  onUndoDone,
  onBacklog,
  onOpenResearch,
  isDraggingActive,
}: {
  item: IvyLeeItem;
  rank: number;
  onDone: () => void;
  onUndoDone: () => void;
  onBacklog: () => void;
  onOpenResearch: () => void;
  isDraggingActive: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: item.status === 'done' });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  const isDone = item.status === 'done';
  const tasks = item.researchTasks ?? [];
  const completedResearch = tasks.filter((t) => t.completed).length;
  const hasResearch = tasks.length > 0;

  const rankColors = [
    'bg-blue-600 text-white',
    'bg-blue-500 text-white',
    'bg-blue-400 text-white',
    'bg-slate-400 text-white',
    'bg-slate-300 text-slate-700',
    'bg-slate-200 text-slate-600',
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-3 bg-white rounded-2xl border transition-colors ${
        isDone
          ? 'border-gray-100 bg-gray-50'
          : isDraggingActive
          ? 'border-gray-200'
          : 'border-gray-200'
      }`}
    >
      {/* Drag handle */}
      <button
        className={`shrink-0 touch-none flex items-center justify-center w-8 h-10 rounded-lg transition-colors ${
          isDone
            ? 'text-gray-200 cursor-default'
            : 'text-gray-300 active:text-gray-500 active:bg-gray-100'
        }`}
        {...(isDone ? {} : { ...attributes, ...listeners })}
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <GripVertical size={20} />
      </button>

      {/* Rank badge */}
      <span
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
          isDone ? 'bg-green-100 text-green-600' : (rankColors[rank] ?? rankColors[5])
        }`}
      >
        {isDone ? <Check size={13} strokeWidth={3} /> : rank + 1}
      </span>

      {/* Tappable title area → opens research sheet */}
      <button
        onClick={onOpenResearch}
        className="flex-1 flex flex-col items-start text-left min-w-0 py-1"
      >
        <p
          className={`text-base leading-snug w-full ${
            isDone ? 'line-through text-gray-400' : 'text-gray-900 font-medium'
          }`}
        >
          {item.title}
        </p>

        {/* Research progress pill — only shown when tasks exist */}
        {hasResearch && (
          <span
            className={`inline-flex items-center gap-1 mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              completedResearch === tasks.length
                ? 'bg-green-100 text-green-600'
                : 'bg-indigo-50 text-indigo-500'
            }`}
          >
            <ClipboardList size={11} />
            {completedResearch}/{tasks.length} research
          </span>
        )}
      </button>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        {isDone ? (
          <button
            onClick={onUndoDone}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 active:bg-gray-100 transition-colors"
            aria-label="Undo done"
          >
            <RotateCcw size={17} />
          </button>
        ) : (
          <>
            <button
              onClick={onDone}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-green-500 active:bg-green-50 transition-colors"
              aria-label="Mark done"
            >
              <Check size={21} strokeWidth={2.5} />
            </button>
            <button
              onClick={onBacklog}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 active:bg-gray-100 transition-colors"
              aria-label="Move to backlog"
            >
              <Archive size={17} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Drag overlay ghost ───────────────────────────────────────────────────────

function DragGhost({ item, rank }: { item: IvyLeeItem; rank: number }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 bg-white rounded-2xl border border-blue-300 shadow-2xl">
      <span className="shrink-0 w-8 h-10 flex items-center justify-center text-blue-400">
        <GripVertical size={20} />
      </span>
      <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
        {rank + 1}
      </span>
      <p className="flex-1 text-base font-medium text-gray-900 truncate">{item.title}</p>
    </div>
  );
}

// ─── Backlog row ──────────────────────────────────────────────────────────────

function BacklogRow({
  item,
  canRestore,
  onRestore,
  onDelete,
}: {
  item: IvyLeeItem;
  canRestore: boolean;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const tasks = item.researchTasks ?? [];
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-600 leading-snug">{item.title}</p>
        {tasks.length > 0 && (
          <span className="inline-flex items-center gap-1 mt-1 text-xs text-gray-400">
            <ClipboardList size={10} />
            {tasks.filter((t) => t.completed).length}/{tasks.length} research
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onRestore}
          disabled={!canRestore}
          className={`h-9 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            canRestore
              ? 'bg-blue-50 text-blue-600 active:bg-blue-100'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          }`}
          title={canRestore ? 'Move back to list' : 'List is full (6 items)'}
        >
          <RotateCcw size={13} /> Add back
        </button>
        <button
          onClick={onDelete}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-red-400 active:bg-red-50 transition-colors"
          aria-label="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function IvyLee() {
  const {
    addItem,
    reorderItems,
    markDone,
    undoDone,
    moveToBacklog,
    restoreFromBacklog,
    deleteItem,
    clearDoneItems,
    getListItems,
    getBacklogItems,
  } = useIvyLeeStore();

  const listItems = getListItems();
  const backlogItems = getBacklogItems();
  const activeItems = listItems.filter((i) => i.status === 'active');
  const doneItems = listItems.filter((i) => i.status === 'done');
  const canAdd = listItems.length < 6;

  const [input, setInput] = useState('');
  const [backlogOpen, setBacklogOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [researchItem, setResearchItem] = useState<IvyLeeItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  // Keep researchItem in sync with store changes (so the modal reflects updates live)
  useEffect(() => {
    if (!researchItem) return;
    const updated = [...listItems, ...backlogItems].find((i) => i.id === researchItem.id);
    if (updated) setResearchItem(updated);
  }, [listItems, backlogItems]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !canAdd) return;
    addItem(input.trim());
    setInput('');
    inputRef.current?.focus();
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = activeItems.map((i) => i.id);
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    reorderItems([...arrayMove(ids, oldIdx, newIdx), ...doneItems.map((i) => i.id)]);
  }

  const activeDragItem = activeDragId ? listItems.find((i) => i.id === activeDragId) ?? null : null;
  const activeDragRank = activeDragItem ? activeItems.indexOf(activeDragItem) : 0;

  const allDone = listItems.length === 6 && doneItems.length === 6;
  const progress = listItems.length > 0 ? (doneItems.length / listItems.length) * 100 : 0;

  return (
    <>
      <div className="flex flex-col min-h-screen bg-gray-50">
        {/* Header */}
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">Ivy Lee Method</h1>
              <p className="text-sm text-gray-500">6 priorities. One at a time.</p>
            </div>
          </div>

          {listItems.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>{doneItems.length} of {listItems.length} done</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* All-done celebration */}
        {allDone && (
          <div className="mx-4 mb-4 p-4 rounded-2xl bg-green-50 border border-green-200 text-center">
            <p className="text-2xl mb-1">🎉</p>
            <p className="font-bold text-green-800">All 6 done!</p>
            <p className="text-sm text-green-600 mt-0.5">Outstanding work. Ready for tomorrow?</p>
            <button
              className="mt-3 btn-primary bg-green-600 hover:bg-green-700 focus:ring-green-500 w-full justify-center"
              onClick={clearDoneItems}
            >
              Clear & plan tomorrow
            </button>
          </div>
        )}

        {/* Priority list */}
        <div className="px-4 flex-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={activeItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {activeItems.map((item, idx) => (
                  <SortableTask
                    key={item.id}
                    item={item}
                    rank={idx}
                    isDraggingActive={activeDragId !== null}
                    onDone={() => markDone(item.id)}
                    onUndoDone={() => undoDone(item.id)}
                    onBacklog={() => moveToBacklog(item.id)}
                    onOpenResearch={() => setResearchItem(item)}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
              {activeDragItem && <DragGhost item={activeDragItem} rank={activeDragRank} />}
            </DragOverlay>
          </DndContext>

          {/* Done items */}
          {doneItems.length > 0 && (
            <div className="space-y-2 mt-2">
              {doneItems.map((item) => (
                <SortableTask
                  key={item.id}
                  item={item}
                  rank={listItems.indexOf(item)}
                  isDraggingActive={false}
                  onDone={() => markDone(item.id)}
                  onUndoDone={() => undoDone(item.id)}
                  onBacklog={() => moveToBacklog(item.id)}
                  onOpenResearch={() => setResearchItem(item)}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {listItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-semibold text-gray-700">No priorities yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Add up to 6 tasks below. Tap a task to add research notes.
              </p>
            </div>
          )}

          {/* Empty slot indicators */}
          {listItems.length > 0 && listItems.length < 6 && (
            <div className="space-y-2 mt-2">
              {Array.from({ length: 6 - listItems.length }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-3 rounded-2xl border border-dashed border-gray-200"
                >
                  <span className="shrink-0 w-8 h-10" />
                  <span className="shrink-0 w-7 h-7 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-300 font-bold">
                    {listItems.length + i + 1}
                  </span>
                  <span className="text-sm text-gray-300 italic">Empty slot</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sticky add-task input */}
        <div className="sticky bottom-0 px-4 pt-3 pb-4 bg-gray-50 border-t border-gray-200">
          {canAdd ? (
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                ref={inputRef}
                className="input flex-1 text-base h-12 rounded-xl"
                placeholder={`Add priority ${listItems.length + 1}…`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="btn-primary h-12 px-4 rounded-xl"
              >
                <Plus size={20} />
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-2 h-12 rounded-xl bg-blue-50 border border-blue-100">
              <Check size={16} className="text-blue-500" />
              <p className="text-sm font-semibold text-blue-600">All 6 priorities set</p>
            </div>
          )}
        </div>

        {/* Backlog accordion */}
        <div className="px-4 pb-8">
          <button
            onClick={() => setBacklogOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white border border-gray-200 active:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Archive size={16} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-600">Backlog</span>
              {backlogItems.length > 0 && (
                <span className="badge bg-gray-100 text-gray-500 font-semibold">
                  {backlogItems.length}
                </span>
              )}
            </div>
            {backlogOpen ? (
              <ChevronUp size={18} className="text-gray-400" />
            ) : (
              <ChevronDown size={18} className="text-gray-400" />
            )}
          </button>

          {backlogOpen && (
            <div className="mt-2 space-y-2">
              {backlogItems.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">No items in backlog</p>
              ) : (
                backlogItems.map((item) => (
                  <BacklogRow
                    key={item.id}
                    item={item}
                    canRestore={listItems.length < 6}
                    onRestore={() => restoreFromBacklog(item.id)}
                    onDelete={() => deleteItem(item.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Research modal */}
      {researchItem && (
        <ResearchModal item={researchItem} onClose={() => setResearchItem(null)} />
      )}
    </>
  );
}
