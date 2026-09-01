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
} from '@owllayer/core';
import { useAgent } from '../../hooks/useAgent.js';
import { useAgentTool } from '../../hooks/useAgentTool.js';
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

/** Mic-off icon (mute) */
const MicOffIcon = () => (
  <svg viewBox="0 0 24 24">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
  </svg>
);

// ---- Default tools ----

/**
 * EndCallTool — nano-composant interne enregistrant l'outil `end_call` par défaut.
 * Conditionnel sans violer les règles des hooks React (composant null vs hook conditionnel).
 * Opt-out : ne pas rendre ce composant via config.disableEndCallTool = true.
 */
function EndCallTool({ onEnd }: { onEnd: () => void }) {
  useAgentTool(
    {
      name: 'end_call',
      description:
        "Fermer le panneau de chat et terminer la conversation en cours. " +
        "À appeler quand tu dis au revoir à l'utilisateur (\"à bientôt\", \"bonne journée\", \"n'hésitez pas à rappeler\"…) " +
        "ou quand la demande est entièrement traitée et qu'il ne reste aucune question ouverte. " +
        "Déclenche l'animation de fermeture et efface l'historique du chat. " +
        "Le bouton flottant reste visible — l'utilisateur peut ré-ouvrir à tout moment. " +
        "Ne pas utiliser si l'utilisateur pose encore une question ou si la session doit rester ouverte.",
      risk: 'none',
    },
    () => {
      onEnd();
      return 'Conversation terminée. À bientôt !';
    },
  );
  return null;
}

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

  const { agentState, sendText, lastResponse, isThinking, isSpeaking, lineState, agentError } = useAgent();
  const { isRecording, isMuted, muteMic, unmuteMic, startRecording, stopRecording } = useVoiceMode({
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

  const isThinkingComputed =
    (isThinking || (messages.length > 0 && messages[messages.length - 1]?.role === 'user' && !lastResponse)) &&
    agentState !== 'error';

  // --- Track agent errors ---
  useEffect(() => {
    if (agentError) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'user') {
          return [
            ...prev,
            {
              id: generateId(),
              role: 'agent',
              content: `⚠️ ${agentError}`,
              timestamp: Date.now(),
            },
          ];
        }
        return prev;
      });
    }
  }, [agentError]);

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
    ? 'bottom-left'
    : (cfg.position === 'bottom-left' ? 'bottom-left' : '');
  const presetClass = `owllayer-preset-${cfg.stylePreset}`;

  return (
    <>
      {/* ---- Default tool: end_call — OUTSIDE Shadow DOM pour accéder au contexte OwlLayerProvider ---- */}
      {/* EndCallTool retourne null (pas de DOM), doit être dans le React tree parent, pas dans createRoot du shadow DOM */}
      {isOpen && !cfg.disableEndCallTool && <EndCallTool onEnd={handleHangUp} />}

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
          <div className={`owllayer-panel ${positionClass} ${presetClass} ${currentMode === 'text' ? 'text-mode' : ''} ${isClosing ? 'is-closing' : ''}`}>

            {/* Header */}
            <div className="owllayer-panel-header">
              <div className="owllayer-avatar">
                <AvatarIcon />
              </div>

              <div className="owllayer-agent-info">
                <div className="owllayer-agent-name">{agentDisplay}</div>
                <div className="owllayer-agent-status">
                  <span className={`owllayer-status-dot ${dotClass}`} />
                  <span>{statusLabel}</span>
              </div>
            </div>

            {isLive && (
              <span className="owllayer-live-badge">{cfg.labels.live}</span>
            )}

            {/* Header action buttons */}
            <div className="owllayer-header-actions">
              {cfg.allowModeSwitch && (
                <button
                  className={`owllayer-btn-header ${currentMode === 'text' ? 'active' : ''}`}
                  onClick={handleSwitchMode}
                  aria-label={currentMode === 'audio' ? 'Mode texte' : 'Mode audio'}
                >
                  {currentMode === 'audio' ? <KeyboardIcon /> : <MicIcon />}
                  <span className="owllayer-tooltip">
                    {currentMode === 'audio' ? 'Mode texte' : 'Mode audio'}
                  </span>
                </button>
              )}
            </div>
          </div>

        {/* ---- Line waiting / busy overlay ---- */}
          {lineState === 'waiting' && (
            <div className="owllayer-line-overlay">
              <div className="owllayer-line-spinner" />
              <p className="owllayer-line-title">Toutes les lignes sont occupées</p>
              <p className="owllayer-line-sub">Vous serez connecté dès qu'une ligne se libère…</p>
            </div>
          )}
          {lineState === 'busy' && (
            <div className="owllayer-line-overlay owllayer-line-overlay--busy">
              <p className="owllayer-line-title">Service temporairement indisponible</p>
              <p className="owllayer-line-sub">Toutes les lignes sont occupées. Veuillez réessayer dans quelques instants.</p>
              <button className="owllayer-btn-hangup" onClick={handleHangUp}>{cfg.labels.hangUp}</button>
            </div>
          )}

          {/* Body */}
          {lineState === 'idle' && (currentMode === 'audio' ? (
            isTravelPreset ? (
              <div className="owllayer-panel-body owllayer-travel-body">
                <TravelWaveform state={visualState} inputLevel={micLevel} isMuted={isMuted} />
                <p className="owllayer-travel-status-label">{statusLabel}</p>
              </div>
            ) : (
              /* Audio mode: dots visualization */
              <div className="owllayer-panel-body">
                <AudioDots state={visualState} />
              </div>
            )
          ) : (
            /* Text mode: message list */
            <div className={isTravelPreset ? 'owllayer-travel-messages-wrap' : ''}>
              <MessageList
                messages={messages}
                isThinking={isThinkingComputed}
                thinkingLabel={cfg.labels.thinking}
              />
            </div>
          ))}

          {/* Footer */}
          {lineState === 'idle' && (currentMode === 'audio' ? (
            <div className="owllayer-panel-footer">
              {isRecording && (
                <button
                  className={`owllayer-btn-mute ${isMuted ? 'muted' : ''}`}
                  onClick={isMuted ? unmuteMic : muteMic}
                  aria-label={isMuted ? 'Réactiver le micro' : 'Couper le micro'}
                >
                  {isMuted ? <MicIcon /> : <MicOffIcon />}
                </button>
              )}
              <button className="owllayer-btn-hangup" onClick={handleHangUp}>
                <XIcon />
                {cfg.labels.hangUp}
              </button>

              {cfg.allowModeSwitch && !isTravelPreset && (
                <button className="owllayer-btn-switch" onClick={handleSwitchMode}>
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
              <div className="owllayer-panel-footer">
                <button className="owllayer-btn-hangup" onClick={handleHangUp}>
                  <XIcon />
                  {cfg.labels.hangUp}
                </button>

                {cfg.allowModeSwitch && (
                  <button className="owllayer-btn-switch" onClick={handleSwitchMode}>
                    Passer en mode audio
                  </button>
                )}
              </div>
            </>
          ))}
          <div className="owllayer-widget-signature">by OwlLayer AI</div>
        </div>
      )}
      </ShadowContainer>
    </>
  );
}
