import { useState } from 'react';
import { Check, Flame, Plus, Trash2, Wrench } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useHabitStore, type Habit, ALL_DAYS } from '../store/habitStore';
import { useToday } from '../hooks/useNow';
import { habitStreak } from '../lib/selectors';
import { canRepair, repairAvailable } from '../lib/streaks';
import { isoToDayKey, prettyDay, shiftDay, weekdayOf } from '../lib/dates';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function HabitRow({ habit, today, compact }: { habit: Habit; today: string; compact?: boolean }) {
  const { toggleCheckIn, deleteHabit, repair } = useHabitStore();
  const streak = habitStreak(habit, today);
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6));
  const scheduledToday = habit.days.includes(weekdayOf(today));
  const doneToday = habit.checkIns.includes(today);
  const repairable =
    streak.repairHelps && canRepair(streak.brokenOn, today) && repairAvailable(habit.repairs, today) && streak.brokenOn;
  const startDay = isoToDayKey(habit.createdAt);

  if (compact) {
    return (
      <button
        onClick={() => toggleCheckIn(habit.id, today)}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left ${
          doneToday ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
        }`}
      >
        <span
          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${
            doneToday ? 'bg-green-500 border-green-500' : 'border-gray-300'
          }`}
        >
          {doneToday && <Check size={14} className="text-white" strokeWidth={3} />}
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block text-sm font-medium ${doneToday ? 'text-green-800' : 'text-gray-900'}`}>{habit.name}</span>
          {habit.cue && <span className="block text-xs text-gray-400 truncate">{habit.cue}</span>}
        </span>
        {streak.current > 0 && (
          <span className="text-xs font-semibold text-orange-600 flex items-center gap-0.5">
            <Flame size={13} /> {streak.current}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{habit.name}</p>
          {habit.cue && <p className="text-xs text-gray-500 mt-0.5">{habit.cue}</p>}
          <p className="text-xs text-gray-400 mt-0.5">
            {habit.days.length === 7 ? 'Every day' : habit.days.map((d) => DAY_LETTERS[d]).join(' ')}
            {!scheduledToday && ' · rest day today'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-gray-900 flex items-center gap-1 justify-end">
            <Flame size={16} className={streak.current ? 'text-orange-500' : 'text-gray-300'} /> {streak.current}
          </p>
          <p className="text-[11px] text-gray-400">best {streak.best}</p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mt-3">
        {week.map((d) => {
          const scheduled = habit.days.includes(weekdayOf(d));
          const done = habit.checkIns.includes(d);
          const rested = habit.rests.includes(d);
          const beforeStart = d < startDay && !done;
          return (
            <button
              key={d}
              onClick={() => toggleCheckIn(habit.id, d)}
              disabled={beforeStart}
              className={`h-11 rounded-lg flex flex-col items-center justify-center text-[11px] border ${
                beforeStart
                  ? 'bg-transparent border-transparent text-gray-300'
                  : done
                  ? 'bg-green-500 border-green-500 text-white'
                  : rested
                  ? 'bg-gray-100 border-gray-200 text-gray-400'
                  : scheduled
                  ? 'bg-white border-gray-200 text-gray-500'
                  : 'bg-gray-50 border-dashed border-gray-200 text-gray-300'
              } ${d === today ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
              aria-label={`${prettyDay(d)}: ${done ? 'done' : rested ? 'rest day' : 'not done'}`}
              aria-pressed={done}
            >
              <span className="font-semibold">{DAY_LETTERS[weekdayOf(d)]}</span>
              {done ? <Check size={12} strokeWidth={3} /> : <span>{format(parseISO(d), 'd')}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-3">
        {repairable && (
          <button
            className="btn-ghost h-9 px-2 text-xs text-indigo-600"
            onClick={() => repair(habit.id, streak.brokenOn!, today)}
          >
            <Wrench size={13} /> Repair streak (missed {prettyDay(streak.brokenOn!)})
          </button>
        )}
        <button
          className="ml-auto btn-ghost h-9 px-2 text-gray-300 hover:text-red-500"
          onClick={() => confirm(`Delete “${habit.name}”?`) && deleteHabit(habit.id)}
          aria-label="Delete habit"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export function HabitList() {
  const habits = useHabitStore((s) => s.habits).filter((h) => !h.archived);
  const addHabit = useHabitStore((s) => s.addHabit);
  const today = useToday();
  const [name, setName] = useState('');
  const [cue, setCue] = useState('');
  const [days, setDays] = useState<number[]>(ALL_DAYS);
  const [open, setOpen] = useState(habits.length === 0);

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Small repeating actions. Streaks are forgiving: unscheduled days never break them, and you can repair one
        missed day a week.
      </p>
      {habits.map((h) => (
        <HabitRow key={h.id} habit={h} today={today} />
      ))}
      {open ? (
        <form
          className="card p-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            addHabit(name.trim(), days, cue.trim());
            setName('');
            setCue('');
            setDays(ALL_DAYS);
            setOpen(false);
          }}
        >
          <input className="input h-11 text-base" placeholder="Habit, e.g. 10 minutes of reading" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <input
            className="input h-11 text-base"
            placeholder="Cue (optional), e.g. After I pour my morning coffee"
            value={cue}
            onChange={(e) => setCue(e.target.value)}
          />
          <div className="grid grid-cols-7 gap-1">
            {DAY_LETTERS.map((l, d) => (
              <button
                type="button"
                key={d}
                onClick={() => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()))}
                className={`h-9 rounded-lg text-xs font-semibold border ${
                  days.includes(d) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-200'
                }`}
                aria-pressed={days.includes(d)}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex gap-2 justify-end pt-1">
            {habits.length > 0 && (
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
                Cancel
              </button>
            )}
            <button className="btn-primary" disabled={!name.trim() || !days.length}>
              <Plus size={16} /> Add habit
            </button>
          </div>
        </form>
      ) : (
        <button className="btn-secondary w-full justify-center" onClick={() => setOpen(true)}>
          <Plus size={16} /> New habit
        </button>
      )}
    </div>
  );
}

/** Today's scheduled habits as quick check-offs (Dashboard). */
export function HabitsToday() {
  const habits = useHabitStore((s) => s.habits);
  const today = useToday();
  const due = habits.filter((h) => !h.archived && h.days.includes(weekdayOf(today)));
  if (!due.length) return null;
  return (
    <div className="space-y-1.5">
      {due.map((h) => (
        <HabitRow key={h.id} habit={h} today={today} compact />
      ))}
    </div>
  );
}
