import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  generateWidgetStyles,
  DEFAULT_WIDGET_CONFIG,
  DEFAULT_LABELS,
  END_CALL_RESULT,
  END_CALL_TIMING,
  END_CALL_TOOL,
  generateId,
  type OwlLayerClientEventListener,
  type WidgetConfig,
  type WidgetLabels,
  type WidgetMode,
  type WidgetVisualState,
  type WidgetMessage,
} from '@owllayer/core';
import { useAgent } from '../../hooks/useAgent.js';
import { useAgentTool } from '../../hooks/useAgentTool.js';
import { useOwlLayerEvent } from '../../hooks/useOwlLayerEvent.js';
import { useVoiceMode } from '../../voice/useVoiceMode.js';
import { ShadowContainer } from '../shadow-dom.Container.js';
import { FloatingButton } from './FloatingButton.js';
import { VoiceVisualizer } from './VoiceVisualizer.js';
import { MessageList } from './MessageList.js';
import { ChatInput } from './ChatInput.js';
import { CloseIcon, HangUpIcon, KeyboardIcon, MicIcon, MicOffIcon, SparkIcon } from './icons.js';

/** Lignes de transcription visibles en mode vocal */
const TRANSCRIPT_LINES = 3;

// ---- Default tools ----

/**
 * EndCallTool — nano-composant interne enregistrant l'outil `end_call` (declaration partagee dans @owllayer/core).
 * Conditionnel sans violer les règles des hooks React (composant null vs hook conditionnel).
 * Opt-out : ne pas rendre ce composant via config.disableEndCallTool = true.
 */
function EndCallTool({ onEnd }: { onEnd: () => void }) {
  useAgentTool(
    { name: END_CALL_TOOL.name, description: END_CALL_TOOL.description, risk: END_CALL_TOOL.risk },
    () => {
      onEnd();
      return END_CALL_RESULT;
    },
  );
  return null;
}

// ---- Component ----

interface WidgetInnerProps {
  config: WidgetConfig;
}

export function WidgetInner({ config }: WidgetInnerProps) {
  const cfg = { ...DEFAULT_WIDGET_CONFIG, ...config };
  const labels: Required<WidgetLabels> = { ...DEFAULT_LABELS, ...config.labels };
  // Palette : preset puis theme de l'application (generateWidgetStyles applique les valeurs par defaut)
  const themeKey = JSON.stringify(config.theme ?? {});
  const css = useMemo(
    () => generateWidgetStyles(config.theme, cfg.stylePreset),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themeKey, cfg.stylePreset],
  );
  // travel s'ouvre a gauche par defaut, sauf position explicite
  const position = config.position ?? (cfg.stylePreset === 'travel' ? 'bottom-left' : cfg.position);

  // --- Niveau du micro, lisse et limite a une mise a jour par frame ---
  const [micLevel, setMicLevel] = useState(0);
  const micEmaRef = useRef(0);
  const micRafRef = useRef<number | null>(null);
  const onInputLevel = useCallback((level: number) => {
    micEmaRef.current = micEmaRef.current * 0.75 + Math.max(0, Math.min(1, level)) * 0.25;
    if (micRafRef.current !== null) return;
    micRafRef.current = window.requestAnimationFrame(() => {
      micRafRef.current = null;
      setMicLevel(micEmaRef.current);
    });
  }, []);

  const { agentState, sendText, lastResponse, isThinking, isSpeaking, lineState, agentError } = useAgent();
  const { isRecording, isMuted, muteMic, unmuteMic, startRecording, stopRecording } = useVoiceMode({
    live: true,
    onInputLevel,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [currentMode, setCurrentMode] = useState<WidgetMode>(cfg.mode);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const currentModeRef = useRef(currentMode);
  currentModeRef.current = currentMode;

  const prevResponseRef = useRef<string | null>(null);
  // Dernier message issu d'une transcription vocale : les fragments suivants du meme role s'y ajoutent
  const voiceMessageIdRef = useRef<string | null>(null);

  // --- Etat visuel ---
  const visualState: WidgetVisualState =
    agentState === 'error' || agentState === 'disconnected' ? 'error'
    : agentState === 'speaking' || isSpeaking ? 'speaking'
    : agentState === 'thinking' || isThinking ? 'thinking'
    : agentState === 'listening' || isRecording ? 'listening'
    : 'idle';

  const statusLabel =
    visualState === 'listening' ? labels.listening
    : visualState === 'thinking' ? labels.thinking
    : visualState === 'speaking' ? labels.speaking
    : visualState === 'error' ? labels.error
    : labels.idle;

  const isLive = agentState === 'connected' || agentState === 'listening'
    || agentState === 'thinking' || agentState === 'speaking';

  const lastMessage = messages[messages.length - 1];
  const isWaitingForAnswer =
    (isThinking || (lastMessage?.role === 'user' && voiceMessageIdRef.current !== lastMessage.id && agentState !== 'speaking'))
    && agentState !== 'error';

  // --- Erreur de l'agent : affichee dans la conversation ---
  useEffect(() => {
    if (!agentError) return;
    setMessages((prev) => {
      if (prev[prev.length - 1]?.role !== 'user') return prev;
      return [...prev, { id: generateId(), role: 'agent', content: `⚠️ ${agentError}`, timestamp: Date.now() }];
    });
  }, [agentError]);

  // --- Reponses texte de l'agent ---
  useEffect(() => {
    if (!lastResponse || lastResponse === prevResponseRef.current) return;
    prevResponseRef.current = lastResponse;
    // En vocal, le texte de l'agent arrive par sa transcription (sinon il s'afficherait deux fois)
    if (currentModeRef.current === 'audio') return;
    voiceMessageIdRef.current = null;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === 'agent') {
        return [...prev.slice(0, -1), { ...last, content: lastResponse, timestamp: Date.now() }];
      }
      return [...prev, { id: generateId(), role: 'agent', content: lastResponse, timestamp: Date.now() }];
    });
  }, [lastResponse]);

  // --- Transcriptions vocales : la conversation reste la meme en voix et en texte ---
  const onTranscript = useCallback<OwlLayerClientEventListener<'transcript.delta'>>(({ role, text }) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && last.id === voiceMessageIdRef.current) {
        return [...prev.slice(0, -1), { ...last, content: last.content + text }];
      }
      const id = generateId();
      voiceMessageIdRef.current = id;
      return [...prev, { id, role, content: text.trimStart(), timestamp: Date.now() }];
    });
  }, []);
  useOwlLayerEvent('transcript.delta', onTranscript);

  useEffect(() => {
    if (isRecording) return;
    micEmaRef.current = 0;
    setMicLevel(0);
  }, [isRecording]);

  useEffect(() => () => {
    if (micRafRef.current !== null) window.cancelAnimationFrame(micRafRef.current);
  }, []);

  // --- Voix ; en cas d'echec du micro, repli sur le texte ---
  const startVoice = useCallback(async () => {
    setCurrentMode('audio');
    try {
      await startRecording();
    } catch {
      if (cfg.fallbackToText) setCurrentMode('text');
    }
  }, [startRecording, cfg.fallbackToText]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setIsClosing(false);
    if (cfg.mode === 'audio') void startVoice();
  }, [cfg.mode, startVoice]);

  const handleClose = useCallback(() => {
    setEndRequestedAt(null);
    if (isRecording) stopRecording();
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setMessages([]);
      voiceMessageIdRef.current = null;
      setCurrentMode(cfg.mode);
    }, 220);
  }, [isRecording, stopRecording, cfg.mode]);

  // end_call : l'agent termine la conversation ; on ferme une fois qu'il a fini de parler
  const [endRequestedAt, setEndRequestedAt] = useState<number | null>(null);
  const requestEnd = useCallback(() => setEndRequestedAt(Date.now()), []);
  const isAgentSpeaking = isSpeaking || agentState === 'speaking';
  useEffect(() => {
    if (endRequestedAt === null) return;
    const delay = isAgentSpeaking
      ? Math.max(0, END_CALL_TIMING.maxWaitMs - (Date.now() - endRequestedAt))
      : END_CALL_TIMING.graceMs;
    const timer = setTimeout(handleClose, delay);
    return () => clearTimeout(timer);
  }, [endRequestedAt, isAgentSpeaking, handleClose]);

  const handleSendText = useCallback((text: string) => {
    voiceMessageIdRef.current = null;
    setMessages((prev) => [...prev, { id: generateId(), role: 'user', content: text, timestamp: Date.now() }]);
    sendText(text);
  }, [sendText]);

  // Texte -> voix : le serveur transmet l'historique a la session vocale
  const handleSwitchMode = useCallback(() => {
    if (currentMode === 'audio') {
      if (isRecording) stopRecording();
      setCurrentMode('text');
    } else {
      void startVoice();
    }
  }, [currentMode, isRecording, stopRecording, startVoice]);

  const agentDisplay = cfg.agentTitle ? `${cfg.agentName} · ${cfg.agentTitle}` : cfg.agentName;
  const isVoice = currentMode === 'audio';
  const transcript = messages.slice(-TRANSCRIPT_LINES);

  return (
    <>
      {/* end_call HORS du Shadow DOM : il a besoin du contexte OwlLayerProvider */}
      {isOpen && !cfg.disableEndCallTool && <EndCallTool onEnd={requestEnd} />}

      <ShadowContainer styles={css}>
        {!isOpen && (
          <FloatingButton
            onClick={handleOpen}
            position={position}
            labels={labels}
            stylePreset={cfg.stylePreset}
          />
        )}

        {isOpen && (
          <div
            className={`owllayer-panel ${position === 'bottom-left' ? 'bottom-left' : ''} owllayer-preset-${cfg.stylePreset} ${isVoice ? 'voice-mode' : 'text-mode'} ${isClosing ? 'is-closing' : ''}`}
            role="dialog"
            aria-label={agentDisplay}
          >
            {/* En-tete */}
            <div className="owllayer-panel-header">
              <div className={`owllayer-avatar state-${isVoice ? visualState : (isWaitingForAnswer ? 'thinking' : visualState === 'error' ? 'error' : 'idle')}`}>
                <SparkIcon />
              </div>
              <div className="owllayer-agent-info">
                <div className="owllayer-agent-name">{agentDisplay}</div>
                <div className="owllayer-agent-status">
                  <span className={`owllayer-status-dot state-${visualState} ${visualState === 'error' ? 'error' : ''}`} />
                  <span>{statusLabel}</span>
                  {isLive && isVoice && <span className="owllayer-live-badge">{labels.live}</span>}
                </div>
              </div>
              <div className="owllayer-header-actions">
                {cfg.allowModeSwitch && (
                  <button
                    type="button"
                    className="owllayer-btn-header"
                    onClick={handleSwitchMode}
                    aria-label={isVoice ? labels.switchToText : labels.switchToVoice}
                  >
                    {isVoice ? <KeyboardIcon /> : <MicIcon />}
                    <span className="owllayer-tooltip">{isVoice ? labels.switchToText : labels.switchToVoice}</span>
                  </button>
                )}
                <button type="button" className="owllayer-btn-close" onClick={handleClose} aria-label={labels.close}>
                  <CloseIcon />
                </button>
              </div>
            </div>

            {/* Lignes virtuelles */}
            {lineState === 'waiting' && (
              <div className="owllayer-line-overlay">
                <div className="owllayer-line-spinner" />
                <p className="owllayer-line-title">{labels.linesWaitingTitle}</p>
                <p className="owllayer-line-sub">{labels.linesWaitingText}</p>
              </div>
            )}
            {lineState === 'busy' && (
              <div className="owllayer-line-overlay owllayer-line-overlay--busy">
                <p className="owllayer-line-title">{labels.linesBusyTitle}</p>
                <p className="owllayer-line-sub">{labels.linesBusyText}</p>
                <button type="button" className="owllayer-btn-chip" onClick={handleClose}>{labels.close}</button>
              </div>
            )}

            {/* Mode vocal */}
            {lineState === 'idle' && isVoice && (
              <>
                <div className="owllayer-voice-stage">
                  <VoiceVisualizer state={visualState} level={micLevel} isMuted={isMuted} />
                  <p className={`owllayer-voice-status state-${visualState}`} aria-live="polite">{statusLabel}</p>
                  <div className="owllayer-transcript" aria-live="polite">
                    {transcript.map((msg) => (
                      <div key={msg.id} className={`owllayer-transcript-line ${msg.role}`}>{msg.content}</div>
                    ))}
                  </div>
                </div>
                <div className="owllayer-voice-controls">
                  <button
                    type="button"
                    className={`owllayer-btn-round ${isMuted ? 'is-active' : ''}`}
                    onClick={isMuted ? unmuteMic : muteMic}
                    disabled={!isRecording}
                    aria-label={isMuted ? labels.unmuteMic : labels.muteMic}
                    aria-pressed={isMuted}
                  >
                    {isMuted ? <MicOffIcon /> : <MicIcon />}
                  </button>
                  <button type="button" className="owllayer-btn-round danger" onClick={handleClose} aria-label={labels.hangUp}>
                    <HangUpIcon />
                  </button>
                  {cfg.allowModeSwitch && (
                    <button type="button" className="owllayer-btn-round" onClick={handleSwitchMode} aria-label={labels.switchToText}>
                      <KeyboardIcon />
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Mode texte */}
            {lineState === 'idle' && !isVoice && (
              <>
                <MessageList
                  messages={messages}
                  isThinking={isWaitingForAnswer}
                  thinkingLabel={labels.thinking}
                  emptyTitle={labels.emptyTitle}
                  emptyText={labels.emptyText}
                />
                <ChatInput labels={labels} onSendText={handleSendText} />
                <div className="owllayer-text-footer">
                  {cfg.allowModeSwitch ? (
                    <button type="button" className="owllayer-btn-chip" onClick={handleSwitchMode}>
                      <MicIcon />
                      {labels.switchToVoice}
                    </button>
                  ) : <span />}
                  <span className="owllayer-widget-signature">by OwlLayer AI</span>
                </div>
              </>
            )}

            {isVoice && <div className="owllayer-widget-signature">by OwlLayer AI</div>}
          </div>
        )}
      </ShadowContainer>
    </>
  );
}
