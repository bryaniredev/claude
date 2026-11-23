import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Play } from 'lucide-react';
import { useGTDStore } from '../store/gtdStore';
import { useDailyStore } from '../store/dailyStore';
import { quadrantRank } from '../lib/quadrants';
import { startFocus } from '../lib/tasks';
import type { EnergyLevel } from '../types';

const TIMES = [
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: 'Any', value: 0 },
];

const ENERGY: { label: string; value: EnergyLevel }[] = [
  { label: '🪫 Low', value: 'low' },
  { label: '🔋 Medium', value: 'medium' },
  { label: '⚡ High', value: 'high' },
];

const ENERGY_RANK: Record<EnergyLevel, number> = { low: 0, medium: 1, high: 2 };

/** "I have 15 minutes and low energy — what can I do?" Removes the what-should-I-do stall. */
export default function WhatNowPicker({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const items = useGTDStore((s) => s.items);
  const daily = useDailyStore((s) => s.items);
  const [time, setTime] = useState<number | null>(null);
  const [energy, setEnergy] = useState<EnergyLevel | null>(null);

  const plannedGtd = useMemo(
    () => new Set(daily.filter((d) => d.status === 'active').map((d) => d.gtdItemId)),
    [daily]
  );

  const actions = items.filter((i) => i.status === 'next-action');
  const ready = time !== null && energy !== null;

  const matches = useMemo(() => {
    if (time === null || energy === null) return [];
    return actions
      .filter((a) => (time === 0 ? true : (a.timeEstimate ?? Infinity) <= time))
      .filter((a) => ENERGY_RANK[a.energyLevel ?? 'medium'] <= ENERGY_RANK[energy])
      .sort(
        (a, b) =>
          Number(plannedGtd.has(b.id)) - Number(plannedGtd.has(a.id)) ||
          quadrantRank(a) - quadrantRank(b) ||
          (a.timeEstimate ?? 999) - (b.timeEstimate ?? 999)
      )
      .slice(0, compact ? 4 : 8);
  }, [actions, time, energy, plannedGtd, compact]);

  const unestimated = actions.filter((a) => !a.timeEstimate).length;

  const chip = (active: boolean) =>
    `h-9 px-3 rounded-full text-sm font-medium border transition-colors ${
      active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'
    }`;

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Compass size={18} className="text-teal-600" />
        <p className="font-semibold text-gray-900 text-sm">What now?</p>
        <p className="text-xs text-gray-400">Pick your time & energy</p>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {TIMES.map((t) => (
          <button key={t.value} className={chip(time === t.value)} onClick={() => setTime(t.value)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ENERGY.map((e) => (
          <button key={e.value} className={chip(energy === e.value)} onClick={() => setEnergy(e.value)}>
            {e.label}
          </button>
        ))}
      </div>

      {ready && (
        <div className="mt-3 space-y-1.5">
          {matches.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">
              Nothing fits. Try "Any" time
              {unestimated > 0 && ` — ${unestimated} action${unestimated !== 1 ? 's have' : ' has'} no time estimate`}
              .
            </p>
          ) : (
            matches.map((a) => (
              <div key={a.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-snug">{a.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {plannedGtd.has(a.id) && <span className="text-blue-600 font-medium">Today's priority · </span>}
                    {a.timeEstimate ? `${a.timeEstimate} min` : 'no estimate'}
                    {a.context && ` · ${a.context}`}
                  </p>
                </div>
                <button
                  className="btn-primary h-9 px-3 text-xs"
                  onClick={() => {
                    startFocus({
                      title: a.title,
                      minutes: Math.min(a.timeEstimate ?? (time || 25), time || 60) || 10,
                      gtdItemId: a.id,
                    });
                    navigate('/focus');
                  }}
                >
                  <Play size={13} /> Start
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
