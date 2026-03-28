import { useState, useEffect } from 'preact/hooks';
import type { ApiClient, ApiKeyEntry } from '../api.js';

const SURFACE = '#1a1a24';
const BORDER = '#2a2a3a';
const ACCENT = '#6366f1';
const TEXT = '#e5e5e5';
const MUTED = '#666680';
const RED = '#ef4444';

function randomHex(length: number): string {
  const arr = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
}

interface ApiKeysPageProps {
  api: ApiClient;
}

export function ApiKeysPage({ api }: ApiKeysPageProps) {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const [adding, setAdding] = useState(false);

  const fetchKeys = () => {
    api.getApiKeys()
      .then(data => { setKeys(data.keys); setEnabled(data.enabled); setError(null); })
      .catch(err => setError((err as Error).message));
  };

  useEffect(() => { fetchKeys(); }, [api]);

  const handleAdd = async () => {
    const key = newKey.trim();
    if (!key) return;
    setAdding(true);
    try {
      await api.addApiKey(key);
      setNewKey('');
      fetchKeys();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Supprimer la clé ${key.slice(0, 8)}... ?`)) return;
    try {
      await api.deleteApiKey(key);
      fetchKeys();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const inputStyle = {
    flex: 1,
    padding: '8px 12px',
    background: '#0a0a10',
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    color: TEXT,
    fontSize: 12,
    fontFamily: 'monospace',
    outline: 'none',
  };

  if (!enabled) {
    return (
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 12px' }}>API Keys</h2>
        <p style={{ color: MUTED, fontSize: 13 }}>Gestion des API keys non disponible sur ce serveur.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: 0 }}>API Keys</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: MUTED, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showKeys}
            onChange={(e) => setShowKeys((e.target as HTMLInputElement).checked)}
          />
          Afficher les clés
        </label>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: RED, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {/* Add new key */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Nouvelle clé API..."
          style={inputStyle as any}
          value={newKey}
          onInput={(e) => setNewKey((e.target as HTMLInputElement).value)}
        />
        <button
          onClick={() => setNewKey(randomHex(32))}
          style={{ padding: '8px 12px', background: '#1e1e2e', border: `1px solid ${BORDER}`, borderRadius: 6, color: MUTED, fontSize: 12, cursor: 'pointer' }}
        >
          Générer
        </button>
        <button
          onClick={handleAdd}
          disabled={!newKey.trim() || adding}
          style={{ padding: '8px 14px', background: ACCENT, border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, cursor: adding ? 'not-allowed' : 'pointer', opacity: (!newKey.trim() || adding) ? 0.5 : 1 }}
        >
          Ajouter
        </button>
      </div>

      {/* Keys list */}
      {keys.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 13 }}>Aucune clé API configurée</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {keys.map(entry => (
            <div key={entry.key} style={{
              background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '10px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: TEXT, wordBreak: 'break-all' }}>
                {showKeys ? entry.key : entry.masked}
              </span>
              <button
                onClick={() => handleDelete(entry.key)}
                style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, color: RED, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
