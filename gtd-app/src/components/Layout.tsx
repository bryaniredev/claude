import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Inbox,
  Zap,
  FolderKanban,
  Clock,
  Star,
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  CheckSquare,
  Menu,
  X,
  Settings,
  Sparkles,
  ListChecks,
  Timer,
  LifeBuoy,
  Moon,
  TrendingUp,
  Mountain,
  Navigation,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useGTDStore } from '../store/gtdStore';
import { useDailyStore, itemsForDay } from '../store/dailyStore';
import { useToday } from '../hooks/useNow';
import { AppWatchers, TimerChip } from './FocusWatcher';
import GuideBar from './GuideBar';
import { usePrefsStore } from '../store/prefsStore';

type NavItem = {
  to: string;
  label: string;
  icon: typeof Inbox;
  end?: boolean;
  badge?: 'inbox' | 'today';
};

const navGroups: { title?: string; items: NavItem[] }[] = [
  {
    title: 'Today',
    items: [
      { to: '/guide', label: 'Guide', icon: Navigation },
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/gtd-ivy-lee', label: 'GTD Ivy Lee', icon: ListChecks, badge: 'today' },
      { to: '/focus', label: 'Focus', icon: Timer },
      { to: '/unstuck', label: "I'm Stuck", icon: LifeBuoy },
      { to: '/shutdown', label: 'Evening Shutdown', icon: Moon },
    ],
  },
  {
    title: 'Capture & Organise',
    items: [
      { to: '/inbox', label: 'Inbox', icon: Inbox, badge: 'inbox' },
      { to: '/next-actions', label: 'Next Actions', icon: Zap },
      { to: '/projects', label: 'Projects', icon: FolderKanban },
      { to: '/waiting-for', label: 'Waiting For', icon: Clock },
      { to: '/someday-maybe', label: 'Someday / Maybe', icon: Star },
      { to: '/reference', label: 'Reference', icon: BookOpen },
      { to: '/calendar', label: 'Calendar', icon: CalendarDays },
    ],
  },
  {
    title: 'Reflect',
    items: [
      { to: '/weekly-review', label: 'Weekly Review', icon: CheckSquare },
      { to: '/progress', label: 'Progress', icon: TrendingUp },
      { to: '/goals', label: 'Goals & Horizons', icon: Mountain },
    ],
  },
  {
    title: 'More',
    items: [
      { to: '/ivy-lee', label: 'Ivy Lee Classic', icon: Sparkles },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  // Optionally open the app on the Guide (only on first load, so Dashboard stays reachable).
  const navigate = useNavigate();
  const startPage = usePrefsStore((s) => s.startPage);
  const startHandled = useRef(false);
  useEffect(() => {
    if (startHandled.current) return;
    startHandled.current = true;
    if (startPage === 'guide' && pathname === '/') navigate('/guide', { replace: true });
  }, [startPage, pathname, navigate]);
  const inboxCount = useGTDStore((s) => s.getInboxCount());
  const today = useToday();
  const todayLeft = useDailyStore((s) => itemsForDay(s.items, today).filter((i) => i.status === 'active').length);

  return (
    <div className="flex h-screen overflow-hidden">
      <AppWatchers />
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col bg-white border-r border-gray-200 transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <CheckSquare size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">Let's Get</p>
            <p className="font-bold text-blue-600 text-sm leading-tight">Things Done</p>
          </div>
          <button
            className="ml-auto lg:hidden btn-ghost p-1 rounded"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-3">
              {group.title && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon, badge, end }) => {
                  const count = badge === 'inbox' ? inboxCount : badge === 'today' ? todayLeft : 0;
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`
                      }
                    >
                      <Icon size={18} />
                      <span className="flex-1">{label}</span>
                      {count > 0 && (
                        <span className="badge bg-blue-100 text-blue-700 font-semibold">{count}</span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex justify-center mb-2">
            <TimerChip onClick={() => setSidebarOpen(false)} />
          </div>
          <p className="text-xs text-gray-400 text-center">Based on David Allen's GTD® & the Ivy Lee Method</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button className="btn-ghost p-1" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <span className="font-semibold text-gray-900 flex-1">Let's Get Things Done</span>
          <TimerChip />
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <GuideBar />
          {children}
        </main>
      </div>
    </div>
  );
}
