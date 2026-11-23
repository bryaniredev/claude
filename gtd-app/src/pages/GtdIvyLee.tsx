import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Check,
  Plus,
  ListChecks,
  Timer,
  LifeBuoy,
  Share2,
  Flame,
  List,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Moon,
  Target,
  RotateCcw,
  Inbox,
  Gift,
} from 'lucide-react';
import { useDailyStore, DAILY_LIMIT, itemsForDay, type DailyItem } from '../store/dailyStore';
import { useGTDStore } from '../store/gtdStore';
import { useHorizonsStore } from '../store/horizonsStore';
import { usePrefsStore } from '../store/prefsStore';
import { useToday } from '../hooks/useNow';
import { completePriority, planNewPriority, startFocus, undoPriority } from '../lib/tasks';
import { daysOnList, goalForGtdItem, priorityStreak } from '../lib/selectors';
import { hhmmLabel, minutesToLabel, shiftDay, todayKey } from '../lib/dates';
import { planText, shareText } from '../lib/share';
import PriorityDetailSheet from '../components/PriorityDetailSheet';
import NextActionPicker from '../components/NextActionPicker';
import DayTimeline from '../components/DayTimeline';

const RANK_COLORS = [
  'bg-blue-600 text-white',
  'bg-blue-500 text-white',
  'bg-blue-400 text-white',
  'bg-slate-400 text-white',
  'bg-slate-300 text-slate-700',
  'bg-slate-200 text-slate-600',
];

// ─── Priority card ────────────────────────────────────────────────────────────

function PriorityCard({
  item,
  rank,
  goalTitle,
  onOpen,
}: {
  item: DailyItem;
  rank: number;
  goalTitle?: string;
  onOpen: () => void;
}) {
  const isDone = item.status === 'done';
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: isDone,
  });
  const onList = daysOnList(item);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className={`flex items-center gap-2 px-2 py-2.5 rounded-2xl border ${
        isDone ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'
      } ${isDragging ? 'shadow-xl border-blue-300 relative z-10' : ''}`}
    >
      <button
        className={`shrink-0 touch-none flex items-center justify-center w-7 h-10 rounded-lg ${
          isDone ? 'text-gray-200 cursor-default' : 'text-gray-300 active:text-gray-500 active:bg-gray-100'
        }`}
        {...(isDone ? {} : { ...attributes, ...listeners })}
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <GripVertical size={18} />
      </button>

      <span
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
          isDone ? 'bg-green-100 text-green-600' : RANK_COLORS[rank] ?? RANK_COLORS[5]
        }`}
      >
        {isDone ? <Check size={13} strokeWidth={3} /> : rank + 1}
      </span>

      <button onClick={onOpen} className="flex-1 min-w-0 text-left py-0.5">
        <p
          className={`text-base leading-snug ${
            isDone ? 'line-through text-gray-400' : 'text-gray-900 font-medium'
          }`}
        >
          {item.isFrog && <span aria-label="Frog">🐸 </span>}
          {item.title}
        </p>
        <div className="flex flex-wrap gap-1 mt-1">
          {item.blockStart && (
            <span className="badge bg-blue-50 text-blue-600 gap-1 px-2">
              <CalendarClock size={10} /> {hhmmLabel(item.blockStart)}
            </span>
          )}
          {item.estimateMinutes && (
            <span className="badge bg-gray-100 text-gray-500 px-2">
              {isDone && item.actualMinutes
                ? `${minutesToLabel(item.estimateMinutes)} est · ${minutesToLabel(item.actualMinutes)} actual`
                : minutesToLabel(item.estimateMinutes)}
            </span>
          )}
          {(item.whenWhere || item.firstStep) && !isDone && (
            <span className="badge bg-indigo-50 text-indigo-600 px-2">if-then ✓</span>
          )}
          {item.treat && !isDone && (
            <span className="badge bg-pink-50 text-pink-600 gap-1 px-2">
              <Gift size={10} /> treat
            </span>
          )}
          {goalTitle && (
            <span className="badge bg-emerald-50 text-emerald-700 gap-1 px-2 max-w-[11rem] truncate">
              <Target size={10} className="shrink-0" /> {goalTitle}
            </span>
          )}
          {!isDone && onList >= 3 && (
            <span className="badge bg-amber-100 text-amber-700 px-2">{onList} days on list</span>
          )}
        </div>
      </button>

      {isDone ? (
        <button
          onClick={() => undoPriority(item.id)}
          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-gray-400 active:bg-gray-100"
          aria-label="Undo done"
        >
          <RotateCcw size={17} />
        </button>
      ) : (
        <button
          onClick={() => completePriority(item.id)}
          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-green-500 active:bg-green-50"
          aria-label="Mark done"
        >
          <Check size={21} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GtdIvyLee() {
  const navigate = useNavigate();
  const today = useToday();
  const tomorrow = shiftDay(today, 1);
  const { items: daily, days, reorder } = useDailyStore();
  const gtdItems = useGTDStore((s) => s.items);
  const projects = useGTDStore((s) => s.projects);
  const goals = useHorizonsStore((s) => s.goals);
  const { defaultFocusMinutes, streakWeekdays, partnerName } = usePrefsStore();

  // Deep links (used by the Guide): ?view=timeline, ?open=<id>, ?pick=1
  const [params] = useSearchParams();
  const [view, setView] = useState<'list' | 'timeline'>(params.get('view') === 'timeline' ? 'timeline' : 'list');
  const [input, setInput] = useState('');
  const [openId, setOpenId] = useState<string | null>(params.get('open'));
  const [pickerDate, setPickerDate] = useState<string | null>(params.get('pick') === '1' ? todayKey() : null);
  const [showTomorrow, setShowTomorrow] = useState(false);
  const [toast, setToast] = useState('');

  const todays = itemsForDay(daily, today);
  const active = todays.filter((i) => i.status === 'active');
  const done = todays.filter((i) => i.status === 'done');
  const tomorrows = itemsForDay(daily, tomorrow);
  const canAdd = todays.length < DAILY_LIMIT;
  const overLimit = todays.length > DAILY_LIMIT;
  const carried = active.filter((i) => i.firstPlannedDate < today).length;
  const progress = todays.length ? (done.length / todays.length) * 100 : 0;
  const streak = priorityStreak(daily, days, streakWeekdays, today);
  const top = active[0];
  const shutdownDone = Boolean(days[today]?.shutdownAt);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  function goalTitle(item: DailyItem) {
    return goalForGtdItem(item.gtdItemId, gtdItems, projects, goals).goal?.title;
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    if (planNewPriority(input.trim(), today)) setInput('');
  }

  function handleDragEnd({ active: a, over }: DragEndEvent) {
    if (!over || a.id === over.id) return;
    const ids = active.map((i) => i.id);
    const from = ids.indexOf(a.id as string);
    const to = ids.indexOf(over.id as string);
    if (from === -1 || to === -1) return;
    reorder(today, arrayMove(ids, from, to));
  }

  async function handleShare() {
    const result = await shareText(planText(todays, today, partnerName));
    if (result === 'copied') flash('Copied — paste it to your accountability partner');
    if (result === 'failed') flash("Couldn't share on this device");
  }

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function startTop() {
    if (!top) return;
    startFocus({ title: top.title, minutes: defaultFocusMinutes, dailyItemId: top.id, gtdItemId: top.gtdItemId });
    navigate('/focus');
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col">
        {/* Header */}
        <div className="px-4 pt-6 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <ListChecks size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">GTD Ivy Lee</h1>
              <p className="text-sm text-gray-500">6 priorities from your GTD system. One at a time.</p>
            </div>
            {streak.current > 0 && (
              <Link
                to="/progress"
                className="badge bg-orange-100 text-orange-700 gap-1 text-sm px-2.5 py-1 shrink-0"
                title="Priority streak"
              >
                <Flame size={14} /> {streak.current}
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <div className="flex p-1 bg-gray-200/70 rounded-xl flex-1">
              {(
                [
                  ['list', 'List', List],
                  ['timeline', 'Timeline', CalendarClock],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={`flex-1 h-9 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 ${
                    view === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
            <button
              className="btn-secondary h-11 px-3"
              onClick={handleShare}
              disabled={!todays.length}
              aria-label="Share today's plan"
              title="Share with an accountability partner"
            >
              <Share2 size={16} />
            </button>
          </div>

          {todays.length > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>
                  {done.length} of {todays.length} done
                </span>
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

        <div className="px-4 space-y-3 flex-1 pb-4">
          {/* Notices */}
          {carried > 0 && (
            <p className="text-xs text-gray-500 bg-white border border-gray-200 rounded-xl px-3 py-2">
              ↻ {carried} unfinished priorit{carried === 1 ? 'y' : 'ies'} rolled forward from earlier days
              — the Ivy Lee rule.
            </p>
          )}
          {overLimit && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              {todays.length} priorities today — Ivy Lee caps it at {DAILY_LIMIT}. Open one and send it
              back to Next Actions or to tomorrow.
            </p>
          )}

          {/* Up next */}
          {top && view === 'list' && (
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                {top.isFrog ? '🐸 Eat the frog first' : 'Up next — work on this until it’s done'}
              </p>
              <button onClick={() => setOpenId(top.id)} className="text-left w-full">
                <p className="text-xl font-bold leading-snug mt-1">{top.title}</p>
                {top.firstStep ? (
                  <p className="text-sm text-blue-100 mt-1">First step: {top.firstStep}</p>
                ) : (
                  <p className="text-sm text-blue-200 mt-1 underline decoration-dotted">
                    Add a first step & if-then plan →
                  </p>
                )}
                {top.whenWhere && <p className="text-xs text-blue-200 mt-0.5">When: {top.whenWhere}</p>}
                {top.ifObstacle && top.thenResponse && (
                  <p className="text-xs text-blue-200 mt-0.5">
                    If {top.ifObstacle}, then {top.thenResponse}.
                  </p>
                )}
              </button>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={startTop}
                  className="flex-1 h-11 rounded-xl bg-white text-blue-700 font-semibold text-sm flex items-center justify-center gap-1.5 active:bg-blue-50"
                >
                  <Timer size={17} /> Start {defaultFocusMinutes} min
                </button>
                <button
                  onClick={() => navigate(`/unstuck?daily=${top.id}`)}
                  className="h-11 px-3 rounded-xl bg-white/15 text-white font-semibold text-sm flex items-center gap-1.5 active:bg-white/25"
                >
                  <LifeBuoy size={16} /> I'm stuck
                </button>
              </div>
            </div>
          )}

          {view === 'timeline' ? (
            <DayTimeline date={today} items={todays} isToday onOpen={setOpenId} />
          ) : (
            <>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={active.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {active.map((item, idx) => (
                      <PriorityCard
                        key={item.id}
                        item={item}
                        rank={idx}
                        goalTitle={goalTitle(item)}
                        onOpen={() => setOpenId(item.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {done.length > 0 && (
                <div className="space-y-2">
                  {done.map((item, idx) => (
                    <PriorityCard
                      key={item.id}
                      item={item}
                      rank={active.length + idx}
                      goalTitle={goalTitle(item)}
                      onOpen={() => setOpenId(item.id)}
                    />
                  ))}
                </div>
              )}

              {todays.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="font-semibold text-gray-700">No priorities for today</p>
                  <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
                    Pick up to six from your Next Actions, most important first. Best done the evening
                    before, in the shutdown.
                  </p>
                  <button className="btn-primary mt-4" onClick={() => setPickerDate(today)}>
                    <Inbox size={16} /> Pick from Next Actions
                  </button>
                </div>
              )}

              {todays.length > 0 && todays.length < DAILY_LIMIT && (
                <div className="space-y-2">
                  {Array.from({ length: DAILY_LIMIT - todays.length }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPickerDate(today)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl border border-dashed border-gray-200 text-left active:bg-white"
                    >
                      <span className="shrink-0 w-7" />
                      <span className="shrink-0 w-7 h-7 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-300 font-bold">
                        {todays.length + i + 1}
                      </span>
                      <span className="text-sm text-gray-300 italic">Empty slot — tap to pick</span>
                    </button>
                  ))}
                </div>
              )}

              {todays.length > 0 && active.length === 0 && (
                <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-center">
                  <p className="text-2xl mb-1">🎉</p>
                  <p className="font-bold text-green-800">All done for today!</p>
                  <p className="text-sm text-green-600 mt-0.5">Close the loop and set up tomorrow.</p>
                  <Link to="/shutdown" className="btn-primary mt-3 bg-green-600 hover:bg-green-700 w-full justify-center">
                    <Moon size={16} /> Evening shutdown
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Tomorrow */}
          <div className="pt-2">
            <button
              onClick={() => setShowTomorrow((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white border border-gray-200"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                <Moon size={16} className="text-indigo-400" /> Tomorrow
                {tomorrows.length > 0 && (
                  <span className="badge bg-indigo-50 text-indigo-600">{tomorrows.length} planned</span>
                )}
              </span>
              {showTomorrow ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>
            {showTomorrow && (
              <div className="mt-2 space-y-1.5">
                {tomorrows.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => setOpenId(t.id)}
                    className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-gray-100 text-sm text-gray-700"
                  >
                    <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    {t.isFrog && '🐸'} {t.title}
                  </button>
                ))}
                <div className="flex gap-2">
                  <Link to="/shutdown" className="btn-secondary flex-1 justify-center">
                    <Moon size={15} /> {shutdownDone ? 'Shutdown done ✓' : 'Evening shutdown'}
                  </Link>
                  <button
                    className="btn-secondary"
                    onClick={() => setPickerDate(tomorrow)}
                    disabled={tomorrows.length >= DAILY_LIMIT}
                  >
                    <Plus size={15} /> Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky add bar */}
        <div className="sticky bottom-0 px-4 pt-3 pb-4 bg-gray-50 border-t border-gray-200">
          {canAdd ? (
            <form onSubmit={handleAdd} className="flex gap-2">
              <button
                type="button"
                onClick={() => setPickerDate(today)}
                className="btn-secondary h-12 px-3 rounded-xl"
                aria-label="Pick from Next Actions"
                title="Pick from Next Actions"
              >
                <Inbox size={18} />
              </button>
              <input
                className="input flex-1 text-base h-12 rounded-xl"
                placeholder={`Add priority ${todays.length + 1}…`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" disabled={!input.trim()} className="btn-primary h-12 px-4 rounded-xl" aria-label="Add">
                <Plus size={20} />
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-2 h-12 rounded-xl bg-blue-50 border border-blue-100">
              <Check size={16} className="text-blue-500" />
              <p className="text-sm font-semibold text-blue-600">All {DAILY_LIMIT} priorities set</p>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-gray-900 text-white text-sm shadow-lg">
          {toast}
        </div>
      )}
      {openId && <PriorityDetailSheet itemId={openId} onClose={() => setOpenId(null)} />}
      {pickerDate && <NextActionPicker date={pickerDate} onClose={() => setPickerDate(null)} />}
    </div>
  );
}
