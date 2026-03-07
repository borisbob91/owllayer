import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAdminKey } from '../api';

const navItems = [
  { to: '/status', label: 'Status' },
  { to: '/sessions', label: 'Sessions' },
  { to: '/tools', label: 'Tools' },
  { to: '/apikeys', label: 'API Keys' },
  { to: '/prompts', label: 'Prompts' },
  { to: '/lines', label: 'Lignes' },
  { to: '/metrics', label: 'Metriques' },
];

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAdminKey();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-800">
          <h1 className="text-lg font-bold tracking-tight text-white">
            DomOS <span className="text-indigo-400">Dashboard</span>
          </h1>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-500 flex items-center justify-between">
          <span>v0.1.0</span>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
