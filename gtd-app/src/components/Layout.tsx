import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import { useState } from 'react';
import { useGTDStore } from '../store/gtdStore';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/inbox', label: 'Inbox', icon: Inbox, badge: true },
  { to: '/next-actions', label: 'Next Actions', icon: Zap },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/waiting-for', label: 'Waiting For', icon: Clock },
  { to: '/someday-maybe', label: 'Someday / Maybe', icon: Star },
  { to: '/reference', label: 'Reference', icon: BookOpen },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/weekly-review', label: 'Weekly Review', icon: CheckSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const inboxCount = useGTDStore((s) => s.getInboxCount());

  return (
    <div className="flex h-screen overflow-hidden">
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
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, badge, end }) => (
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
              {badge && inboxCount > 0 && (
                <span className="badge bg-blue-100 text-blue-700 font-semibold">
                  {inboxCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">Based on David Allen's GTD®</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button className="btn-ghost p-1" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <span className="font-semibold text-gray-900">Let's Get Things Done</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
