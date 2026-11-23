import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navigation, ChevronRight, Check, Flame, Eye, EyeOff, RotateCcw, Sun, Sunset, MoonStar, Sunrise } from 'lucide-react';
import { useGuide } from '../hooks/useGuide';
import { useGuideStore } from '../store/guideStore';
import { usePrefsStore } from '../store/prefsStore';
import { startFocus } from '../lib/tasks';
import { requestNotifications, unlockAudio } from '../lib/sound';
import { FEATURES } from '../lib/guideFeatures';
import type { GuideStep, Phase } from '../lib/guide';
import { HabitsToday } from '../components/Habits';

const PHASES: Record<Phase, { label: string; icon: typeof Sun }> = {
  morning: { label: 'Morning', icon: Sunrise },
  afternoon: { label: 'Afternoon', icon: Sun },
  evening: { label: 'Evening', icon: Sunset },
  night: { label: 'Night', icon: MoonStar },
};

function FeatureChip({ step }: { step: Pick<GuideStep, 'feature'> }) {
  const f = FEATURES[step.feature];
  const Icon = f.icon;
  return (
    <span className={`badge gap-1 ${f.chip}`}>
      <Icon size={12} /> {f.label}
    </span>
  );
}

export default function Guide() {
  const navigate = useNavigate();
  const g = useGuide();
  const { follow, skip, clearSkips } = useGuideStore();
  const { startPage, setPrefs } = usePrefsStore();
  const [showWhy, setShowWhy] = useState(false);
  const { snapshot: s, current, upcoming, forecast } = g;
  const PhaseIcon = PHASES[s.phase].icon;

  function go(step: GuideStep) {
    follow(step);
    if (step.action?.type === 'start-focus') {
      unlockAudio();
      requestNotifications();
      const { title, minutes, dailyItemId, gtdItemId } = step.action;
      startFocus({ title, minutes, dailyItemId, gtdItemId });
    }
    navigate(step.to);
  }

  // Today's journey: Plan → Do → Shut down
  const journey = [
    { key: 'plan', label: 'Plan', done: s.planned > 0, detail: s.planned ? `${s.planned} chosen` : 'not yet' },
    {
      key: 'do',
      label: 'Do',
      done: s.planned > 0 && s.done === s.planned,
      detail: s.planned ? `${s.done}/${s.planned} done` : '—',
    },
    { key: 'shutdown', label: 'Shut down', done: s.shutdownDone, detail: s.shutdownDone ? 'done' : 'tonight' },
  ];
  const activeJourney =
    s.phase === 'evening' || s.phase === 'night' ? 'shutdown' : s.planned === 0 ? 'plan' : 'do';

  const f = current ? FEATURES[current.feature] : null;
  const CurrentIcon = f?.icon;
  const isRest = current?.tone === 'rest';

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
          <Navigation size={19} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Guide</h1>
          <p className="text-sm text-gray-500">I'll work out what you should do next.</p>
        </div>
        {s.streak > 0 && (
          <span className="badge bg-orange-100 text-orange-700 gap-1 text-sm px-2.5 py-1">
            <Flame size={14} /> {s.streak}
          </span>
        )}
      </div>

      {/* Context */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
        <PhaseIcon size={16} className="text-gray-400" />
        <span>
          {s.timeLabel} · {PHASES[s.phase].label}
          {!s.isWorkday && ' · day off'}
        </span>
      </div>

      {/* Journey */}
      <div className="grid grid-cols-3 gap-1.5 mb-4">
        {journey.map((j) => (
          <div
            key={j.key}
            className={`rounded-xl px-3 py-2 border ${
              j.done
                ? 'bg-green-50 border-green-200'
                : j.key === activeJourney
                ? 'bg-white border-gray-900'
                : 'bg-white border-gray-200'
            }`}
          >
            <p className={`text-xs font-semibold flex items-center gap-1 ${j.done ? 'text-green-700' : 'text-gray-900'}`}>
              {j.done && <Check size={12} strokeWidth={3} />} {j.label}
            </p>
            <p className="text-[11px] text-gray-500">{j.detail}</p>
          </div>
        ))}
      </div>

      {/* Current step */}
      {current && f && CurrentIcon ? (
        <div
          className={`rounded-3xl border p-5 shadow-sm bg-gradient-to-b ${f.tint} to-white ${
            isRest ? 'border-slate-200' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Your next step</p>
            <FeatureChip step={current} />
          </div>
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${f.chip}`}>
              <CurrentIcon size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 leading-snug">{current.title}</h2>
              <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{current.why}</p>
            </div>
          </div>

          {current.extra === 'habits' && (
            <div className="mt-4">
              <HabitsToday />
            </div>
          )}

          <button
            className={`mt-5 w-full h-14 rounded-2xl text-white font-semibold text-base flex items-center justify-center gap-2 ${f.button}`}
            onClick={() => go(current)}
          >
            {current.cta} <ChevronRight size={18} />
          </button>

          <div className="flex items-center justify-between mt-3">
            {current.skippable ? (
              <button className="text-sm text-gray-500 px-2 py-1.5 rounded-lg hover:bg-gray-100" onClick={() => skip(current)}>
                {isRest ? 'Keep working' : 'Not now'}
              </button>
            ) : (
              <span />
            )}
            <button
              className="text-sm text-gray-400 px-2 py-1.5 rounded-lg hover:bg-gray-100 flex items-center gap-1"
              onClick={() => setShowWhy((v) => !v)}
              aria-expanded={showWhy}
            >
              {showWhy ? <EyeOff size={14} /> : <Eye size={14} />} Why this?
            </button>
          </div>

          {showWhy && (
            <div className="mt-3 p-3 rounded-xl bg-white border border-gray-200 text-xs text-gray-600 space-y-1">
              <p className="font-semibold text-gray-700 mb-1">What I looked at</p>
              <p>Time: {s.timeLabel} ({PHASES[s.phase].label.toLowerCase()}{s.isWorkday ? ', a streak day' : ', a day off'})</p>
              <p>
                Today's priorities: {s.planned ? `${s.done} of ${s.planned} done` : 'none chosen yet'}
              </p>
              <p>
                Inbox: {s.inbox} · Next Actions: {s.nextActions}
              </p>
              <p>Evening shutdown today: {s.shutdownDone ? 'done' : 'not yet'}</p>
              <p>
                Weekly Review: {s.daysSinceReview === null ? 'never done' : s.daysSinceReview === 0 ? 'done today' : `${s.daysSinceReview} days ago`}
              </p>
              <p>Priority streak: {s.streak} day{s.streak !== 1 ? 's' : ''}</p>
              <p className="text-gray-400 pt-1">
                Order: anything in progress → evening/night wind-down → plan the day → clear blockers → do #1 → extras.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center">
          <p className="text-3xl mb-2">🌤️</p>
          <p className="font-bold text-gray-900">Nothing needs you right now</p>
          <p className="text-sm text-gray-500 mt-1">You're on top of things. Pick something freely, or rest.</p>
        </div>
      )}

      {/* Coming up */}
      {upcoming.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">After that</p>
          <div className="space-y-1.5">
            {upcoming.map((u) => {
              const uf = FEATURES[u.feature];
              const UIcon = uf.icon;
              return (
                <button
                  key={u.id}
                  onClick={() => go(u)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-gray-200 text-left active:bg-gray-50"
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${uf.chip}`}>
                    <UIcon size={16} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-gray-800 truncate">{u.title}</span>
                    <span className="block text-xs text-gray-400">{uf.label}</span>
                  </span>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Later */}
      {forecast.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Later</p>
          <ul className="space-y-1">
            {forecast.map((fc) => (
              <li key={fc.title} className="flex items-center gap-3 text-sm text-gray-500 px-1">
                <span className="w-28 shrink-0 text-xs text-gray-400">{fc.when}</span>
                {fc.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200 space-y-2 text-xs text-gray-500">
        {g.skippedCount > 0 && (
          <button className="flex items-center gap-1 text-blue-600" onClick={clearSkips}>
            <RotateCcw size={12} /> Show the {g.skippedCount} suggestion{g.skippedCount !== 1 ? 's' : ''} I skipped
          </button>
        )}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="w-4 h-4"
            checked={startPage === 'guide'}
            onChange={(e) => setPrefs({ startPage: e.target.checked ? 'guide' : 'dashboard' })}
          />
          Open the app on the Guide
        </label>
        <p>
          Prefer to choose for yourself? Every tab is still in the menu — or go to the{' '}
          <Link to="/" className="text-blue-600">
            Dashboard
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
