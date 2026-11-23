import { useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { EMPTY_WOOP, type Woop } from '../store/horizonsStore';

const STEPS: { key: keyof Woop; letter: string; title: string; prompt: string; placeholder: string }[] = [
  {
    key: 'wish',
    letter: 'W',
    title: 'Wish',
    prompt: 'What is an important wish you want to fulfil? Challenging, but possible.',
    placeholder: 'e.g. Finish the first draft of my book by March',
  },
  {
    key: 'outcome',
    letter: 'O',
    title: 'Outcome',
    prompt: 'What would be the best result? Take a moment to really imagine it. How would it feel?',
    placeholder: 'e.g. Holding a finished draft, proud and relieved',
  },
  {
    key: 'obstacle',
    letter: 'O',
    title: 'Obstacle',
    prompt:
      "What's the main obstacle inside you that holds you back? An emotion, a habit, a belief. Imagine it happening.",
    placeholder: 'e.g. I scroll my phone when the writing feels hard',
  },
  {
    key: 'plan',
    letter: 'P',
    title: 'Plan',
    prompt: 'What will you do when that obstacle shows up? Make it an if-then plan.',
    placeholder: 'If I reach for my phone, then I will write one more sentence first',
  },
];

/** Guided WOOP: Wish, Outcome, Obstacle, Plan (mental contrasting with implementation intentions). */
export default function WoopSheet({
  initial,
  onSave,
  onClose,
}: {
  initial?: Woop;
  onSave: (woop: Woop) => void;
  onClose: () => void;
}) {
  const [woop, setWoop] = useState<Woop>(initial ?? EMPTY_WOOP);
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx];
  const last = idx === STEPS.length - 1;

  return (
    <BottomSheet
      eyebrow={`WOOP · step ${idx + 1} of 4`}
      title={
        <span className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">
            {step.letter}
          </span>
          {step.title}
        </span>
      }
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {idx > 0 && (
            <button className="btn-secondary h-12" onClick={() => setIdx(idx - 1)}>
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <button
            className="btn-primary flex-1 h-12 justify-center bg-emerald-600 hover:bg-emerald-700"
            disabled={!woop[step.key].trim()}
            onClick={() => {
              if (last) {
                onSave(woop);
                onClose();
              } else setIdx(idx + 1);
            }}
          >
            {last ? (
              <>
                <Check size={17} /> Save WOOP
              </>
            ) : (
              <>
                Next <ChevronRight size={17} />
              </>
            )}
          </button>
        </div>
      }
    >
      <p className="text-sm text-gray-600 mb-3 leading-relaxed">{step.prompt}</p>
      <textarea
        key={step.key}
        className="textarea h-28 text-base"
        placeholder={step.placeholder}
        value={woop[step.key]}
        onChange={(e) => setWoop({ ...woop, [step.key]: e.target.value })}
        autoFocus
      />
      {idx > 0 && (
        <div className="mt-4 space-y-1 text-xs text-gray-500">
          {STEPS.slice(0, idx).map((s) => (
            <p key={s.key}>
              <b className="text-gray-700">{s.title}:</b> {woop[s.key]}
            </p>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
