/**
 * Actions that touch more than one store. Pages call these instead of the
 * stores directly so GTD Next Actions and GTD Ivy Lee priorities stay in sync.
 */
import { useGTDStore } from '../store/gtdStore';
import { useDailyStore, DAILY_LIMIT, itemsForDay } from '../store/dailyStore';
import { useFocusStore } from '../store/focusStore';

function dailyById(id: string) {
  return useDailyStore.getState().items.find((i) => i.id === id);
}

export function dayIsFull(date: string): boolean {
  return itemsForDay(useDailyStore.getState().items, date).length >= DAILY_LIMIT;
}

export function isPlanned(gtdItemId: string): boolean {
  return useDailyStore
    .getState()
    .items.some((i) => i.gtdItemId === gtdItemId && i.status === 'active');
}

/** Put an existing Next Action on a day's Ivy Lee list. */
export function planNextAction(gtdItemId: string, date: string): boolean {
  const item = useGTDStore.getState().items.find((i) => i.id === gtdItemId);
  if (!item) return false;
  return Boolean(
    useDailyStore.getState().addItem({
      title: item.title,
      gtdItemId,
      date,
      estimateMinutes: item.timeEstimate,
    })
  );
}

/** Type a brand-new priority — it's also captured as a GTD Next Action so it lives in one trusted system. */
export function planNewPriority(title: string, date: string): boolean {
  if (dayIsFull(date)) return false;
  const gtd = useGTDStore.getState();
  const created = gtd.addItem(title);
  gtd.updateItem(created.id, { status: 'next-action' });
  return Boolean(useDailyStore.getState().addItem({ title, gtdItemId: created.id, date }));
}

export function completePriority(dailyId: string) {
  const item = dailyById(dailyId);
  if (!item) return;
  useDailyStore.getState().markDone(dailyId);
  if (item.gtdItemId) {
    const gtd = useGTDStore.getState();
    const linked = gtd.items.find((g) => g.id === item.gtdItemId);
    if (linked && linked.status !== 'done') gtd.completeItem(linked.id);
  }
}

export function undoPriority(dailyId: string) {
  const item = dailyById(dailyId);
  if (!item) return;
  useDailyStore.getState().undoDone(dailyId);
  if (item.gtdItemId) {
    const gtd = useGTDStore.getState();
    const linked = gtd.items.find((g) => g.id === item.gtdItemId);
    if (linked && linked.status === 'done')
      gtd.updateItem(linked.id, { status: 'next-action', completedAt: undefined });
  }
}

/** Completing a Next Action anywhere also ticks it off today's Ivy Lee list. */
export function completeNextAction(gtdItemId: string) {
  useGTDStore.getState().completeItem(gtdItemId);
  useDailyStore.getState().markDoneByGtdId(gtdItemId);
}

/** Take it off the day's list — it stays in Next Actions. */
export function unplanPriority(dailyId: string) {
  useDailyStore.getState().removeItem(dailyId);
}

export function priorityToSomeday(dailyId: string) {
  const item = dailyById(dailyId);
  useDailyStore.getState().removeItem(dailyId);
  if (item?.gtdItemId) useGTDStore.getState().moveItem(item.gtdItemId, 'someday-maybe');
}

export function priorityToWaiting(dailyId: string, delegatedTo: string) {
  const item = dailyById(dailyId);
  useDailyStore.getState().removeItem(dailyId);
  if (item?.gtdItemId)
    useGTDStore.getState().updateItem(item.gtdItemId, {
      status: 'waiting-for',
      delegatedTo,
      delegatedDate: new Date().toISOString(),
    });
}

export function trashPriority(dailyId: string) {
  const item = dailyById(dailyId);
  useDailyStore.getState().removeItem(dailyId);
  if (item?.gtdItemId) useGTDStore.getState().moveItem(item.gtdItemId, 'trash');
}

export function renamePriority(dailyId: string, title: string) {
  const item = dailyById(dailyId);
  if (!item || !title.trim()) return;
  useDailyStore.getState().updateItem(dailyId, { title: title.trim() });
  if (item.gtdItemId) useGTDStore.getState().updateItem(item.gtdItemId, { title: title.trim() });
}

export function setPriorityEstimate(dailyId: string, minutes: number | undefined) {
  const item = dailyById(dailyId);
  if (!item) return;
  useDailyStore.getState().updateItem(dailyId, { estimateMinutes: minutes });
  if (item.gtdItemId) useGTDStore.getState().updateItem(item.gtdItemId, { timeEstimate: minutes });
}

// ─── Focus timer ──────────────────────────────────────────────────────────────

export function startFocus(input: {
  title: string;
  minutes: number;
  dailyItemId?: string;
  gtdItemId?: string;
}) {
  let { dailyItemId } = input;
  const { gtdItemId } = input;
  if (!dailyItemId && gtdItemId) {
    dailyItemId = useDailyStore
      .getState()
      .items.find((i) => i.gtdItemId === gtdItemId && i.status === 'active')?.id;
  }
  useFocusStore.getState().start({ mode: 'focus', ...input, dailyItemId, gtdItemId });
}

export function startBreak(minutes: number) {
  useFocusStore.getState().start({ mode: 'break', title: 'Break', minutes });
}

function creditMinutes(session: { dailyItemId?: string; focusedMinutes: number } | null) {
  if (session?.dailyItemId && session.focusedMinutes > 0)
    useDailyStore.getState().addActualMinutes(session.dailyItemId, session.focusedMinutes);
}

export function finishTimer() {
  creditMinutes(useFocusStore.getState().finish());
}

export function stopTimer() {
  creditMinutes(useFocusStore.getState().stop());
}

/** Quick capture to the GTD Inbox without leaving what you're doing. */
export function captureToInbox(title: string) {
  if (!title.trim()) return;
  useGTDStore.getState().addItem(title.trim());
}
