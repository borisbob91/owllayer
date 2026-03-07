import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import StatusPage from './pages/StatusPage';
import SessionsPage from './pages/SessionsPage';
import SessionDetailPage from './pages/SessionDetailPage';
import ToolsPage from './pages/ToolsPage';
import MetricsPage from './pages/MetricsPage';
import LinesPage from './pages/LinesPage';
import ApiKeysPage from './pages/ApiKeysPage';
import PromptsPage from './pages/PromptsPage';
import LoginPage from './pages/LoginPage';
import { getAdminKey } from './api';

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const key = getAdminKey();
  if (!key) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={(
          <RequireAuth>
            <Layout />
          </RequireAuth>
        )}
      >
        <Route path="/" element={<Navigate to="/status" replace />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/sessions/:id" element={<SessionDetailPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/lines" element={<LinesPage />} />
        <Route path="/apikeys" element={<ApiKeysPage />} />
        <Route path="/prompts" element={<PromptsPage />} />
      </Route>
    </Routes>
  );
}
