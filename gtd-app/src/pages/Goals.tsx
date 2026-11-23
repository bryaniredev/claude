import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  Target,
  Plus,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Check,
  Trash2,
  RotateCcw,
  Compass,
  Mountain,
  Layers,
  X,
} from 'lucide-react';
import { useHorizonsStore, type Goal } from '../store/horizonsStore';
import { useGTDStore } from '../store/gtdStore';
import WoopSheet from '../components/WoopSheet';

type Tab = 'goals' | 'vision' | 'areas';

const LADDER = [
  { alt: '50,000 ft', name: 'Purpose & principles', tab: 'vision' as Tab },
  { alt: '40,000 ft', name: 'Vision (3–5 years)', tab: 'vision' as Tab },
  { alt: '30,000 ft', name: 'Goals (1–2 years)', tab: 'goals' as Tab },
  { alt: '20,000 ft', name: 'Areas of focus', tab: 'areas' as Tab },
  { alt: '10,000 ft', name: 'Projects', to: '/projects' },
  { alt: 'Runway', name: 'Next actions', to: '/next-actions' },
];

// ─── Goal card ────────────────────────────────────────────────────────────────

function GoalCard({ goal }: { goal: Goal }) {
  const { updateGoal, deleteGoal, areas } = useHorizonsStore();
  const { projects, items, updateProject } = useGTDStore();
  const [open, setOpen] = useState(false);
  const [woopOpen, setWoopOpen] = useState(false);

  const linked = projects.filter((p) => p.goalId === goal.id);
  const activeLinked = linked.filter((p) => p.status === 'active');
  const doneLinked = linked.filter((p) => p.status === 'completed');
  const unlinked = projects.filter((p) => p.status === 'active' && !p.goalId);
  const nextActions = items.filter(
    (i) => i.status === 'next-action' && activeLinked.some((p) => p.id === i.projectId)
  ).length;
  const area = areas.find((a) => a.id === goal.areaId);
  const isActive = goal.status === 'active';

  return (
    <div className={`card overflow-hidden ${isActive ? '' : 'opacity-70'}`}>
      <button className="w-full flex items-start gap-3 p-4 text-left" onClick={() => setOpen((v) => !v)}>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${goal.status === 'achieved' ? 'bg-green-100' : 'bg-emerald-50'}`}>
          {goal.status === 'achieved' ? <Check size={18} className="text-green-600" /> : <Target size={18} className="text-emerald-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-gray-900 ${goal.status !== 'active' ? 'line-through' : ''}`}>{goal.title}</p>
          {goal.why && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">Why: {goal.why}</p>}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {area && <span className="badge bg-gray-100 text-gray-600">{area.name}</span>}
            {goal.targetDate && (
              <span className="badge bg-gray-100 text-gray-600">by {format(parseISO(goal.targetDate), 'MMM yyyy')}</span>
            )}
            <span className="badge bg-purple-50 text-purple-600">
              {activeLinked.length} project{activeLinked.length !== 1 ? 's' : ''}
              {doneLinked.length > 0 && ` · ${doneLinked.length} done`}
            </span>
            {goal.woop?.plan && <span className="badge bg-emerald-50 text-emerald-700">WOOP ✓</span>}
          </div>
          {isActive && activeLinked.length === 0 && (
            <p className="text-xs text-amber-700 mt-1.5">No project moves this goal yet — link or create one.</p>
          )}
          {isActive && activeLinked.length > 0 && nextActions === 0 && (
            <p className="text-xs text-amber-700 mt-1.5">Its projects have no next actions — what's the next step?</p>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400 mt-1" /> : <ChevronDown size={16} className="text-gray-400 mt-1" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
          {/* WOOP */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">WOOP</p>
            {goal.woop?.plan ? (
              <div className="text-sm text-gray-700 space-y-1 bg-white rounded-xl border border-gray-200 p-3">
                <p><b>Wish:</b> {goal.woop.wish}</p>
                <p><b>Outcome:</b> {goal.woop.outcome}</p>
                <p><b>Obstacle:</b> {goal.woop.obstacle}</p>
                <p><b>Plan:</b> {goal.woop.plan}</p>
                <button className="text-xs text-emerald-700 mt-1" onClick={() => setWoopOpen(true)}>Edit</button>
              </div>
            ) : (
              <button className="btn-secondary w-full justify-center" onClick={() => setWoopOpen(true)}>
                <Compass size={16} /> Do a WOOP for this goal (2 min)
              </button>
            )}
          </div>

          {/* Projects */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Projects</p>
            {linked.length > 0 && (
              <ul className="space-y-1 mb-2">
                {linked.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <FolderKanban size={14} className={p.status === 'completed' ? 'text-green-500' : 'text-purple-500'} />
                    <span className={`flex-1 ${p.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{p.title}</span>
                    <button onClick={() => updateProject(p.id, { goalId: undefined })} className="text-gray-300 hover:text-red-500" aria-label="Unlink project">
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              {unlinked.length > 0 && (
                <select
                  className="input h-10 text-sm flex-1"
                  value=""
                  onChange={(e) => e.target.value && updateProject(e.target.value, { goalId: goal.id })}
                >
                  <option value="">Link an existing project…</option>
                  {unlinked.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              )}
              <Link to={`/projects?goal=${goal.id}`} className="btn-secondary h-10 text-sm">
                <Plus size={14} /> New project
              </Link>
            </div>
          </div>

          {/* Edit */}
          <div className="grid grid-cols-2 gap-2">
            <label className="block col-span-2">
              <span className="text-xs text-gray-500">Why does this matter to you?</span>
              <textarea
                className="textarea h-16 mt-1 text-base"
                defaultValue={goal.why}
                onBlur={(e) => updateGoal(goal.id, { why: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">Area</span>
              <select className="input h-10 mt-1 text-sm" value={goal.areaId ?? ''} onChange={(e) => updateGoal(goal.id, { areaId: e.target.value || undefined })}>
                <option value="">None</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">Target date</span>
              <input type="date" className="input h-10 mt-1 text-sm" value={goal.targetDate ?? ''} onChange={(e) => updateGoal(goal.id, { targetDate: e.target.value || undefined })} />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {isActive ? (
              <>
                <button className="btn-ghost py-1 px-3 text-xs text-green-600 hover:bg-green-50" onClick={() => updateGoal(goal.id, { status: 'achieved', achievedAt: new Date().toISOString() })}>
                  <Check size={13} /> Achieved!
                </button>
                <button className="btn-ghost py-1 px-3 text-xs text-gray-500" onClick={() => updateGoal(goal.id, { status: 'dropped' })}>
                  Let it go
                </button>
              </>
            ) : (
              <button className="btn-ghost py-1 px-3 text-xs text-blue-600" onClick={() => updateGoal(goal.id, { status: 'active', achievedAt: undefined })}>
                <RotateCcw size={13} /> Reactivate
              </button>
            )}
            <button
              className="btn-ghost py-1 px-3 text-xs text-red-500 hover:bg-red-50 ml-auto"
              onClick={() => confirm('Delete this goal?') && deleteGoal(goal.id)}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
      )}

      {woopOpen && (
        <WoopSheet
          initial={goal.woop ?? { wish: goal.title, outcome: '', obstacle: '', plan: '' }}
          onSave={(woop) => updateGoal(goal.id, { woop })}
          onClose={() => setWoopOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function GoalsTab() {
  const { goals, areas, addGoal, updateGoal } = useHorizonsStore();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [areaId, setAreaId] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [quickWoop, setQuickWoop] = useState(false);
  const [showClosed, setShowClosed] = useState(false);

  const active = goals.filter((g) => g.status === 'active');
  const closed = goals.filter((g) => g.status !== 'active');

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button className="btn-primary flex-1 justify-center" onClick={() => setShowAdd((v) => !v)}>
          <Plus size={16} /> New goal
        </button>
        <button className="btn-secondary flex-1 justify-center" onClick={() => setQuickWoop(true)}>
          <Compass size={16} /> Start with a WOOP
        </button>
      </div>

      {showAdd && (
        <form
          className="card p-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            addGoal({ title: title.trim(), why: why.trim(), areaId: areaId || undefined, targetDate: targetDate || undefined });
            setTitle('');
            setWhy('');
            setAreaId('');
            setTargetDate('');
            setShowAdd(false);
          }}
        >
          <input className="input h-11 text-base" placeholder="Goal for the next 1–2 years…" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <textarea className="textarea h-16 text-base" placeholder="Why does it matter to you?" value={why} onChange={(e) => setWhy(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <select className="input h-10 text-sm" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
              <option value="">Area (optional)</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <input type="date" className="input h-10 text-sm" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} aria-label="Target date" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn-primary" disabled={!title.trim()}>Add goal</button>
          </div>
        </form>
      )}

      {active.length === 0 && !showAdd ? (
        <div className="text-center py-10">
          <Target size={44} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No goals yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
            Goals give your tasks a reason. When a priority shows which goal it moves forward, it's easier to start.
          </p>
        </div>
      ) : (
        active.map((g) => <GoalCard key={g.id} goal={g} />)
      )}

      {closed.length > 0 && (
        <div className="pt-3">
          <button className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1" onClick={() => setShowClosed((v) => !v)}>
            Achieved & let go ({closed.length}) {showClosed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showClosed && <div className="space-y-2 mt-2">{closed.map((g) => <GoalCard key={g.id} goal={g} />)}</div>}
        </div>
      )}

      {quickWoop && (
        <WoopSheet
          onSave={(woop) => {
            const goal = addGoal({ title: woop.wish.trim(), why: woop.outcome.trim() });
            updateGoal(goal.id, { woop });
          }}
          onClose={() => setQuickWoop(false)}
        />
      )}
    </div>
  );
}

function VisionTab() {
  const { purpose, principles, vision, setText } = useHorizonsStore();
  const fields = [
    {
      key: 'purpose' as const,
      label: 'Purpose',
      alt: '50,000 ft',
      prompt: 'Why do you do what you do? What is the point of it all for you?',
      value: purpose,
    },
    {
      key: 'principles' as const,
      label: 'Principles',
      alt: '50,000 ft',
      prompt: 'What standards do you want to live and work by?',
      value: principles,
    },
    {
      key: 'vision' as const,
      label: 'Vision',
      alt: '40,000 ft',
      prompt: 'If things go wonderfully, what does your life and work look like in 3–5 years?',
      value: vision,
    },
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        The highest horizons. Rough is fine; revisit them every few months in your Weekly Review.
      </p>
      {fields.map((f) => (
        <label key={f.key} className="card p-4 block">
          <span className="flex items-baseline gap-2">
            <span className="font-semibold text-gray-900">{f.label}</span>
            <span className="text-[11px] text-gray-400">{f.alt}</span>
          </span>
          <span className="block text-xs text-gray-500 mt-0.5">{f.prompt}</span>
          <textarea
            className="textarea h-24 mt-2 text-base"
            defaultValue={f.value}
            onBlur={(e) => setText(f.key, e.target.value)}
            placeholder="Write freely…"
          />
        </label>
      ))}
    </div>
  );
}

function AreasTab() {
  const { areas, goals, addArea, updateArea, deleteArea } = useHorizonsStore();
  const [name, setName] = useState('');
  const examples = ['Health', 'Family', 'Finances', 'Career', 'Home', 'Friends', 'Learning', 'Fun'];

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        The ongoing parts of life you want to keep in good shape. They don't finish — you maintain them. Use them to spot
        neglected areas in your Weekly Review.
      </p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          addArea(name.trim());
          setName('');
        }}
      >
        <input className="input h-11 text-base flex-1" placeholder="New area…" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn-primary h-11" disabled={!name.trim()} aria-label="Add area">
          <Plus size={16} />
        </button>
      </form>
      {areas.length === 0 && (
        <div className="flex flex-wrap gap-1.5">
          {examples.map((x) => (
            <button key={x} className="badge bg-white border border-gray-200 text-gray-600 py-1.5 px-3" onClick={() => addArea(x)}>
              + {x}
            </button>
          ))}
        </div>
      )}
      {areas.map((a) => {
        const areaGoals = goals.filter((g) => g.areaId === a.id && g.status === 'active');
        return (
          <div key={a.id} className="card p-4">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-gray-400" />
              <input
                className="flex-1 font-semibold text-gray-900 bg-transparent focus:outline-none"
                defaultValue={a.name}
                onBlur={(e) => e.target.value.trim() && updateArea(a.id, { name: e.target.value.trim() })}
                aria-label="Area name"
              />
              <button onClick={() => confirm(`Delete area “${a.name}”?`) && deleteArea(a.id)} className="text-gray-300 hover:text-red-500" aria-label="Delete area">
                <Trash2 size={14} />
              </button>
            </div>
            <input
              className="input h-9 mt-2 text-sm"
              placeholder="What does 'in good shape' look like?"
              defaultValue={a.description}
              onBlur={(e) => updateArea(a.id, { description: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-2">
              {areaGoals.length ? `Goals: ${areaGoals.map((g) => g.title).join(', ')}` : 'No active goals in this area'}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function Goals() {
  const [params, setParams] = useSearchParams();
  const tab = (['goals', 'vision', 'areas'].includes(params.get('tab') ?? '') ? params.get('tab') : 'goals') as Tab;
  const setTab = (t: Tab) => setParams(t === 'goals' ? {} : { tab: t });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Mountain size={20} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goals & Horizons</h1>
          <p className="text-sm text-gray-500">The why behind your next actions</p>
        </div>
      </div>

      {/* Horizons ladder */}
      <div className="card p-3 mb-4">
        <div className="grid grid-cols-1 gap-0.5">
          {LADDER.map((l) => {
            const content = (
              <>
                <span className="w-16 text-[11px] text-gray-400 shrink-0">{l.alt}</span>
                <span className="text-sm text-gray-700">{l.name}</span>
              </>
            );
            const cls = `flex items-center gap-2 px-2 py-1.5 rounded-lg text-left ${
              l.tab === tab && !l.to ? 'bg-emerald-50' : 'hover:bg-gray-50'
            }`;
            return l.to ? (
              <Link key={l.alt} to={l.to} className={cls}>{content}<span className="ml-auto text-gray-300">→</span></Link>
            ) : (
              <button key={l.alt} className={cls} onClick={() => setTab(l.tab!)}>{content}</button>
            );
          })}
        </div>
      </div>

      <div className="flex p-1 bg-gray-200/70 rounded-xl mb-4">
        {(
          [
            ['goals', 'Goals'],
            ['vision', 'Vision & Purpose'],
            ['areas', 'Areas'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold ${tab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'goals' && <GoalsTab />}
      {tab === 'vision' && <VisionTab />}
      {tab === 'areas' && <AreasTab />}
    </div>
  );
}
