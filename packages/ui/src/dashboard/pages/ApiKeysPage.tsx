import { useState, useEffect } from 'preact/hooks';
import type { ApiClient, ApiKeyEntry } from '../api.js';
import { t } from '../i18n/index.js';

const SURFACE = '#1a1a24';
const BORDER = '#2a2a3a';
const ACCENT = '#6366f1';
const TEXT = '#e5e5e5';
const MUTED = '#666680';
const RED = '#ef4444';
const GREEN = '#22c55e';
const YELLOW = '#eab308';

const CLIENT_TYPES = ['react', 'vue', 'svelte', 'browser'] as const;
type ClientType = typeof CLIENT_TYPES[number];

function randomHex(length: number): string {
  const arr = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
}

function formatDate(value?: number): string {
  return value ? new Date(value).toLocaleString() : 'never';
}

interface ApiKeysPageProps {
  api: ApiClient;
}

export function ApiKeysPage({ api }: ApiKeysPageProps) {
  const strings = t();
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newClientType, setNewClientType] = useState<ClientType[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
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
      const result = await api.addApiKey(key, {
        name: newName.trim() || undefined,
        description: newDescription.trim() || undefined,
        clientType: newClientType.length ? newClientType : undefined,
      });
      setCreatedKey(result.publicKey ?? key);
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

  const handleDelete = async (entry: ApiKeyEntry) => {
    const key = entry.id;
    const label = entry.name ?? entry.masked;
    if (!confirm(`Delete API key ${label}?`)) return;
    try {
      await api.deleteApiKey(key);
      fetchKeys();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleToggleStatus = async (entry: ApiKeyEntry) => {
    const nextStatus = (entry.status ?? 'active') === 'active' ? 'disabled' : 'active';
    try {
      await api.setApiKeyStatus(entry.id, nextStatus);
      fetchKeys();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRevoke = async (entry: ApiKeyEntry) => {
    const label = entry.name ?? entry.masked;
    if (!confirm(strings.apikeys.revokeConfirm)) return;
    try {
      await api.setApiKeyStatus(entry.id, 'revoked');
      fetchKeys();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRotate = async (entry: ApiKeyEntry) => {
    const label = entry.name ?? entry.masked;
    if (!confirm(`Rotate API key ${label}? Active sessions will be terminated.`)) return;
    try {
      const result = await api.rotateApiKey(entry.id);
      if (result.publicKey) setCreatedKey(result.publicKey);
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
        <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 12px' }}>{strings.apikeys.title}</h2>
        <p style={{ color: MUTED, fontSize: 13 }}>{strings.apikeys.noKeys}</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: 0 }}>{strings.apikeys.title}</h2>
        <span style={{ fontSize: 12, color: MUTED }}>{strings.apikeys.copyKeyNotice}</span>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: RED, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {createdKey && (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, padding: '10px 12px', fontSize: 12, color: TEXT, marginBottom: 14 }}>
          <div style={{ color: MUTED, marginBottom: 4 }}>{strings.apikeys.keyCreatedNotice}</div>
          <code style={{ color: '#86efac', wordBreak: 'break-all' }}>{createdKey}</code>
        </div>
      )}

      {/* Add new key */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder={strings.apikeys.keyNamePlaceholder}
            style={inputStyle as any}
            value={newKey}
            onInput={(e) => setNewKey((e.target as HTMLInputElement).value)}
          />
          <button
            onClick={() => setNewKey(randomHex(32))}
            style={{ padding: '8px 12px', background: '#1e1e2e', border: `1px solid ${BORDER}`, borderRadius: 6, color: MUTED, fontSize: 12, cursor: 'pointer' }}
          >
            Generate
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder={strings.apikeys.keyName}
            style={{ ...inputStyle as any, fontFamily: 'system-ui, sans-serif' }}
            value={newName}
            onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
          />
          <input
            type="text"
            placeholder={strings.tools.description}
            style={{ ...inputStyle as any, fontFamily: 'system-ui, sans-serif' }}
            value={newDescription}
            onInput={(e) => setNewDescription((e.target as HTMLInputElement).value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: MUTED }}>Client Types :</span>
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
            {strings.apikeys.createBtn}
          </button>
        </div>
      </div>

      {/* Keys list */}
      {keys.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 13 }}>{strings.apikeys.noKeys}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {keys.map(entry => (
            <div key={entry.id} style={{
              background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '10px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: TEXT, wordBreak: 'break-all' }}>
                    {entry.masked}
                  </span>
                  <span style={{
                    padding: '1px 6px',
                    background: (entry.status ?? 'active') === 'active'
                      ? 'rgba(34,197,94,0.12)'
                      : (entry.status === 'disabled' ? 'rgba(234,179,8,0.12)' : 'rgba(239,68,68,0.12)'),
                    border: `1px solid ${(entry.status ?? 'active') === 'active'
                      ? 'rgba(34,197,94,0.3)'
                      : (entry.status === 'disabled' ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)')}`,
                    borderRadius: 4,
                    fontSize: 10,
                    color: (entry.status ?? 'active') === 'active' ? GREEN : (entry.status === 'disabled' ? YELLOW : RED),
                  }}>
                    {entry.status ?? 'active'}
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
                <div style={{ marginTop: 3, fontSize: 11, color: MUTED }}>
                  Last used : {formatDate(entry.lastUsedAt)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {entry.status !== 'revoked' && (
                  <button
                    onClick={() => handleToggleStatus(entry)}
                    style={{ padding: '4px 10px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 5, color: YELLOW, fontSize: 11, cursor: 'pointer' }}
                  >
                    {(entry.status ?? 'active') === 'active' ? strings.common.disabled : strings.common.enabled}
                  </button>
                )}
                {entry.status !== 'revoked' && (
                  <button
                    onClick={() => handleRotate(entry)}
                    style={{ padding: '4px 10px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 5, color: '#a5b4fc', fontSize: 11, cursor: 'pointer' }}
                  >
                    Rotate
                  </button>
                )}
                {entry.status !== 'revoked' && (
                  <button
                    onClick={() => handleRevoke(entry)}
                    style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, color: RED, fontSize: 11, cursor: 'pointer' }}
                  >
                    {strings.apikeys.revokeBtn}
                  </button>
                )}
              <button
                onClick={() => handleDelete(entry)}
                style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, color: RED, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
              >
                Delete
              </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

