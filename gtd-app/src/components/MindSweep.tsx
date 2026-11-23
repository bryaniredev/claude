import { useState } from 'react';
import { Lightbulb, RefreshCw } from 'lucide-react';

/** GTD "trigger list" prompts to jog your memory during a mind sweep. */
const PROMPTS = [
  'Work projects you’ve started but not finished',
  'Things you promised someone you’d do',
  'Emails or messages you need to reply to',
  'Calls you need to make',
  'Meetings or conversations to prepare for',
  'Bills, payments, taxes, budgets',
  'Things that need fixing at home',
  'Errands and shopping',
  'Appointments to book — doctor, dentist, haircut',
  'Birthdays, gifts, cards coming up',
  'People you should get back in touch with',
  'Health: exercise, check-ups, sleep',
  'Paperwork and admin: forms, renewals, subscriptions',
  'Things you’re waiting on from other people',
  'Decisions you’ve been putting off',
  'Learning: courses, books, skills',
  'Trips and events to plan',
  'Ideas you keep thinking about',
  'Anything that’s been nagging at you this week',
];

export default function MindSweep({ captured }: { captured: number }) {
  const [i, setI] = useState(0);
  return (
    <div className="card p-4 mb-4 bg-gradient-to-br from-sky-50 to-white border-sky-200">
      <div className="flex items-center gap-2 mb-1">
        <Lightbulb size={16} className="text-sky-600" />
        <p className="font-semibold text-gray-900 text-sm">Mind sweep</p>
        <span className="ml-auto text-xs text-gray-400">{captured} captured</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Get everything out of your head. Don't sort or judge — one line each. Use the prompts if you get stuck.
      </p>
      <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-sky-100">
        <p className="flex-1 text-sm text-gray-800">{PROMPTS[i % PROMPTS.length]}…</p>
        <button
          className="shrink-0 h-8 px-2.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 flex items-center gap-1"
          onClick={() => setI((v) => v + 1)}
        >
          <RefreshCw size={12} /> Another
        </button>
      </div>
    </div>
  );
}
