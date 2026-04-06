const SURFACE = '#1a1a24';
const BORDER = '#2a2a3a';
const GRID = '#252535';
const TEXT = '#e5e5e5';
const MUTED = '#666680';

interface MetricsChartProps {
  data: { label: string; value: number }[];
  color?: string;
  title: string;
}

export function MetricsChart({ data, color = '#6366f1', title }: MetricsChartProps) {
  if (data.length === 0) return null;

  const W = 400;
  const H = 160;
  const pad = { top: 12, right: 12, bottom: 28, left: 38 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;
  const maxVal = Math.max(...data.map(d => d.value), 1);

  const pts = data.map((d, i) => ({
    x: pad.left + (data.length > 1 ? (i / (data.length - 1)) * cW : cW / 2),
    y: pad.top + cH - (d.value / maxVal) * cH,
  }));

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${(pad.top + cH).toFixed(1)} L${pts[0].x.toFixed(1)},${(pad.top + cH).toFixed(1)} Z`;

  const gridLines = [0.25, 0.5, 0.75, 1].map(p => ({
    y: pad.top + cH - p * cH,
    label: Math.round(maxVal * p).toLocaleString(),
  }));

  return (
    <div style={{
      background: SURFACE,
      border: `1px solid ${BORDER}`,
      borderRadius: 8,
      padding: 14,
    }}>
      <h3 style={{ fontSize: 12, color: MUTED, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', overflow: 'visible' }}
        aria-label={title}
      >
        {/* Grid */}
        {gridLines.map(g => (
          <g key={g.y}>
            <line x1={pad.left} x2={pad.left + cW} y1={g.y} y2={g.y} stroke={GRID} strokeDasharray="3 3" />
            <text x={pad.left - 4} y={g.y + 4} fontSize={9} fill={MUTED} textAnchor="end">{g.label}</text>
          </g>
        ))}

        {/* Area fill */}
        <path d={area} fill={color} fillOpacity={0.12} />

        {/* Line */}
        <path d={line} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots on data points */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => {
          const skip = data.length > 10 && i % Math.ceil(data.length / 8) !== 0;
          if (skip) return null;
          const x = pad.left + (data.length > 1 ? (i / (data.length - 1)) * cW : cW / 2);
          return (
            <text key={i} x={x} y={H - 4} fontSize={9} fill={MUTED} textAnchor="middle">
              {d.label}
            </text>
          );
        })}

        {/* Y=0 axis line */}
        <line
          x1={pad.left} x2={pad.left + cW}
          y1={pad.top + cH} y2={pad.top + cH}
          stroke={BORDER}
        />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 11, color: MUTED }}>
          Min: {Math.min(...data.map(d => d.value)).toLocaleString()}
        </span>
        <span style={{ fontSize: 11, color: TEXT, fontWeight: 600 }}>
          Max: {maxVal.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
