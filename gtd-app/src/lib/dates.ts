import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

/** Local calendar date as 'yyyy-MM-dd'. All day-based data is keyed by this. */
export function dayKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

export function todayKey(): string {
  return dayKey(new Date());
}

export function tomorrowKey(): string {
  return dayKey(addDays(new Date(), 1));
}

export function shiftDay(key: string, days: number): string {
  return dayKey(addDays(parseISO(key), days));
}

export function daysBetween(fromKey: string, toKey: string): number {
  return differenceInCalendarDays(parseISO(toKey), parseISO(fromKey));
}

/** Day key for an ISO timestamp, in local time. */
export function isoToDayKey(iso: string): string {
  return dayKey(new Date(iso));
}

export function weekdayOf(key: string): number {
  return parseISO(key).getDay();
}

export function prettyDay(key: string): string {
  const today = todayKey();
  if (key === today) return 'Today';
  if (key === shiftDay(today, -1)) return 'Yesterday';
  if (key === shiftDay(today, 1)) return 'Tomorrow';
  return format(parseISO(key), 'EEE, MMM d');
}

export function minutesToLabel(mins: number): string {
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** 'HH:mm' → minutes since midnight */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutesToHHMM(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function hhmmLabel(hhmm: string): string {
  const mins = hhmmToMinutes(hhmm);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
}

export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Milliseconds → 'm:ss' countdown. */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
