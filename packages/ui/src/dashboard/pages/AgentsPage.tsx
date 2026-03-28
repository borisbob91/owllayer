import { useState, useEffect } from 'preact/hooks';
import type { ApiClient, ApiKeyEntry, PromptEntry, SystemPromptConfig } from '../api.js';

const SURFACE = '#1a1a24';
const BORDER = '#2a2a3a';
const ACCENT = '#6366f1';
const TEXT = '#e5e5e5';
const MUTED = '#666680';
const GREEN = '#22c55e';
const YELLOW = '#eab308';

const EMPTY: SystemPromptConfig = {
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

function cleanConfig(cfg: SystemPromptConfig): SystemPromptConfig {
  const out: SystemPromptConfig = { role: cfg.role };
  if (cfg.name?.trim())             out.name = cfg.name.trim();
  if (cfg.language?.trim())         out.language = cfg.language.trim();
  if (cfg.personality?.trim())      out.personality = cfg.personality.trim();
  if (cfg.capabilities?.length)     out.capabilities = cfg.capabilities;
  if (cfg.rules?.length)            out.rules = cfg.rules;
  if (cfg.context?.trim())          out.context = cfg.context.trim();
  if (cfg.toolInstructions?.trim()) out.toolInstructions = cfg.toolInstructions.trim();
  if (cfg.responseFormat?.trim())   out.responseFormat = cfg.responseFormat.trim();
  return out;
}

const TEXTAREA = {
  width: '100%',
  padding: '8px 10px',
  background: '#0a0a10',
  border: `1px solid #2a2a3a`,
  borderRadius: 6,
  color: TEXT,
  fontSize: 12,
  resize: 'vertical' as const,
  outline: 'none',
  boxSizing: 'border-box' as const,
  fontFamily: 'system-ui, sans-serif',
};

const INPUT = {
  ...TEXTAREA,
  resize: undefined as any,
};

interface AgentsPageProps {
  api: ApiClient;
}

export function AgentsPage({ api }: AgentsPageProps) {
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [allKeys, setAllKeys] = useState<ApiKeyEntry[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [config, setConfig] = useState<SystemPromptConfig>({ ...EMPTY });
  const [capInput, setCapInput] = useState('');
  const [ruleInput, setRuleInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAll = async () => {
    try {
      const [promptsData, keysData] = await Promise.all([
        api.getPrompts(),
        api.getApiKeys(),
      ]);
      setPrompts(promptsData.prompts);
      setAllKeys(keysData.keys);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchAll(); }, [api]);

  const handleSelectKey = (apiKey: string) => {
    setSelectedKey(apiKey);
    setMessage(null);
    const existing = prompts.find(p => p.apiKey === apiKey);
    if (existing?.prompt) {
      if (typeof existing.prompt === 'string') {
        setConfig({ ...EMPTY, role: existing.prompt });
      } else {
        setConfig({ ...EMPTY, ...existing.prompt, capabilities: existing.prompt.capabilities ?? [], rules: existing.prompt.rules ?? [] });
      }
    } else {
      setConfig({ ...EMPTY });
    }
  };

  const handleSave = async () => {
    if (!selectedKey || !config.role.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.setPrompt(selectedKey, cleanConfig(config));
      setMessage({ type: 'success', text: 'Agent sauvegardé' });
      await fetchAll();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedKey || !confirm('Supprimer cet agent ?')) return;
    try {
      await api.deletePrompt(selectedKey);
      setConfig({ ...EMPTY });
      setSelectedKey('');
      await fetchAll();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    }
  };

  const addCap = () => {
    const v = capInput.trim();
    if (!v) return;
    setConfig(c => ({ ...c, capabilities: [...(c.capabilities ?? []), v] }));
    setCapInput('');
  };

  const addRule = () => {
    const v = ruleInput.trim();
    if (!v) return;
    setConfig(c => ({ ...c, rules: [...(c.rules ?? []), v] }));
    setRuleInput('');
  };

  const label = (text: string) => (
    <div style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 }}>
      {text}
    </div>
  );

  const assignedKeys = new Set(prompts.map(p => p.apiKey));
  const unassigned = allKeys.length - assignedKeys.size;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>Agents</h2>
      <p style={{ color: MUTED, fontSize: 12, margin: '0 0 20px' }}>
        System prompt par API key. Override le prompt du code si défini.
      </p>

      {/* Résumé */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'API Keys', value: allKeys.length, color: TEXT },
          { label: 'Configurés', value: prompts.length, color: GREEN },
          { label: 'Sans agent', value: unassigned, color: unassigned > 0 ? YELLOW : MUTED },
        ].map(item => (
          <div key={item.label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Sélecteur API key */}
      <div style={{ marginBottom: 20 }}>
        {label('API Key')}
        <select
          value={selectedKey}
          onChange={(e) => handleSelectKey((e.target as HTMLSelectElement).value)}
          style={{ ...INPUT as any, cursor: 'pointer' }}
        >
          <option value="">— Sélectionner une API key —</option>
          {allKeys.map(entry => {
            const hasAgent = assignedKeys.has(entry.key);
            const displayName = entry.name ?? `${entry.key.slice(0, 12)}...`;
            return (
              <option key={entry.key} value={entry.key}>
                {displayName} {hasAgent ? '✓ configuré' : '⚠ sans agent'}
              </option>
            );
          })}
        </select>
        {allKeys.length === 0 && (
          <p style={{ marginTop: 8, fontSize: 12, color: YELLOW }}>
            Aucune API key enregistrée. Ajoutez des clés dans <strong>API Keys</strong> d'abord.
          </p>
        )}
      </div>

      {!selectedKey && (
        <p style={{ color: MUTED, fontSize: 13 }}>Sélectionnez une API key pour configurer son agent.</p>
      )}

      {selectedKey && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 700 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              {label('Nom')}
              <input
                type="text"
                style={INPUT as any}
                value={config.name ?? ''}
                placeholder="ex: assistant-crm"
                onInput={(e) => setConfig(c => ({ ...c, name: (e.target as HTMLInputElement).value }))}
              />
            </div>
            <div>
              {label('Langue')}
              <input
                type="text"
                style={INPUT as any}
                value={config.language ?? 'fr'}
                onInput={(e) => setConfig(c => ({ ...c, language: (e.target as HTMLInputElement).value }))}
              />
            </div>
          </div>

          <div>
            {label('Rôle (requis)')}
            <textarea
              rows={4}
              style={TEXTAREA as any}
              value={config.role}
              placeholder="Décrivez le rôle de l'agent..."
              onInput={(e) => setConfig(c => ({ ...c, role: (e.target as HTMLTextAreaElement).value }))}
            />
          </div>

          <div>
            {label('Personnalité')}
            <textarea rows={2} style={TEXTAREA as any} value={config.personality ?? ''} placeholder="Ton, style..."
              onInput={(e) => setConfig(c => ({ ...c, personality: (e.target as HTMLTextAreaElement).value }))} />
          </div>

          {/* Capabilities */}
          <div>
            {label('Capabilities')}
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input type="text" style={{ ...INPUT as any, flex: 1 }} value={capInput} placeholder="Ajouter une capability..."
                onInput={(e) => setCapInput((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCap(); } }}
              />
              <button onClick={addCap} style={{ padding: '6px 12px', background: ACCENT, border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, cursor: 'pointer' }}>+</button>
            </div>
            {(config.capabilities ?? []).map((cap, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ flex: 1, fontSize: 12, color: TEXT }}>{cap}</span>
                <button onClick={() => setConfig(c => ({ ...c, capabilities: (c.capabilities ?? []).filter((_, j) => j !== i) }))}
                  style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            ))}
          </div>

          {/* Rules */}
          <div>
            {label('Règles')}
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input type="text" style={{ ...INPUT as any, flex: 1 }} value={ruleInput} placeholder="Ajouter une règle..."
                onInput={(e) => setRuleInput((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRule(); } }}
              />
              <button onClick={addRule} style={{ padding: '6px 12px', background: ACCENT, border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, cursor: 'pointer' }}>+</button>
            </div>
            {(config.rules ?? []).map((rule, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ flex: 1, fontSize: 12, color: TEXT }}>{rule}</span>
                <button onClick={() => setConfig(c => ({ ...c, rules: (c.rules ?? []).filter((_, j) => j !== i) }))}
                  style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            ))}
          </div>

          <div>
            {label('Contexte')}
            <textarea rows={2} style={TEXTAREA as any} value={config.context ?? ''} placeholder="Contexte métier..."
              onInput={(e) => setConfig(c => ({ ...c, context: (e.target as HTMLTextAreaElement).value }))} />
          </div>

          <div>
            {label('Instructions tools')}
            <textarea rows={2} style={TEXTAREA as any} value={config.toolInstructions ?? ''} placeholder="Comment utiliser les tools..."
              onInput={(e) => setConfig(c => ({ ...c, toolInstructions: (e.target as HTMLTextAreaElement).value }))} />
          </div>

          <div>
            {label('Format de réponse')}
            <textarea rows={2} style={TEXTAREA as any} value={config.responseFormat ?? ''} placeholder="Format attendu..."
              onInput={(e) => setConfig(c => ({ ...c, responseFormat: (e.target as HTMLTextAreaElement).value }))} />
          </div>

          {message && (
            <div style={{
              padding: '8px 12px', borderRadius: 6, fontSize: 12,
              background: message.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: message.type === 'success' ? '#22c55e' : '#ef4444',
            }}>
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave}
              disabled={!config.role.trim() || saving}
              style={{ padding: '8px 20px', background: ACCENT, border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: (!config.role.trim() || saving) ? 0.5 : 1 }}
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            {prompts.find(p => p.apiKey === selectedKey) && (
              <button
                onClick={handleDelete}
                style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', fontSize: 13, cursor: 'pointer' }}
              >
                Supprimer l'agent
              </button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: MUTED, alignSelf: 'center' }}>
              {prompts.find(p => p.apiKey === selectedKey)
                ? 'Agent actif — remplace le prompt du code'
                : 'Pas d\'agent — le prompt du code est utilisé'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
