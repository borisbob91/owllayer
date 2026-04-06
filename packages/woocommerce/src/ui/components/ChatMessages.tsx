import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { UIMessage } from '../types';

interface Props {
  messages: UIMessage[];
  isThinking: boolean;
}

export function ChatMessages({ messages, isThinking }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  if (messages.length === 0 && !isThinking) {
    return (
      <div class="messages-list">
        <div class="empty-state">
          <span class="empty-wave">👋</span>
          <p style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '15px' }}>
            Bonjour, je suis votre assistant vocal
          </p>
          <p class="empty-hint">
            Cliquez sur le micro pour commencer à parler, ou tapez votre question.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div class="messages-list">
      {messages.map((msg) => (
        <div key={msg.id} class={`msg-row ${msg.role}`}>
          <div class={`msg-bubble ${msg.role}${msg.streaming ? ' streaming' : ''}`}>
            {msg.content}
          </div>
        </div>
      ))}
      {isThinking && (
        <div class="msg-row agent">
          <div class="typing-indicator" aria-label="L'agent est en train d'écrire">
            <div class="typing-dot" />
            <div class="typing-dot" />
            <div class="typing-dot" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
