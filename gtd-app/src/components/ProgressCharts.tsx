import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { shiftDay, weekdayOf } from '../lib/dates';

// Sequential blue ramp (light → dark) — one hue, more is darker.
const RAMP = ['#86b6ef', '#3987e5', '#1c5cab', '#0d366b'];
const EMPTY = '#eef0f3';
const BAR = '#2a78d6';

export function StatTile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="card p-3.5">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
    </div>
  );
}

function rampColor(count: number, max: number) {
  if (count <= 0) return EMPTY;
  const scaled = Math.ceil((count / Math.max(max, 1)) * RAMP.length);
  return RAMP[Math.min(RAMP.length, Math.max(1, scaled)) - 1];
}

/** Calendar heatmap: priorities completed per day for the last `weeks` weeks. */
export function DayHeatmap({
  counts,
  rest,
  today,
  weeks = 6,
}: {
  counts: Record<string, number>;
  rest: Set<string>;
  today: string;
  weeks?: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  // Start on the Monday `weeks-1` weeks before this week's Monday.
  const offsetToMonday = (weekdayOf(today) + 6) % 7;
  const start = shiftDay(today, -offsetToMonday - (weeks - 1) * 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => shiftDay(start, i));
  const max = Math.max(1, ...cells.map((d) => counts[d] ?? 0));
  const shown = selected ?? today;

  return (
    <div>
      <div className="grid grid-cols-7 gap-[3px] max-w-sm">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => (
          <span key={i} className="text-[10px] text-gray-400 text-center pb-0.5">
            {l}
          </span>
        ))}
        {cells.map((d) => {
          const future = d > today;
          const c = counts[d] ?? 0;
          return (
            <button
              key={d}
              disabled={future}
              onClick={() => setSelected(d)}
              onMouseEnter={() => setSelected(d)}
              onFocus={() => setSelected(d)}
              className={`aspect-square rounded-[4px] relative ${future ? 'opacity-0' : ''} ${
                shown === d ? 'ring-2 ring-gray-900 ring-offset-1' : ''
              }`}
              style={{ background: future ? 'transparent' : rampColor(c, max) }}
              aria-label={`${format(parseISO(d), 'EEE d MMM')}: ${c} priorit${c === 1 ? 'y' : 'ies'} done${rest.has(d) ? ', rest day' : ''}`}
            >
              {rest.has(d) && c === 0 && (
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-400">R</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2 max-w-sm">
        <p className="text-xs text-gray-600" aria-live="polite">
          <b className="text-gray-900">{counts[shown] ?? 0}</b> done · {format(parseISO(shown), 'EEE d MMM')}
          {rest.has(shown) && ' · rest day'}
        </p>
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          Less
          {[EMPTY, ...RAMP].map((c) => (
            <span key={c} className="w-2.5 h-2.5 rounded-[3px]" style={{ background: c }} />
          ))}
          More
        </div>
      </div>
    </div>
  );
}

/** Single-series column chart (e.g. focus minutes per day). */
export function Columns({
  data,
  unit,
  highlight,
}: {
  data: { key: string; label: string; value: number }[];
  unit: string;
  highlight?: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const H = 120;
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);
  const shown = data.find((d) => d.key === (selected ?? highlight)) ?? peak;

  return (
    <div>
      <div className="flex items-end gap-2 border-b border-gray-200" style={{ height: H + 18 }}>
        {data.map((d) => {
          const h = d.value > 0 ? Math.max(3, (d.value / max) * H) : 0;
          const labelled = d.key === peak.key && d.value > 0;
          return (
            <button
              key={d.key}
              className="flex-1 h-full flex flex-col items-center justify-end group"
              onClick={() => setSelected(d.key)}
              onMouseEnter={() => setSelected(d.key)}
              onFocus={() => setSelected(d.key)}
              aria-label={`${d.label}: ${Math.round(d.value)} ${unit}`}
            >
              {labelled && <span className="text-[11px] font-semibold text-gray-700 mb-0.5">{Math.round(d.value)}</span>}
              <span
                className="w-full max-w-[24px] rounded-t-[4px] transition-opacity group-hover:opacity-80"
                style={{ height: h, background: BAR, opacity: shown.key === d.key || !selected ? 1 : 0.55 }}
              />
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 mt-1">
        {data.map((d) => (
          <span key={d.key} className="flex-1 text-center text-[11px] text-gray-400">
            {d.label}
          </span>
        ))}
      </div>
      <p className="text-xs text-gray-600 mt-2" aria-live="polite">
        <b className="text-gray-900">{Math.round(shown.value)}</b> {unit} · {shown.label}
      </p>
    </div>
  );
}

/** Ranked horizontal bars, one hue, largest first. */
export function RankedBars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-gray-700">{r.label}</span>
            <span className="font-semibold text-gray-900">{r.value}</span>
          </div>
          <div className="h-2.5 rounded-r-[4px] bg-transparent">
            <div className="h-full rounded-r-[4px]" style={{ width: `${(r.value / max) * 100}%`, background: BAR }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DataTable({ caption, rows }: { caption: string; rows: [string, string | number][] }) {
  return (
    <details className="mt-2">
      <summary className="text-xs text-gray-400 cursor-pointer select-none">Show as table</summary>
      <table className="w-full text-xs mt-1">
        <caption className="sr-only">{caption}</caption>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-t border-gray-100">
              <td className="py-1 text-gray-500">{k}</td>
              <td className="py-1 text-right tabular-nums text-gray-900">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
