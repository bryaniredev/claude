import { useRef, useState } from 'react';
import { Download, Upload, Trash2, CheckCircle, AlertTriangle, Settings as SettingsIcon, SlidersHorizontal } from 'lucide-react';
import { useGTDStore } from '../store/gtdStore';
import { useIvyLeeStore, type IvyLeeItem } from '../store/ivyLeeStore';
import { useDailyStore, type DailyItem, type DayLog } from '../store/dailyStore';
import { useFocusStore, type FocusSession } from '../store/focusStore';
import { useHabitStore, type Habit } from '../store/habitStore';
import { useProgressStore, type Win, type StuckEntry } from '../store/progressStore';
import { useHorizonsStore, type Area, type Goal } from '../store/horizonsStore';
import { usePrefsStore, pickPrefs, type Prefs } from '../store/prefsStore';
import { format } from 'date-fns';
import type { GTDItem, Project, WeeklyReview } from '../types';

const EXPORT_VERSION = '2.0';

interface ExportPayload {
  version: string;
  appName: string;
  exportedAt: string;
  items: GTDItem[];
  projects: Project[];
  weeklyReviews: WeeklyReview[];
  // Added in 2.0 — older exports won't have these, and those parts are left untouched on import.
  gtdIvyLee?: { items: DailyItem[]; days: Record<string, DayLog>; repairs: string[] };
  ivyLeeClassic?: { items: IvyLeeItem[] };
  focus?: { sessions: FocusSession[] };
  habits?: { habits: Habit[] };
  progress?: { wins: Win[]; stuckLog: StuckEntry[] };
  horizons?: { purpose: string; principles: string; vision: string; areas: Area[]; goals: Goal[] };
  prefs?: Partial<Prefs>;
}

function buildPayload(): ExportPayload {
  const gtd = useGTDStore.getState();
  const daily = useDailyStore.getState();
  const h = useHorizonsStore.getState();
  const progress = useProgressStore.getState();
  return {
    version: EXPORT_VERSION,
    appName: "Let's Get Things Done",
    exportedAt: new Date().toISOString(),
    items: gtd.items,
    projects: gtd.projects,
    weeklyReviews: gtd.weeklyReviews,
    gtdIvyLee: { items: daily.items, days: daily.days, repairs: daily.repairs },
    ivyLeeClassic: { items: useIvyLeeStore.getState().items },
    focus: { sessions: useFocusStore.getState().sessions },
    habits: { habits: useHabitStore.getState().habits },
    progress: { wins: progress.wins, stuckLog: progress.stuckLog },
    horizons: { purpose: h.purpose, principles: h.principles, vision: h.vision, areas: h.areas, goals: h.goals },
    prefs: pickPrefs(usePrefsStore.getState()),
  };
}

function applyPayload(p: ExportPayload) {
  useGTDStore.getState().importData({ items: p.items, projects: p.projects, weeklyReviews: p.weeklyReviews });
  if (p.gtdIvyLee) useDailyStore.getState().importData(p.gtdIvyLee);
  if (p.ivyLeeClassic) useIvyLeeStore.setState({ items: p.ivyLeeClassic.items ?? [] });
  if (p.focus) useFocusStore.getState().importData(p.focus);
  if (p.habits) useHabitStore.getState().importData(p.habits);
  if (p.progress) useProgressStore.getState().importData(p.progress);
  if (p.horizons) useHorizonsStore.getState().importData(p.horizons);
  if (p.prefs) usePrefsStore.getState().importData(p.prefs);
}

function clearEverything() {
  useGTDStore.getState().importData({ items: [], projects: [], weeklyReviews: [] });
  useDailyStore.getState().importData({});
  useIvyLeeStore.setState({ items: [] });
  useFocusStore.getState().importData({});
  useHabitStore.getState().importData({});
  useProgressStore.getState().importData({});
  useHorizonsStore.getState().importData({});
}

function isValidPayload(obj: unknown): obj is ExportPayload {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return Array.isArray(o.items) && Array.isArray(o.projects) && Array.isArray(o.weeklyReviews);
}

type ImportState =
  | { stage: 'idle' }
  | { stage: 'preview'; payload: ExportPayload; fileName: string }
  | { stage: 'success'; fileName: string; counts: { items: number; projects: number; reviews: number } }
  | { stage: 'error'; message: string };

export default function Settings() {
  const { items, projects, weeklyReviews } = useGTDStore();
  const dailyCount = useDailyStore((st) => st.items.length);
  const classicCount = useIvyLeeStore((st) => st.items.length);
  const habitCount = useHabitStore((st) => st.habits.length);
  const goalCount = useHorizonsStore((st) => st.goals.length);
  const sessionCount = useFocusStore((st) => st.sessions.length);
  const winCount = useProgressStore((st) => st.wins.length);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<ImportState>({ stage: 'idle' });
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // ── Export ────────────────────────────────────────────────────────────────
  function handleExport() {
    const payload = buildPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gtd-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Import – file selected ────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected after an error
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);
        if (!isValidPayload(raw)) {
          setImportState({ stage: 'error', message: 'File is not a valid GTD export.' });
          return;
        }
        setImportState({ stage: 'preview', payload: raw, fileName: file.name });
      } catch {
        setImportState({ stage: 'error', message: 'Could not parse file — make sure it is a valid JSON export.' });
      }
    };
    reader.readAsText(file);
  }

  // ── Import – confirmed ────────────────────────────────────────────────────
  function handleConfirmImport() {
    if (importState.stage !== 'preview') return;
    const { payload, fileName } = importState;
    applyPayload(payload);
    setImportState({
      stage: 'success',
      fileName,
      counts: {
        items: payload.items.length,
        projects: payload.projects.length,
        reviews: payload.weeklyReviews.length,
      },
    });
  }

  // ── Clear all data ────────────────────────────────────────────────────────
  function handleClearAll() {
    clearEverything();
    setShowClearConfirm(false);
    setImportState({ stage: 'idle' });
  }

  const stats = {
    items: items.length,
    projects: projects.length,
    reviews: weeklyReviews.length,
  };

  const hasData =
    stats.items > 0 ||
    stats.projects > 0 ||
    stats.reviews > 0 ||
    dailyCount + classicCount + habitCount + goalCount + sessionCount + winCount > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
          <SettingsIcon size={20} className="text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Preferences, export, import, and your data</p>
        </div>
      </div>

      <PreferencesCard />

      {/* Current data summary */}
      <div className="card p-5 mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Current Data
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Items', count: stats.items },
            { label: 'Projects', count: stats.projects },
            { label: 'Weekly Reviews', count: stats.reviews },
            { label: 'GTD Ivy Lee', count: dailyCount },
            { label: 'Ivy Lee Classic', count: classicCount },
            { label: 'Goals', count: goalCount },
            { label: 'Habits', count: habitCount },
            { label: 'Focus sessions', count: sessionCount },
            { label: 'Wins', count: winCount },
          ].map(({ label, count }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="card p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Download size={20} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">Export Data</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Download everything — GTD lists, both Ivy Lee lists, goals, habits, focus history, wins and
              preferences — as a JSON file. Use this to back up or move to another device.
            </p>
            <button
              className="btn-primary mt-4"
              onClick={handleExport}
              disabled={!hasData}
            >
              <Download size={16} />
              Download JSON export
            </button>
            {!hasData && (
              <p className="text-xs text-gray-400 mt-2">Nothing to export yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Import */}
      <div className="card p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <Upload size={20} className="text-green-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">Import Data</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Load a previously exported JSON file. This will <span className="font-medium text-gray-700">replace</span> all
              current data — export first if you want to keep it.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />

            {importState.stage === 'idle' && (
              <button
                className="btn-secondary mt-4"
                onClick={() => {
                  setImportState({ stage: 'idle' });
                  fileInputRef.current?.click();
                }}
              >
                <Upload size={16} />
                Choose JSON file
              </button>
            )}

            {importState.stage === 'error' && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-700">Import failed</p>
                  <p className="text-xs text-red-600 mt-0.5">{importState.message}</p>
                </div>
                <button
                  className="text-xs text-red-500 hover:text-red-700 underline shrink-0"
                  onClick={() => {
                    setImportState({ stage: 'idle' });
                    fileInputRef.current?.click();
                  }}
                >
                  Try again
                </button>
              </div>
            )}

            {importState.stage === 'preview' && (
              <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <p className="text-sm font-semibold text-amber-800">
                    Ready to import — this will replace your current data
                  </p>
                </div>
                {!importState.payload.gtdIvyLee && (
                  <p className="text-xs text-amber-700">
                    This is an older export: only GTD items, projects and reviews will be replaced. Your GTD Ivy
                    Lee, goals, habits and other new data stay as they are.
                  </p>
                )}
                <p className="text-xs text-amber-700">
                  File: <span className="font-medium">{importState.fileName}</span>
                  {importState.payload.exportedAt && (
                    <> · Exported {format(new Date(importState.payload.exportedAt), 'MMM d, yyyy')}</>
                  )}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Items', count: importState.payload.items.length },
                    { label: 'Projects', count: importState.payload.projects.length },
                    { label: 'Reviews', count: importState.payload.weeklyReviews.length },
                  ].map(({ label, count }) => (
                    <div key={label} className="bg-white rounded-lg p-2 text-center border border-amber-100">
                      <p className="text-lg font-bold text-gray-900">{count}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button className="btn-primary bg-amber-600 hover:bg-amber-700 focus:ring-amber-500" onClick={handleConfirmImport}>
                    <Upload size={15} /> Confirm import
                  </button>
                  <button className="btn-secondary" onClick={() => setImportState({ stage: 'idle' })}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {importState.stage === 'success' && (
              <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200 flex items-start gap-2">
                <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-700">Import successful</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Loaded {importState.counts.items} items, {importState.counts.projects} projects,
                    and {importState.counts.reviews} reviews from{' '}
                    <span className="font-medium">{importState.fileName}</span>.
                  </p>
                </div>
                <button
                  className="text-xs text-green-600 hover:text-green-800 underline shrink-0"
                  onClick={() => setImportState({ stage: 'idle' })}
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clear all data */}
      <div className="card p-5 border-red-100">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <Trash2 size={20} className="text-red-500" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">Clear All Data</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Permanently delete all items, projects, reviews, both Ivy Lee lists, goals, habits, focus
              history and wins. Preferences are kept. This cannot be undone — export first if you want a
              backup.
            </p>
            {!showClearConfirm ? (
              <button
                className="btn-danger mt-4"
                onClick={() => setShowClearConfirm(true)}
                disabled={!hasData}
              >
                <Trash2 size={16} />
                Clear all data
              </button>
            ) : (
              <div className="mt-4 flex items-center gap-3">
                <p className="text-sm font-medium text-red-600">Are you sure?</p>
                <button className="btn-danger py-1.5 px-3 text-xs" onClick={handleClearAll}>
                  Yes, delete everything
                </button>
                <button className="btn-secondary py-1.5 px-3 text-xs" onClick={() => setShowClearConfirm(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Preferences ──────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 || h === 24 ? 'am' : 'pm'}`;

function PreferencesCard() {
  const p = usePrefsStore();
  const [url, setUrl] = useState(p.coworkingUrl);
  const urlValid = !url || /^https?:\/\//i.test(url);

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal size={18} className="text-gray-500" />
        <h2 className="font-semibold text-gray-900">Preferences</h2>
      </div>
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-500">Default focus timer</span>
            <select className="input mt-1" value={p.defaultFocusMinutes} onChange={(e) => p.setPrefs({ defaultFocusMinutes: Number(e.target.value) })}>
              {[2, 5, 10, 15, 25, 45].map((m) => (
                <option key={m} value={m}>{m} minutes</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Shutdown reminder after</span>
            <select className="input mt-1" value={p.shutdownHour} onChange={(e) => p.setPrefs({ shutdownHour: Number(e.target.value) })}>
              {Array.from({ length: 10 }, (_, i) => i + 14).map((h) => (
                <option key={h} value={h}>{hourLabel(h)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Day starts</span>
            <select className="input mt-1" value={p.dayStartHour} onChange={(e) => p.setPrefs({ dayStartHour: Math.min(Number(e.target.value), p.dayEndHour - 1) })}>
              {Array.from({ length: 13 }, (_, i) => i + 4).map((h) => (
                <option key={h} value={h}>{hourLabel(h)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Day ends</span>
            <select className="input mt-1" value={p.dayEndHour} onChange={(e) => p.setPrefs({ dayEndHour: Math.max(Number(e.target.value), p.dayStartHour + 1) })}>
              {Array.from({ length: 11 }, (_, i) => i + 14).map((h) => (
                <option key={h} value={h}>{hourLabel(h)}</option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <span className="text-xs text-gray-500">Days your priority streak counts (other days never break it)</span>
          <div className="grid grid-cols-7 gap-1 mt-1">
            {WEEKDAYS.map((d, i) => {
              const on = p.streakWeekdays.includes(i);
              return (
                <button
                  key={d}
                  onClick={() =>
                    p.setPrefs({
                      streakWeekdays: on ? p.streakWeekdays.filter((x) => x !== i) : [...p.streakWeekdays, i].sort(),
                    })
                  }
                  className={`h-9 rounded-lg text-xs font-semibold border ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-200'}`}
                  aria-pressed={on}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-500">Accountability partner</span>
            <input className="input mt-1" placeholder="Name (optional)" defaultValue={p.partnerName} onBlur={(e) => p.setPrefs({ partnerName: e.target.value.trim() })} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Birthday (fresh-start prompt)</span>
            <input
              type="date"
              className="input mt-1"
              value={p.birthday ? `2000-${p.birthday}` : ''}
              onChange={(e) => p.setPrefs({ birthday: e.target.value ? e.target.value.slice(5) : '' })}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs text-gray-500">Co-working / body-doubling room link</span>
          <input
            className={`input mt-1 ${urlValid ? '' : 'border-red-300'}`}
            placeholder="https://… (e.g. a video room you work in with a friend)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => urlValid && p.setPrefs({ coworkingUrl: url.trim() })}
          />
          {!urlValid && <span className="text-xs text-red-500">Link must start with https://</span>}
        </label>

        <div className="flex flex-col gap-2">
          {(
            [
              ['freshStartEnabled', 'Fresh-start prompts (new week, month, birthday)'],
              ['soundEnabled', 'Chime when a focus timer ends'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-gray-700">
              <input type="checkbox" className="w-4 h-4" checked={p[key]} onChange={(e) => p.setPrefs({ [key]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
