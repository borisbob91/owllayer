import type { WidgetPosition, WidgetLabels, WidgetStylePreset } from '@domos/core';

interface FloatingButtonProps {
  onClick: () => void;
  position: WidgetPosition;
  labels: Required<WidgetLabels>;
  stylePreset: WidgetStylePreset;
}

/** Phone icon (filled) */
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export function FloatingButton({ onClick, position, labels, stylePreset }: FloatingButtonProps) {
  const presetClass = `domos-preset-${stylePreset}`;

  return (
    <button
      className={`domos-fab ${position === 'bottom-left' ? 'bottom-left' : ''} ${presetClass}`}
      onClick={onClick}
      aria-label={labels.callToAction}
    >
      {/* Badge */}
      {labels.badge && (
        <span className="domos-fab-badge">{labels.badge}</span>
      )}

      {/* Text content */}
      <div className="domos-fab-content">
        <span className="domos-fab-title">{labels.callToAction}</span>
        <span className="domos-fab-subtitle">{labels.subtitle}</span>
        <span className="domos-fab-signature">by DomOS AI</span>
      </div>

      {/* Phone icon circle */}
      <div className="domos-fab-icon">
        <PhoneIcon />
      </div>
    </button>
  );
}
