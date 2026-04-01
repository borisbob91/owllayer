import { useState } from 'preact/hooks';
import { RiskBadge } from './RiskBadge.js';
import type { DevToolsConfig } from './index.js';

const TEXT = '#edf2ff';
const MUTED = '#8b95ba';
const ACCENT = '#a78bfa';
const GREEN = '#86efac';
const BORDER = '#2d3355';
const SURFACE = '#12172d';
const SURFACE_ALT = '#181e38';

interface SimulatorProps {
  config: DevToolsConfig;
}

export function ToolCallSimulator({ config }: SimulatorProps) {
  const tools = [...config.getRegisteredTools()].sort((left, right) => left.name.localeCompare(right.name));
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

  const currentTool = tools.find((tool) => tool.name === selectedTool);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: 12, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: TEXT }}>Simulation manuelle d’un tool</div>
        <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
          Sélectionne un tool actif, ajuste ses arguments JSON puis exécute-le directement depuis le DevTools embarqué.
        </div>
      </div>

      {/* Tool selector */}
      <div style={{ padding: 12, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10 }}>
        <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>Tool</div>
        <select
          value={selectedTool}
          onChange={(e) => handleSelectTool((e.target as HTMLSelectElement).value)}
          style={{ width: '100%', padding: '8px 10px', background: SURFACE_ALT, border: `1px solid ${BORDER}`, borderRadius: 7, color: TEXT, fontSize: 12, cursor: 'pointer', outline: 'none' }}
        >
          <option value="">— Sélectionner un tool —</option>
          {tools.map((t: any) => (
            <option key={t.name} value={t.name}>{t.name}</option>
          ))}
        </select>

        {currentTool && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: SURFACE_ALT, border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <code style={{ fontSize: 11, color: GREEN, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}>{currentTool.name}</code>
              <RiskBadge level={currentTool.risk ?? 'none'} />
              {currentTool.source && <span style={{ fontSize: 10, color: ACCENT, fontWeight: 700 }}>{currentTool.source}</span>}
            </div>
            {currentTool.description && <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.45 }}>{currentTool.description}</div>}
          </div>
        )}
      </div>

      {/* Args */}
      <div style={{ padding: 12, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10 }}>
        <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>Arguments (JSON)</div>
        <textarea
          rows={6}
          value={argsText}
          onInput={(e) => { setArgsText((e.target as HTMLTextAreaElement).value); setArgsError(''); }}
          style={{ width: '100%', padding: '10px 12px', background: SURFACE_ALT, border: `1px solid ${argsError ? '#ef4444' : BORDER}`, borderRadius: 8, color: TEXT, fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', resize: 'vertical' as const, outline: 'none', boxSizing: 'border-box' as const, lineHeight: 1.45 }}
        />
        {argsError && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{argsError}</div>}
      </div>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={!selectedTool || running}
        style={{ padding: '10px 16px', background: ACCENT, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: (!selectedTool || running) ? 'not-allowed' : 'pointer', opacity: (!selectedTool || running) ? 0.5 : 1, alignSelf: 'flex-start', boxShadow: '0 10px 24px rgba(139,92,246,0.24)' }}
      >
        {running ? '⏳ Exécution...' : '▶ Simuler'}
      </button>

      {/* Result */}
      {result !== null && (
        <div style={{ padding: 12, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>
            Résultat {result.ok ? <span style={{ color: '#22c55e' }}>✓ succès</span> : <span style={{ color: '#ef4444' }}>✗ erreur</span>}
          </div>
          <pre style={{
            margin: 0, padding: '12px 14px', background: '#0b1020',
            border: `1px solid ${result.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            borderRadius: 8, fontSize: 11, color: result.ok ? '#22c55e' : '#ef4444',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', whiteSpace: 'pre-wrap' as const, wordBreak: 'break-all' as const,
            maxHeight: 200, overflowY: 'auto' as const,
          }}>
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
