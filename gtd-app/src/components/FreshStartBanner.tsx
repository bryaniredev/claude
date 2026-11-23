import { Link } from 'react-router-dom';
import { Sunrise, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { usePrefsStore } from '../store/prefsStore';
import { useHabitStore } from '../store/habitStore';
import { useHorizonsStore } from '../store/horizonsStore';
import { useGTDStore } from '../store/gtdStore';
import { useDailyStore } from '../store/dailyStore';
import { habitStreak, stuckItems } from '../lib/selectors';

function landmark(today: string, birthday: string): string | null {
  const d = parseISO(today);
  const md = format(d, 'MM-dd');
  if (birthday && md === birthday) return 'Happy birthday — a new year of you';
  if (md === '01-01') return "It's a new year";
  if (d.getDate() === 1) return `It's a new month — hello, ${format(d, 'MMMM')}`;
  if (d.getDay() === 1) return "It's a new week";
  return null;
}

/**
 * Fresh-start prompts: motivation measurably rises after "new chapter" dates
 * (new week, month, year, birthday). Use the moment to restart what's stalled.
 */
export default function FreshStartBanner({ today }: { today: string }) {
  const { birthday, freshStartEnabled, freshStartDismissed, setPrefs } = usePrefsStore();
  const habits = useHabitStore((s) => s.habits);
  const goals = useHorizonsStore((s) => s.goals);
  const projects = useGTDStore((s) => s.projects);
  const daily = useDailyStore((s) => s.items);

  const title = landmark(today, birthday);
  if (!freshStartEnabled || !title || freshStartDismissed === today) return null;

  const stalledHabits = habits.filter((h) => !h.archived && h.checkIns.length > 0 && habitStreak(h, today).current === 0);
  const stuck = stuckItems(daily, today);
  const orphanGoals = goals.filter(
    (g) => g.status === 'active' && !projects.some((p) => p.goalId === g.id && p.status === 'active')
  );
  const ideas = [
    stalledHabits.length > 0 && {
      text: `Restart ${stalledHabits.length === 1 ? `“${stalledHabits[0].name}”` : `${stalledHabits.length} stalled habits`}`,
      to: '/progress?tab=habits',
    },
    stuck.length > 0 && { text: `Clear ${stuck.length} stuck priorit${stuck.length === 1 ? 'y' : 'ies'}`, to: '/progress?tab=insights' },
    orphanGoals.length > 0 && {
      text: `Give ${orphanGoals.length === 1 ? `“${orphanGoals[0].title}”` : `${orphanGoals.length} goals`} a project`,
      to: '/goals',
    },
  ].filter(Boolean) as { text: string; to: string }[];

  return (
    <div className="relative p-4 rounded-2xl mb-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
      <button
        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full text-amber-700/60 hover:bg-amber-100"
        onClick={() => setPrefs({ freshStartDismissed: today })}
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <Sunrise size={22} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-900">{title} — a natural fresh start.</p>
          <p className="text-sm text-amber-800/80 mt-0.5">
            Last week's slips belong to last week. Moments like this make it easier to begin again.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {ideas.map((i) => (
              <Link key={i.to} to={i.to} className="badge bg-white border border-amber-200 text-amber-800 py-1.5 px-3">
                {i.text} →
              </Link>
            ))}
            <Link to="/gtd-ivy-lee" className="badge bg-amber-600 text-white py-1.5 px-3">
              Pick today's six →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
