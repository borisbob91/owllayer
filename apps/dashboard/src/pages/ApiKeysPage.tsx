import { useState, useEffect } from 'react';
import { api, type ApiKeyEntry } from '../api';

const CLIENT_TYPES = ['react', 'vue', 'svelte', 'browser'] as const;
type ClientType = typeof CLIENT_TYPES[number];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newClientType, setNewClientType] = useState<ClientType[]>([]);
  const [showKeys, setShowKeys] = useState(false);

  const fetchKeys = () => {
    api.getApiKeys()
      .then(data => {
        setKeys(data.keys);
        setEnabled(data.enabled);
        setError(null);
      })
      .catch(err => setError(err.message));
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleAdd = async () => {
    const key = newKey.trim();
    if (!key) return;

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
      setError(null);
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await api.deleteApiKey(key);
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleGenerate = () => {
    const generated = randomHex(32);
    setNewKey(generated);
  };

  if (!enabled) {
    return (
      <div className="text-gray-400">
        <h2 className="text-xl font-bold text-white mb-4">API Keys</h2>
        <p>Gestion des API keys non disponible.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">API Keys</h2>
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showKeys}
            onChange={e => setShowKeys(e.target.checked)}
            className="rounded bg-gray-700 border-gray-600"
          />
          Afficher les cles
        </label>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Formulaire d'ajout */}
      <div className="mb-6 bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Ajouter une API key</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="ex: a3f9c1d2e8b47f01..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleGenerate}
              className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
            >
              Générer
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nom (ex: Boutique prod)" 
              className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              placeholder="Description (optionnel)"
              className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs text-gray-400">Types clients :</span>
            {CLIENT_TYPES.map(t => (
              <label key={t} className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newClientType.includes(t)}
                  onChange={e => setNewClientType(prev => e.target.checked ? [...prev, t] : prev.filter(x => x !== t))}
                  className="rounded bg-gray-700 border-gray-600 text-indigo-500"
                />
                {t}
              </label>
            ))}
            <button
              onClick={handleAdd}
              disabled={!newKey.trim()}
              className="ml-auto px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-md transition-colors"
            >
              Ajouter
            </button>
          </div>
        </div>
      </div>

      {/* Liste des keys */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">
          {keys.length} cle(s) enregistree(s)
        </h3>
        {keys.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune API key configuree.</p>
        ) : (
          <div className="space-y-2">
            {keys.map(entry => (
              <div
                key={entry.key}
                className="flex items-center justify-between bg-gray-900 rounded-md px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-white font-mono truncate">
                      {showKeys ? entry.key : entry.masked}
                    </code>
                    {entry.clientType?.map(t => (
                      <span key={t} className="px-1.5 py-0.5 text-xs bg-indigo-900/40 text-indigo-300 rounded">{t}</span>
                    ))}
                  </div>
                  {(entry.name || entry.description) && (
                    <div className="mt-0.5 text-xs text-gray-400">
                      {entry.name && <span className="font-medium text-gray-300 mr-2">{entry.name}</span>}
                      {entry.description && <span>{entry.description}</span>}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(entry.key)}
                  className="ml-4 px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded transition-colors flex-shrink-0"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function randomHex(length: number): string {
  const buf = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(buf);
  return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
}
