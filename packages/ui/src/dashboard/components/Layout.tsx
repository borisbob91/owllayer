import type { ComponentChildren } from 'preact';
import { t, getDashboardLanguage, setDashboardLanguage } from '../i18n/index.js';

const BG = '#0f0f13';
const SURFACE = '#111118';
const BORDER = '#2a2a3a';
const ACCENT = '#6366f1';
const TEXT = '#e5e5e5';
const MUTED = '#666680';

interface LayoutProps {
  page: string;
  onLogout: () => void;
  children: ComponentChildren;
}

export function Layout({ page, onLogout, children }: LayoutProps) {
  const strings = t();
  const currentLang = getDashboardLanguage();

  const navItems = [
    { hash: '#/status',       label: strings.nav.status },
    { hash: '#/sessions',     label: strings.nav.sessions },
    { hash: '#/tools',        label: strings.nav.tools },
    { hash: '#/apikeys',      label: strings.nav.apikeys },
    { hash: '#/agents',       label: strings.nav.agents },
    { hash: '#/capabilities', label: strings.nav.capabilities },
    { hash: '#/lines',        label: strings.nav.lines },
    { hash: '#/metrics',      label: strings.nav.metrics },
  ];

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
            OwlLayer{' '}
            <span style={{ color: ACCENT }}>Dashboard</span>
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
          {navItems.map(item => {
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

        {/* Language selector + Footer */}
        <div style={{
          padding: '8px 16px',
          borderTop: `1px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button
              onClick={() => setDashboardLanguage('en')}
              style={{
                background: currentLang === 'en' ? 'rgba(99,102,241,0.2)' : 'transparent',
                border: currentLang === 'en' ? `1px solid ${ACCENT}` : '1px solid transparent',
                borderRadius: 4,
                color: currentLang === 'en' ? '#fff' : MUTED,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: currentLang === 'en' ? 600 : 400,
                padding: '2px 6px',
              }}
            >
              EN
            </button>
            <span style={{ color: MUTED, fontSize: 11 }}>/</span>
            <button
              onClick={() => setDashboardLanguage('fr')}
              style={{
                background: currentLang === 'fr' ? 'rgba(99,102,241,0.2)' : 'transparent',
                border: currentLang === 'fr' ? `1px solid ${ACCENT}` : '1px solid transparent',
                borderRadius: 4,
                color: currentLang === 'fr' ? '#fff' : MUTED,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: currentLang === 'fr' ? 600 : 400,
                padding: '2px 6px',
              }}
            >
              FR
            </button>
          </div>
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
            {strings.nav.logout}
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
