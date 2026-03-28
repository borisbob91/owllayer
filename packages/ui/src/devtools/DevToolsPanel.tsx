import { useState, useEffect, useRef } from 'preact/hooks';
import { PluginInspector } from './PluginInspector.js';
import { ToolCallSimulator } from './ToolCallSimulator.js';
import { StateMonitor } from './StateMonitor.js';
import { ToolsInspector } from './ToolsInspector.js';
import type { DevToolsConfig } from './index.js';

const ACCENT = '#6366f1';
const BG     = '#0f0f13';
const TEXT   = '#e5e5e5';
const MUTED  = '#666680';
const BORDER = '#2a2a3a';

type Tab = 'plugins' | 'tools' | 'simulator' | 'monitor';

interface DevToolsPanelProps {
  config: DevToolsConfig;
}

export function DevToolsPanel({ config }: DevToolsPanelProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [tab, setTab] = useState<Tab>('tools');
  const [toolCount, setToolCount] = useState(0);
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

  const tabBtn = (id: Tab, label: string) => (
    <button
      onClick={() => setTab(id)}
      style={{ padding: '5px 12px', border: 'none', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
        background: tab === id ? ACCENT : 'transparent', color: tab === id ? '#fff' : MUTED }}
    >
      {label}
    </button>
  );

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
        width: collapsed ? 'auto' : 380,
        maxWidth: 'calc(100vw - 20px)',
        maxHeight: collapsed ? 'auto' : 'calc(100vh - 40px)',
        zIndex: 2147483647,
        background: BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 13,
        color: TEXT,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Handle bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#111118', cursor: 'grab', borderBottom: collapsed ? 'none' : `1px solid ${BORDER}` }}>
        {/* DomOS dot */}
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, display: 'inline-block', boxShadow: `0 0 6px ${ACCENT}` }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: '0.04em', flex: 1 }}>DOMOS DEV</span>

        {!collapsed && (
          <div style={{ display: 'flex', gap: 4 }}>
            {tabBtn('tools', `Tools${toolCount > 0 ? ` (${toolCount})` : ''}`)}
            {tabBtn('plugins', 'Plugins')}
            {tabBtn('simulator', 'Simuler')}
            {tabBtn('monitor', 'État')}
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); setCollapsed(c => !c); }}
          style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
          title={collapsed ? 'Ouvrir' : 'Réduire'}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {/* Content */}
      {!collapsed && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          {tab === 'tools'     && <ToolsInspector config={config} onCount={setToolCount} />}
          {tab === 'plugins'   && <PluginInspector config={config} />}
          {tab === 'simulator' && <ToolCallSimulator config={config} />}
          {tab === 'monitor'   && <StateMonitor config={config} />}
        </div>
      )}
    </div>
  );
}
