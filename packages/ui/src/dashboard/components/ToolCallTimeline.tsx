const ACCENT = '#6366f1';
const SURFACE2 = '#1e1e2e';
const TEXT = '#e5e5e5';
const MUTED = '#666680';

interface ToolCallTimelineProps {
  topTools: { name: string; count: number }[];
}

export function ToolCallTimeline({ topTools }: ToolCallTimelineProps) {
  if (topTools.length === 0) {
    return <p style={{ color: MUTED, fontSize: 13 }}>Aucun tool appelé</p>;
  }

  const maxCount = Math.max(...topTools.map(t => t.count));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {topTools.map(tool => (
        <div key={tool.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'monospace',
            fontSize: 12,
            color: TEXT,
            width: 160,
            flexShrink: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {tool.name}
          </span>
          <div style={{
            flex: 1,
            background: SURFACE2,
            borderRadius: 99,
            height: 14,
            overflow: 'hidden',
          }}>
            <div style={{
              background: ACCENT,
              height: '100%',
              borderRadius: 99,
              width: `${(tool.count / maxCount) * 100}%`,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{ fontSize: 11, color: MUTED, width: 28, textAlign: 'right' }}>
            {tool.count}
          </span>
        </div>
      ))}
    </div>
  );
}
