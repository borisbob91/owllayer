import type { ComponentChildren } from 'preact';

const BG = '#0f0f13';
const SURFACE = '#111118';
const BORDER = '#2a2a3a';
const ACCENT = '#6366f1';
const TEXT = '#e5e5e5';
const MUTED = '#666680';

const NAV_ITEMS = [
  { hash: '#/status',   label: 'Status' },
  { hash: '#/sessions', label: 'Sessions' },
  { hash: '#/tools',    label: 'Tools' },
  { hash: '#/apikeys',  label: 'API Keys' },
  { hash: '#/agents',   label: 'Agents' },
  { hash: '#/lines',    label: 'Lignes' },
  { hash: '#/metrics',  label: 'Métriques' },
];

interface LayoutProps {
  page: string;
  onLogout: () => void;
  children: ComponentChildren;
}

export function Layout({ page, onLogout, children }: LayoutProps) {
  return (
    <div style={{
      display: 'flex',
      height: '100%',
      minHeight: 0,
      background: BG,
      color: TEXT,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: 14,
      lineHeight: 1.5,
    }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        minWidth: 220,
        background: SURFACE,
        borderRight: `1px solid ${BORDER}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 16px 16px',
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>
            DomOS{' '}
            <span style={{ color: ACCENT }}>Dashboard</span>
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const itemPage = item.hash.slice(2);
            const active = page === itemPage;
            return (
              <a
                key={item.hash}
                href={item.hash}
                style={{
                  display: 'block',
                  padding: '7px 12px',
                  borderRadius: 6,
                  marginBottom: 2,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  background: active ? ACCENT : 'transparent',
                  color: active ? '#fff' : MUTED,
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '10px 16px',
          borderTop: `1px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: MUTED }}>v0.1.0</span>
          <button
            onClick={onLogout}
            style={{
              background: 'none',
              border: 'none',
              color: MUTED,
              cursor: 'pointer',
              fontSize: 12,
              padding: '2px 4px',
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        padding: 24,
        minWidth: 0,
      }}>
        {children}
      </main>
    </div>
  );
}
