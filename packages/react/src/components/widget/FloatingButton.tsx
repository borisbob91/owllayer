import type { WidgetPosition, WidgetLabels, WidgetStylePreset } from '@owllayer/core';
import { ChatIcon, PhoneIcon, WaveIcon } from './icons.js';

interface FloatingButtonProps {
  onClick: () => void;
  position: WidgetPosition;
  labels: Required<WidgetLabels>;
  stylePreset: WidgetStylePreset;
}

export function FloatingButton({ onClick, position, labels, stylePreset }: FloatingButtonProps) {
  const Icon = stylePreset === 'chat' ? ChatIcon : stylePreset === 'travel' ? WaveIcon : PhoneIcon;

  return (
    <button
      type="button"
      className={`owllayer-fab ${position === 'bottom-left' ? 'bottom-left' : ''} owllayer-preset-${stylePreset}`}
      onClick={onClick}
      aria-label={labels.callToAction}
      title={stylePreset === 'chat' ? labels.callToAction : undefined}
    >
      {labels.badge && <span className="owllayer-fab-badge">{labels.badge}</span>}

      <span className="owllayer-fab-content">
        <span className="owllayer-fab-title">{labels.callToAction}</span>
        <span className="owllayer-fab-subtitle">{labels.subtitle}</span>
        <span className="owllayer-fab-signature">by OwlLayer AI</span>
      </span>

      <span className="owllayer-fab-icon">
        <Icon />
      </span>
    </button>
  );
}
