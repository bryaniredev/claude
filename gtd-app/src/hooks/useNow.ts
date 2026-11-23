import { useEffect, useState } from 'react';
import { dayKey } from '../lib/dates';

/** Current time, re-rendering every `intervalMs` (pass 0 to disable ticking). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!intervalMs) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Today's day key; updates when the date changes. */
export function useToday(): string {
  const now = useNow(30_000);
  return dayKey(new Date(now));
}
