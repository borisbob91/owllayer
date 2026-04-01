import { useState } from 'preact/hooks';
import { RiskBadge } from './RiskBadge.js';
import type { DevToolsConfig } from './index.js';

const TEXT = '#edf2ff';
const MUTED = '#8b95ba';
const ACCENT = '#a78bfa';
const BLUE = '#93c5fd';
const GREEN = '#86efac';
const BORDER = '#2d3355';
const SURFACE = '#12172d';
const SURFACE_ALT = '#181e38';
const EMPTY = '#5e688b';

interface PluginInspectorMeta {
  name: string;
  version?: string;
  description?: string;
  ui?: { components?: Record<string, unknown> };
  components?: Record<string, unknown>;
}

interface PluginInspectorProps {
  config: DevToolsConfig;
}

export function PluginInspector({ config }: PluginInspectorProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    config.plugins[0]?.name ? { [config.plugins[0].name]: true } : {},
  );
  const tools = config.getRegisteredTools();

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  if (config.plugins.length === 0) {
    return <div style={{ fontSize: 12, color: MUTED }}>Aucun plugin chargé.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {config.plugins.map((pluginMeta) => {
        const plugin = pluginMeta as PluginInspectorMeta;
        const pluginId = plugin.name;
        const isOpen = !!expanded[pluginId];
        const pluginTools = tools.filter((t) => t.source === pluginId);
        const pluginComponents = Object.keys(plugin.ui?.components ?? plugin.components ?? {});

        return (
          <div key={pluginId} style={{ background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: '0 10px 20px rgba(2, 6, 23, 0.22)' }}>
            <button
              onClick={() => toggle(pluginId)}
              style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: SURFACE_ALT, border: 'none', cursor: 'pointer', textAlign: 'left' as const }}
            >
              <span style={{ color: MUTED, fontSize: 11, transition: 'transform 0.15s', transform: isOpen ? 'rotate(180deg)' : 'none', marginTop: 4 }}>▾</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: ACCENT }}>{pluginId}</span>
                  {typeof plugin.version !== 'undefined' && (
                    <span style={{ fontSize: 11, color: MUTED }}>v{plugin.version}</span>
                  )}
                </div>
                {plugin.description && (
                  <p style={{ fontSize: 12, color: TEXT, opacity: 0.86, margin: '8px 0 0', lineHeight: 1.45 }}>
                    {plugin.description}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 999, background: '#1d2d52', color: BLUE }}>
                  {pluginComponents.length} UI
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 999, background: '#10311d', color: GREEN }}>
                  {pluginTools.length} tool{pluginTools.length !== 1 ? 's' : ''}
                </span>
              </div>
            </button>

            {isOpen && (
              <div style={{ borderTop: `1px solid ${BORDER}`, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: BLUE }}>Composants UI</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: '#1d2d52', color: BLUE }}>{pluginComponents.length}</span>
                  </div>
                  {pluginComponents.length === 0 ? (
                    <span style={{ fontSize: 11, color: EMPTY, fontStyle: 'italic' }}>Aucun composant UI déclaré</span>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {pluginComponents.map((componentName) => (
                        <span key={componentName} style={{ padding: '4px 8px', borderRadius: 7, background: '#1d2d52', color: BLUE, fontSize: 11, fontWeight: 600 }}>
                          {componentName}
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>Tools LLM</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: '#10311d', color: GREEN }}>{pluginTools.length}</span>
                  </div>
                  {pluginTools.length === 0 ? (
                    <span style={{ fontSize: 11, color: EMPTY, fontStyle: 'italic' }}>Aucun tool actif (composant non monté ?)</span>
                  ) : (
                    pluginTools.map((tool) => (
                      <div key={tool.name} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: SURFACE_ALT, borderRadius: 8, border: `1px solid ${BORDER}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <code style={{ fontSize: 11, color: GREEN, flex: 1, wordBreak: 'break-all' as const, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}>{tool.name}</code>
                          <RiskBadge level={tool.risk ?? 'none'} />
                        </div>
                        {tool.description && (
                          <span style={{ fontSize: 11, color: MUTED, lineHeight: 1.45 }}>{tool.description}</span>
                        )}
                      </div>
                    ))
                  )}
                </section>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
