import { useState, useCallback, useEffect, useRef } from 'react';
import {
  generateWidgetStyles,
  DEFAULT_WIDGET_CONFIG,
  DEFAULT_THEME,
  DEFAULT_LABELS,
  generateId,
  type WidgetConfig,
  type WidgetMode,
  type WidgetVisualState,
  type WidgetMessage,
} from '@domos/core';
import { useAgent } from '../../hooks/useAgent.js';
import { useVoiceMode } from '../../voice/useVoiceMode.js';
import { ShadowContainer } from '../shadow-dom.Container.js';
import { FloatingButton } from './FloatingButton.js';
import { AudioDots, TravelWaveform } from './AudioOrb.js';
import { MessageList } from './MessageList.js';
import { ChatInput } from './ChatInput.js';

// ---- SVG Icons ----

/** User avatar icon */
const AvatarIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

/** X icon for hang up */
const XIcon = () => (
  <svg viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/** Keyboard icon (switch to text) */
const KeyboardIcon = () => (
  <svg viewBox="0 0 24 24">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <line x1="6" y1="8" x2="6" y2="8" />
    <line x1="10" y1="8" x2="10" y2="8" />
    <line x1="14" y1="8" x2="14" y2="8" />
    <line x1="18" y1="8" x2="18" y2="8" />
    <line x1="8" y1="16" x2="16" y2="16" />
  </svg>
);

/** Mic icon (switch to audio) */
const MicIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
  </svg>
);

// ---- Component ----

interface WidgetInnerProps {
  config: WidgetConfig;
}

export function WidgetInner({ config }: WidgetInnerProps) {
  // Merge config with defaults
  const cfg = {
    ...DEFAULT_WIDGET_CONFIG,
    ...config,
    theme: { ...DEFAULT_THEME, ...config.theme },
    labels: { ...DEFAULT_LABELS, ...config.labels },
  };
  const isTravelPreset = cfg.stylePreset === 'travel';

  const [micLevel, setMicLevel] = useState(0);
  const micEmaRef = useRef(0);
  const micLevelRef = useRef(0);
  const micRafRef = useRef<number | null>(null);

  const { agentState, sendText, lastResponse, isThinking, isSpeaking } = useAgent();
  const { isRecording, startRecording, stopRecording } = useVoiceMode({
    live: true,
    onInputLevel: isTravelPreset
      ? (level: number) => {
          const target = Math.max(0, Math.min(1, level));
          // Smooth the meter to avoid jitter in the visualizer.
          micEmaRef.current = micEmaRef.current * 0.78 + target * 0.22;
          micLevelRef.current = micEmaRef.current;
          if (micRafRef.current !== null) return;
          micRafRef.current = window.requestAnimationFrame(() => {
            setMicLevel(micLevelRef.current);
            micRafRef.current = null;
          });
        }
      : undefined,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [currentMode, setCurrentMode] = useState<WidgetMode>(cfg.mode);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);

  const prevResponseRef = useRef<string | null>(null);
  const cssRef = useRef(generateWidgetStyles(cfg.theme, cfg.stylePreset));

  // --- Derive visual state ---
  const visualState: WidgetVisualState =
    agentState === 'listening' || isRecording ? 'listening'
    : agentState === 'thinking' ? 'thinking'
    : agentState === 'speaking' || isSpeaking ? 'speaking'
    : agentState === 'error' || agentState === 'disconnected' ? 'error'
    : 'idle';

  // --- Status label ---
  const statusLabel =
    visualState === 'listening' ? cfg.labels.listening
    : visualState === 'thinking' ? cfg.labels.thinking
    : visualState === 'speaking' ? cfg.labels.speaking
    : visualState === 'error' ? cfg.labels.error
    : cfg.labels.idle;

  // --- Status dot class ---
  const dotClass =
    visualState === 'error' ? 'error'
    : agentState === 'disconnected' ? 'offline'
    : '';

  // --- Track agent responses ---
  useEffect(() => {
    if (lastResponse && lastResponse !== prevResponseRef.current) {
      prevResponseRef.current = lastResponse;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'agent') {
          return [
            ...prev.slice(0, -1),
            { ...last, content: lastResponse, timestamp: Date.now() },
          ];
        }

        return [
          ...prev,
          {
            id: generateId(),
            role: 'agent',
            content: lastResponse,
            timestamp: Date.now(),
          },
        ];
      });
    }
  }, [lastResponse]);

  useEffect(() => {
    if (isRecording) return;
    micEmaRef.current = 0;
    micLevelRef.current = 0;
    setMicLevel(0);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (micRafRef.current !== null) {
        window.cancelAnimationFrame(micRafRef.current);
        micRafRef.current = null;
      }
    };
  }, []);

  // --- Auto-start recording when opening in audio mode ---
  const handleOpen = useCallback(async () => {
    setIsOpen(true);
    setIsClosing(false);

    if (cfg.mode === 'audio') {
      try {
        await startRecording();
      } catch {
        if (cfg.fallbackToText) {
          setCurrentMode('text');
        }
      }
    }
  }, [cfg.mode, cfg.fallbackToText, startRecording]);

  // --- Hang up / close ---
  const handleHangUp = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }

    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setMessages([]);
    }, 250);
  }, [isRecording, stopRecording]);

  // --- Send text ---
  const handleSendText = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      },
    ]);
    sendText(text);
  }, [sendText]);

  // --- Switch mode ---
  const handleSwitchMode = useCallback(() => {
    if (currentMode === 'audio') {
      if (isRecording) stopRecording();
      setCurrentMode('text');
    } else {
      setCurrentMode('audio');
      startRecording().catch(() => {
        if (cfg.fallbackToText) setCurrentMode('text');
      });
    }
  }, [currentMode, isRecording, stopRecording, startRecording, cfg.fallbackToText]);

  // --- Agent display name ---
  const agentDisplay = cfg.agentTitle
    ? `${cfg.agentName} (${cfg.agentTitle})`
    : cfg.agentName;

  // --- Is connected ---
  const isLive = agentState === 'connected' || agentState === 'listening'
    || agentState === 'thinking' || agentState === 'speaking';

  const positionClass = isTravelPreset
    ? 'travel-dock-left'
    : (cfg.position === 'bottom-left' ? 'bottom-left' : '');
  const presetClass = `domos-preset-${cfg.stylePreset}`;

  return (
    <ShadowContainer styles={cssRef.current}>
      {/* ---- Floating Button (when closed) ---- */}
      {!isOpen && (
        <FloatingButton
          onClick={handleOpen}
          position={cfg.position}
          labels={cfg.labels as Required<typeof cfg.labels>}
          stylePreset={cfg.stylePreset}
        />
      )}

      {/* ---- Call Panel (when open) ---- */}
      {isOpen && (
        <div className={`domos-panel ${positionClass} ${presetClass} ${currentMode === 'text' ? 'text-mode' : ''} ${isClosing ? 'is-closing' : ''}`}>

          {/* Header */}
          <div className="domos-panel-header">
            <div className="domos-avatar">
              <AvatarIcon />
            </div>

            <div className="domos-agent-info">
              <div className="domos-agent-name">{agentDisplay}</div>
              <div className="domos-agent-status">
                <span className={`domos-status-dot ${dotClass}`} />
                <span>{statusLabel}</span>
              </div>
            </div>

            {isLive && (
              <span className="domos-live-badge">{cfg.labels.live}</span>
            )}

            {/* Header action buttons */}
            <div className="domos-header-actions">
              {cfg.allowModeSwitch && (
                <button
                  className={`domos-btn-header ${currentMode === 'text' ? 'active' : ''}`}
                  onClick={handleSwitchMode}
                  aria-label={currentMode === 'audio' ? 'Mode texte' : 'Mode audio'}
                >
                  {currentMode === 'audio' ? <KeyboardIcon /> : <MicIcon />}
                  <span className="domos-tooltip">
                    {currentMode === 'audio' ? 'Mode texte' : 'Mode audio'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          {currentMode === 'audio' ? (
            isTravelPreset ? (
              <div className="domos-panel-body domos-travel-body">
                <TravelWaveform state={visualState} inputLevel={micLevel} />
                <p className="domos-travel-status-label">{statusLabel}</p>
              </div>
            ) : (
              /* Audio mode: dots visualization */
              <div className="domos-panel-body">
                <AudioDots state={visualState} />
              </div>
            )
          ) : (
            /* Text mode: message list */
            <div className={isTravelPreset ? 'domos-travel-messages-wrap' : ''}>
              <MessageList messages={messages} isThinking={isThinking} />
            </div>
          )}

          {/* Footer */}
          {currentMode === 'audio' ? (
            <div className="domos-panel-footer">
              <button className="domos-btn-hangup" onClick={handleHangUp}>
                <XIcon />
                {cfg.labels.hangUp}
              </button>

              {cfg.allowModeSwitch && (
                <button className="domos-btn-switch" onClick={handleSwitchMode}>
                  Passer en mode texte
                </button>
              )}
            </div>
          ) : (
            <>
              <ChatInput
                labels={cfg.labels as Required<typeof cfg.labels>}
                onSendText={handleSendText}
              />
              <div className="domos-panel-footer">
                <button className="domos-btn-hangup" onClick={handleHangUp}>
                  <XIcon />
                  {cfg.labels.hangUp}
                </button>

                {cfg.allowModeSwitch && (
                  <button className="domos-btn-switch" onClick={handleSwitchMode}>
                    Passer en mode audio
                  </button>
                )}
              </div>
            </>
          )}
          <div className="domos-widget-signature">by DomOS AI</div>
        </div>
      )}
    </ShadowContainer>
  );
}
