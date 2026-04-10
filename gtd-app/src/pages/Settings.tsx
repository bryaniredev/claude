import { useRef, useState } from 'react';
import { Download, Upload, Trash2, CheckCircle, AlertTriangle, Settings as SettingsIcon } from 'lucide-react';
import { useGTDStore } from '../store/gtdStore';
import { format } from 'date-fns';
import type { GTDItem, Project, WeeklyReview } from '../types';

const EXPORT_VERSION = '1.0';

interface ExportPayload {
  version: string;
  appName: string;
  exportedAt: string;
  items: GTDItem[];
  projects: Project[];
  weeklyReviews: WeeklyReview[];
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
  const { items, projects, weeklyReviews, importData } = useGTDStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<ImportState>({ stage: 'idle' });
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // ── Export ────────────────────────────────────────────────────────────────
  function handleExport() {
    const payload: ExportPayload = {
      version: EXPORT_VERSION,
      appName: "Let's Get Things Done",
      exportedAt: new Date().toISOString(),
      items,
      projects,
      weeklyReviews,
    };
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
    importData({
      items: payload.items,
      projects: payload.projects,
      weeklyReviews: payload.weeklyReviews,
    });
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
    importData({ items: [], projects: [], weeklyReviews: [] });
    setShowClearConfirm(false);
    setImportState({ stage: 'idle' });
  }

  const stats = {
    items: items.length,
    projects: projects.length,
    reviews: weeklyReviews.length,
  };

  const hasData = stats.items > 0 || stats.projects > 0 || stats.reviews > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
          <SettingsIcon size={20} className="text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Export, import, and manage your data</p>
        </div>
      </div>

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
              Download all your items, projects, and weekly reviews as a JSON file. Use this to
              back up your data or move it to another device.
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
              Permanently delete all items, projects, and reviews. This cannot be undone — export
              first if you want a backup.
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
