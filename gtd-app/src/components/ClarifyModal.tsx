import { useState } from 'react';
import {
  X,
  Star,
  BookOpen,
  CalendarDays,
  Clock,
  Zap,
  FolderKanban,
  Check,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import type { GTDItem } from '../types';
import { CONTEXTS } from '../types';
import { useGTDStore } from '../store/gtdStore';

type Step =
  | 'is-actionable'
  | 'non-actionable-choice'
  | 'two-minute-rule'
  | 'delegate-or-defer'
  | 'single-or-project'
  | 'next-action-details'
  | 'project-details'
  | 'waiting-for-details'
  | 'calendar-details'
  | 'done';

interface ClarifyModalProps {
  item: GTDItem;
  onClose: () => void;
}

export default function ClarifyModal({ item, onClose }: ClarifyModalProps) {
  const { clarifyItem, completeItem, addProject } = useGTDStore();
  const [step, setStep] = useState<Step>('is-actionable');
  const [completedAction, setCompletedAction] = useState('');

  // Form state
  const [context, setContext] = useState(item.context ?? '');
  const [timeEstimate, setTimeEstimate] = useState(item.timeEstimate?.toString() ?? '');
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>(
    item.energyLevel ?? 'medium'
  );
  const [delegatedTo, setDelegatedTo] = useState(item.delegatedTo ?? '');
  const [scheduledDate, setScheduledDate] = useState(item.scheduledDate ?? '');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectOutcome, setProjectOutcome] = useState('');
  const [notes, setNotes] = useState(item.notes);

  function handleNonActionable(dest: 'trash' | 'someday-maybe' | 'reference') {
    clarifyItem(item.id, { status: dest, notes });
    setCompletedAction(
      dest === 'trash'
        ? 'Moved to Trash'
        : dest === 'someday-maybe'
        ? 'Moved to Someday / Maybe'
        : 'Moved to Reference'
    );
    setStep('done');
  }

  function handleDoNow() {
    completeItem(item.id);
    setCompletedAction('Marked as Done (2-minute rule)');
    setStep('done');
  }

  function handleNextAction() {
    clarifyItem(item.id, {
      status: 'next-action',
      notes,
      context: context || undefined,
      timeEstimate: timeEstimate ? parseInt(timeEstimate, 10) : undefined,
      energyLevel,
    });
    setCompletedAction('Added to Next Actions');
    setStep('done');
  }

  function handleWaitingFor() {
    clarifyItem(item.id, {
      status: 'waiting-for',
      notes,
      delegatedTo: delegatedTo || undefined,
      delegatedDate: new Date().toISOString(),
    });
    setCompletedAction('Added to Waiting For');
    setStep('done');
  }

  function handleCalendar() {
    clarifyItem(item.id, {
      status: 'calendar',
      notes,
      scheduledDate: scheduledDate || undefined,
    });
    setCompletedAction('Added to Calendar');
    setStep('done');
  }

  function handleProject() {
    const title = projectTitle.trim() || item.title;
    const project = addProject(title, notes, projectOutcome.trim());
    // The original item becomes the first next action for this project
    clarifyItem(item.id, {
      status: 'next-action',
      notes,
      projectId: project.id,
      context: context || undefined,
      timeEstimate: timeEstimate ? parseInt(timeEstimate, 10) : undefined,
      energyLevel,
    });
    setCompletedAction('Created as Project + first Next Action');
    setStep('done');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex-1 pr-4">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
              Clarify
            </p>
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{item.title}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1 shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Notes field (always visible) */}
        {step !== 'done' && (
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
            <textarea
              className="textarea text-xs h-14"
              placeholder="Notes (optional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        )}

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Step: Is it actionable? */}
          {step === 'is-actionable' && (
            <DecisionStep
              question="Is this actionable?"
              description="Does this require you (or someone) to do something?"
            >
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  className="btn-primary justify-center py-3 text-base"
                  onClick={() => setStep('two-minute-rule')}
                >
                  Yes, it is
                </button>
                <button
                  className="btn-secondary justify-center py-3 text-base"
                  onClick={() => setStep('non-actionable-choice')}
                >
                  No, it's not
                </button>
              </div>
            </DecisionStep>
          )}

          {/* Step: Non-actionable choice */}
          {step === 'non-actionable-choice' && (
            <DecisionStep
              question="What do you want to do with it?"
              description="Non-actionable items go one of three places:"
            >
              <div className="space-y-2 mt-4">
                <ChoiceButton
                  icon={<Trash2 size={18} className="text-red-500" />}
                  label="Trash"
                  description="It's no longer relevant or needed"
                  onClick={() => handleNonActionable('trash')}
                  color="red"
                />
                <ChoiceButton
                  icon={<Star size={18} className="text-amber-500" />}
                  label="Someday / Maybe"
                  description="I might want to do this in the future"
                  onClick={() => handleNonActionable('someday-maybe')}
                  color="amber"
                />
                <ChoiceButton
                  icon={<BookOpen size={18} className="text-teal-500" />}
                  label="Reference"
                  description="Useful information to keep for later"
                  onClick={() => handleNonActionable('reference')}
                  color="teal"
                />
              </div>
            </DecisionStep>
          )}

          {/* Step: Two-minute rule */}
          {step === 'two-minute-rule' && (
            <DecisionStep
              question="Can you do it in 2 minutes or less?"
              description="If the action takes less than 2 minutes, do it now rather than organizing it."
            >
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-green-200 bg-green-50 text-green-700 hover:border-green-400 transition-colors"
                  onClick={handleDoNow}
                >
                  <Check size={24} />
                  <span className="font-semibold text-sm">Yes — do it now!</span>
                </button>
                <button
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-400 transition-colors"
                  onClick={() => setStep('delegate-or-defer')}
                >
                  <Clock size={24} />
                  <span className="font-semibold text-sm">No, it takes longer</span>
                </button>
              </div>
            </DecisionStep>
          )}

          {/* Step: Delegate or defer */}
          {step === 'delegate-or-defer' && (
            <DecisionStep
              question="Should someone else do this?"
              description="If you're the right person to handle it, it gets organized into your system. If not, delegate it."
            >
              <div className="space-y-2 mt-4">
                <ChoiceButton
                  icon={<Clock size={18} className="text-amber-500" />}
                  label="Delegate it — Waiting For"
                  description="Someone else needs to do this; I'll track it"
                  onClick={() => setStep('waiting-for-details')}
                  color="amber"
                />
                <ChoiceButton
                  icon={<CalendarDays size={18} className="text-red-500" />}
                  label="Schedule it — Calendar"
                  description="It must happen at a specific date or time"
                  onClick={() => setStep('calendar-details')}
                  color="red"
                />
                <ChoiceButton
                  icon={<Zap size={18} className="text-blue-500" />}
                  label="I'll do it — Organize"
                  description="It goes into my action lists"
                  onClick={() => setStep('single-or-project')}
                  color="blue"
                />
              </div>
            </DecisionStep>
          )}

          {/* Step: Single action or project? */}
          {step === 'single-or-project' && (
            <DecisionStep
              question="Is this a single action or a project?"
              description='A "project" is anything that requires more than one action to complete.'
            >
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400 transition-colors"
                  onClick={() => setStep('next-action-details')}
                >
                  <Zap size={24} />
                  <span className="font-semibold text-sm text-center">Single action</span>
                </button>
                <button
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-purple-200 bg-purple-50 text-purple-700 hover:border-purple-400 transition-colors"
                  onClick={() => setStep('project-details')}
                >
                  <FolderKanban size={24} />
                  <span className="font-semibold text-sm text-center">Project (multi-step)</span>
                </button>
              </div>
            </DecisionStep>
          )}

          {/* Step: Next action details */}
          {step === 'next-action-details' && (
            <div>
              <p className="font-semibold text-gray-900 mb-4">Next Action details</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Context (where/how can you do this?)
                  </label>
                  <select
                    className="input"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                  >
                    <option value="">No context</option>
                    {CONTEXTS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Time estimate (minutes)
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    placeholder="e.g. 30"
                    value={timeEstimate}
                    onChange={(e) => setTimeEstimate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Energy required
                  </label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setEnergyLevel(level)}
                        className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium capitalize transition-colors ${
                          energyLevel === level
                            ? level === 'low'
                              ? 'bg-green-100 border-green-400 text-green-700'
                              : level === 'medium'
                              ? 'bg-amber-100 border-amber-400 text-amber-700'
                              : 'bg-red-100 border-red-400 text-red-700'
                            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="btn-primary w-full justify-center" onClick={handleNextAction}>
                  <Zap size={16} />
                  Add to Next Actions
                </button>
              </div>
            </div>
          )}

          {/* Step: Project details */}
          {step === 'project-details' && (
            <div>
              <p className="font-semibold text-gray-900 mb-4">Project details</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Project title
                  </label>
                  <input
                    className="input"
                    placeholder={item.title}
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Desired outcome (what does "done" look like?)
                  </label>
                  <textarea
                    className="textarea h-16"
                    placeholder="e.g. Website is live and accepting orders"
                    value={projectOutcome}
                    onChange={(e) => setProjectOutcome(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    First next action context
                  </label>
                  <select
                    className="input"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                  >
                    <option value="">No context</option>
                    {CONTEXTS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="btn-primary w-full justify-center" onClick={handleProject}>
                  <FolderKanban size={16} />
                  Create Project
                </button>
              </div>
            </div>
          )}

          {/* Step: Waiting For details */}
          {step === 'waiting-for-details' && (
            <div>
              <p className="font-semibold text-gray-900 mb-4">Waiting For details</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Delegated to (person or team)
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. John, Design team..."
                    value={delegatedTo}
                    onChange={(e) => setDelegatedTo(e.target.value)}
                  />
                </div>
                <button className="btn-primary w-full justify-center" onClick={handleWaitingFor}>
                  <Clock size={16} />
                  Add to Waiting For
                </button>
              </div>
            </div>
          )}

          {/* Step: Calendar details */}
          {step === 'calendar-details' && (
            <div>
              <p className="font-semibold text-gray-900 mb-4">Calendar details</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Scheduled date
                  </label>
                  <input
                    className="input"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
                <button className="btn-primary w-full justify-center" onClick={handleCalendar}>
                  <CalendarDays size={16} />
                  Add to Calendar
                </button>
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-600" />
              </div>
              <p className="font-semibold text-gray-900 text-lg">Done!</p>
              <p className="text-gray-500 text-sm mt-1">{completedAction}</p>
              <button className="btn-primary mt-6" onClick={onClose}>
                Close
              </button>
            </div>
          )}
        </div>

        {/* Back button */}
        {step !== 'is-actionable' && step !== 'done' && (
          <div className="px-6 pb-4 pt-2 border-t border-gray-100">
            <button
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => {
                const prev: Partial<Record<Step, Step>> = {
                  'non-actionable-choice': 'is-actionable',
                  'two-minute-rule': 'is-actionable',
                  'delegate-or-defer': 'two-minute-rule',
                  'single-or-project': 'delegate-or-defer',
                  'next-action-details': 'single-or-project',
                  'project-details': 'single-or-project',
                  'waiting-for-details': 'delegate-or-defer',
                  'calendar-details': 'delegate-or-defer',
                };
                if (prev[step]) setStep(prev[step]!);
              }}
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionStep({
  question,
  description,
  children,
}: {
  question: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900">{question}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
      {children}
    </div>
  );
}

function ChoiceButton({
  icon,
  label,
  description,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  color: string;
}) {
  const hover: Record<string, string> = {
    red: 'hover:border-red-300 hover:bg-red-50',
    amber: 'hover:border-amber-300 hover:bg-amber-50',
    teal: 'hover:border-teal-300 hover:bg-teal-50',
    blue: 'hover:border-blue-300 hover:bg-blue-50',
    purple: 'hover:border-purple-300 hover:bg-purple-50',
    green: 'hover:border-green-300 hover:bg-green-50',
  };
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white transition-colors text-left ${
        hover[color] ?? 'hover:bg-gray-50'
      }`}
    >
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <ChevronRight size={16} className="text-gray-300 shrink-0" />
    </button>
  );
}
