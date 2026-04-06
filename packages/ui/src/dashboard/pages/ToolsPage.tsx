import { useState, useEffect } from 'preact/hooks';
import type { ApiClient, ToolsData, ToolDecl, ToolParameterProp } from '../api.js';

const SURFACE = '#1a1a24';
const SURFACE2 = '#0e0e18';
const BORDER = '#2a2a3a';
const ACCENT = '#6366f1';
const TEXT = '#e5e5e5';
const MUTED = '#666680';

const RISK_STYLE: Record<string, { bg: string; color: string }> = {
  none:     { bg: 'rgba(100,100,120,0.2)', color: MUTED },
  low:      { bg: 'rgba(59,130,246,0.15)', color: '#93c5fd' },
  high:     { bg: 'rgba(234,179,8,0.15)',  color: '#fde047' },
  critical: { bg: 'rgba(239,68,68,0.15)',  color: '#fca5a5' },
};

const PARAM_TYPE_COLOR: Record<string, string> = {
  string:  '#4ade80',
  number:  '#fbbf24',
  boolean: '#c084fc',
  object:  '#60a5fa',
  array:   '#fb923c',
};

function ToolDetail({ tool, onClose }: { tool: ToolDecl; onClose: () => void }) {
  const params = tool.parameters?.properties ? Object.entries(tool.parameters.properties) : [];
  const required = tool.parameters?.required ?? [];
  const riskStyle = RISK_STYLE[tool.risk ?? 'none'] ?? RISK_STYLE.none;

  return (
    <div style={{
      background: SURFACE,
      border: `1px solid ${BORDER}`,
      borderRadius: 10,
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 14, color: TEXT }}>{tool.name}</span>
            {tool.risk && tool.risk !== 'none' && (
              <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, ...riskStyle }}>
                {tool.risk}
              </span>
            )}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: MUTED }}>{tool.description}</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      {params.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Paramètres
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {params.map(([key, prop]: [string, ToolParameterProp]) => (
              <div key={key} style={{
                background: SURFACE2,
                borderRadius: 6,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: TEXT }}>{key}</span>
                    {required.includes(key) && (
                      <span style={{ fontSize: 10, color: '#ef4444' }}>requis</span>
                    )}
                  </div>
                  {prop.description && (
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: MUTED }}>{prop.description}</p>
                  )}
                  {prop.enum && prop.enum.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {prop.enum.map((v: string) => (
                        <span key={v} style={{ background: '#2a2a3a', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontFamily: 'monospace', color: MUTED }}>{v}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: PARAM_TYPE_COLOR[prop.type] ?? MUTED, flexShrink: 0 }}>
                  {prop.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {params.length === 0 && (
        <p style={{ fontSize: 12, color: MUTED, fontStyle: 'italic' }}>Aucun paramètre</p>
      )}
    </div>
  );
}

interface ToolsPageProps {
  api: ApiClient;
}

export function ToolsPage({ api }: ToolsPageProps) {
  const [tools, setTools] = useState<ToolsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ToolDecl | null>(null);

  useEffect(() => {
    const load = () => {
      api.getTools().then(data => {
        setTools(data);
        setSelected(prev => {
          if (!prev) return null;
          for (const decls of Object.values(data.clientTools)) {
            const found = decls.find(t => t.name === prev.name);
            if (found) return found;
          }
          return null;
        });
      }).catch(e => setError((e as Error).message));
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [api]);

  if (error) {
    return (
      <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 16, color: '#ef4444' }}>
        Erreur : {error}
      </div>
    );
  }

  if (!tools) return <div style={{ color: MUTED }}>Chargement...</div>;

  const clientSessions = Object.entries(tools.clientTools);

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 20px' }}>Tools</h2>

        {/* Tools serveur */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 12, color: MUTED, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tools serveur ({tools.serverTools.length})
          </h3>
          {tools.serverTools.length === 0 ? (
            <p style={{ color: MUTED, fontSize: 13 }}>Aucun tool serveur</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tools.serverTools.map(name => (
                <span key={name} style={{
                  padding: '4px 12px',
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: 99,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: ACCENT,
                }}>
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tools client */}
        <div>
          <h3 style={{ fontSize: 12, color: MUTED, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tools client par session ({clientSessions.length} session{clientSessions.length !== 1 ? 's' : ''})
          </h3>
          {clientSessions.length === 0 ? (
            <p style={{ color: MUTED, fontSize: 13 }}>Aucun tool client actif</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {clientSessions.map(([sessionId, decls]) => (
                <div key={sessionId} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 14 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: ACCENT, marginBottom: 10 }}>{sessionId}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {decls.map(tool => {
                      const active = selected?.name === tool.name;
                      return (
                        <button
                          key={tool.name}
                          onClick={() => setSelected(s => s?.name === tool.name ? null : tool)}
                          style={{
                            padding: '4px 10px',
                            background: active ? ACCENT : '#1e1e2e',
                            border: `1px solid ${active ? ACCENT : BORDER}`,
                            borderRadius: 6,
                            fontSize: 11,
                            fontFamily: 'monospace',
                            color: active ? '#fff' : TEXT,
                            cursor: 'pointer',
                          }}
                        >
                          {tool.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ width: 360, flexShrink: 0 }}>
          <ToolDetail tool={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}
