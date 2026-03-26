'use client';

import { useState, useContext } from 'react';
import type { PluginEntry, DomOSClientPlugin } from '@domos/core';
import { DomOSContext } from '../provider/DomOSContext.js';

export interface PluginDevPanelProps {
  /** Meme tableau que celui passe a DomOSProvider plugins={...} */
  plugins: readonly PluginEntry[];
}

/**
 * PluginDevPanel — Panneau de developpement pour inspecter et tester les plugins.
 *
 * Affiche pour chaque plugin :
 * - Nom, version, description
 * - Composants UI declares
 * - Simulation d'appel tool avec args JSON editables
 *
 * A utiliser uniquement en developpement (idealement conditionne par import.meta.env.DEV).
 *
 * @example
 * ```tsx
 * {import.meta.env.DEV && <PluginDevPanel plugins={DEMO_PLUGINS} />}
 * ```
 */
export function PluginDevPanel({ plugins }: PluginDevPanelProps) {
  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>⚡ DomOS Plugin Dev Panel</span>
        <span style={styles.badge}>{plugins.length} plugin{plugins.length > 1 ? 's' : ''}</span>
      </div>
      <div style={styles.list}>
        {plugins.map(([plugin]) => (
          <PluginCard key={(plugin as DomOSClientPlugin<any>).meta.name} plugin={plugin as DomOSClientPlugin<any>} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PluginCard — carte d'un plugin avec simulateur de tool
// ============================================================

function PluginCard({ plugin }: { plugin: DomOSClientPlugin<any> }) {
  const [expanded, setExpanded] = useState(false);
  const components = Object.keys(plugin.ui?.components ?? {});

  return (
    <div style={styles.card}>
      <button style={styles.cardHeader} onClick={() => setExpanded(e => !e)}>
        <div>
          <span style={styles.pluginName}>{plugin.meta.name}</span>
          <span style={styles.version}>v{plugin.meta.version}</span>
        </div>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={styles.cardBody}>
          {plugin.meta.description && (
            <p style={styles.desc}>{plugin.meta.description}</p>
          )}

          {/* Composants UI */}
          <Section title="Composants UI" count={components.length}>
            {components.length === 0
              ? <Empty>Aucun composant UI déclaré</Empty>
              : components.map(name => (
                  <Tag key={name}>{name}</Tag>
                ))
            }
          </Section>

          {/* Tools via context */}
          <ToolsSection pluginName={plugin.meta.name} />
        </div>
      )}
    </div>
  );
}

// ============================================================
// ToolsSection — lit les tools enregistres depuis DomOSContext
// ============================================================

function ToolsSection({ pluginName }: { pluginName: string }) {
  const ctx = useContext(DomOSContext);
  const [simArgs, setSimArgs] = useState<Record<string, string>>({});
  const [simResult, setSimResult] = useState<string | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [simLoading, setSimLoading] = useState<string | null>(null);

  // Extraire les tools de ce plugin depuis le client
  const client = ctx?.['_client' as keyof typeof ctx] as any;
  const allTools: string[] = client?.getRegisteredToolNames?.() ?? [];
  const pluginTools = allTools.filter((n: string) => n.startsWith(pluginName + '/'));

  const simulate = async (toolName: string) => {
    setSimResult(null);
    setSimError(null);
    setSimLoading(toolName);
    try {
      const rawArgs = simArgs[toolName] ?? '{}';
      let parsed: Record<string, unknown>;
      try { parsed = JSON.parse(rawArgs); } catch { throw new Error('JSON invalide'); }

      const tool = client?.getTool?.(toolName);
      if (!tool) throw new Error(`Tool "${toolName}" non trouvé`);
      const result = await tool.handler(parsed);
      setSimResult(JSON.stringify(result, null, 2));
    } catch (e: unknown) {
      setSimError(String(e instanceof Error ? e.message : e));
    } finally {
      setSimLoading(null);
    }
  };

  return (
    <Section title="Tools LLM" count={pluginTools.length}>
      {pluginTools.length === 0
        ? <Empty>Aucun tool enregistré (plugin peut-être pas encore installé)</Empty>
        : pluginTools.map(toolName => {
            const shortName = toolName.replace(pluginName + '/', '');
            return (
              <div key={toolName} style={styles.toolRow}>
                <div style={styles.toolName}>{shortName}</div>
                <div style={styles.simRow}>
                  <input
                    style={styles.simInput}
                    placeholder='{"key": "value"}'
                    value={simArgs[toolName] ?? ''}
                    onChange={e => setSimArgs(a => ({ ...a, [toolName]: e.target.value }))}
                  />
                  <button
                    style={styles.simBtn}
                    onClick={() => simulate(toolName)}
                    disabled={simLoading === toolName}
                  >
                    {simLoading === toolName ? '…' : '▶ Simulate'}
                  </button>
                </div>
                {simResult && simLoading !== toolName && (
                  <pre style={styles.simResult}>{simResult}</pre>
                )}
                {simError && simLoading !== toolName && (
                  <pre style={styles.simError}>{simError}</pre>
                )}
              </div>
            );
          })
      }
    </Section>
  );
}

// ============================================================
// Helpers UI
// ============================================================

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>
        {title} <span style={styles.badge}>{count}</span>
      </div>
      <div style={styles.sectionBody}>{children}</div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span style={styles.tag}>{children}</span>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <span style={styles.empty}>{children}</span>;
}

// ============================================================
// Styles inline minimalistes
// ============================================================

const styles = {
  panel: {
    position: 'fixed' as const,
    bottom: '16px',
    right: '16px',
    width: '380px',
    maxHeight: '70vh',
    overflowY: 'auto' as const,
    background: '#1a1a2e',
    color: '#e2e8f0',
    borderRadius: '10px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    fontFamily: 'monospace',
    fontSize: '12px',
    zIndex: 9999,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid #2d3748',
    background: '#16213e',
    borderRadius: '10px 10px 0 0',
  },
  headerTitle: { fontWeight: 700, fontSize: '13px', color: '#7c3aed' },
  badge: {
    background: '#374151',
    color: '#9ca3af',
    borderRadius: '4px',
    padding: '1px 6px',
    fontSize: '11px',
    marginLeft: '6px',
  },
  list: { padding: '8px' },
  card: {
    background: '#16213e',
    borderRadius: '6px',
    marginBottom: '6px',
    border: '1px solid #2d3748',
    overflow: 'hidden',
  },
  cardHeader: {
    width: '100%',
    background: 'none',
    border: 'none',
    color: '#e2e8f0',
    padding: '8px 12px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontFamily: 'monospace',
    fontSize: '12px',
    textAlign: 'left' as const,
  },
  pluginName: { color: '#a78bfa', fontWeight: 700 },
  version: { color: '#6b7280', marginLeft: '8px' },
  cardBody: { padding: '0 12px 10px' },
  desc: { color: '#9ca3af', marginBottom: '8px', lineHeight: 1.4 },
  section: { marginTop: '8px' },
  sectionTitle: { color: '#60a5fa', fontWeight: 600, marginBottom: '4px' },
  sectionBody: { display: 'flex', flexWrap: 'wrap' as const, gap: '4px' },
  tag: {
    background: '#1e3a5f',
    color: '#93c5fd',
    borderRadius: '4px',
    padding: '2px 7px',
  },
  empty: { color: '#4b5563', fontStyle: 'italic' as const },
  toolRow: { width: '100%', marginBottom: '6px' },
  toolName: { color: '#34d399', marginBottom: '3px' },
  simRow: { display: 'flex', gap: '4px' },
  simInput: {
    flex: 1,
    background: '#0f172a',
    border: '1px solid #374151',
    borderRadius: '4px',
    color: '#e2e8f0',
    padding: '3px 7px',
    fontFamily: 'monospace',
    fontSize: '11px',
  },
  simBtn: {
    background: '#5b21b6',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '3px 9px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '11px',
    whiteSpace: 'nowrap' as const,
  },
  simResult: {
    background: '#0f2818',
    color: '#86efac',
    borderRadius: '4px',
    padding: '5px 8px',
    margin: '4px 0 0',
    fontSize: '11px',
    overflowX: 'auto' as const,
    maxHeight: '120px',
    overflowY: 'auto' as const,
  },
  simError: {
    background: '#2d0e0e',
    color: '#fca5a5',
    borderRadius: '4px',
    padding: '5px 8px',
    margin: '4px 0 0',
    fontSize: '11px',
  },
} as const;

import React from 'react';
