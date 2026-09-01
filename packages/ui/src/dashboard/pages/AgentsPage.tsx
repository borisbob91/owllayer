import { useState, useEffect } from 'preact/hooks';
import type { ApiClient, ApiKeyEntry, PromptEntry, SystemPromptConfig } from '../api.js';
import { t } from '../i18n/index.js';

const SURFACE = '#1a1a24';
const BORDER = '#2a2a3a';
const ACCENT = '#6366f1';
const TEXT = '#e5e5e5';
const MUTED = '#666680';
const GREEN = '#22c55e';
const YELLOW = '#eab308';

type EditableSystemPromptConfig = Omit<SystemPromptConfig, 'context'> & {
  context?: string;
};

const EMPTY: EditableSystemPromptConfig = {
  name: '',
  language: 'en',
  role: '',
  personality: '',
  capabilities: [],
  rules: [],
  context: '',
  toolInstructions: '',
  responseFormat: '',
};

function cleanConfig(cfg: EditableSystemPromptConfig): SystemPromptConfig {
  const out: SystemPromptConfig = { role: cfg.role };
  if (cfg.name?.trim())             out.name = cfg.name.trim();
  if (cfg.language?.trim())         out.language = cfg.language.trim();
  if (cfg.personality?.trim())      out.personality = cfg.personality.trim();
  if (cfg.capabilities?.length)     out.capabilities = cfg.capabilities;
  if (cfg.rules?.length)            out.rules = cfg.rules;
  if (cfg.context?.trim())          out.context = cfg.context.trim();
  if (cfg.toolInstructions?.trim()) out.toolInstructions = cfg.toolInstructions.trim();
  if (cfg.responseFormat?.trim())   out.responseFormat = cfg.responseFormat.trim();
  if (cfg.sections && Object.keys(cfg.sections).length > 0) out.sections = cfg.sections;
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
  const strings = t();
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [allKeys, setAllKeys] = useState<ApiKeyEntry[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [config, setConfig] = useState<EditableSystemPromptConfig>({ ...EMPTY });
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
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    }
  };

  useEffect(() => { fetchAll(); }, [api]);

  const handleSelectKey = (keyRef: string) => {
    setSelectedKey(keyRef);
    setMessage(null);
    const existing = prompts.find(p => p.keyId === keyRef);
    if (existing?.prompt) {
      if (typeof existing.prompt === 'string') {
        setConfig({ ...EMPTY, role: existing.prompt });
      } else {
        setConfig({
          ...EMPTY,
          ...existing.prompt,
          context: typeof existing.prompt.context === 'string' ? existing.prompt.context : '',
          capabilities: existing.prompt.capabilities ?? [],
          rules: existing.prompt.rules ?? [],
        });
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
      setMessage({ type: 'success', text: strings.agents.promptUpdatedNotice });
      await fetchAll();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedKey || !confirm('Delete this agent?')) return;
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

  const assignedKeys = new Set(prompts.map(p => p.keyId));
  const unassigned = allKeys.length - assignedKeys.size;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>{strings.agents.title}</h2>
      <p style={{ color: MUTED, fontSize: 12, margin: '0 0 20px' }}>
        {strings.agents.subtitle}
      </p>

      {/* Résumé */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: strings.apikeys.title, value: allKeys.length, color: TEXT },
          { label: strings.common.enabled, value: prompts.length, color: GREEN },
          { label: strings.common.disabled, value: unassigned, color: unassigned > 0 ? YELLOW : MUTED },
        ].map(item => (
          <div key={item.label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Sélecteur API key */}
      <div style={{ marginBottom: 20 }}>
        {label(strings.agents.apiKey)}
        <select
          value={selectedKey}
          onChange={(e) => handleSelectKey((e.target as HTMLSelectElement).value)}
          style={{ ...INPUT as any, cursor: 'pointer' }}
        >
          <option value="">— Select API key —</option>
          {allKeys.map(entry => {
            const hasAgent = assignedKeys.has(entry.id);
            const displayName = entry.name ?? entry.masked;
            return (
              <option key={entry.id} value={entry.id}>
                {displayName} {hasAgent ? '✓' : '⚠'}
              </option>
            );
          })}
        </select>
        {allKeys.length === 0 && (
          <p style={{ marginTop: 8, fontSize: 12, color: YELLOW }}>
            {strings.apikeys.noKeys}
          </p>
        )}
      </div>

      {!selectedKey && (
        <p style={{ color: MUTED, fontSize: 13 }}>{strings.agents.noAgents}</p>
      )}

      {selectedKey && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 700 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              {label(strings.agents.agentName)}
              <input
                type="text"
                style={INPUT as any}
                value={config.name ?? ''}
                placeholder="ex: assistant-crm"
                onInput={(e) => setConfig(c => ({ ...c, name: (e.target as HTMLInputElement).value }))}
              />
            </div>
            <div>
              {label(strings.common.language)}
              <input
                type="text"
                style={INPUT as any}
                value={config.language ?? 'en'}
                onInput={(e) => setConfig(c => ({ ...c, language: (e.target as HTMLInputElement).value }))}
              />
            </div>
          </div>

          <div>
            {label('Role')}
            <textarea
              rows={4}
              style={TEXTAREA as any}
              value={config.role}
              placeholder="Describe the agent role..."
              onInput={(e) => setConfig(c => ({ ...c, role: (e.target as HTMLTextAreaElement).value }))}
            />
          </div>

          <div>
            {label('Personality')}
            <textarea rows={2} style={TEXTAREA as any} value={config.personality ?? ''} placeholder="Tone, style..."
              onInput={(e) => setConfig(c => ({ ...c, personality: (e.target as HTMLTextAreaElement).value }))} />
          </div>

          {/* Capabilities */}
          <div>
            {label('Capabilities')}
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input type="text" style={{ ...INPUT as any, flex: 1 }} value={capInput} placeholder="Add capability..."
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
            {label('Rules')}
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input type="text" style={{ ...INPUT as any, flex: 1 }} value={ruleInput} placeholder="Add rule..."
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
            {label('Context')}
            <textarea rows={2} style={TEXTAREA as any} value={config.context ?? ''} placeholder="Business context..."
              onInput={(e) => setConfig(c => ({ ...c, context: (e.target as HTMLTextAreaElement).value }))} />
          </div>

          <div>
            {label('Tool Instructions')}
            <textarea rows={2} style={TEXTAREA as any} value={config.toolInstructions ?? ''} placeholder="How to use tools..."
              onInput={(e) => setConfig(c => ({ ...c, toolInstructions: (e.target as HTMLTextAreaElement).value }))} />
          </div>

          <div>
            {label('Response Format')}
            <textarea rows={2} style={TEXTAREA as any} value={config.responseFormat ?? ''} placeholder="Response format..."
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
              {saving ? 'Saving...' : strings.agents.saveBtn}
            </button>
            {prompts.find(p => p.keyId === selectedKey) && (
              <button
                onClick={handleDelete}
                style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', fontSize: 13, cursor: 'pointer' }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
