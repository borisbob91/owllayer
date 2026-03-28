import { useState } from 'preact/hooks';
import type { DevToolsConfig } from './index.js';

const TEXT   = '#e5e5e5';
const MUTED  = '#666680';
const ACCENT = '#6366f1';
const BORDER = '#2a2a3a';

interface SimulatorProps {
  config: DevToolsConfig;
}

export function ToolCallSimulator({ config }: SimulatorProps) {
  const tools = config.getRegisteredTools();
  const [selectedTool, setSelectedTool] = useState('');
  const [argsText, setArgsText] = useState('{}');
  const [argsError, setArgsError] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; data: unknown } | null>(null);

  const handleSelectTool = (name: string) => {
    setSelectedTool(name);
    setResult(null);
    setArgsError('');
    // Pre-fill with empty object or default from schema if present
    const tool: any = tools.find((t: any) => t.name === name);
    if (tool?.parameters?.properties) {
      const defaults: Record<string, unknown> = {};
      for (const [k, v] of Object.entries<any>(tool.parameters.properties)) {
        defaults[k] = v.default ?? (v.type === 'string' ? '' : v.type === 'number' ? 0 : v.type === 'boolean' ? false : null);
      }
      setArgsText(JSON.stringify(defaults, null, 2));
    } else {
      setArgsText('{}');
    }
  };

  const handleRun = async () => {
    if (!selectedTool) return;
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(argsText);
    } catch (e) {
      setArgsError('JSON invalide : ' + (e as Error).message);
      return;
    }
    setArgsError('');
    setRunning(true);
    setResult(null);
    try {
      const data = await config.callTool(selectedTool, args);
      setResult({ ok: true, data });
    } catch (err) {
      setResult({ ok: false, data: { error: (err as Error).message } });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Tool selector */}
      <div>
        <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>Tool</div>
        <select
          value={selectedTool}
          onChange={(e) => handleSelectTool((e.target as HTMLSelectElement).value)}
          style={{ width: '100%', padding: '7px 10px', background: '#0a0a10', border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 12, cursor: 'pointer', outline: 'none' }}
        >
          <option value="">— Sélectionner un tool —</option>
          {tools.map((t: any) => (
            <option key={t.name} value={t.name}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Args */}
      <div>
        <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>Arguments (JSON)</div>
        <textarea
          rows={6}
          value={argsText}
          onInput={(e) => { setArgsText((e.target as HTMLTextAreaElement).value); setArgsError(''); }}
          style={{ width: '100%', padding: '8px 10px', background: '#0a0a10', border: `1px solid ${argsError ? '#ef4444' : BORDER}`, borderRadius: 6, color: TEXT, fontSize: 11, fontFamily: 'monospace', resize: 'vertical' as const, outline: 'none', boxSizing: 'border-box' as const }}
        />
        {argsError && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{argsError}</div>}
      </div>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={!selectedTool || running}
        style={{ padding: '8px 16px', background: ACCENT, border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: (!selectedTool || running) ? 'not-allowed' : 'pointer', opacity: (!selectedTool || running) ? 0.5 : 1, alignSelf: 'flex-start' }}
      >
        {running ? '⏳ Exécution...' : '▶ Simuler'}
      </button>

      {/* Result */}
      {result !== null && (
        <div>
          <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>
            Résultat {result.ok ? <span style={{ color: '#22c55e' }}>✓ succès</span> : <span style={{ color: '#ef4444' }}>✗ erreur</span>}
          </div>
          <pre style={{
            margin: 0, padding: '10px 12px', background: '#040408',
            border: `1px solid ${result.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            borderRadius: 6, fontSize: 11, color: result.ok ? '#22c55e' : '#ef4444',
            fontFamily: 'monospace', whiteSpace: 'pre-wrap' as const, wordBreak: 'break-all' as const,
            maxHeight: 200, overflowY: 'auto' as const,
          }}>
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
