import { AlertTriangle, CalendarDays, Wand2, Check } from 'lucide-react';
import { useDailyStore, type DailyItem } from '../store/dailyStore';
import { useGTDStore } from '../store/gtdStore';
import { usePrefsStore } from '../store/prefsStore';
import { useNow } from '../hooks/useNow';
import { hhmmLabel, hhmmToMinutes, minutesToHHMM, minutesToLabel } from '../lib/dates';

const PX_PER_MIN = 1.6;
const MIN_BLOCK_PX = 24;
const DEFAULT_BLOCK = 30;

function duration(i: DailyItem) {
  return i.estimateMinutes ?? DEFAULT_BLOCK;
}

/** Minutes a block occupies on screen (short tasks get a minimum height). */
function visualMinutes(i: DailyItem) {
  return Math.max(duration(i), MIN_BLOCK_PX / PX_PER_MIN);
}

/** Assign side-by-side columns to overlapping blocks. */
function layout(blocks: DailyItem[]) {
  const sorted = [...blocks].sort((a, b) => hhmmToMinutes(a.blockStart!) - hhmmToMinutes(b.blockStart!));
  const colEnds: number[] = [];
  const placed = sorted.map((item) => {
    const start = hhmmToMinutes(item.blockStart!);
    const end = start + visualMinutes(item);
    let col = colEnds.findIndex((e) => e <= start);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(end);
    } else colEnds[col] = end;
    return { item, start, end, col };
  });
  return { placed, cols: Math.max(1, colEnds.length) };
}

export default function DayTimeline({
  date,
  items,
  isToday,
  onOpen,
}: {
  date: string;
  items: DailyItem[];
  isToday: boolean;
  onOpen: (id: string) => void;
}) {
  const updateItem = useDailyStore((s) => s.updateItem);
  const calendarItems = useGTDStore((s) => s.items).filter(
    (i) => i.status === 'calendar' && i.scheduledDate === date
  );
  const { dayStartHour, dayEndHour } = usePrefsStore();
  const now = useNow(60_000);

  const dayStart = dayStartHour * 60;
  const dayEnd = Math.max(dayEndHour * 60, dayStart + 60);
  const nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes();

  const scheduled = items.filter((i) => i.blockStart);
  const unscheduled = items.filter((i) => !i.blockStart && i.status === 'active');
  const { placed, cols } = layout(scheduled);

  // Capacity check — planning fallacy guard.
  const remainingWork = items
    .filter((i) => i.status === 'active')
    .reduce((n, i) => n + duration(i), 0);
  const freeLeft = isToday ? Math.max(0, dayEnd - Math.max(nowMin, dayStart)) : dayEnd - dayStart;
  const over = remainingWork > freeLeft;

  function nextFreeSlot(after: number, len: number, taken: { start: number; end: number }[]) {
    let t = Math.ceil(after / 15) * 15;
    const sorted = [...taken].sort((a, b) => a.start - b.start);
    for (const b of sorted) {
      if (t + len <= b.start) break;
      if (t < b.end) t = Math.ceil(b.end / 15) * 15;
    }
    return t;
  }

  function autoSchedule() {
    const taken = placed.filter((p) => p.item.status === 'active').map((p) => ({ start: p.start, end: p.end }));
    let cursor = isToday ? Math.max(nowMin, dayStart) : dayStart;
    for (const item of unscheduled) {
      const len = duration(item);
      const start = nextFreeSlot(cursor, len, taken);
      if (start + len > 24 * 60) break;
      updateItem(item.id, { blockStart: minutesToHHMM(start) });
      taken.push({ start, end: start + len });
      cursor = start + len;
    }
  }

  const hours: number[] = [];
  for (let h = dayStartHour; h <= Math.max(dayEndHour, dayStartHour + 1); h++) hours.push(h);
  const height = (dayEnd - dayStart) * PX_PER_MIN;

  return (
    <div className="space-y-3">
      {/* Capacity */}
      <div
        className={`p-3 rounded-2xl border text-sm flex items-start gap-2 ${
          over ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-white border-gray-200 text-gray-600'
        }`}
      >
        {over && <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
        <p>
          <b>{minutesToLabel(remainingWork)}</b> of work planned ·{' '}
          <b>{minutesToLabel(freeLeft)}</b> {isToday ? 'left today' : 'in the day'}
          {over && (
            <span className="block text-xs mt-0.5">
              That won't fit — and tasks usually take longer than we think. Move something to tomorrow.
            </span>
          )}
          {!over && items.some((i) => i.status === 'active' && !i.estimateMinutes) && (
            <span className="block text-xs text-gray-400 mt-0.5">
              Items without an estimate count as {DEFAULT_BLOCK} min.
            </span>
          )}
        </p>
      </div>

      {calendarItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {calendarItems.map((c) => (
            <span key={c.id} className="badge bg-red-50 text-red-700 gap-1">
              <CalendarDays size={11} /> {c.title}
            </span>
          ))}
        </div>
      )}

      {/* Unscheduled tray */}
      {unscheduled.length > 0 && (
        <div className="p-3 rounded-2xl bg-white border border-dashed border-gray-300">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Not scheduled ({unscheduled.length})
            </p>
            <button className="btn-ghost h-8 px-2 text-xs text-blue-600" onClick={autoSchedule}>
              <Wand2 size={14} /> Fill next free slots
            </button>
          </div>
          <div className="space-y-1.5">
            {unscheduled.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <button
                  className="flex-1 min-w-0 text-left text-sm text-gray-800 truncate"
                  onClick={() => onOpen(item.id)}
                >
                  {item.isFrog && '🐸 '}
                  {item.title}
                  <span className="text-xs text-gray-400"> · {minutesToLabel(duration(item))}</span>
                </button>
                <input
                  type="time"
                  step={900}
                  aria-label={`Start time for ${item.title}`}
                  className="input w-28 h-9 text-sm"
                  value=""
                  onChange={(e) => e.target.value && updateItem(item.id, { blockStart: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day grid */}
      <div className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="relative ml-12 my-3" style={{ height }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-gray-100"
              style={{ top: (h * 60 - dayStart) * PX_PER_MIN }}
            >
              <span className="absolute -left-12 -top-2 w-10 text-right text-[11px] text-gray-400">
                {hhmmLabel(`${h}:00`)}
              </span>
            </div>
          ))}

          {isToday && nowMin >= dayStart && nowMin <= dayEnd && (
            <div className="absolute left-0 right-0 z-10" style={{ top: (nowMin - dayStart) * PX_PER_MIN }}>
              <div className="h-0.5 bg-red-500" />
              <div className="absolute -left-1.5 -top-1 w-2.5 h-2.5 rounded-full bg-red-500" />
            </div>
          )}

          {placed.map(({ item, start, col }) => {
            const top = Math.max(0, (start - dayStart) * PX_PER_MIN);
            const h = visualMinutes(item) * PX_PER_MIN - 2;
            const done = item.status === 'done';
            return (
              <button
                key={item.id}
                onClick={() => onOpen(item.id)}
                className={`absolute rounded-lg px-2 py-[3px] text-left overflow-hidden border ${
                  done
                    ? 'bg-gray-50 border-gray-200 text-gray-400'
                    : item.isFrog
                    ? 'bg-green-100 border-green-300 text-green-900'
                    : 'bg-blue-100 border-blue-200 text-blue-900'
                }`}
                style={{
                  top,
                  height: h,
                  left: `calc(${(col / cols) * 100}% + 4px)`,
                  width: `calc(${100 / cols}% - 8px)`,
                }}
              >
                <p className={`text-xs font-semibold leading-4 truncate ${done ? 'line-through' : ''}`}>
                  {done && <Check size={11} className="inline mr-0.5" />}
                  {item.isFrog && '🐸 '}
                  {item.title}
                </p>
                {h > 34 && (
                  <p className="text-[11px] opacity-70">
                    {hhmmLabel(item.blockStart!)} · {minutesToLabel(duration(item))}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-gray-400 text-center">
        Tap a block to change its time or estimate. Day hours are set in Settings.
      </p>
    </div>
  );
}
