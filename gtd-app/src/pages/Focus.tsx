import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Timer,
  Play,
  Pause,
  Square,
  Plus,
  Check,
  Coffee,
  RotateCcw,
  Users,
  LifeBuoy,
  Gift,
  Inbox,
  ExternalLink,
} from 'lucide-react';
import { remainingMs, useFocusStore, type ActiveTimer } from '../store/focusStore';
import { activeForDay, useDailyStore } from '../store/dailyStore';
import { useGTDStore } from '../store/gtdStore';
import { usePrefsStore } from '../store/prefsStore';
import { useNow, useToday } from '../hooks/useNow';
import {
  captureToInbox,
  completeNextAction,
  completePriority,
  startBreak,
  startFocus,
  stopTimer,
} from '../lib/tasks';
import { formatClock, isoToDayKey, minutesToLabel } from '../lib/dates';
import { requestNotifications, unlockAudio } from '../lib/sound';

const DURATIONS = [2, 5, 10, 15, 25, 45];

function Ring({ fraction, children, tone }: { fraction: number; children: React.ReactNode; tone: string }) {
  const r = 108;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-64 h-64 mx-auto">
      <svg viewBox="0 0 240 240" className="w-full h-full -rotate-90">
        <circle cx="120" cy="120" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle
          cx="120"
          cy="120"
          r={r}
          fill="none"
          className={tone}
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          style={{ transition: 'stroke-dashoffset 0.9s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">{children}</div>
    </div>
  );
}

// ─── Running / finished timer ─────────────────────────────────────────────────

function RunningTimer({ timer }: { timer: ActiveTimer }) {
  const navigate = useNavigate();
  const { pause, resume, addMinutes, incrementParked, dismiss } = useFocusStore();
  const dailyItem = useDailyStore((s) => s.items.find((i) => i.id === timer.dailyItemId));
  const { coworkingUrl } = usePrefsStore();
  const now = useNow(timer.finished || timer.pausedAt ? 0 : 1000);
  const [parkInput, setParkInput] = useState('');
  const [parkedFlash, setParkedFlash] = useState(false);

  const left = remainingMs(timer, now);
  const fraction = timer.finished ? 1 : 1 - left / timer.durationMs;
  const isBreak = timer.mode === 'break';
  const minutes = Math.round(timer.durationMs / 60000);

  function park(e: React.FormEvent) {
    e.preventDefault();
    if (!parkInput.trim()) return;
    captureToInbox(parkInput);
    incrementParked();
    setParkInput('');
    setParkedFlash(true);
    setTimeout(() => setParkedFlash(false), 1500);
  }

  function markTaskDone() {
    if (timer.dailyItemId) completePriority(timer.dailyItemId);
    else if (timer.gtdItemId) completeNextAction(timer.gtdItemId);
    dismiss();
    navigate('/gtd-ivy-lee');
  }

  if (timer.finished) {
    return (
      <div className="text-center space-y-5">
        <Ring fraction={1} tone={isBreak ? 'text-teal-500' : 'text-green-500'}>
          <p className="text-5xl">{isBreak ? '☕' : '🎉'}</p>
          <p className="font-bold text-gray-900 mt-2">{isBreak ? 'Break over' : `${minutes} minutes done`}</p>
          {!isBreak && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{timer.title}</p>}
        </Ring>
        {!isBreak ? (
          <>
            <p className="text-sm text-gray-500">
              You started — that was the hard part. What next?
              {timer.parked > 0 && ` (${timer.parked} thought${timer.parked !== 1 ? 's' : ''} parked in your Inbox.)`}
            </p>
            <div className="grid gap-2">
              {(timer.dailyItemId || timer.gtdItemId) && (
                <button className="btn h-12 justify-center bg-green-600 text-white hover:bg-green-700" onClick={markTaskDone}>
                  <Check size={18} /> Task finished!
                </button>
              )}
              <button
                className="btn-primary h-12 justify-center"
                onClick={() => startFocus({ title: timer.title, minutes, dailyItemId: timer.dailyItemId, gtdItemId: timer.gtdItemId })}
              >
                <RotateCcw size={17} /> Keep going — another {minutes} min
              </button>
              <button className="btn-secondary h-12 justify-center" onClick={() => startBreak(5)}>
                <Coffee size={17} /> Take a 5-minute break
              </button>
              <button className="btn-ghost h-11 justify-center" onClick={dismiss}>
                Stop for now
              </button>
            </div>
          </>
        ) : (
          <div className="grid gap-2">
            <button
              className="btn-primary h-12 justify-center"
              onClick={() => {
                const last = useFocusStore.getState().sessions.at(-1);
                if (last) startFocus({ title: last.title, minutes: last.plannedMinutes, dailyItemId: last.dailyItemId, gtdItemId: last.gtdItemId });
                else dismiss();
              }}
            >
              <Play size={17} /> Another round
            </button>
            <button className="btn-ghost h-11 justify-center" onClick={dismiss}>
              Done for now
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Ring fraction={fraction} tone={isBreak ? 'text-teal-500' : 'text-blue-600'}>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {timer.pausedAt ? 'Paused' : isBreak ? 'Break' : 'Focus'}
        </p>
        <p className="text-6xl font-bold text-gray-900 tabular-nums mt-1">{formatClock(left)}</p>
        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{isBreak ? 'Stand up, stretch, drink water' : timer.title}</p>
      </Ring>

      {!isBreak && dailyItem?.firstStep && (
        <p className="text-center text-sm text-gray-600">
          <span className="font-semibold">First step:</span> {dailyItem.firstStep}
        </p>
      )}
      {!isBreak && dailyItem?.treat && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-pink-50 border border-pink-100 text-sm text-pink-800">
          <Gift size={16} className="shrink-0" />
          <span>
            Treat time: <b>{dailyItem.treat}</b> — enjoy it now, only while you work on this.
          </span>
        </div>
      )}

      <div className="flex gap-2 justify-center">
        {timer.pausedAt ? (
          <button className="btn-primary h-12 px-6" onClick={resume}>
            <Play size={18} /> Resume
          </button>
        ) : (
          <button className="btn-secondary h-12 px-6" onClick={pause}>
            <Pause size={18} /> Pause
          </button>
        )}
        <button className="btn-secondary h-12 px-4" onClick={() => addMinutes(5)} aria-label="Add 5 minutes">
          <Plus size={16} /> 5
        </button>
        <button className="btn-ghost h-12 px-4 text-red-500 hover:bg-red-50" onClick={stopTimer}>
          <Square size={16} /> Stop
        </button>
      </div>

      {!isBreak && (
        <>
          <form onSubmit={park} className="card p-3">
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
              <Inbox size={13} /> Parking lot — capture a stray thought and get back to it
            </p>
            <div className="flex gap-2">
              <input
                className="input h-11 text-base flex-1"
                placeholder="Remember to…"
                value={parkInput}
                onChange={(e) => setParkInput(e.target.value)}
              />
              <button className="btn-secondary h-11" disabled={!parkInput.trim()}>
                {parkedFlash ? <Check size={16} className="text-green-600" /> : 'Park'}
              </button>
            </div>
            {timer.parked > 0 && (
              <p className="text-xs text-gray-400 mt-1.5">{timer.parked} parked in your Inbox for later.</p>
            )}
          </form>
          <div className="flex gap-2 justify-center">
            {timer.dailyItemId && (
              <Link to={`/unstuck?daily=${timer.dailyItemId}`} className="btn-ghost text-xs">
                <LifeBuoy size={14} /> I'm stuck
              </Link>
            )}
            {coworkingUrl && (
              <a href={coworkingUrl} target="_blank" rel="noreferrer" className="btn-ghost text-xs">
                <Users size={14} /> Co-working room <ExternalLink size={11} />
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

function FocusSetup() {
  const [params] = useSearchParams();
  const today = useToday();
  const daily = useDailyStore((s) => s.items);
  const gtdItems = useGTDStore((s) => s.items);
  const sessions = useFocusStore((s) => s.sessions);
  const { defaultFocusMinutes, coworkingUrl } = usePrefsStore();

  const priorities = activeForDay(daily, today);
  const nextActions = gtdItems.filter(
    (i) => i.status === 'next-action' && !priorities.some((p) => p.gtdItemId === i.id)
  );

  const initialMinutes = Number(params.get('min')) || defaultFocusMinutes;
  const initialTarget = params.get('daily')
    ? `d:${params.get('daily')}`
    : params.get('gtd')
    ? `g:${params.get('gtd')}`
    : priorities[0]
    ? `d:${priorities[0].id}`
    : 'custom';

  const [target, setTarget] = useState(initialTarget);
  const [custom, setCustom] = useState('');
  const [minutes, setMinutes] = useState(initialMinutes);

  const selectedDaily = target.startsWith('d:') ? daily.find((d) => d.id === target.slice(2)) : undefined;
  const selectedGtd = target.startsWith('g:') ? gtdItems.find((g) => g.id === target.slice(2)) : undefined;
  const title = selectedDaily?.title ?? selectedGtd?.title ?? custom.trim();

  const todaySessions = useMemo(
    () => sessions.filter((s) => isoToDayKey(s.startedAt) === today),
    [sessions, today]
  );
  const todayMinutes = todaySessions.reduce((n, s) => n + s.focusedMinutes, 0);

  function begin() {
    if (!title) return;
    unlockAudio();
    requestNotifications();
    startFocus({
      title,
      minutes,
      dailyItemId: selectedDaily?.id,
      gtdItemId: selectedDaily?.gtdItemId ?? selectedGtd?.id,
    });
  }

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Work on</p>
        {priorities.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {priorities.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setTarget(`d:${p.id}`)}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left ${
                  target === `d:${p.id}` ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-gray-900 flex-1">
                  {p.isFrog && '🐸 '}
                  {p.title}
                </span>
              </button>
            ))}
          </div>
        )}
        <select
          className="input h-11"
          value={target.startsWith('g:') ? target : target === 'custom' ? 'custom' : ''}
          onChange={(e) => e.target.value && setTarget(e.target.value)}
        >
          <option value="">{priorities.length ? 'Or another Next Action…' : 'Pick a Next Action…'}</option>
          {nextActions.map((a) => (
            <option key={a.id} value={`g:${a.id}`}>
              {a.title}
            </option>
          ))}
          <option value="custom">Something else…</option>
        </select>
        {target === 'custom' && (
          <input
            className="input h-11 mt-2 text-base"
            placeholder="What will you work on?"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            autoFocus
          />
        )}
        {selectedDaily?.firstStep && (
          <p className="text-sm text-gray-600 mt-3">
            <span className="font-semibold">First step:</span> {selectedDaily.firstStep}
          </p>
        )}
        {selectedDaily?.treat && (
          <p className="text-sm text-pink-700 mt-1 flex items-center gap-1">
            <Gift size={14} /> Treat: {selectedDaily.treat}
          </p>
        )}
      </div>

      <div className="card p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">For just…</p>
        <p className="text-xs text-gray-500 mb-3">
          Starting is the hardest part. Commit to a short block — you can stop when it ends.
        </p>
        <div className="grid grid-cols-6 gap-1.5">
          {DURATIONS.map((m) => (
            <button
              key={m}
              onClick={() => setMinutes(m)}
              className={`h-11 rounded-xl text-sm font-semibold border ${
                minutes === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 mt-2 text-xs text-gray-500">
          Custom
          <input
            type="number"
            min={1}
            max={180}
            inputMode="numeric"
            className="input w-20 h-9"
            value={minutes}
            onChange={(e) => setMinutes(Math.min(180, Math.max(1, Number(e.target.value) || 1)))}
          />
          minutes
        </label>
      </div>

      <button className="btn-primary w-full h-14 text-base justify-center rounded-2xl" onClick={begin} disabled={!title}>
        <Play size={20} /> Start {minutes} minutes
      </button>

      {coworkingUrl && (
        <a href={coworkingUrl} target="_blank" rel="noreferrer" className="btn-secondary w-full justify-center">
          <Users size={16} /> Work alongside someone (co-working room) <ExternalLink size={12} />
        </a>
      )}

      {todaySessions.length > 0 && (
        <p className="text-center text-sm text-gray-500">
          Today: {todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''} ·{' '}
          {minutesToLabel(todayMinutes)} focused
        </p>
      )}
    </div>
  );
}

export default function Focus() {
  const active = useFocusStore((s) => s.active);
  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <Timer size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Focus</h1>
          <p className="text-sm text-gray-500">One task. A short timer. Just start.</p>
        </div>
      </div>
      {active ? <RunningTimer timer={active} /> : <FocusSetup />}
    </div>
  );
}
