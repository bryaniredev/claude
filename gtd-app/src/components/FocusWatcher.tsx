import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Timer, Coffee, Pause } from 'lucide-react';
import { remainingMs, useFocusStore } from '../store/focusStore';
import { usePrefsStore } from '../store/prefsStore';
import { useDailyStore } from '../store/dailyStore';
import { useNow, useToday } from '../hooks/useNow';
import { finishTimer } from '../lib/tasks';
import { chime, notify } from '../lib/sound';
import { formatClock } from '../lib/dates';

/**
 * Runs app-wide: finishes the timer when it hits zero (even if you're on
 * another page), chimes, shows the countdown in the tab title, and performs
 * the daily Ivy Lee rollover when the date changes.
 */
export function AppWatchers() {
  const active = useFocusStore((s) => s.active);
  const soundEnabled = usePrefsStore((s) => s.soundEnabled);
  const ticking = Boolean(active && !active.finished && !active.pausedAt);
  const now = useNow(ticking ? 1000 : 0);
  const today = useToday();
  const rollover = useDailyStore((s) => s.rollover);

  useEffect(() => {
    rollover(today);
  }, [today, rollover]);

  useEffect(() => {
    if (!active || active.finished || active.pausedAt) return;
    if (remainingMs(active, now) <= 0) {
      finishTimer();
      if (soundEnabled) chime();
      notify(
        active.mode === 'focus' ? 'Focus session done' : 'Break over',
        active.mode === 'focus' ? `Nice work on “${active.title}”.` : 'Ready for another round?'
      );
    }
  }, [active, now, soundEnabled]);

  useEffect(() => {
    const base = "Let's Get Things Done";
    if (!active) {
      document.title = base;
      return;
    }
    if (active.finished) document.title = active.mode === 'focus' ? '✓ Session done' : '✓ Break over';
    else document.title = `${active.pausedAt ? '⏸' : active.mode === 'focus' ? '⏱' : '☕'} ${formatClock(remainingMs(active, now))} · ${active.title}`;
  }, [active, now]);

  return null;
}

/** Small running-timer pill for the sidebar / mobile header. */
export function TimerChip({ onClick }: { onClick?: () => void }) {
  const active = useFocusStore((s) => s.active);
  const ticking = Boolean(active && !active.finished && !active.pausedAt);
  const now = useNow(ticking ? 1000 : 0);
  if (!active) return null;
  const Icon = active.pausedAt ? Pause : active.mode === 'break' ? Coffee : Timer;
  return (
    <Link
      to="/focus"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 h-8 rounded-full text-xs font-semibold tabular-nums ${
        active.finished
          ? 'bg-green-100 text-green-700'
          : active.mode === 'break'
          ? 'bg-teal-100 text-teal-700'
          : 'bg-blue-600 text-white'
      }`}
    >
      <Icon size={13} />
      {active.finished ? 'Done!' : formatClock(remainingMs(active, now))}
    </Link>
  );
}
