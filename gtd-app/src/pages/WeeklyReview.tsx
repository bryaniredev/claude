import { useState } from 'react';
import {
  CheckSquare,
  Check,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Inbox,
  Zap,
  FolderKanban,
  Clock,
  Star,
  CalendarDays,
} from 'lucide-react';
import { useGTDStore } from '../store/gtdStore';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    id: 'collect',
    title: 'Get Clear',
    icon: Inbox,
    items: [
      'Collect all loose papers, notes, and receipts',
      'Clear your head — capture any lingering thoughts to the Inbox',
      'Empty your email inbox by capturing anything actionable',
    ],
  },
  {
    id: 'process-inbox',
    title: 'Empty the Inbox',
    icon: CheckSquare,
    items: [
      'Process every item in your Inbox',
      'Ask: is it actionable? What\'s the next step?',
      'Goal: get Inbox to zero',
    ],
  },
  {
    id: 'review-calendar',
    title: 'Review Calendar',
    icon: CalendarDays,
    items: [
      'Review past calendar for any loose ends or follow-ups',
      'Review upcoming calendar — any prep needed?',
      'Make sure all date-specific actions are captured',
    ],
  },
  {
    id: 'review-next-actions',
    title: 'Review Next Actions',
    icon: Zap,
    items: [
      'Review each Next Action — is it still relevant?',
      'Mark anything completed',
      'Add any new next actions you\'ve thought of',
    ],
  },
  {
    id: 'review-projects',
    title: 'Review Projects',
    icon: FolderKanban,
    items: [
      'Ensure each project has at least one Next Action',
      'Are there stalled projects? What\'s blocking them?',
      'Complete or archive finished projects',
    ],
  },
  {
    id: 'review-waiting',
    title: 'Review Waiting For',
    icon: Clock,
    items: [
      'Check each Waiting For item — any needed follow-ups?',
      'How long have you been waiting? Should you follow up?',
    ],
  },
  {
    id: 'review-someday',
    title: 'Review Someday / Maybe',
    icon: Star,
    items: [
      'Review your Someday / Maybe list',
      'Is anything ready to become an active project or next action?',
      'Remove anything you no longer care about',
    ],
  },
  {
    id: 'reflect',
    title: 'Get Creative',
    icon: CheckSquare,
    items: [
      'Are there new projects you\'d like to capture?',
      'Any wild ideas worth noting down?',
      'What would make the next week great?',
    ],
  },
];

export default function WeeklyReview() {
  const { weeklyReviews, addWeeklyReview, getLastReview, items, projects } = useGTDStore();
  const lastReview = getLastReview();

  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [finished, setFinished] = useState(false);

  const inboxCount = items.filter((i) => i.status === 'inbox').length;
  const nextActionsCount = items.filter((i) => i.status === 'next-action').length;
  const projectsCount = projects.filter((p) => p.status === 'active').length;
  const waitingCount = items.filter((i) => i.status === 'waiting-for').length;

  function toggleCheck(key: string) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleFinish() {
    addWeeklyReview(notes);
    setFinished(true);
  }

  function handleReset() {
    setStarted(false);
    setCurrentStep(0);
    setChecked({});
    setNotes('');
    setFinished(false);
  }

  const step = STEPS[currentStep];
  const StepIcon = step?.icon;

  if (finished) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check size={40} className="text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Complete!</h1>
          <p className="text-gray-500">
            Excellent work. Your GTD system is up to date and trusted.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Completed {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
          <div className="flex gap-3 justify-center mt-8">
            <Link to="/" className="btn-primary">
              Back to Dashboard
            </Link>
            <button className="btn-secondary" onClick={handleReset}>
              <RotateCcw size={16} /> Do another review
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <CheckSquare size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Weekly Review</h1>
            <p className="text-sm text-gray-500">David Allen's "critical factor for success"</p>
          </div>
        </div>

        {/* Last review */}
        {lastReview ? (
          <div className="card p-4 mb-6">
            <p className="text-sm font-medium text-gray-700">Last review</p>
            <p className="text-gray-500 text-sm mt-1">
              {format(new Date(lastReview.completedAt), 'EEEE, MMMM d, yyyy')} —{' '}
              {formatDistanceToNow(new Date(lastReview.completedAt), { addSuffix: true })}
            </p>
            {lastReview.notes && (
              <p className="text-xs text-gray-400 mt-2 italic">"{lastReview.notes}"</p>
            )}
          </div>
        ) : (
          <div className="card p-4 mb-6 bg-blue-50 border-blue-200">
            <p className="text-sm font-semibold text-blue-700">No reviews yet</p>
            <p className="text-xs text-blue-600 mt-1">
              This is your first Weekly Review. It's the cornerstone of a working GTD system.
            </p>
          </div>
        )}

        {/* Current system status */}
        <div className="card p-4 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            System Status
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Inbox', count: inboxCount, urgent: inboxCount > 0, to: '/inbox' },
              { label: 'Next Actions', count: nextActionsCount, to: '/next-actions' },
              { label: 'Projects', count: projectsCount, to: '/projects' },
              { label: 'Waiting For', count: waitingCount, to: '/waiting-for' },
            ].map(({ label, count, urgent, to }) => (
              <Link
                key={label}
                to={to}
                className={`rounded-lg p-3 border text-sm ${
                  urgent ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <p className={`font-bold text-xl ${urgent ? 'text-blue-600' : 'text-gray-900'}`}>
                  {count}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">{label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Start */}
        <div className="card p-6 text-center">
          <h2 className="font-bold text-gray-900 mb-2">Ready to review?</h2>
          <p className="text-sm text-gray-500 mb-5">
            Set aside 20-30 minutes, find a quiet space, and work through each step. A thorough
            weekly review is what makes GTD work.
          </p>
          <button className="btn-primary text-base py-3 px-8 w-full justify-center" onClick={() => setStarted(true)}>
            Start Weekly Review <ChevronRight size={18} />
          </button>
        </div>

        {/* Review history */}
        {weeklyReviews.length > 1 && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Review History
            </p>
            <div className="space-y-1">
              {[...weeklyReviews]
                .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
                .slice(0, 5)
                .map((r) => (
                  <div key={r.id} className="flex items-center gap-3 text-sm text-gray-600 py-1.5">
                    <Check size={14} className="text-green-500 shrink-0" />
                    {format(new Date(r.completedAt), 'MMMM d, yyyy')}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Step {currentStep + 1} of {STEPS.length}
          </p>
          <button className="text-xs text-gray-400 hover:text-gray-600" onClick={handleReset}>
            Cancel review
          </button>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step card */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            {StepIcon && <StepIcon size={20} className="text-blue-600" />}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{step.title}</h2>
        </div>

        <div className="space-y-3">
          {step.items.map((item, i) => {
            const key = `${step.id}-${i}`;
            const isChecked = checked[key];
            return (
              <button
                key={key}
                onClick={() => toggleCheck(key)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${
                  isChecked
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div
                  className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isChecked
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300'
                  }`}
                >
                  {isChecked && <Check size={12} className="text-white" />}
                </div>
                <span
                  className={`text-sm ${
                    isChecked ? 'text-green-700 line-through' : 'text-gray-700'
                  }`}
                >
                  {item}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes on last step */}
      {currentStep === STEPS.length - 1 && (
        <div className="card p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Review notes (optional)
          </label>
          <textarea
            className="textarea h-24"
            placeholder="Reflections, commitments, anything worth noting from this review..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {currentStep > 0 && (
          <button
            className="btn-secondary"
            onClick={() => setCurrentStep((s) => s - 1)}
          >
            <ChevronLeft size={16} /> Back
          </button>
        )}
        <div className="flex-1" />
        {currentStep < STEPS.length - 1 ? (
          <button
            className="btn-primary"
            onClick={() => setCurrentStep((s) => s + 1)}
          >
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button className="btn-primary bg-green-600 hover:bg-green-700" onClick={handleFinish}>
            <Check size={16} /> Complete Review
          </button>
        )}
      </div>
    </div>
  );
}
