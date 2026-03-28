import { useState, useEffect } from 'preact/hooks';
import { RiskBadge } from './RiskBadge.js';
import type { DevToolsConfig } from './index.js';

const TEXT   = '#e5e5e5';
const MUTED  = '#666680';
const ACCENT = '#6366f1';
const BORDER = '#2a2a3a';
const GREEN  = '#22c55e';

interface ToolsInspectorProps {
  config: DevToolsConfig;
  /** Callback pour notifier le parent du count (pour le badge header) */
  onCount?: (n: number) => void;
}

type ViewMode = 'grouped' | 'flat';
type ScopeFilter = 'all' | 'global' | 'page';

export function ToolsInspector({ config, onCount }: ToolsInspectorProps) {
  const [tools, setTools] = useState<Array<ReturnType<DevToolsConfig['getRegisteredTools']>[number]>>([]);
  const [filter, setFilter] = useState('');
  const [mode, setMode] = useState<ViewMode>('grouped');
  const [scope, setScope] = useState<ScopeFilter>('all');

  // Polling 1s — les tools apparaissent/disparaissent selon les composants montés
  useEffect(() => {
    const refresh = () => {
      const t = config.getRegisteredTools();
      setTools(t);
      onCount?.(t.length);
    };
    refresh();
    const id = setInterval(refresh, 1000);
    return () => clearInterval(id);
  }, [config]);

  const scoped = scope === 'all' ? tools
    : scope === 'global' ? tools.filter(t => t.global)
    : tools.filter(t => !t.global);

  const visible = filter
    ? scoped.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()) || t.description?.toLowerCase().includes(filter.toLowerCase()))
    : scoped;

  // Grouper par source (plugin) ou "standalone"
  const groups = new Map<string, typeof visible>();
  for (const t of visible) {
    const key = t.source ?? '—';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const ToolRow = ({ tool, last }: { tool: typeof visible[number]; last: boolean }) => (
    <div
      key={tool.name}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '8px 12px',
        borderBottom: !last ? `1px solid ${BORDER}` : 'none',
      }}
    >
      <code style={{ fontSize: 11, color: ACCENT, flex: 1, wordBreak: 'break-all' as const, lineHeight: 1.4 }}>
        {tool.name}
      </code>
      {tool.risk && <RiskBadge level={tool.risk as any} />}
      {tool.description && (
        <span style={{ fontSize: 10, color: MUTED, maxWidth: 160, lineHeight: 1.3 }}>
          {tool.description.length > 80 ? tool.description.slice(0, 80) + '…' : tool.description}
        </span>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header live count + scope filter + mode toggle + filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: MUTED, marginRight: 2 }}>
          <span style={{ color: tools.length > 0 ? GREEN : MUTED, fontWeight: 700 }}>●</span>
          {' '}{visible.length}{scope !== 'all' ? `/${tools.length}` : ''}
        </span>

        {/* Scope filter */}
        <div style={{ display: 'flex', borderRadius: 5, border: `1px solid ${BORDER}`, overflow: 'hidden', fontSize: 10 }}>
          {(['all', 'global', 'page'] as ScopeFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setScope(s)}
              style={{
                padding: '3px 7px', border: 'none', cursor: 'pointer', fontWeight: 600,
                background: scope === s ? (s === 'global' ? '#164e16' : s === 'page' ? '#1e3a5f' : ACCENT) : '#0a0a10',
                color: scope === s ? '#fff' : MUTED,
              }}
            >
              {s === 'all' ? 'Tous' : s === 'global' ? '🌐' : '📄'}
            </button>
          ))}
        </div>

        {/* Vue toggle */}
        <div style={{ display: 'flex', borderRadius: 5, border: `1px solid ${BORDER}`, overflow: 'hidden', fontSize: 10 }}>
          {(['grouped', 'flat'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setMode(v)}
              style={{
                padding: '3px 8px', border: 'none', cursor: 'pointer', fontWeight: 600,
                background: mode === v ? ACCENT : '#0a0a10',
                color: mode === v ? '#fff' : MUTED,
              }}
            >
              {v === 'grouped' ? 'Groupé' : 'Liste'}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Filtrer…"
          value={filter}
          onInput={(e) => setFilter((e.target as HTMLInputElement).value)}
          style={{
            padding: '4px 8px', background: '#0a0a10', border: `1px solid ${BORDER}`,
            borderRadius: 5, color: TEXT, fontSize: 11, outline: 'none', flex: 1, minWidth: 0,
          }}
        />
      </div>

      {tools.length === 0 && (
        <div style={{ fontSize: 12, color: MUTED, textAlign: 'center' as const, padding: '20px 0' }}>
          Aucun tool enregistré.<br />
          <span style={{ fontSize: 11 }}>Ils apparaissent ici quand les composants sont montés.</span>
        </div>
      )}

      {/* Flat view */}
      {mode === 'flat' && visible.length > 0 && (
        <div style={{ background: '#0a0a10', borderRadius: 8, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          {visible.map((tool, i) => (
            <ToolRow key={tool.name} tool={tool} last={i === visible.length - 1} />
          ))}
        </div>
      )}

      {/* Grouped view */}
      {mode === 'grouped' && [...groups.entries()].map(([source, groupTools]) => (
        <div key={source} style={{ background: '#0a0a10', borderRadius: 8, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderBottom: `1px solid ${BORDER}`, background: '#111118' }}>
            <span style={{ fontSize: 10, color: source === '—' ? MUTED : ACCENT, fontWeight: 700, letterSpacing: '0.05em' }}>
              {source === '—' ? 'STANDALONE' : source.toUpperCase()}
            </span>
            <span style={{ fontSize: 10, color: MUTED, marginLeft: 'auto' }}>{groupTools.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {groupTools.map((tool, i) => (
              <ToolRow key={tool.name} tool={tool} last={i === groupTools.length - 1} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
