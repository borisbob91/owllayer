import { useState } from 'preact/hooks';
import { RiskBadge } from './RiskBadge.js';
import type { DevToolsConfig } from './index.js';

const TEXT   = '#e5e5e5';
const MUTED  = '#666680';
const ACCENT = '#6366f1';
const BORDER = '#2a2a3a';

interface PluginInspectorProps {
  config: DevToolsConfig;
}

export function PluginInspector({ config }: PluginInspectorProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const tools = config.getRegisteredTools();

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  if (config.plugins.length === 0) {
    return <div style={{ fontSize: 12, color: MUTED }}>Aucun plugin chargé.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {config.plugins.map((plugin: any) => {
        const pluginId: string = plugin.name ?? plugin.id ?? String(Math.random());
        const isOpen = !!expanded[pluginId];
        const pluginTools = tools.filter((t: any) => t.plugin === pluginId || t.source === pluginId);

        return (
          <div key={pluginId} style={{ background: '#0a0a10', borderRadius: 8, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            {/* Header */}
            <button
              onClick={() => toggle(pluginId)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}
            >
              <span style={{ color: MUTED, fontSize: 11, transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
              <span style={{ fontWeight: 600, fontSize: 13, color: TEXT, flex: 1 }}>{pluginId}</span>
              {typeof plugin.version !== 'undefined' && (
                <span style={{ fontSize: 10, color: MUTED }}>v{plugin.version}</span>
              )}
              <span style={{ fontSize: 10, color: ACCENT }}>{pluginTools.length} tool{pluginTools.length !== 1 ? 's' : ''}</span>
            </button>

            {/* Tools list */}
            {isOpen && (
              <div style={{ borderTop: `1px solid ${BORDER}`, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {plugin.description && (
                  <p style={{ fontSize: 11, color: MUTED, margin: '0 0 8px' }}>{plugin.description}</p>
                )}
                {pluginTools.length === 0 ? (
                  <span style={{ fontSize: 11, color: MUTED }}>Aucun tool enregistré.</span>
                ) : (
                  pluginTools.map((tool: any) => (
                    <div key={tool.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', background: '#111118', borderRadius: 6 }}>
                      <code style={{ fontSize: 11, color: ACCENT, flex: 1, wordBreak: 'break-all' as const }}>{tool.name}</code>
                      {tool.riskLevel && <RiskBadge level={tool.riskLevel} />}
                      {tool.description && (
                        <span style={{ fontSize: 11, color: MUTED, marginLeft: 4 }}>{tool.description}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
