import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  TrendingUp,
  Flame,
  Trophy,
  Check,
  Star,
  FolderKanban,
  Trash2,
  Plus,
  Wrench,
  LifeBuoy,
  Undo2,
  Coffee,
} from 'lucide-react';
import { useDailyStore } from '../store/dailyStore';
import { useGTDStore } from '../store/gtdStore';
import { useFocusStore } from '../store/focusStore';
import { useProgressStore, type StuckReason } from '../store/progressStore';
import { usePrefsStore } from '../store/prefsStore';
import { useToday } from '../hooks/useNow';
import {
  daysOnList,
  doneEntries,
  estimateAccuracy,
  priorityStreak,
  stuckItems,
} from '../lib/selectors';
import { canRepair, repairAvailable } from '../lib/streaks';
import { isoToDayKey, minutesToLabel, prettyDay, shiftDay } from '../lib/dates';
import { priorityToSomeday, unplanPriority } from '../lib/tasks';
import { STUCK_REASONS } from '../lib/stuck';
import { HabitList } from '../components/Habits';
import { Columns, DataTable, DayHeatmap, RankedBars, StatTile } from '../components/ProgressCharts';

type Tab = 'overview' | 'done' | 'habits' | 'insights';
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'done', label: 'Done list' },
  { key: 'habits', label: 'Habits' },
  { key: 'insights', label: 'Insights' },
];

// ─── Overview ─────────────────────────────────────────────────────────────────

function Overview({ today }: { today: string }) {
  const { items: daily, days, repairs, repairStreak, setRest } = useDailyStore();
  const sessions = useFocusStore((s) => s.sessions);
  const streakWeekdays = usePrefsStore((s) => s.streakWeekdays);
  const streak = priorityStreak(daily, days, streakWeekdays, today);
  const repairable = streak.repairHelps && canRepair(streak.brokenOn, today) && repairAvailable(repairs, today);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of daily) if (i.status === 'done' && i.completedAt) {
      const k = isoToDayKey(i.completedAt);
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [daily]);
  const rest = new Set(Object.values(days).filter((d) => d.rest).map((d) => d.date));

  const week = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6));
  const weekSet = new Set(week);
  const doneThisWeek = week.reduce((n, d) => n + (counts[d] ?? 0), 0);
  const frogsThisWeek = daily.filter(
    (i) => i.isFrog && i.status === 'done' && i.completedAt && weekSet.has(isoToDayKey(i.completedAt))
  ).length;
  const focusByDay = week.map((d) => ({
    key: d,
    label: d === today ? 'Today' : format(parseISO(d), 'EEE'),
    value: sessions.filter((s) => isoToDayKey(s.startedAt) === d).reduce((n, s) => n + s.focusedMinutes, 0),
  }));
  const focusWeek = focusByDay.reduce((n, d) => n + d.value, 0);
  const shutdowns = week.filter((d) => days[d]?.shutdownAt).length;
  const restToday = Boolean(days[today]?.rest);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatTile
          label="Priority streak"
          value={
            <span className="flex items-center gap-1">
              <Flame size={20} className={streak.current ? 'text-orange-500' : 'text-gray-300'} />
              {streak.current}
            </span>
          }
          sub={`best ${streak.best} day${streak.best !== 1 ? 's' : ''}`}
        />
        <StatTile label="Priorities done" value={doneThisWeek} sub="last 7 days" />
        <StatTile label="Focused" value={minutesToLabel(focusWeek)} sub="last 7 days" />
        <StatTile label="Frogs eaten 🐸" value={frogsThisWeek} sub={`${shutdowns}/7 evening shutdowns`} />
      </div>

      {repairable && streak.brokenOn && (
        <div className="card p-4 flex items-start gap-3 border-indigo-200 bg-indigo-50">
          <Wrench size={18} className="text-indigo-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-indigo-900">Missed {prettyDay(streak.brokenOn)}? Repair your streak.</p>
            <p className="text-xs text-indigo-700 mt-0.5">
              One repair per week. A broken streak shouldn't cost you your motivation.
            </p>
          </div>
          <button className="btn-primary bg-indigo-600 hover:bg-indigo-700 h-9 px-3 text-xs" onClick={() => repairStreak(today, streak.brokenOn!)}>
            Repair
          </button>
        </div>
      )}

      <div className="card p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Priorities completed per day</p>
            <p className="text-xs text-gray-400">Last 6 weeks · R = rest day</p>
          </div>
          <button
            className={`h-8 px-2.5 rounded-lg text-xs font-semibold border flex items-center gap-1 ${
              restToday ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'
            }`}
            onClick={() => setRest(today, !restToday)}
            aria-pressed={restToday}
          >
            <Coffee size={12} /> {restToday ? 'Rest day ✓' : 'Rest today'}
          </button>
        </div>
        <DayHeatmap counts={counts} rest={rest} today={today} />
        <p className="text-xs text-gray-400 mt-3">
          Your streak counts {streakWeekdays.length === 7 ? 'every day' : 'the days chosen in Settings'}; other days and rest days never
          break it.
        </p>
      </div>

      <div className="card p-4">
        <p className="font-semibold text-gray-900 text-sm">Focus minutes</p>
        <p className="text-xs text-gray-400 mb-3">Last 7 days</p>
        <Columns data={focusByDay} unit="min focused" highlight={today} />
        <DataTable caption="Focus minutes per day" rows={focusByDay.map((d) => [d.label, Math.round(d.value)])} />
      </div>
    </div>
  );
}

// ─── Done list ────────────────────────────────────────────────────────────────

function DoneList({ today }: { today: string }) {
  const gtdItems = useGTDStore((s) => s.items);
  const projects = useGTDStore((s) => s.projects);
  const daily = useDailyStore((s) => s.items);
  const { wins, addWin, deleteWin } = useProgressStore();
  const [input, setInput] = useState('');
  const [limit, setLimit] = useState(14);

  const entries = useMemo(() => doneEntries(gtdItems, projects, daily, wins), [gtdItems, projects, daily, wins]);
  const byDay = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const e of entries) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  return (
    <div className="space-y-4">
      <form
        className="card p-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          addWin(input.trim(), today);
          setInput('');
        }}
      >
        <input
          className="input h-11 text-base flex-1"
          placeholder="Log a win — anything that moved you forward"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn-primary h-11" disabled={!input.trim()} aria-label="Add win">
          <Plus size={16} />
        </button>
      </form>

      {byDay.length === 0 ? (
        <div className="text-center py-12">
          <Trophy size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nothing here yet</p>
          <p className="text-sm text-gray-400 mt-1">Everything you finish shows up here — so you can see your progress.</p>
        </div>
      ) : (
        byDay.slice(0, limit).map(([day, list]) => (
          <section key={day}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              {prettyDay(day)} · {list.length}
            </p>
            <ul className="card divide-y divide-gray-100">
              {list.map((e) => (
                <li key={e.key} className="flex items-center gap-2.5 px-3 py-2.5">
                  {e.kind === 'priority' ? (
                    <Star size={15} className="text-blue-500 shrink-0" fill="currentColor" />
                  ) : e.kind === 'project' ? (
                    <FolderKanban size={15} className="text-purple-500 shrink-0" />
                  ) : e.kind === 'win' ? (
                    <Trophy size={15} className="text-amber-500 shrink-0" />
                  ) : (
                    <Check size={15} className="text-green-500 shrink-0" />
                  )}
                  <span className="flex-1 min-w-0 text-sm text-gray-800">
                    {e.frog && '🐸 '}
                    {e.title}
                  </span>
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {e.kind === 'priority' ? 'priority' : e.kind === 'project' ? 'project' : e.kind === 'win' ? 'win' : ''}
                  </span>
                  {e.winId && (
                    <button onClick={() => deleteWin(e.winId!)} className="text-gray-300 hover:text-red-500 p-1" aria-label="Delete win">
                      <Trash2 size={13} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      {byDay.length > limit && (
        <button className="btn-secondary w-full justify-center" onClick={() => setLimit((l) => l + 14)}>
          Show older
        </button>
      )}
    </div>
  );
}

// ─── Insights ─────────────────────────────────────────────────────────────────

function Insights({ today }: { today: string }) {
  const daily = useDailyStore((s) => s.items);
  const stuckLog = useProgressStore((s) => s.stuckLog);
  const stuck = stuckItems(daily, today);
  const accuracy = estimateAccuracy(daily);

  const reasonRows = useMemo(() => {
    const counts = new Map<StuckReason, number>();
    stuckLog.forEach((e) => counts.set(e.reason, (counts.get(e.reason) ?? 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([r, n]) => ({ label: `${STUCK_REASONS[r].emoji} ${STUCK_REASONS[r].label}`, value: n }));
  }, [stuckLog]);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="font-semibold text-gray-900 text-sm">Stuck priorities</p>
        <p className="text-xs text-gray-400 mb-3">On your list 3+ days without being finished</p>
        {stuck.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing stuck. 👏</p>
        ) : (
          <ul className="space-y-2">
            {stuck.map((i) => (
              <li key={i.id} className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-sm font-medium text-gray-900">{i.title}</p>
                <p className="text-xs text-amber-700">{daysOnList(i, today)} days on your list</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Link to={`/unstuck?daily=${i.id}`} className="btn-primary h-8 px-2.5 text-xs">
                    <LifeBuoy size={13} /> Get unstuck
                  </Link>
                  <button className="btn-secondary h-8 px-2.5 text-xs" onClick={() => unplanPriority(i.id)}>
                    <Undo2 size={13} /> Back to Next Actions
                  </button>
                  <button className="btn-secondary h-8 px-2.5 text-xs" onClick={() => priorityToSomeday(i.id)}>
                    <Star size={13} /> Someday
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-4">
        <p className="font-semibold text-gray-900 text-sm">Why you get stuck</p>
        <p className="text-xs text-gray-400 mb-3">From the I'm Stuck page — your most common reasons first</p>
        {reasonRows.length === 0 ? (
          <p className="text-sm text-gray-500">
            No data yet. Next time you're avoiding something, tap <Link to="/unstuck" className="text-blue-600">I'm Stuck</Link>.
          </p>
        ) : (
          <>
            <RankedBars rows={reasonRows} />
            {reasonRows[0] && (
              <p className="text-xs text-gray-500 mt-3">
                Most often: <b>{reasonRows[0].label.slice(reasonRows[0].label.indexOf(' ') + 1).toLowerCase()}</b>. Build that
                fix into your if-then plans in advance.
              </p>
            )}
          </>
        )}
      </div>

      <div className="card p-4">
        <p className="font-semibold text-gray-900 text-sm">Estimates vs reality</p>
        <p className="text-xs text-gray-400 mb-3">Completed priorities with an estimate and tracked time</p>
        {!accuracy ? (
          <p className="text-sm text-gray-500">
            Add estimates to priorities and use the Focus timer — you'll see how long things really take.
          </p>
        ) : (
          <>
            <p className="text-4xl font-bold text-gray-900">{accuracy.median.toFixed(1)}×</p>
            <p className="text-sm text-gray-600 mt-1">
              Your tasks typically take <b>{accuracy.median.toFixed(1)}×</b> your estimate (median of {accuracy.count}).
              {accuracy.median > 1.15
                ? ` When planning, multiply your gut estimate by about ${accuracy.median.toFixed(1)}.`
                : accuracy.median < 0.85
                ? ' You tend to overestimate — you have more room than you think.'
                : ' Your estimates are well calibrated.'}
            </p>
            <DataTable
              caption="Estimated vs actual minutes"
              rows={accuracy.samples.slice(-10).map((s) => [s.title, `${s.estimateMinutes} → ${s.actualMinutes} min`])}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Progress() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.key === params.get('tab'))?.key ?? 'overview') as Tab;
  const today = useToday();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <TrendingUp size={20} className="text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progress</h1>
          <p className="text-sm text-gray-500">See how far you've come — it's the best motivator.</p>
        </div>
      </div>

      <div className="flex p-1 bg-gray-200/70 rounded-xl mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setParams(t.key === 'overview' ? {} : { tab: t.key })}
            className={`flex-1 h-9 px-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview today={today} />}
      {tab === 'done' && <DoneList today={today} />}
      {tab === 'habits' && <HabitList />}
      {tab === 'insights' && <Insights today={today} />}
    </div>
  );
}
