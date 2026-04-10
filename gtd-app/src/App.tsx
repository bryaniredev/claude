import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inbox from './pages/Inbox';
import NextActions from './pages/NextActions';
import Projects from './pages/Projects';
import WaitingFor from './pages/WaitingFor';
import SomedayMaybe from './pages/SomedayMaybe';
import Reference from './pages/Reference';
import CalendarView from './pages/CalendarView';
import WeeklyReview from './pages/WeeklyReview';
import Settings from './pages/Settings';

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/next-actions" element={<NextActions />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/waiting-for" element={<WaitingFor />} />
          <Route path="/someday-maybe" element={<SomedayMaybe />} />
          <Route path="/reference" element={<Reference />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/weekly-review" element={<WeeklyReview />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
