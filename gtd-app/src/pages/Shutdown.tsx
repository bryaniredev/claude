import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Moon,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Trophy,
  Inbox,
  Heart,
  ListChecks,
  Target,
  ArrowUp,
  ArrowDown,
  X,
  Share2,
} from 'lucide-react';
import { useDailyStore, itemsForDay, activeForDay, DAILY_LIMIT } from '../store/dailyStore';
import { useGTDStore } from '../store/gtdStore';
import { useProgressStore } from '../store/progressStore';
import { usePrefsStore } from '../store/prefsStore';
import { useToday } from '../hooks/useNow';
import {
  captureToInbox,
  planNewPriority,
  priorityToSomeday,
  unplanPriority,
} from '../lib/tasks';
import { daysOnList } from '../lib/selectors';
import { isoToDayKey, prettyDay, shiftDay } from '../lib/dates';
import { reportText, shareText } from '../lib/share';
import NextActionPicker from '../components/NextActionPicker';

type Fate = 'tomorrow' | 'next-actions' | 'someday';

const STEPS = [
  { key: 'wins', title: "Today's wins", icon: Trophy },
  { key: 'unfinished', title: 'Unfinished', icon: ListChecks },
  { key: 'forgive', title: 'Let it go', icon: Heart },
  { key: 'capture', title: 'Clear your head', icon: Inbox },
  { key: 'tomorrow', title: "Tomorrow's six", icon: Moon },
  { key: 'first-move', title: 'Plan the first move', icon: Target },
] as const;

const FORGIVE_CHIPS = [
  'I did what I could today.',
  'Tomorrow is a fresh start.',
  'Progress, not perfection.',
  "Rest is part of the work — I'm allowed to stop.",
];

export default function Shutdown() {
  const today = useToday();
  const tomorrow = shiftDay(today, 1);
  const daily = useDailyStore((s) => s.items);
  const days = useDailyStore((s) => s.days);
  const { moveToDate, reorder, toggleFrog, updateItem, completeShutdown } = useDailyStore();
  const gtdItems = useGTDStore((s) => s.items);
  const { wins, addWin } = useProgressStore();
  const partnerName = usePrefsStore((s) => s.partnerName);

  const [stepIdx, setStepIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const [fates, setFates] = useState<Record<string, Fate>>({});
  const [winInput, setWinInput] = useState('');
  const [forgiveness, setForgiveness] = useState(days[today]?.forgiveness ?? '');
  const [captureInput, setCaptureInput] = useState('');
  const [captured, setCaptured] = useState<string[]>([]);
  const [newPriority, setNewPriority] = useState('');
  const [picker, setPicker] = useState(false);
  const [toast, setToast] = useState('');

  const todays = itemsForDay(daily, today);
  const doneToday = todays.filter((i) => i.status === 'done');
  const unfinished = todays.filter((i) => i.status === 'active');
  const otherDone = gtdItems.filter(
    (g) =>
      g.status === 'done' &&
      g.completedAt &&
      isoToDayKey(g.completedAt) === today &&
      !doneToday.some((d) => d.gtdItemId === g.id)
  );
  const winsToday = wins.filter((w) => w.date === today);
  const tomorrows = activeForDay(daily, tomorrow);
  const first = tomorrows[0];
  const inboxCount = gtdItems.filter((g) => g.status === 'inbox').length;
  const alreadyDone = Boolean(days[today]?.shutdownAt);

  function applyFates() {
    for (const item of unfinished) {
      const fate = fates[item.id] ?? 'tomorrow';
      if (fate === 'tomorrow') moveToDate(item.id, tomorrow);
      if (fate === 'next-actions') unplanPriority(item.id);
      if (fate === 'someday') priorityToSomeday(item.id);
    }
  }

  function next() {
    if (STEPS[stepIdx].key === 'unfinished') applyFates();
    if (stepIdx < STEPS.length - 1) setStepIdx(stepIdx + 1);
    else {
      completeShutdown(today, forgiveness.trim());
      setFinished(true);
    }
  }

  function move(id: string, dir: -1 | 1) {
    const ids = tomorrows.map((t) => t.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder(tomorrow, ids);
  }

  async function share() {
    const result = await shareText(reportText(itemsForDay(useDailyStore.getState().items, today), today, partnerName));
    if (result === 'copied') {
      setToast('Report copied');
      setTimeout(() => setToast(''), 2000);
    }
  }

  if (finished) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10 text-center">
        <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-5">
          <Moon size={36} className="text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Shutdown complete</h1>
        <p className="text-gray-500 mt-2">
          Tomorrow is planned. Your #1 is ready. Now switch off — work is done for today.
        </p>
        {first && (
          <div className="card p-4 mt-6 text-left">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tomorrow you start with</p>
            <p className="font-semibold text-gray-900 mt-1">
              {first.isFrog && '🐸 '}
              {first.title}
            </p>
            {first.firstStep && <p className="text-sm text-gray-500 mt-0.5">First step: {first.firstStep}</p>}
          </div>
        )}
        <div className="flex flex-col gap-2 mt-6">
          <button className="btn-secondary justify-center" onClick={share}>
            <Share2 size={16} /> Send today's report{partnerName ? ` to ${partnerName}` : ''}
          </button>
          <Link to="/" className="btn-primary justify-center">
            Back to Dashboard
          </Link>
        </div>
        {toast && <p className="text-sm text-green-600 mt-3">{toast}</p>}
      </div>
    );
  }

  const step = STEPS[stepIdx];
  const StepIcon = step.icon;

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-28">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <Moon size={20} className="text-indigo-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Evening Shutdown</h1>
          <p className="text-sm text-gray-500">
            {alreadyDone ? 'Already done today — run it again any time.' : 'Close today. Set up tomorrow. ~5 minutes.'}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1 mb-5">
        {STEPS.map((s, i) => (
          <div key={s.key} className={`h-1.5 flex-1 rounded-full ${i <= stepIdx ? 'bg-indigo-500' : 'bg-gray-200'}`} />
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <StepIcon size={20} className="text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900">{step.title}</h2>
          <span className="ml-auto text-xs text-gray-400">
            {stepIdx + 1}/{STEPS.length}
          </span>
        </div>

        {step.key === 'wins' && (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              Seeing your progress is the biggest everyday motivator. Look what you got done.
            </p>
            {doneToday.length + otherDone.length + winsToday.length === 0 ? (
              <p className="text-sm text-gray-400 italic mb-3">
                Nothing ticked off yet — that's OK. Did anything go well, however small?
              </p>
            ) : (
              <ul className="space-y-1.5 mb-3">
                {doneToday.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 text-sm text-gray-800">
                    <Check size={15} className="text-green-500 shrink-0" />
                    {d.isFrog && '🐸'} {d.title}
                    <span className="badge bg-blue-50 text-blue-600 ml-auto">priority</span>
                  </li>
                ))}
                {otherDone.map((g) => (
                  <li key={g.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check size={15} className="text-green-500 shrink-0" /> {g.title}
                  </li>
                ))}
                {winsToday.map((w) => (
                  <li key={w.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <Trophy size={14} className="text-amber-500 shrink-0" /> {w.text}
                  </li>
                ))}
              </ul>
            )}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!winInput.trim()) return;
                addWin(winInput.trim());
                setWinInput('');
              }}
            >
              <input
                className="input h-11 text-base flex-1"
                placeholder="Add a win (a hard call, a good conversation…)"
                value={winInput}
                onChange={(e) => setWinInput(e.target.value)}
              />
              <button className="btn-secondary h-11" disabled={!winInput.trim()} aria-label="Add win">
                <Plus size={16} />
              </button>
            </form>
          </div>
        )}

        {step.key === 'unfinished' && (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              Ivy Lee rule: unfinished priorities move to tomorrow. Or send them back to your lists.
            </p>
            {unfinished.length === 0 ? (
              <p className="text-sm text-green-700 bg-green-50 rounded-xl p-3">Everything's done. 🎉</p>
            ) : (
              <ul className="space-y-3">
                {unfinished.map((item) => {
                  const fate = fates[item.id] ?? 'tomorrow';
                  const stuckDays = daysOnList(item, today);
                  return (
                    <li key={item.id}>
                      <p className="text-sm font-medium text-gray-900">
                        {item.isFrog && '🐸 '}
                        {item.title}
                      </p>
                      {stuckDays >= 3 && (
                        <p className="text-xs text-amber-700 mt-0.5">
                          On your list {stuckDays} days —{' '}
                          <Link to={`/unstuck?daily=${item.id}`} className="underline">
                            get unstuck
                          </Link>{' '}
                          or let it go.
                        </p>
                      )}
                      <div className="flex p-0.5 bg-gray-100 rounded-lg mt-1.5">
                        {(
                          [
                            ['tomorrow', 'Tomorrow'],
                            ['next-actions', 'Next Actions'],
                            ['someday', 'Someday'],
                          ] as const
                        ).map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => setFates((f) => ({ ...f, [item.id]: key }))}
                            className={`flex-1 h-9 rounded-md text-xs font-semibold ${
                              fate === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {step.key === 'forgive' && (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              Didn't get to everything? Note it and forgive yourself. People who forgive themselves for
              procrastinating tend to procrastinate less next time — guilt just makes the task feel worse.
            </p>
            <textarea
              className="textarea h-28 text-base"
              placeholder="What didn't go to plan — and what you'll tell yourself about it."
              value={forgiveness}
              onChange={(e) => setForgiveness(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {FORGIVE_CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForgiveness((f) => (f ? `${f.trim()} ${c}` : c))}
                  className="badge bg-rose-50 text-rose-700 py-1.5 px-3 text-xs"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {step.key === 'capture' && (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              Anything still rattling around your head? Dump it in the Inbox so you can stop thinking about it.
              {inboxCount > 0 && ` (${inboxCount} item${inboxCount !== 1 ? 's' : ''} waiting to be clarified.)`}
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!captureInput.trim()) return;
                captureToInbox(captureInput);
                setCaptured((c) => [...c, captureInput.trim()]);
                setCaptureInput('');
              }}
            >
              <input
                className="input h-11 text-base flex-1"
                placeholder="On my mind…"
                value={captureInput}
                onChange={(e) => setCaptureInput(e.target.value)}
                autoFocus
              />
              <button className="btn-secondary h-11" disabled={!captureInput.trim()} aria-label="Capture">
                <Plus size={16} />
              </button>
            </form>
            {captured.length > 0 && (
              <ul className="mt-2 space-y-1">
                {captured.map((c, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                    <Inbox size={13} className="text-blue-400" /> {c}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step.key === 'tomorrow' && (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              Write down the six most important things for {prettyDay(tomorrow).toLowerCase()}, in order. Mark
              the one you're dreading as the frog 🐸 — it goes first.
            </p>
            {tomorrows.length === 0 ? (
              <p className="text-sm text-gray-400 italic mb-3">Nothing planned yet.</p>
            ) : (
              <ul className="space-y-1.5 mb-3">
                {tomorrows.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-1.5 p-2 rounded-xl border border-gray-200 bg-white">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 min-w-0 text-sm text-gray-800 leading-snug">{t.title}</span>
                    <button
                      onClick={() => toggleFrog(t.id)}
                      className={`w-8 h-8 rounded-lg text-base ${t.isFrog ? 'bg-green-100' : 'opacity-30 grayscale'}`}
                      aria-label={t.isFrog ? 'Unmark frog' : 'Mark as frog'}
                      aria-pressed={Boolean(t.isFrog)}
                    >
                      🐸
                    </button>
                    <button onClick={() => move(t.id, -1)} disabled={i === 0} className="w-8 h-8 rounded-lg text-gray-400 disabled:opacity-20 flex items-center justify-center" aria-label="Move up">
                      <ArrowUp size={15} />
                    </button>
                    <button onClick={() => move(t.id, 1)} disabled={i === tomorrows.length - 1} className="w-8 h-8 rounded-lg text-gray-400 disabled:opacity-20 flex items-center justify-center" aria-label="Move down">
                      <ArrowDown size={15} />
                    </button>
                    <button onClick={() => unplanPriority(t.id)} className="w-8 h-8 rounded-lg text-gray-300 flex items-center justify-center" aria-label="Remove">
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {tomorrows.length < DAILY_LIMIT ? (
              <div className="space-y-2">
                <button className="btn-secondary w-full justify-center h-11" onClick={() => setPicker(true)}>
                  <Inbox size={16} /> Pick from Next Actions
                </button>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newPriority.trim() && planNewPriority(newPriority.trim(), tomorrow)) setNewPriority('');
                  }}
                >
                  <input
                    className="input h-11 text-base flex-1"
                    placeholder={`Or type priority ${tomorrows.length + 1}…`}
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                  />
                  <button className="btn-primary h-11" disabled={!newPriority.trim()} aria-label="Add priority">
                    <Plus size={16} />
                  </button>
                </form>
              </div>
            ) : (
              <p className="text-sm text-indigo-700 bg-indigo-50 rounded-xl p-3 text-center font-medium">All six set.</p>
            )}
          </div>
        )}

        {step.key === 'first-move' && (
          <div>
            {!first ? (
              <p className="text-sm text-gray-500">No priorities for tomorrow yet — go back a step to add some.</p>
            ) : (
              <div key={first.id} className="space-y-3">
                <p className="text-sm text-gray-500">
                  Decide now exactly when, where and how you'll start #1. If-then plans are one of the
                  best-tested ways to beat procrastination.
                </p>
                <p className="font-semibold text-gray-900">
                  {first.isFrog && '🐸 '}
                  {first.title}
                </p>
                <label className="block">
                  <span className="text-xs text-gray-500">When & where</span>
                  <input
                    className="input h-11 mt-1 text-base"
                    placeholder="e.g. 8:30, at my desk, before email"
                    defaultValue={first.whenWhere}
                    onBlur={(e) => updateItem(first.id, { whenWhere: e.target.value || undefined })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">First physical step</span>
                  <input
                    className="input h-11 mt-1 text-base"
                    placeholder="e.g. Open the file and write the title"
                    defaultValue={first.firstStep}
                    onBlur={(e) => updateItem(first.id, { firstStep: e.target.value || undefined })}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs text-gray-500">If…</span>
                    <input
                      className="input h-11 mt-1 text-base"
                      placeholder="I want to check my phone"
                      defaultValue={first.ifObstacle}
                      onBlur={(e) => updateItem(first.id, { ifObstacle: e.target.value || undefined })}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500">…then I'll</span>
                    <input
                      className="input h-11 mt-1 text-base"
                      placeholder="start a 5-minute timer"
                      defaultValue={first.thenResponse}
                      onBlur={(e) => updateItem(first.id, { thenResponse: e.target.value || undefined })}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 inset-x-0 lg:left-64 bg-gray-50/95 backdrop-blur border-t border-gray-200 px-4 py-3 z-20">
        <div className="max-w-xl mx-auto flex gap-2">
          {stepIdx > 0 && (
            <button className="btn-secondary h-12" onClick={() => setStepIdx(stepIdx - 1)}>
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <button className="btn-primary flex-1 h-12 justify-center bg-indigo-600 hover:bg-indigo-700" onClick={next}>
            {stepIdx === STEPS.length - 1 ? (
              <>
                <Check size={17} /> Shutdown complete
              </>
            ) : (
              <>
                Next <ChevronRight size={17} />
              </>
            )}
          </button>
        </div>
      </div>

      {picker && <NextActionPicker date={tomorrow} onClose={() => setPicker(false)} />}
    </div>
  );
}
