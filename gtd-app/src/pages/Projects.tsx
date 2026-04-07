import { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { useGTDStore } from '../store/gtdStore';
import { format } from 'date-fns';

export default function Projects() {
  const { projects, items, addProject, completeProject, deleteProject } =
    useGTDStore();
  const activeProjects = projects.filter((p) => p.status === 'active');
  const completedProjects = projects.filter((p) => p.status === 'completed');

  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    addProject(title.trim(), notes.trim(), outcome.trim());
    setTitle('');
    setOutcome('');
    setNotes('');
    setShowAdd(false);
  }

  function getNextActions(projectId: string) {
    return items.filter(
      (i) => i.projectId === projectId && i.status === 'next-action'
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <FolderKanban size={20} className="text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500">Outcomes requiring more than one action</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="badge bg-purple-100 text-purple-700 font-semibold text-sm px-3 py-1">
            {activeProjects.length}
          </span>
          <button className="btn-primary" onClick={() => setShowAdd((v) => !v)}>
            <Plus size={16} />
            New
          </button>
        </div>
      </div>

      {/* Add project form */}
      {showAdd && (
        <div className="card p-4 mb-6">
          <form onSubmit={handleAdd} className="space-y-3">
            <p className="font-semibold text-sm text-gray-700">New Project</p>
            <input
              className="input"
              placeholder="Project title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <textarea
              className="textarea h-14"
              placeholder="Desired outcome — what does 'done' look like?"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            />
            <textarea
              className="textarea h-14"
              placeholder="Notes (optional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={!title.trim()}>
                <Plus size={16} /> Add Project
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active projects */}
      {activeProjects.length === 0 && !showAdd ? (
        <div className="text-center py-16">
          <FolderKanban size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No active projects</p>
          <p className="text-gray-400 text-sm mt-1">
            Add a project or clarify multi-step items from your Inbox
          </p>
          <button className="btn-primary mt-4" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> New Project
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {activeProjects.map((project) => {
            const nextActions = getNextActions(project.id);
            const isExpanded = expandedId === project.id;
            return (
              <div key={project.id} className="card overflow-hidden">
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : project.id)}
                >
                  <div className="w-5 h-5 mt-0.5 rounded-md border-2 border-purple-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{project.title}</p>
                    {project.outcome && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 italic">
                        "{project.outcome}"
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="badge bg-purple-50 text-purple-600 text-xs">
                        {nextActions.length} next action{nextActions.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-gray-400">
                        Since {format(new Date(project.createdAt), 'MMM d')}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                    {project.notes && (
                      <p className="text-xs text-gray-600">{project.notes}</p>
                    )}
                    {project.outcome && (
                      <div className="text-xs bg-purple-50 border border-purple-100 rounded-lg p-2.5">
                        <span className="font-medium text-purple-700">Desired outcome: </span>
                        <span className="text-purple-600">{project.outcome}</span>
                      </div>
                    )}

                    {nextActions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">Next Actions</p>
                        <div className="space-y-1">
                          {nextActions.map((action) => (
                            <div
                              key={action.id}
                              className="flex items-center gap-2 text-xs text-gray-700 bg-white rounded-lg px-3 py-2 border border-gray-200"
                            >
                              <Zap size={12} className="text-green-500 shrink-0" />
                              {action.title}
                              {action.context && (
                                <span className="ml-auto badge bg-gray-100 text-gray-500">
                                  {action.context}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        className="btn-ghost py-1 px-3 text-xs text-green-600 hover:bg-green-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          completeProject(project.id);
                        }}
                      >
                        <Check size={12} /> Complete
                      </button>
                      <button
                        className="btn-ghost py-1 px-3 text-xs text-red-500 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this project?')) deleteProject(project.id);
                        }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Completed projects */}
      {completedProjects.length > 0 && (
        <div className="mt-8">
          <button
            className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1 hover:text-gray-600 transition-colors"
            onClick={() => setShowCompleted((v) => !v)}
          >
            Completed ({completedProjects.length})
            {showCompleted ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showCompleted && (
            <div className="space-y-2 mt-3">
              {completedProjects.map((p) => (
                <div
                  key={p.id}
                  className="card p-3 flex items-center gap-3 opacity-60"
                >
                  <Check size={16} className="text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 line-through">{p.title}</p>
                    {p.completedAt && (
                      <p className="text-xs text-gray-400">
                        Completed {format(new Date(p.completedAt), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <button
                    className="btn-ghost p-1 text-gray-300 hover:text-red-400"
                    onClick={() => deleteProject(p.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
