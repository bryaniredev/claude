import { useState, useRef } from 'react';
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
} from 'lucide-react';
import { useIvyLeeStore, type IvyLeeItem } from '../store/ivyLeeStore';

// ─── Sortable item ────────────────────────────────────────────────────────────

function SortableTask({
  item,
  rank,
  onDone,
  onUndoDone,
  onBacklog,
  isDraggingActive,
}: {
  item: IvyLeeItem;
  rank: number;
  onDone: () => void;
  onUndoDone: () => void;
  onBacklog: () => void;
  isDraggingActive: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: item.status === 'done' });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  const isDone = item.status === 'done';

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
      className={`flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border transition-colors ${
        isDone
          ? 'border-gray-100 bg-gray-50'
          : isDraggingActive
          ? 'border-gray-200'
          : 'border-gray-200 active:border-blue-300'
      }`}
    >
      {/* Drag handle — touch target is the whole grip area */}
      <button
        className={`shrink-0 touch-none flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
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
          isDone ? 'bg-green-100 text-green-600' : rankColors[rank] ?? rankColors[5]
        }`}
      >
        {isDone ? <Check size={13} strokeWidth={3} /> : rank + 1}
      </span>

      {/* Title */}
      <p
        className={`flex-1 text-base leading-snug ${
          isDone ? 'line-through text-gray-400' : 'text-gray-900 font-medium'
        }`}
      >
        {item.title}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
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
              <Check size={20} strokeWidth={2.5} />
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

// ─── Drag overlay (ghost card) ────────────────────────────────────────────────

function DragGhost({ item, rank }: { item: IvyLeeItem; rank: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-blue-300 shadow-xl opacity-95">
      <span className="shrink-0 w-8 h-8 flex items-center justify-center text-blue-400">
        <GripVertical size={20} />
      </span>
      <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
        {rank + 1}
      </span>
      <p className="flex-1 text-base font-medium text-gray-900">{item.title}</p>
    </div>
  );
}

// ─── Backlog item ─────────────────────────────────────────────────────────────

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
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100">
      <p className="flex-1 text-sm text-gray-600 leading-snug">{item.title}</p>
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
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

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

    const activeOnlyIds = activeItems.map((i) => i.id);
    const oldIndex = activeOnlyIds.indexOf(active.id as string);
    const newIndex = activeOnlyIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(activeOnlyIds, oldIndex, newIndex);
    // Done items keep their order slots at the end
    reorderItems([...reordered, ...doneItems.map((i) => i.id)]);
  }

  const activeDragItem = activeDragId
    ? listItems.find((i) => i.id === activeDragId) ?? null
    : null;
  const activeDragRank = activeDragItem ? activeItems.indexOf(activeDragItem) : 0;

  const allDone = listItems.length === 6 && doneItems.length === 6;
  const progress = listItems.length > 0 ? (doneItems.length / listItems.length) * 100 : 0;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-safe">
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

        {/* Progress bar */}
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
          <SortableContext
            items={activeItems.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {/* Active items (draggable) */}
              {activeItems.map((item, idx) => (
                <SortableTask
                  key={item.id}
                  item={item}
                  rank={idx}
                  isDraggingActive={activeDragId !== null}
                  onDone={() => markDone(item.id)}
                  onUndoDone={() => undoDone(item.id)}
                  onBacklog={() => moveToBacklog(item.id)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
            {activeDragItem && (
              <DragGhost item={activeDragItem} rank={activeDragRank} />
            )}
          </DragOverlay>
        </DndContext>

        {/* Done items (non-draggable, shown below active) */}
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
              Add up to 6 tasks below. Work through them in order.
            </p>
          </div>
        )}

        {/* Slot indicators when partially filled */}
        {listItems.length > 0 && listItems.length < 6 && (
          <div className="space-y-2 mt-2">
            {Array.from({ length: 6 - listItems.length }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-dashed border-gray-200"
              >
                <span className="shrink-0 w-8 h-8" />
                <span className="shrink-0 w-7 h-7 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-300 font-bold">
                  {listItems.length + i + 1}
                </span>
                <span className="text-sm text-gray-300 italic">Empty slot</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add task form */}
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
            <p className="text-sm font-semibold text-blue-600">
              All 6 priorities set
            </p>
          </div>
        )}
      </div>

      {/* Backlog accordion */}
      <div className="px-4 pb-6">
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
              <p className="text-center text-sm text-gray-400 py-4">
                No items in backlog
              </p>
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
  );
}
