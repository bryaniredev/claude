import { format, parseISO } from 'date-fns';
import type { DailyItem } from '../store/dailyStore';

export function planText(items: DailyItem[], date: string, partnerName?: string): string {
  const active = items.filter((i) => i.status === 'active');
  const done = items.filter((i) => i.status === 'done');
  const lines = [
    `${partnerName ? `Hey ${partnerName} — h` : 'H'}ere are my Ivy Lee priorities for ${format(parseISO(date), 'EEE d MMM')}:`,
    ...active.map((i, n) => `${n + 1}. ${i.isFrog ? '🐸 ' : ''}${i.title}${i.blockStart ? ` (${i.blockStart})` : ''}`),
  ];
  if (done.length) lines.push('', 'Done so far:', ...done.map((i) => `✓ ${i.title}`));
  lines.push('', 'Hold me to it!');
  return lines.join('\n');
}

export function reportText(items: DailyItem[], date: string, partnerName?: string): string {
  const done = items.filter((i) => i.status === 'done');
  const left = items.filter((i) => i.status === 'active');
  const lines = [
    `${partnerName ? `${partnerName}, my` : 'My'} end-of-day report for ${format(parseISO(date), 'EEE d MMM')}: ${done.length}/${items.length} done.`,
    ...done.map((i) => `✓ ${i.isFrog ? '🐸 ' : ''}${i.title}`),
    ...left.map((i) => `→ ${i.title} (rolling to tomorrow)`),
  ];
  return lines.join('\n');
}

/** Web Share sheet on phones, clipboard elsewhere. Resolves to what happened. */
export async function shareText(text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return 'shared';
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return 'failed';
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
