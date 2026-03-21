import { h, render } from 'preact';
import type { WidgetConfig } from '@domos/core';

interface WidgetMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
}

interface WidgetHostOptions {
  config?: WidgetConfig;
  onSendText: (text: string) => void;
}

interface WidgetState {
  open: boolean;
  input: string;
  messages: WidgetMessage[];
  status: 'idle' | 'thinking' | 'connected' | 'error';
}

function WidgetView(props: {
  cfg: Required<Pick<WidgetConfig, 'agentName'>>;
  state: WidgetState;
  onToggle: () => void;
  onInput: (value: string) => void;
  onSend: () => void;
}) {
  if (!props.state.open) {
    return h(
      'button',
      {
        type: 'button',
        onClick: props.onToggle,
        style: {
          position: 'fixed',
          right: '20px',
          bottom: '20px',
          zIndex: '2147483646',
          border: 'none',
          borderRadius: '999px',
          background: '#0f172a',
          color: '#f8fafc',
          padding: '12px 16px',
          cursor: 'pointer',
          boxShadow: '0 8px 26px rgba(2,6,23,0.35)',
          fontWeight: 700,
        },
      },
      'Ouvrir DomOS',
    );
  }

  return h(
    'div',
    {
      style: {
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        width: 'min(92vw, 360px)',
        height: 'min(78vh, 560px)',
        background: '#0b1220',
        color: '#e2e8f0',
        border: '1px solid #334155',
        borderRadius: '16px',
        overflow: 'hidden',
        zIndex: '2147483646',
        boxShadow: '0 18px 60px rgba(2,6,23,0.45)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      },
    },
    h(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 14px',
          borderBottom: '1px solid #334155',
        },
      },
      h('strong', null, props.cfg.agentName || 'DomOS Assistant'),
      h(
        'button',
        {
          type: 'button',
          onClick: props.onToggle,
          style: {
            background: 'transparent',
            color: '#94a3b8',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
          },
        },
        '×',
      ),
    ),
    h(
      'div',
      {
        style: {
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        },
      },
      props.state.messages.map((msg) =>
        h(
          'div',
          {
            key: msg.id,
            style: {
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? '#0ea5e9' : '#1e293b',
              color: '#f8fafc',
              borderRadius: '10px',
              padding: '8px 10px',
              maxWidth: '82%',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            },
          },
          msg.content,
        ),
      ),
      props.state.status === 'thinking'
        ? h('div', { style: { color: '#94a3b8', fontSize: '12px' } }, 'DomOS réfléchit...')
        : null,
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          gap: '8px',
          borderTop: '1px solid #334155',
          padding: '10px',
        },
      },
      h('input', {
        value: props.state.input,
        onInput: (e: Event) => props.onInput((e.target as HTMLInputElement).value),
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter') props.onSend();
        },
        placeholder: 'Tapez votre message...',
        style: {
          flex: 1,
          borderRadius: '8px',
          border: '1px solid #334155',
          background: '#0f172a',
          color: '#e2e8f0',
          padding: '8px 10px',
        },
      }),
      h(
        'button',
        {
          type: 'button',
          onClick: props.onSend,
          style: {
            border: 'none',
            borderRadius: '8px',
            background: '#22c55e',
            color: '#022c22',
            fontWeight: 700,
            padding: '8px 12px',
            cursor: 'pointer',
          },
        },
        'Envoyer',
      ),
    ),
    h(
      'div',
      {
        style: {
          textAlign: 'center',
          fontSize: '10px',
          color: '#94a3b8',
          padding: '0 0 8px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
      },
      'by DomOS AI',
    ),
  );
}

export class WidgetHost {
  private host: HTMLDivElement | null = null;
  private readonly options: WidgetHostOptions;
  private state: WidgetState = {
    open: false,
    input: '',
    messages: [],
    status: 'idle',
  };

  constructor(options: WidgetHostOptions) {
    this.options = options;
  }

  mount(): void {
    if (typeof document === 'undefined' || this.host) return;
    this.host = document.createElement('div');
    this.host.setAttribute('data-domos-widget-host', 'browser');
    document.body.appendChild(this.host);
    this.update();
  }

  unmount(): void {
    if (!this.host) return;
    render(null, this.host);
    this.host.remove();
    this.host = null;
  }

  addUserMessage(content: string): void {
    this.state.messages = [...this.state.messages, { id: `u_${Date.now()}`, role: 'user', content }];
    this.update();
  }

  upsertAgentMessage(content: string): void {
    const last = this.state.messages[this.state.messages.length - 1];
    if (last?.role === 'agent') {
      this.state.messages = [
        ...this.state.messages.slice(0, -1),
        { ...last, content },
      ];
    } else {
      this.state.messages = [...this.state.messages, { id: `a_${Date.now()}`, role: 'agent', content }];
    }
    this.update();
  }

  setStatus(status: WidgetState['status']): void {
    this.state.status = status;
    this.update();
  }

  restoreMessages(messages: WidgetMessage[]): void {
    this.state.messages = [...messages];
    this.update();
  }

  private update(): void {
    if (!this.host) return;

    const agentName = this.options.config?.agentName ?? 'DomOS Assistant';

    render(
      h(WidgetView, {
        cfg: { agentName },
        state: this.state,
        onToggle: () => {
          this.state.open = !this.state.open;
          this.update();
        },
        onInput: (value: string) => {
          this.state.input = value;
          this.update();
        },
        onSend: () => {
          const text = this.state.input.trim();
          if (!text) return;
          this.state.input = '';
          this.addUserMessage(text);
          this.options.onSendText(text);
        },
      }),
      this.host,
    );
  }
}
