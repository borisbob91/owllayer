import { useState, useEffect } from 'preact/hooks';
import type { ApiClient, ApiKeyEntry } from '../api.js';

const SURFACE = '#1a1a24';
const BORDER = '#2a2a3a';
const ACCENT = '#6366f1';
const TEXT = '#e5e5e5';
const MUTED = '#666680';
const RED = '#ef4444';

const CLIENT_TYPES = ['react', 'vue', 'svelte', 'browser'] as const;
type ClientType = typeof CLIENT_TYPES[number];

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
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newClientType, setNewClientType] = useState<ClientType[]>([]);
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
      await api.addApiKey(key, {
        name: newName.trim() || undefined,
        description: newDescription.trim() || undefined,
        clientType: newClientType.length ? newClientType : undefined,
      });
      setNewKey('');
      setNewName('');
      setNewDescription('');
      setNewClientType([]);
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
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
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Nom (ex: Boutique prod)"
            style={{ ...inputStyle as any, fontFamily: 'system-ui, sans-serif' }}
            value={newName}
            onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
          />
          <input
            type="text"
            placeholder="Description (optionnel)"
            style={{ ...inputStyle as any, fontFamily: 'system-ui, sans-serif' }}
            value={newDescription}
            onInput={(e) => setNewDescription((e.target as HTMLInputElement).value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: MUTED }}>Types clients :</span>
          {CLIENT_TYPES.map(t => (
            <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: TEXT, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newClientType.includes(t)}
                onChange={(e) => setNewClientType(prev =>
                  (e.target as HTMLInputElement).checked ? [...prev, t] : prev.filter(x => x !== t)
                )}
              />
              {t}
            </label>
          ))}
          <button
            onClick={handleAdd}
            disabled={!newKey.trim() || adding}
            style={{ marginLeft: 'auto', padding: '8px 14px', background: ACCENT, border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, cursor: adding ? 'not-allowed' : 'pointer', opacity: (!newKey.trim() || adding) ? 0.5 : 1 }}
          >
            Ajouter
          </button>
        </div>
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
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: TEXT, wordBreak: 'break-all' }}>
                    {showKeys ? entry.key : entry.masked}
                  </span>
                  {entry.clientType?.map(t => (
                    <span key={t} style={{ padding: '1px 6px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 4, fontSize: 10, color: '#a5b4fc' }}>{t}</span>
                  ))}
                </div>
                {(entry.name || entry.description) && (
                  <div style={{ marginTop: 2, fontSize: 11, color: MUTED }}>
                    {entry.name && <span style={{ color: TEXT, marginRight: 8 }}>{entry.name}</span>}
                    {entry.description && <span>{entry.description}</span>}
                  </div>
                )}
              </div>
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
