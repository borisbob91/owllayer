interface RiskBadgeProps {
  level: 'none' | 'low' | 'high' | 'critical' | string;
}

const RISK_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  none:     { bg: 'rgba(34,197,94,0.15)',   fg: '#22c55e', label: 'safe' },
  low:      { bg: 'rgba(234,179,8,0.15)',   fg: '#eab308', label: 'low' },
  high:     { bg: 'rgba(249,115,22,0.15)',  fg: '#f97316', label: 'high' },
  critical: { bg: 'rgba(239,68,68,0.15)',   fg: '#ef4444', label: '⚠ critical' },
};

export function RiskBadge({ level }: RiskBadgeProps) {
  const c = RISK_COLORS[level] ?? { bg: 'rgba(100,100,120,0.15)', fg: '#888', label: level };
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 7px',
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.04em',
      textTransform: 'uppercase' as const,
      background: c.bg,
      color: c.fg,
      border: `1px solid ${c.fg}44`,
    }}>
      {c.label}
    </span>
  );
}
