import { Link, useLocation } from 'react-router-dom';
import { Navigation, X, CheckCircle2, ChevronRight } from 'lucide-react';
import { useGuideStore } from '../store/guideStore';
import { useGuide } from '../hooks/useGuide';

function Bar({ stepId, stepTitle, exit }: { stepId?: string; stepTitle?: string; exit: () => void }) {
  const g = useGuide();
  const current = g.current;
  // The step is "done" once the guide's decision moves on (a running timer is still the same step).
  const moved = Boolean(current && current.id !== stepId && !current.id.startsWith('timer-'));
  // Capture steps have no natural "done" moment — you decide when your head is clear.
  const capturing = stepId === 'mind-sweep' || stepId === 'capture-more';

  return (
    <div
      className={`sticky top-0 z-20 flex items-center gap-2 px-3 py-2 border-b text-sm ${
        moved ? 'bg-green-50 border-green-200 text-green-900' : 'bg-gray-900 border-gray-900 text-white'
      }`}
      role="status"
    >
      {moved ? <CheckCircle2 size={16} className="shrink-0 text-green-600" /> : <Navigation size={15} className="shrink-0" />}
      <p className="flex-1 min-w-0 truncate">
        {moved && capturing ? (
          <>
            <span className="font-semibold">Keep capturing.</span> When your head feels clear…
          </>
        ) : moved ? (
          <>
            <span className="font-semibold">Nice.</span> Next: {current?.title}
          </>
        ) : (
          <>
            <span className="opacity-60">Guided · </span>
            {stepTitle}
          </>
        )}
      </p>
      <Link
        to="/guide"
        className={`shrink-0 h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-0.5 ${
          moved ? 'bg-green-600 text-white' : 'bg-white/15 text-white'
        }`}
      >
        {moved ? (capturing ? "I'm done" : 'Next step') : 'Guide'} <ChevronRight size={13} />
      </Link>
      <button
        onClick={exit}
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          moved ? 'text-green-700 hover:bg-green-100' : 'text-white/60 hover:bg-white/10'
        }`}
        aria-label="Exit guided mode"
        title="Exit guided mode"
      >
        <X size={15} />
      </button>
    </div>
  );
}

/** Follows you onto other tabs while in guided mode, and tells you when to come back. */
export default function GuideBar() {
  const { active, stepId, stepTitle, exit } = useGuideStore();
  const { pathname } = useLocation();
  if (!active || pathname === '/guide') return null;
  return <Bar stepId={stepId} stepTitle={stepTitle} exit={exit} />;
}
