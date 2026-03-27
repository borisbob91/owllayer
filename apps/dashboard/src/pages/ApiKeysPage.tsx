import { useState, useEffect } from 'react';
import { api, type ApiKeyEntry } from '../api';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');
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
      await api.addApiKey(key);
      setNewKey('');
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
            Generer
          </button>
          <button
            onClick={handleAdd}
            disabled={!newKey.trim()}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-md transition-colors"
          >
            Ajouter
          </button>
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
                <code className="text-sm text-white font-mono">
                  {showKeys ? entry.key : entry.masked}
                </code>
                <button
                  onClick={() => handleDelete(entry.key)}
                  className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded transition-colors"
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
