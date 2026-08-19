'use client';

import React, { useState, useContext, useEffect } from 'react';
import type { PluginEntry, OwlLayerClientPlugin, ToolDeclaration } from '@owllayer/core';
import { OwlLayerContext } from '../provider/OwlLayerContext.js';

export interface PluginDevPanelProps {
  /** Meme tableau que celui passe a OwlLayerProvider plugins={...} */
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
  const [collapsed, setCollapsed] = useState(false);
  const ctx = useContext(OwlLayerContext);

  // Poll registered tools every 2s for live updates
  const [allTools, setAllTools] = useState<ToolDeclaration[]>([]);
  useEffect(() => {
    const refresh = () => setAllTools(ctx?.getRegisteredTools?.() ?? []);
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [ctx]);

  const totalTools = allTools.length;

  if (collapsed) {
    return (
      <button onClick={() => setCollapsed(false)} style={styles.collapsedBtn}>
        ⚡ DevPanel ({plugins.length} plugins · {totalTools} tools)
      </button>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>⚡ OwlLayer Plugin Dev Panel</span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={styles.badge}>{plugins.length} plugin{plugins.length > 1 ? 's' : ''}</span>
          <span style={{ ...styles.badge, background: '#1e3a5f', color: '#93c5fd' }}>{totalTools} tools</span>
          <button onClick={() => setCollapsed(true)} style={styles.closeBtn}>—</button>
        </div>
      </div>

      {/* All registered tools summary */}
      <div style={styles.toolsSummary}>
        {allTools.map(t => (
          <span key={t.name} style={styles.toolPill}>{t.name}</span>
        ))}
        {totalTools === 0 && <span style={styles.empty}>Aucun tool enregistré</span>}
      </div>

      <div style={styles.list}>
        {plugins.map(([plugin]) => (
          <PluginCard
            key={(plugin as OwlLayerClientPlugin<any>).meta.name}
            plugin={plugin as OwlLayerClientPlugin<any>}
            allTools={allTools}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PluginCard — carte d'un plugin avec simulateur de tool
// ============================================================

function PluginCard({ plugin, allTools }: { plugin: OwlLayerClientPlugin<any>; allTools: ToolDeclaration[] }) {
  const [expanded, setExpanded] = useState(false);
  const components = Object.keys(plugin.ui?.components ?? {});
  const prefix = plugin.meta.name + '/';
  const pluginTools = allTools.filter(t => t.name.startsWith(prefix));

  return (
    <div style={styles.card}>
      <button style={styles.cardHeader} onClick={() => setExpanded(e => !e)}>
        <div>
          <span style={styles.pluginName}>{plugin.meta.name}</span>
          <span style={styles.version}>v{plugin.meta.version}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {components.length > 0 && <span style={{ ...styles.badge, background: '#1e3a5f', color: '#93c5fd' }}>{components.length} UI</span>}
          {pluginTools.length > 0 && <span style={{ ...styles.badge, background: '#0b3d0b', color: '#86efac' }}>{pluginTools.length} tools</span>}
          <span>{expanded ? '▲' : '▼'}</span>
        </div>
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

          {/* Tools */}
          <Section title="Tools LLM" count={pluginTools.length}>
            {pluginTools.length === 0
              ? <Empty>Aucun tool actif (composant non monté ?)</Empty>
              : pluginTools.map(tool => (
                  <ToolRow key={tool.name} tool={tool} prefix={prefix} />
                ))
            }
          </Section>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ToolRow — affiche un tool avec description et risque
// ============================================================

function ToolRow({ tool, prefix }: { tool: ToolDeclaration; prefix: string }) {
  const shortName = tool.name.replace(prefix, '');
  const risk = tool.risk ?? 'none';
  const riskColor = risk === 'none' ? '#22c55e' : risk === 'low' ? '#eab308' : risk === 'high' ? '#f97316' : '#ef4444';

  return (
    <div style={{ width: '100%', marginBottom: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={styles.toolName}>{shortName}</span>
        <span style={{
          fontSize: '9px',
          fontWeight: 700,
          padding: '1px 5px',
          borderRadius: '3px',
          background: `${riskColor}22`,
          color: riskColor,
          textTransform: 'uppercase' as const,
        }}>{risk}</span>
      </div>
      {tool.description && (
        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px', lineHeight: 1.3 }}>
          {tool.description.length > 120 ? tool.description.slice(0, 120) + '…' : tool.description}
        </div>
      )}
    </div>
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
  toolName: { color: '#34d399', marginBottom: '3px', fontWeight: 600, fontSize: '12px' },
  toolsSummary: {
    padding: '6px 14px 4px',
    borderBottom: '1px solid #2d3748',
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '4px',
  },
  toolPill: {
    background: '#0b3d0b',
    color: '#86efac',
    borderRadius: '3px',
    padding: '1px 5px',
    fontSize: '10px',
    fontFamily: 'monospace',
  },
  collapsedBtn: {
    position: 'fixed' as const,
    bottom: '16px',
    right: '16px',
    zIndex: 9999,
    background: '#16213e',
    color: '#7c3aed',
    border: '1px solid #2d3748',
    borderRadius: '8px',
    padding: '6px 14px',
    fontFamily: 'monospace',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    padding: '0 4px',
    fontFamily: 'monospace',
  },
} as const;
