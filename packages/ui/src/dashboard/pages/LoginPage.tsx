import { useState } from 'preact/hooks';
import { t } from '../i18n/index.js';

const BG = '#0f0f13';
const SURFACE = '#1a1a24';
const BORDER = '#2a2a3a';
const ACCENT = '#6366f1';
const TEXT = '#e5e5e5';
const MUTED = '#666680';
const RED = '#ef4444';

// Inline SVG logo OwlLayer
function OwlLayerLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="rgba(99,102,241,0.12)" />
      <circle cx="24" cy="24" r="16" stroke={ACCENT} strokeWidth="1.5" strokeOpacity="0.35" />
      <circle cx="24" cy="24" r="9" stroke={ACCENT} strokeWidth="1.5" strokeOpacity="0.7" />
      <circle cx="24" cy="24" r="4" fill={ACCENT} />
      <line x1="24" y1="4" x2="24" y2="10" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="38" x2="24" y2="44" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="24" x2="10" y2="24" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="24" x2="44" y2="24" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const strings = t();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onLogin(username.trim(), password.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.login.defaultError);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    background: '#0a0a10',
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    color: TEXT,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{
      minHeight: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: BG,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: '28px 24px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Logo + titre */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <OwlLayerLogo />
          <h1 style={{ margin: '12px 0 2px', fontSize: 18, fontWeight: 700, color: TEXT }}>
            {strings.login.title}
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
            {strings.login.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            placeholder={strings.login.usernamePlaceholder}
            autoComplete="username"
            style={inputStyle}
            value={username}
            onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
          />
          <input
            type="password"
            placeholder={strings.login.passwordPlaceholder}
            autoComplete="current-password"
            style={inputStyle}
            value={password}
            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          />

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 12,
              color: RED,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!username.trim() || !password.trim() || loading}
            style={{
              padding: '10px',
              background: ACCENT,
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: (!username.trim() || !password.trim() || loading) ? 0.5 : 1,
              marginTop: 4,
            }}
          >
            {loading ? strings.login.submitting : strings.login.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
