import { useState, useEffect } from 'react';
import { api, type PromptEntry, type SystemPromptConfig, type SystemPromptValue } from '../api';

const EMPTY_CONFIG: SystemPromptConfig = {
  name: '',
  language: 'fr',
  role: '',
  personality: '',
  capabilities: [],
  rules: [],
  context: '',
  toolInstructions: '',
  responseFormat: '',
};

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [config, setConfig] = useState<SystemPromptConfig>({ ...EMPTY_CONFIG });
  const [capInput, setCapInput] = useState('');
  const [ruleInput, setRuleInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Charger les prompts + api keys au mount
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [promptsData, keysData] = await Promise.all([
        api.getPrompts(),
        api.getApiKeys(),
      ]);
      setPrompts(promptsData.prompts);
      setApiKeys(keysData.keys.map(k => k.key));
    } catch {
      // ignore
    }
  };

  // Quand on selectionne une API key, charger son prompt s'il existe
  const handleSelectKey = (apiKey: string) => {
    setSelectedKey(apiKey);
    setMessage(null);

    const existing = prompts.find(p => p.apiKey === apiKey);
    if (existing?.prompt) {
      if (typeof existing.prompt === 'string') {
        // Convertir un string en config avec juste le role
        setConfig({ ...EMPTY_CONFIG, role: existing.prompt });
      } else {
        setConfig({
          ...EMPTY_CONFIG,
          ...existing.prompt,
          capabilities: existing.prompt.capabilities || [],
          rules: existing.prompt.rules || [],
        });
      }
    } else {
      setConfig({ ...EMPTY_CONFIG });
    }
  };

  const handleSave = async () => {
    if (!selectedKey || !config.role.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      // Nettoyer le config avant envoi (retirer les champs vides)
      const prompt = cleanConfig(config);
      await api.setPrompt(selectedKey, prompt);
      setMessage({ type: 'success', text: 'Prompt sauvegarde' });
      await fetchAll();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedKey) return;

    try {
      await api.deletePrompt(selectedKey);
      setConfig({ ...EMPTY_CONFIG });
      setMessage({ type: 'success', text: 'Override supprime — le prompt du code sera utilise' });
      await fetchAll();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  };

  const addCapability = () => {
    const val = capInput.trim();
    if (!val) return;
    setConfig(c => ({ ...c, capabilities: [...(c.capabilities || []), val] }));
    setCapInput('');
  };

  const removeCapability = (index: number) => {
    setConfig(c => ({ ...c, capabilities: (c.capabilities || []).filter((_, i) => i !== index) }));
  };

  const addRule = () => {
    const val = ruleInput.trim();
    if (!val) return;
    setConfig(c => ({ ...c, rules: [...(c.rules || []), val] }));
    setRuleInput('');
  };

  const removeRule = (index: number) => {
    setConfig(c => ({ ...c, rules: (c.rules || []).filter((_, i) => i !== index) }));
  };

  const hasOverride = prompts.some(p => p.apiKey === selectedKey);

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">System Prompts</h2>
      <p className="text-sm text-gray-400 mb-6">
        Definir un prompt par API key. L'override dashboard a priorite sur le prompt du code.
      </p>

      {/* Selecteur API key */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-1">API Key</label>
        <select
          value={selectedKey}
          onChange={e => handleSelectKey(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">— Selectionner une API key —</option>
          {apiKeys.map(k => (
            <option key={k} value={k}>
              {k} {prompts.some(p => p.apiKey === k) ? '(override actif)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${
          message.type === 'success'
            ? 'bg-green-900/30 border border-green-500/30 text-green-400'
            : 'bg-red-900/30 border border-red-500/30 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {selectedKey && (
        <div className="space-y-4">
          {/* Nom */}
          <Field label="Nom de l'agent" optional>
            <input
              type="text"
              value={config.name || ''}
              onChange={e => setConfig(c => ({ ...c, name: e.target.value }))}
              placeholder="Alex"
              className="input-field"
            />
          </Field>

          {/* Langue */}
          <Field label="Langue" optional>
            <input
              type="text"
              value={config.language || ''}
              onChange={e => setConfig(c => ({ ...c, language: e.target.value }))}
              placeholder="fr"
              className="input-field"
            />
          </Field>

          {/* Role */}
          <Field label="Role" required>
            <textarea
              value={config.role}
              onChange={e => setConfig(c => ({ ...c, role: e.target.value }))}
              placeholder="Tu es un assistant shopping expert pour la boutique en ligne..."
              rows={3}
              className="input-field"
            />
          </Field>

          {/* Personnalite */}
          <Field label="Personnalite" optional>
            <textarea
              value={config.personality || ''}
              onChange={e => setConfig(c => ({ ...c, personality: e.target.value }))}
              placeholder="Tu es amical, professionnel et concis."
              rows={2}
              className="input-field"
            />
          </Field>

          {/* Capacites */}
          <Field label="Capacites" optional>
            <div className="space-y-2">
              {(config.capabilities || []).map((cap, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 bg-gray-900 rounded px-3 py-1.5 text-sm text-white">- {cap}</span>
                  <button onClick={() => removeCapability(i)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={capInput}
                  onChange={e => setCapInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCapability())}
                  placeholder="Ajouter une capacite..."
                  className="input-field flex-1"
                />
                <button onClick={addCapability} className="btn-secondary">Ajouter</button>
              </div>
            </div>
          </Field>

          {/* Regles */}
          <Field label="Regles" optional>
            <div className="space-y-2">
              {(config.rules || []).map((rule, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 bg-gray-900 rounded px-3 py-1.5 text-sm text-white">- {rule}</span>
                  <button onClick={() => removeRule(i)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ruleInput}
                  onChange={e => setRuleInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRule())}
                  placeholder="Ajouter une regle..."
                  className="input-field flex-1"
                />
                <button onClick={addRule} className="btn-secondary">Ajouter</button>
              </div>
            </div>
          </Field>

          {/* Contexte */}
          <Field label="Contexte" optional>
            <textarea
              value={(config.context as string) || ''}
              onChange={e => setConfig(c => ({ ...c, context: e.target.value }))}
              placeholder="Informations contextuelles (date, infos business...)"
              rows={2}
              className="input-field"
            />
          </Field>

          {/* Instructions tools */}
          <Field label="Instructions tools" optional>
            <textarea
              value={config.toolInstructions || ''}
              onChange={e => setConfig(c => ({ ...c, toolInstructions: e.target.value }))}
              placeholder="Instructions specifiques pour l'usage des tools..."
              rows={2}
              className="input-field"
            />
          </Field>

          {/* Format de reponse */}
          <Field label="Format de reponse" optional>
            <textarea
              value={config.responseFormat || ''}
              onChange={e => setConfig(c => ({ ...c, responseFormat: e.target.value }))}
              placeholder="Reponds en francais, de maniere concise..."
              rows={2}
              className="input-field"
            />
          </Field>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
            <button
              onClick={handleSave}
              disabled={saving || !config.role.trim()}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-md transition-colors"
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            {hasOverride && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-md transition-colors"
              >
                Supprimer l'override
              </button>
            )}
            <span className="text-xs text-gray-500 ml-auto">
              {hasOverride ? 'Override actif — remplace le prompt du code' : 'Pas d\'override — le prompt du code est utilise'}
            </span>
          </div>
        </div>
      )}

      {/* CSS inline pour les champs */}
      <style>{`
        .input-field {
          width: 100%;
          background: #111827;
          border: 1px solid #374151;
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: white;
          outline: none;
        }
        .input-field:focus {
          border-color: #6366f1;
        }
        .input-field::placeholder {
          color: #6b7280;
        }
        .btn-secondary {
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: #374151;
          color: #d1d5db;
          border-radius: 0.375rem;
          transition: background 0.15s;
        }
        .btn-secondary:hover {
          background: #4b5563;
        }
      `}</style>
    </div>
  );
}

function Field({ label, optional, required, children }: {
  label: string;
  optional?: boolean;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
        {optional && <span className="text-gray-500 ml-1 text-xs">(optionnel)</span>}
      </label>
      {children}
    </div>
  );
}

/**
 * Nettoyer le config en retirant les champs vides.
 */
function cleanConfig(config: SystemPromptConfig): SystemPromptConfig {
  const clean: SystemPromptConfig = { role: config.role };

  if (config.name?.trim()) clean.name = config.name.trim();
  if (config.language?.trim()) clean.language = config.language.trim();
  if (config.personality?.trim()) clean.personality = config.personality.trim();
  if (config.capabilities?.length) clean.capabilities = config.capabilities;
  if (config.rules?.length) clean.rules = config.rules;
  if ((config.context as string)?.trim()) clean.context = (config.context as string).trim();
  if (config.toolInstructions?.trim()) clean.toolInstructions = config.toolInstructions.trim();
  if (config.responseFormat?.trim()) clean.responseFormat = config.responseFormat.trim();

  return clean;
}
