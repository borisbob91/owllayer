import { h, render } from 'preact';
import { generateWidgetStyles, DEFAULT_THEME, type WidgetConfig } from '@owllayer/core';
import type { AgentState } from '../types.js';
import { AgentStateIndicator } from './components/AgentStateIndicator.js';
import { MicButton } from './components/MicButton.js';
import { ModeToggle } from './components/ModeToggle.js';
import { MessageBubble, type MessageData } from './components/MessageBubble.js';

/**
 * CSS injecte dans le Shadow DOM.
 * Utilise generateWidgetStyles() de @owllayer/core (preset 'chat') + overrides scrollbar.
 * Le preset 'chat' fournit les keyframes owllayer-dot-bounce, owllayer-dot-pulse, owllayer-dot-bar,
 * owllayer-pulse, owllayer-spin, ainsi que toutes les variables CSS (--accent, --bg, etc.).
 */
function buildWidgetCss(config?: WidgetConfig): string {
  const coreCss = generateWidgetStyles(config?.theme, config?.stylePreset ?? 'chat');
  return [
    coreCss,
    // Overrides specifiques au Shadow DOM du OwlLayerChatWidget
    `* { box-sizing: border-box; }`,
    `::-webkit-scrollbar { width: 4px; }`,
    `::-webkit-scrollbar-track { background: transparent; }`,
    `::-webkit-scrollbar-thumb { background: var(--border, #334155); border-radius: 2px; }`,
    // owllayer-spin non fourni par le core — ajout minimal pour le spinner connecting
    `@keyframes owllayer-spin { to { transform: rotate(360deg); } }`,
  ].join('\n');
}

interface OwlLayerChatWidgetOptions {
  config?: WidgetConfig;
  onSendText: (text: string) => void;
  /** Appele quand l utilisateur clique MicButton */
  onVoiceToggle?: () => void;
  /** Appele quand l utilisateur bascule le mode (texte ↔ vocal) */
  onModeToggle?: (newMode: 'text' | 'voice') => void;
  /** Afficher MicButton + ModeToggle dans le footer */
  voiceEnabled?: boolean;
}

interface WidgetState {
  open: boolean;
  input: string;
  messages: MessageData[];
  /** Etat courant de l agent - pilote les indicateurs visuels */
  agentState: AgentState;
  /** Mode actif dans le footer : texte (input) ou vocal (MicButton) */
  mode: 'text' | 'voice';
  /** Etat de file d attente des lignes virtuelles */
  lineState: 'idle' | 'waiting' | 'busy';
}

function WidgetView(props: {
  cfg: { agentName: string; accentColor?: string };
  state: WidgetState;
  voiceEnabled: boolean;
  onToggle: () => void;
  onInput: (value: string) => void;
  onSend: () => void;
  onModeToggle: () => void;
  onVoiceToggle: () => void;
  onClose: () => void;
}) {
  const accent = props.cfg.accentColor ?? DEFAULT_THEME.accentColor ?? '#f97316';
  const { agentState, lineState } = props.state;
  const inputDisabled = agentState === 'connecting' || agentState === 'error' || lineState !== 'idle';

  // Bouton pill ferme
  if (!props.state.open) {
    const isPulsing = agentState === 'listening' || agentState === 'speaking';
    return h('button', {
      type: 'button',
      onClick: props.onToggle,
      title: `Ouvrir ${props.cfg.agentName}`,
      style: {
        position: 'fixed',
        right: '20px', bottom: '20px',
        zIndex: '2147483646',
        border: 'none', borderRadius: '999px',
        background: '#0f172a', color: '#f8fafc',
        padding: '12px 18px', cursor: 'pointer',
        boxShadow: '0 8px 26px rgba(2,6,23,0.45)',
        fontWeight: 700, fontSize: '14px',
        outline: `2px solid ${accent}`, outlineOffset: '2px',
        animation: isPulsing ? 'owllayer-pulse 1.5s ease-in-out infinite' : 'none',
      },
    }, props.cfg.agentName);
  }

  // Panneau ouvert
  return h('div', {
    style: {
      position: 'fixed',
      right: '20px', bottom: '20px',
      width: 'min(92vw, 360px)', height: 'min(78vh, 560px)',
      background: '#0b1220', color: '#e2e8f0',
      border: '1px solid #334155', borderRadius: '16px',
      overflow: 'hidden', zIndex: '2147483646',
      boxShadow: '0 18px 60px rgba(2,6,23,0.45)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    },
  },
    // Header
    h('div', {
      style: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', borderBottom: '1px solid #334155',
        flexShrink: 0, gap: '8px',
      },
    },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 } },
        h('strong', {
          style: { fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
        }, props.cfg.agentName),
        h(AgentStateIndicator, { state: agentState, accentColor: accent }),
      ),
      h('button', {
        type: 'button', onClick: props.onToggle, title: 'Fermer',
        style: {
          background: 'transparent', color: '#94a3b8',
          border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: '1', flexShrink: 0,
        },
      }, 'x'),
    ),
    // Messages
    lineState === 'waiting'
      ? h('div', {
          style: {
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '10px', padding: '28px 18px',
            textAlign: 'center', flex: 1,
          },
        },
          h('div', {
            style: {
              width: '32px', height: '32px',
              border: `3px solid rgba(249,115,22,0.3)`,
              borderTopColor: accent, borderRadius: '50%',
              animation: 'owllayer-spin 0.9s linear infinite',
            },
          }),
          h('p', { style: { margin: 0, fontSize: '13px', fontWeight: 600, color: '#e2e8f0' } }, 'Toutes les lignes sont occup\u00e9es'),
          h('p', { style: { margin: 0, fontSize: '12px', color: '#64748b' } }, 'Vous serez connect\u00e9 d\u00e8s qu\'une ligne se lib\u00e8re\u2026'),
        )
      : lineState === 'busy'
      ? h('div', {
          style: {
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '10px', padding: '28px 18px',
            textAlign: 'center', flex: 1,
            background: 'rgba(239,68,68,0.08)',
          },
        },
          h('p', { style: { margin: 0, fontSize: '13px', fontWeight: 600, color: '#e2e8f0' } }, 'Service temporairement indisponible'),
          h('p', { style: { margin: 0, fontSize: '12px', color: '#64748b' } }, 'Toutes les lignes sont occup\u00e9es. Veuillez r\u00e9essayer dans quelques instants.'),
          h('button', {
            type: 'button', onClick: props.onClose,
            style: {
              marginTop: '8px', border: 'none', borderRadius: '8px',
              background: '#ef4444', color: '#fff',
              fontWeight: 700, padding: '8px 14px', cursor: 'pointer',
            },
          }, 'Fermer'),
        )
      : h('div', {   // normal message list
          style: {
            flex: 1, overflowY: 'auto', padding: '12px',
            display: 'flex', flexDirection: 'column', gap: '8px',
          },
        },
          props.state.messages.length === 0
            ? h('div', {
                style: {
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: '100%',
                  gap: '8px', textAlign: 'center', padding: '24px',
                },
              },
                h('div', { style: { fontSize: '32px' } }, '\uD83D\uDC4B'),
                h('div', { style: { fontSize: '13px', color: '#64748b' } }, 'Bonjour ! Comment puis-je vous aider ?'),
              )
            : props.state.messages.map(msg => h(MessageBubble, { key: msg.id, message: msg })),
          (agentState === 'thinking')
            ? h('div', { className: 'owllayer-typing' },
                h('span', { className: 'owllayer-typing-label' }, 'En train d\'\u00e9crire...'),
                h('span', { className: 'owllayer-typing-dots' },
                  h('span', { className: 'owllayer-typing-dot' }),
                  h('span', { className: 'owllayer-typing-dot' }),
                  h('span', { className: 'owllayer-typing-dot' }),
                ),
              )
            : null,
        ), // end normal message list
    // Footer
    h('div', {
      style: {
        borderTop: '1px solid #334155', padding: '8px 10px',
        display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0,
      },
    },
      props.voiceEnabled
        ? h(ModeToggle, {
            mode: props.state.mode,
            onToggle: props.onModeToggle,
            disabled: inputDisabled,
          })
        : null,
      props.state.mode === 'text' || !props.voiceEnabled
        ? [
            h('input', {
              key: 'input',
              value: props.state.input,
              onInput: (e: Event) => props.onInput((e.target as HTMLInputElement).value),
              onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter') props.onSend(); },
              placeholder: 'Tapez votre message...',
              disabled: inputDisabled,
              style: {
                flex: 1, borderRadius: '8px',
                border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0',
                padding: '8px 10px', fontSize: '13px', outline: 'none',
              },
            }),
            h('button', {
              key: 'send',
              type: 'button',
              onClick: props.onSend,
              disabled: !props.state.input.trim() || inputDisabled,
              style: {
                border: 'none', borderRadius: '8px',
                background: accent, color: '#fff',
                fontWeight: 700, padding: '8px 14px',
                cursor: !props.state.input.trim() || inputDisabled ? 'not-allowed' : 'pointer',
                flexShrink: 0, opacity: !props.state.input.trim() ? 0.5 : 1,
              },
            }, '\u2191'),
          ]
        : h('div', { style: { flex: 1, display: 'flex', justifyContent: 'center' } },
            h(MicButton, {
              agentState,
              onToggle: props.onVoiceToggle,
              accentColor: accent,
            }),
          ),
    ),
    h('div', {
      style: {
        textAlign: 'center', fontSize: '10px', color: '#334155',
        padding: '0 0 6px', letterSpacing: '0.05em',
      },
    }, 'by OwlLayer AI'),
  );
}

export class OwlLayerChatWidget {
  private host: HTMLDivElement | null = null;
  private preactContainer: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private readonly options: OwlLayerChatWidgetOptions;
  private state: WidgetState = {
    open: false,
    input: '',
    messages: [],
    agentState: 'connecting',
    mode: 'text',
    lineState: 'idle',
  };

  constructor(options: OwlLayerChatWidgetOptions) {
    this.options = options;
    // Voice-first : afficher le MicButton par défaut quand la voix est activée
    if (options.voiceEnabled) this.state.mode = 'voice';
  }

  mount(): void {
    if (typeof document === 'undefined' || this.host) return;
    this.host = document.createElement('div');
    this.host.setAttribute('data-owllayer-widget-host', 'browser');
    document.body.appendChild(this.host);
    this.shadowRoot = this.host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = buildWidgetCss(this.options.config);
    this.shadowRoot.appendChild(style);
    this.preactContainer = document.createElement('div');
    this.shadowRoot.appendChild(this.preactContainer);
    this.update();
  }

  unmount(): void {
    if (!this.host) return;
    if (this.preactContainer) render(null, this.preactContainer);
    this.host.remove();
    this.host = null;
    this.preactContainer = null;
    this.shadowRoot = null;
  }

  addUserMessage(content: string): void {
    this.state.messages = [...this.state.messages, { id: `u_${Date.now()}`, role: 'user', content }];
    this.update();
  }

  upsertAgentMessage(content: string): void {
    const last = this.state.messages[this.state.messages.length - 1];
    if (last?.role === 'agent') {
      this.state.messages = [...this.state.messages.slice(0, -1), { ...last, content }];
    } else {
      this.state.messages = [...this.state.messages, { id: `a_${Date.now()}`, role: 'agent', content }];
    }
    this.update();
  }

  setAgentState(agentState: AgentState): void {
    this.state.agentState = agentState;
    this.update();
  }

  setLineState(lineState: 'idle' | 'waiting' | 'busy'): void {
    this.state.lineState = lineState;
    this.update();
  }

  setMode(mode: 'text' | 'voice'): void {
    this.state.mode = mode;
    this.update();
  }

  open(): void {
    this.state.open = true;
    this.update();
  }

  restoreMessages(messages: MessageData[]): void {
    this.state.messages = [...messages];
    this.update();
  }

  private update(): void {
    if (!this.preactContainer) return;
    const agentName = this.options.config?.agentName ?? 'OwlLayer Assistant';
    render(
      h(WidgetView, {
        cfg: { agentName },
        state: this.state,
        voiceEnabled: this.options.voiceEnabled ?? false,
        onToggle: () => { this.state.open = !this.state.open; this.update(); },
        onInput: (value: string) => { this.state.input = value; this.update(); },
        onSend: () => {
          const text = this.state.input.trim();
          if (!text) return;
          this.state.input = '';
          this.options.onSendText(text);
        },
        onClose: () => { this.state.open = false; this.update(); },
        onModeToggle: () => {
          const newMode = this.state.mode === 'text' ? 'voice' : 'text';
          this.state.mode = newMode;
          this.update();
          this.options.onModeToggle?.(newMode);
        },
        onVoiceToggle: () => { this.options.onVoiceToggle?.(); },
      }),
      this.preactContainer,
    );
  }
}