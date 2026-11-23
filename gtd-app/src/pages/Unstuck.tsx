import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LifeBuoy, ChevronLeft, Play, Star, Clock, Trash2, FolderKanban, Check, ExternalLink, Users } from 'lucide-react';
import { activeForDay, useDailyStore } from '../store/dailyStore';
import { useGTDStore } from '../store/gtdStore';
import { usePrefsStore } from '../store/prefsStore';
import { useProgressStore, type StuckReason } from '../store/progressStore';
import { useToday } from '../hooks/useNow';
import {
  planNextAction,
  priorityToSomeday,
  priorityToWaiting,
  startFocus,
  trashPriority,
} from '../lib/tasks';
import { STUCK_REASONS } from '../lib/stuck';
import WhatNowPicker from '../components/WhatNowPicker';

export default function Unstuck() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const today = useToday();
  const daily = useDailyStore((s) => s.items);
  const updateDaily = useDailyStore((s) => s.updateItem);
  const gtd = useGTDStore();
  const stuckLog = useProgressStore((s) => s.stuckLog);
  const logStuck = useProgressStore((s) => s.logStuck);
  const coworkingUrl = usePrefsStore((s) => s.coworkingUrl);

  const dailyItem = daily.find((d) => d.id === params.get('daily'));
  const gtdId = dailyItem?.gtdItemId ?? params.get('gtd') ?? undefined;
  const gtdItem = gtd.items.find((g) => g.id === gtdId);
  const [customTitle, setCustomTitle] = useState('');
  const title = dailyItem?.title ?? gtdItem?.title ?? customTitle.trim();

  const [reason, setReason] = useState<StuckReason | null>(null);
  const [step, setStep] = useState(dailyItem?.firstStep ?? '');
  const [treat, setTreat] = useState(dailyItem?.treat ?? '');
  const [delegate, setDelegate] = useState('');
  const [savedPlan, setSavedPlan] = useState(false);
  const [madeProject, setMadeProject] = useState(false);

  const priorities = activeForDay(daily, today);
  const patterns = useMemo(() => {
    const counts = new Map<StuckReason, number>();
    stuckLog.forEach((e) => counts.set(e.reason, (counts.get(e.reason) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [stuckLog]);

  function choose(r: StuckReason) {
    setReason(r);
    setSavedPlan(false);
    logStuck(r, title || 'Untitled');
  }

  /** Make sure we have a daily priority to attach notes to (plans a Next Action for today if possible). */
  function ensureDailyId(): string | undefined {
    if (dailyItem) return dailyItem.id;
    if (gtdItem && planNextAction(gtdItem.id, today)) {
      return useDailyStore.getState().items.find((d) => d.gtdItemId === gtdItem.id && d.status === 'active')?.id;
    }
    return undefined;
  }

  function begin(minutes: number, extra?: { firstStep?: string; treat?: string }) {
    const id = extra?.firstStep || extra?.treat ? ensureDailyId() : dailyItem?.id;
    if (id && extra) updateDaily(id, { ...(extra.firstStep && { firstStep: extra.firstStep }), ...(extra.treat && { treat: extra.treat }) });
    startFocus({
      title: extra?.firstStep && !id ? `${title} — ${extra.firstStep}` : title,
      minutes,
      dailyItemId: id,
      gtdItemId: gtdItem?.id,
    });
    navigate('/focus');
  }

  function saveIfThen() {
    if (!reason) return;
    const id = ensureDailyId();
    if (!id) return;
    const meta = STUCK_REASONS[reason];
    updateDaily(id, { ifObstacle: meta.ifText, thenResponse: meta.thenText });
    setSavedPlan(true);
  }

  function makeProject() {
    if (!gtdItem) return;
    const project = gtd.addProject(gtdItem.title, '', `${gtdItem.title} — done`);
    gtd.updateItem(gtdItem.id, { projectId: project.id, ...(step.trim() && { title: step.trim() }) });
    if (dailyItem && step.trim()) updateDaily(dailyItem.id, { title: step.trim(), firstStep: undefined });
    setMadeProject(true);
  }

  function decide(action: 'someday' | 'trash' | 'delegate') {
    if (dailyItem) {
      if (action === 'someday') priorityToSomeday(dailyItem.id);
      if (action === 'trash') trashPriority(dailyItem.id);
      if (action === 'delegate') priorityToWaiting(dailyItem.id, delegate.trim());
    } else if (gtdItem) {
      if (action === 'someday') gtd.moveItem(gtdItem.id, 'someday-maybe');
      if (action === 'trash') gtd.moveItem(gtdItem.id, 'trash');
      if (action === 'delegate')
        gtd.updateItem(gtdItem.id, { status: 'waiting-for', delegatedTo: delegate.trim(), delegatedDate: new Date().toISOString() });
    }
    navigate('/gtd-ivy-lee');
  }

  const meta = reason ? STUCK_REASONS[reason] : null;
  const linked = Boolean(dailyItem || gtdItem);

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
          <LifeBuoy size={20} className="text-rose-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">I'm Stuck</h1>
          <p className="text-sm text-gray-500">It's a feeling, not a flaw. Name it, then shrink it.</p>
        </div>
      </div>

      {/* What are you stuck on? */}
      {!linked ? (
        <div className="card p-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">What are you avoiding?</p>
          {priorities.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {priorities.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setParams({ daily: p.id })}
                  className="w-full text-left p-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 active:bg-gray-50"
                >
                  {p.isFrog && '🐸 '}
                  {p.title}
                </button>
              ))}
            </div>
          )}
          <input
            className="input h-11 text-base"
            placeholder={priorities.length ? 'Or type something else…' : 'Type the task…'}
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
          />
        </div>
      ) : (
        <div className="card p-4 mb-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Stuck on</p>
            <p className="font-semibold text-gray-900 mt-0.5">{title}</p>
          </div>
          <button className="text-xs text-blue-600" onClick={() => { setParams({}); setReason(null); }}>
            Change
          </button>
        </div>
      )}

      {/* Reason or fix */}
      {!meta ? (
        <div className={title ? '' : 'opacity-50 pointer-events-none'}>
          <p className="text-sm font-semibold text-gray-700 mb-2">What's going on, honestly?</p>
          <div className="space-y-2">
            {(Object.keys(STUCK_REASONS) as StuckReason[]).map((r) => (
              <button
                key={r}
                onClick={() => choose(r)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-gray-200 text-left active:bg-gray-50"
              >
                <span className="text-2xl" aria-hidden>{STUCK_REASONS[r].emoji}</span>
                <span className="text-base font-medium text-gray-800">{STUCK_REASONS[r].label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button className="text-sm text-gray-500 flex items-center gap-1" onClick={() => setReason(null)}>
            <ChevronLeft size={16} /> Different reason
          </button>
          <div className="card p-5">
            <p className="text-3xl mb-2" aria-hidden>{meta.emoji}</p>
            <h2 className="text-xl font-bold text-gray-900">{meta.headline}</h2>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{meta.advice}</p>

            {(reason === 'unclear' || reason === 'too-big' || reason === 'fear') && (
              <div className="mt-4 space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {reason === 'unclear'
                    ? 'The next physical action is…'
                    : reason === 'too-big'
                    ? 'A 2-minute version would be…'
                    : 'The rough, imperfect version is…'}
                </label>
                <input
                  className="input h-12 text-base"
                  placeholder={
                    reason === 'unclear'
                      ? 'e.g. Email Sam to ask for the figures'
                      : reason === 'too-big'
                      ? 'e.g. Write the headings only'
                      : 'e.g. Bullet points, no polish'
                  }
                  value={step}
                  onChange={(e) => setStep(e.target.value)}
                  autoFocus
                />
                <button
                  className="btn-primary w-full h-12 justify-center"
                  disabled={!step.trim()}
                  onClick={() => begin(reason === 'too-big' ? 2 : reason === 'unclear' ? 5 : 15, { firstStep: step.trim() })}
                >
                  <Play size={17} /> Start {reason === 'too-big' ? '2' : reason === 'unclear' ? '5' : '15'} minutes on it
                </button>
                {reason === 'too-big' && gtdItem && !gtdItem.projectId && (
                  <button className="btn-secondary w-full justify-center" onClick={makeProject} disabled={madeProject}>
                    {madeProject ? <Check size={16} /> : <FolderKanban size={16} />}
                    {madeProject ? 'Now a project — this is its first step' : 'It’s really a project — make it one'}
                  </button>
                )}
              </div>
            )}

            {reason === 'boring' && (
              <div className="mt-4 space-y-2">
                <label className="block text-sm font-medium text-gray-700">Pair it with…</label>
                <input
                  className="input h-12 text-base"
                  placeholder="e.g. my favourite podcast"
                  value={treat}
                  onChange={(e) => setTreat(e.target.value)}
                />
                <button className="btn-primary w-full h-12 justify-center" onClick={() => begin(10, { treat: treat.trim() || undefined })}>
                  <Play size={17} /> Race a 10-minute timer
                </button>
              </div>
            )}

            {reason === 'tired' && (
              <div className="mt-4 space-y-3">
                <button className="btn-primary w-full h-12 justify-center" onClick={() => begin(5)}>
                  <Play size={17} /> Just 5 minutes of the easiest part
                </button>
                <WhatNowPicker compact />
              </div>
            )}

            {reason === 'distracted' && (
              <div className="mt-4 space-y-2">
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>☐ Phone in another room (or face down, on silent)</li>
                  <li>☐ Close every tab and app you don't need</li>
                  <li>☐ Have water nearby so you don't wander off</li>
                </ul>
                <button className="btn-primary w-full h-12 justify-center" onClick={() => begin(15)}>
                  <Play size={17} /> Start 15 focused minutes
                </button>
                {coworkingUrl && (
                  <a href={coworkingUrl} target="_blank" rel="noreferrer" className="btn-secondary w-full justify-center">
                    <Users size={16} /> Work alongside someone <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}

            {reason === 'not-worth-it' && (
              <div className="mt-4 space-y-2">
                {linked ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button className="btn-secondary justify-center h-11" onClick={() => decide('someday')}>
                        <Star size={15} /> Someday/Maybe
                      </button>
                      <button className="btn-ghost justify-center h-11 text-red-500 hover:bg-red-50" onClick={() => decide('trash')}>
                        <Trash2 size={15} /> Delete it
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        className="input h-11 text-base flex-1"
                        placeholder="Hand it to…"
                        value={delegate}
                        onChange={(e) => setDelegate(e.target.value)}
                      />
                      <button className="btn-secondary h-11" disabled={!delegate.trim()} onClick={() => decide('delegate')}>
                        <Clock size={15} /> Delegate
                      </button>
                    </div>
                    <button className="btn-ghost w-full justify-center text-sm" onClick={() => begin(10)}>
                      Actually, it does matter — start 10 minutes
                    </button>
                  </>
                ) : (
                  <Link to="/" className="btn-secondary w-full justify-center">Let it go</Link>
                )}
              </div>
            )}
          </div>

          {linked && reason !== 'not-worth-it' && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Next time</p>
              <p className="text-sm text-gray-700">
                <b>If</b> {meta.ifText}, <b>then</b> I'll {meta.thenText}.
              </p>
              <button className="btn-ghost mt-2 px-2 h-9 text-sm text-indigo-600" onClick={saveIfThen} disabled={savedPlan}>
                {savedPlan ? <><Check size={15} /> Saved as this task's if-then plan</> : 'Save as this task’s if-then plan'}
              </button>
            </div>
          )}
        </div>
      )}

      {patterns.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Your patterns</p>
          <div className="flex flex-wrap gap-1.5">
            {patterns.map(([r, n]) => (
              <span key={r} className="badge bg-white border border-gray-200 text-gray-600 py-1">
                {STUCK_REASONS[r].emoji} {STUCK_REASONS[r].label.toLowerCase()} · {n}
              </span>
            ))}
          </div>
          <Link to="/progress?tab=insights" className="text-xs text-blue-600 mt-2 inline-block">
            See insights →
          </Link>
        </div>
      )}
    </div>
  );
}
