import { useState, useEffect, useRef } from 'preact/hooks';
import { PluginInspector } from './PluginInspector.js';
import { ToolCallSimulator } from './ToolCallSimulator.js';
import { StateMonitor } from './StateMonitor.js';
import { ToolsInspector } from './ToolsInspector.js';
import type { DevToolsConfig } from './index.js';

const ACCENT = '#8b5cf6';
const ACCENT_SOFT = '#1f1b3a';
const BG = '#13162b';
const PANEL_BG = '#111528';
const SURFACE = '#171c33';
const SURFACE_ALT = '#0f1428';
const TEXT = '#edf2ff';
const MUTED = '#8b95ba';
const BORDER = '#2d3355';
const GREEN = '#22c55e';
const BLUE = '#60a5fa';
const SHADOW = '0 24px 60px rgba(2, 6, 23, 0.58)';

type Tab = 'plugins' | 'tools' | 'simulator' | 'monitor';

interface DevToolsPanelProps {
  config: DevToolsConfig;
}

export function DevToolsPanel({ config }: DevToolsPanelProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [tab, setTab] = useState<Tab>('plugins');
  const [tools, setTools] = useState(() => config.getRegisteredTools());
  const [agentState, setAgentState] = useState(() => config.getAgentState());
  const [pos, setPos] = useState({ x: 20, y: 20 }); // distance from bottom-right
  const dragging = useRef<{ ox: number; oy: number; ix: number; iy: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Drag support
  const hasMoved = useRef(false);

  const onPointerDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, select, textarea, input')) return;
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    hasMoved.current = false;
    dragging.current = { ox: e.clientX, oy: e.clientY, ix: rect.left, iy: rect.top };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragging.current.ox;
    const dy = e.clientY - dragging.current.oy;
    if (!hasMoved.current && Math.sqrt(dx * dx + dy * dy) > 4) hasMoved.current = true;
    if (!hasMoved.current) return;
    const newX = dragging.current.ix + dx;
    const newY = dragging.current.iy + dy;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const el = panelRef.current;
    const w = el?.offsetWidth ?? 360;
    const h = el?.offsetHeight ?? 80;
    // clamp so panel stays in viewport
    const clampedX = Math.max(0, Math.min(vw - w, newX));
    const clampedY = Math.max(0, Math.min(vh - h, newY));
    setPos({ x: vw - clampedX - w, y: vh - clampedY - h });
    e.preventDefault();
  };

  const onPointerUp = () => {
    if (dragging.current && !hasMoved.current) {
      setCollapsed(c => !c);
    }
    dragging.current = null;
    hasMoved.current = false;
  };

  const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
  const pluginCount = config.plugins.length;
  const toolCount = tools.length;

  useEffect(() => {
    const refresh = () => {
      setTools(config.getRegisteredTools());
      setAgentState(config.getAgentState());
    };
    refresh();
    const id = setInterval(refresh, 1000);
    return () => clearInterval(id);
  }, [config]);

  const stateColor =
    agentState === 'running' ? GREEN :
    agentState === 'error' ? '#ef4444' :
    agentState === 'idle' ? MUTED :
    BLUE;

  const tabBtn = (id: Tab, label: string) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: '7px 12px',
        border: '1px solid transparent',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.15s',
        background: tab === id ? ACCENT_SOFT : SURFACE_ALT,
        color: tab === id ? '#f8faff' : MUTED,
        borderColor: tab === id ? '#7057ff66' : BORDER,
        boxShadow: tab === id ? 'inset 0 0 0 1px rgba(139,92,246,0.18)' : 'none',
      }}
    >
      {label}
    </button>
  );

  if (collapsed) {
    return (
      <button
        ref={panelRef as any}
        onPointerDown={onPointerDown as any}
        onPointerMove={onPointerMove as any}
        onPointerUp={onPointerUp}
        style={{
          position: 'fixed',
          right: pos.x,
          bottom: pos.y,
          zIndex: 2147483647,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '11px 16px',
          background: 'linear-gradient(180deg, #20284a 0%, #171c33 100%)',
          color: ACCENT,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          boxShadow: SHADOW,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'grab',
          userSelect: 'none',
        }}
        title="Ouvrir le DevTools DomOS"
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>⚡</span>
        <span>DevPanel ({pluginCount} plugins · {toolCount} tools)</span>
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      onPointerDown={onPointerDown as any}
      onPointerMove={onPointerMove as any}
      onPointerUp={onPointerUp}
      style={{
        position: 'fixed',
        right: pos.x,
        bottom: pos.y,
        width: 430,
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'min(78vh, 820px)',
        zIndex: 2147483647,
        background: BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        boxShadow: SHADOW,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
        fontSize: 13,
        color: TEXT,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 14px 12px', background: PANEL_BG, cursor: 'grab', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>⚡</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: ACCENT, letterSpacing: '0.02em' }}>DevPanel</div>
            <div style={{ fontSize: 11, color: MUTED }}>DomOS DevTools embarqué</div>
          </div>
          <span style={{ padding: '4px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: '#1a2244', color: '#c7d2fe', border: `1px solid ${BORDER}` }}>
            {pluginCount} plugins
          </span>
          <span style={{ padding: '4px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: '#10311d', color: '#86efac', border: '1px solid rgba(34,197,94,0.24)' }}>
            {toolCount} tools
          </span>
          <span style={{ padding: '4px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: `${stateColor}22`, color: stateColor, border: `1px solid ${stateColor}33` }}>
            {agentState}
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 68, overflowY: 'auto', paddingBottom: 2 }}>
          {toolCount === 0 && (
            <span style={{ fontSize: 11, color: MUTED, fontStyle: 'italic' }}>Aucun tool actif pour le moment.</span>
          )}
          {tools.map((tool) => (
            <span
              key={tool.name}
              style={{
                padding: '3px 7px',
                borderRadius: 5,
                fontSize: 10,
                fontWeight: 700,
                lineHeight: 1.3,
                background: '#0b3d0b',
                color: '#86efac',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              }}
            >
              {tool.name}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tabBtn('plugins', `Plugins (${pluginCount})`)}
          {tabBtn('tools', `Tools (${toolCount})`)}
          {tabBtn('simulator', 'Simuler')}
          {tabBtn('monitor', 'État')}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); setCollapsed(c => !c); }}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'transparent',
            border: 'none',
            color: MUTED,
            cursor: 'pointer',
            fontSize: 16,
            padding: '0 4px',
            lineHeight: 1,
          }}
          title="Réduire"
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 14, background: 'linear-gradient(180deg, #12172d 0%, #0f1325 100%)' }}>
        {tab === 'tools' && <ToolsInspector config={config} onCount={() => undefined} />}
        {tab === 'plugins' && <PluginInspector config={config} />}
        {tab === 'simulator' && <ToolCallSimulator config={config} />}
        {tab === 'monitor' && <StateMonitor config={config} />}
      </div>
    </div>
  );
}
