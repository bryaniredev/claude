import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Timer,
  LifeBuoy,
  Star,
  Clock,
  Trash2,
  ArrowRightCircle,
  Undo2,
  Gift,
  Target,
  CalendarClock,
  Check,
} from 'lucide-react';
import BottomSheet from './BottomSheet';
import { useDailyStore, type DailyItem } from '../store/dailyStore';
import { useGTDStore } from '../store/gtdStore';
import { useHorizonsStore } from '../store/horizonsStore';
import { usePrefsStore } from '../store/prefsStore';
import {
  completePriority,
  priorityToSomeday,
  priorityToWaiting,
  renamePriority,
  setPriorityEstimate,
  startFocus,
  trashPriority,
  undoPriority,
  unplanPriority,
} from '../lib/tasks';
import { goalForGtdItem, daysOnList } from '../lib/selectors';
import { minutesToLabel, todayKey, tomorrowKey } from '../lib/dates';

const ESTIMATES = [5, 15, 30, 45, 60, 90, 120];

export default function PriorityDetailSheet({
  itemId,
  onClose,
}: {
  itemId: string;
  onClose: () => void;
}) {
  const item = useDailyStore((s) => s.items.find((i) => i.id === itemId));
  if (!item) return null;
  return <PriorityDetail key={item.id} item={item} onClose={onClose} />;
}

function PriorityDetail({ item, onClose }: { item: DailyItem; onClose: () => void }) {
  const navigate = useNavigate();
  const { updateItem, toggleFrog, moveToDate } = useDailyStore();
  const gtdItems = useGTDStore((s) => s.items);
  const projects = useGTDStore((s) => s.projects);
  const goals = useHorizonsStore((s) => s.goals);
  const defaultMinutes = usePrefsStore((s) => s.defaultFocusMinutes);
  const { project, goal } = goalForGtdItem(item.gtdItemId, gtdItems, projects, goals);

  const [title, setTitle] = useState(item.title);
  const [delegate, setDelegate] = useState('');
  const [showDelegate, setShowDelegate] = useState(false);

  const isDone = item.status === 'done';
  const onList = daysOnList(item);

  function field(key: keyof DailyItem, value: string) {
    updateItem(item.id, { [key]: value || undefined } as Partial<DailyItem>);
  }

  function go(path: string) {
    onClose();
    navigate(path);
  }

  return (
    <BottomSheet
      eyebrow={isDone ? 'Completed priority' : 'Priority'}
      title={
        <input
          className="w-full font-bold text-lg text-gray-900 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg -mx-1 px-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => renamePriority(item.id, title)}
          aria-label="Priority title"
        />
      }
      onClose={onClose}
      footer={
        isDone ? (
          <button className="btn-secondary w-full justify-center h-12" onClick={() => undoPriority(item.id)}>
            <Undo2 size={16} /> Mark not done
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              className="btn-primary flex-1 justify-center h-12"
              onClick={() => {
                startFocus({ title: item.title, minutes: defaultMinutes, dailyItemId: item.id, gtdItemId: item.gtdItemId });
                go('/focus');
              }}
            >
              <Timer size={18} /> Start {defaultMinutes} min
            </button>
            <button
              className="btn-secondary h-12 px-3"
              onClick={() => go(`/unstuck?daily=${item.id}`)}
              aria-label="I'm stuck"
            >
              <LifeBuoy size={18} /> Stuck
            </button>
            <button
              className="btn h-12 px-3 bg-green-600 text-white hover:bg-green-700"
              onClick={() => {
                completePriority(item.id);
                onClose();
              }}
              aria-label="Mark done"
            >
              <Check size={18} />
            </button>
          </div>
        )
      }
    >
      <div className="space-y-5">
        {(goal || project) && (
          <div className="flex flex-wrap gap-2">
            {goal && (
              <span className="badge bg-emerald-50 text-emerald-700 gap-1">
                <Target size={12} /> Moves goal: {goal.title}
              </span>
            )}
            {project && (
              <span className="badge bg-purple-50 text-purple-700">Project: {project.title}</span>
            )}
          </div>
        )}

        {!isDone && onList >= 3 && (
          <button
            onClick={() => go(`/unstuck?daily=${item.id}`)}
            className="w-full text-left p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800"
          >
            <span className="font-semibold">On your list {onList} days.</span> That usually means
            it's unclear, too big, or not worth doing. Tap to get unstuck →
          </button>
        )}

        {/* If-then plan */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            If-then plan
          </p>
          <div className="space-y-2">
            <label className="block">
              <span className="text-xs text-gray-500">When & where will you start?</span>
              <input
                className="input mt-1 h-11 text-base"
                placeholder="e.g. At 9:00, at my desk, after coffee"
                defaultValue={item.whenWhere}
                onBlur={(e) => field('whenWhere', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">The very first physical step</span>
              <input
                className="input mt-1 h-11 text-base"
                placeholder="e.g. Open the doc and write one sentence"
                defaultValue={item.firstStep}
                onBlur={(e) => field('firstStep', e.target.value)}
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs text-gray-500">If… (likely obstacle)</span>
                <input
                  className="input mt-1 h-11 text-base"
                  placeholder="I feel like avoiding it"
                  defaultValue={item.ifObstacle}
                  onBlur={(e) => field('ifObstacle', e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">…then I will</span>
                <input
                  className="input mt-1 h-11 text-base"
                  placeholder="start a 5-minute timer"
                  defaultValue={item.thenResponse}
                  onBlur={(e) => field('thenResponse', e.target.value)}
                />
              </label>
            </div>
          </div>
        </section>

        {/* Frog + treat */}
        <section className="grid grid-cols-1 gap-2">
          {!isDone && (
            <button
              onClick={() => toggleFrog(item.id)}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                item.isFrog ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'
              }`}
            >
              <span className="text-2xl" aria-hidden>🐸</span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-gray-900">
                  {item.isFrog ? "This is today's frog" : 'Make this the frog'}
                </span>
                <span className="block text-xs text-gray-500">
                  The task you're dreading most. It moves to #1 so you do it first.
                </span>
              </span>
            </button>
          )}
          <label className="block">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Gift size={12} /> Treat pairing — something you only enjoy while doing this
            </span>
            <input
              className="input mt-1 h-11 text-base"
              placeholder="e.g. My favourite podcast, a fancy coffee"
              defaultValue={item.treat}
              onBlur={(e) => field('treat', e.target.value)}
            />
          </label>
        </section>

        {/* Time */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Time</p>
          <p className="text-xs text-gray-500 mb-1.5">Estimate</p>
          <div className="flex flex-wrap gap-1.5">
            {ESTIMATES.map((m) => (
              <button
                key={m}
                onClick={() => setPriorityEstimate(item.id, item.estimateMinutes === m ? undefined : m)}
                className={`h-9 px-3 rounded-lg text-sm font-medium border ${
                  item.estimateMinutes === m
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {minutesToLabel(m)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <label className="block">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <CalendarClock size={12} /> Time block start
              </span>
              <input
                type="time"
                step={900}
                className="input mt-1 h-11 text-base"
                value={item.blockStart ?? ''}
                onChange={(e) => field('blockStart', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock size={12} /> Actual minutes
              </span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                className="input mt-1 h-11 text-base"
                placeholder="from focus"
                value={item.actualMinutes ?? ''}
                onChange={(e) =>
                  updateItem(item.id, {
                    actualMinutes: e.target.value ? Math.max(0, Number(e.target.value)) : undefined,
                  })
                }
              />
            </label>
          </div>
          {item.estimateMinutes && item.actualMinutes ? (
            <p className="text-xs text-gray-500 mt-2">
              Estimated {minutesToLabel(item.estimateMinutes)}, took {minutesToLabel(item.actualMinutes)}
              {item.actualMinutes > item.estimateMinutes * 1.2 && ' — normal! Most people underestimate.'}
            </p>
          ) : null}
        </section>

        {/* Move */}
        {!isDone && (
          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Move</p>
            <div className="grid grid-cols-2 gap-2">
              {item.date !== tomorrowKey() && (
                <button
                  className="btn-secondary justify-center"
                  onClick={() => {
                    moveToDate(item.id, tomorrowKey());
                    onClose();
                  }}
                >
                  <ArrowRightCircle size={15} /> Tomorrow
                </button>
              )}
              {item.date !== todayKey() && (
                <button
                  className="btn-secondary justify-center"
                  onClick={() => {
                    moveToDate(item.id, todayKey());
                    onClose();
                  }}
                >
                  <ArrowRightCircle size={15} /> Today
                </button>
              )}
              <button
                className="btn-secondary justify-center"
                onClick={() => {
                  unplanPriority(item.id);
                  onClose();
                }}
              >
                <Undo2 size={15} /> Next Actions
              </button>
              <button
                className="btn-secondary justify-center"
                onClick={() => {
                  priorityToSomeday(item.id);
                  onClose();
                }}
              >
                <Star size={15} /> Someday
              </button>
              <button className="btn-secondary justify-center" onClick={() => setShowDelegate((v) => !v)}>
                <Clock size={15} /> Delegate
              </button>
              <button
                className="btn-ghost justify-center text-red-500 hover:bg-red-50"
                onClick={() => {
                  if (confirm('Move this to the trash?')) {
                    trashPriority(item.id);
                    onClose();
                  }
                }}
              >
                <Trash2 size={15} /> Trash
              </button>
            </div>
            {showDelegate && (
              <form
                className="flex gap-2 mt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!delegate.trim()) return;
                  priorityToWaiting(item.id, delegate.trim());
                  onClose();
                }}
              >
                <input
                  className="input flex-1 h-11 text-base"
                  placeholder="Delegate to…"
                  value={delegate}
                  onChange={(e) => setDelegate(e.target.value)}
                  autoFocus
                />
                <button className="btn-primary h-11" disabled={!delegate.trim()}>
                  Waiting For
                </button>
              </form>
            )}
          </section>
        )}
      </div>
    </BottomSheet>
  );
}
