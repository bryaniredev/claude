import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';

const Inbox = lazy(() => import('./pages/Inbox'));
const NextActions = lazy(() => import('./pages/NextActions'));
const Projects = lazy(() => import('./pages/Projects'));
const WaitingFor = lazy(() => import('./pages/WaitingFor'));
const SomedayMaybe = lazy(() => import('./pages/SomedayMaybe'));
const Reference = lazy(() => import('./pages/Reference'));
const CalendarView = lazy(() => import('./pages/CalendarView'));
const WeeklyReview = lazy(() => import('./pages/WeeklyReview'));
const Settings = lazy(() => import('./pages/Settings'));
const IvyLee = lazy(() => import('./pages/IvyLee'));
const GtdIvyLee = lazy(() => import('./pages/GtdIvyLee'));
const Focus = lazy(() => import('./pages/Focus'));
const Unstuck = lazy(() => import('./pages/Unstuck'));
const Shutdown = lazy(() => import('./pages/Shutdown'));
const Progress = lazy(() => import('./pages/Progress'));
const Goals = lazy(() => import('./pages/Goals'));
const Guide = lazy(() => import('./pages/Guide'));

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">Loading…</div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/gtd-ivy-lee" element={<GtdIvyLee />} />
          <Route path="/focus" element={<Focus />} />
          <Route path="/unstuck" element={<Unstuck />} />
          <Route path="/shutdown" element={<Shutdown />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/ivy-lee" element={<IvyLee />} />
          <Route path="/next-actions" element={<NextActions />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/waiting-for" element={<WaitingFor />} />
          <Route path="/someday-maybe" element={<SomedayMaybe />} />
          <Route path="/reference" element={<Reference />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/weekly-review" element={<WeeklyReview />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        </Suspense>
      </Layout>
    </HashRouter>
  );
}
