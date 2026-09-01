import { useEffect, useRef } from 'react';
import type { WidgetMessage } from '@owllayer/core';
import { formatMarkdown } from './markdown.util.js';

interface MessageListProps {
  messages: WidgetMessage[];
  isThinking: boolean;
  thinkingLabel?: string;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageList({ messages, isThinking, thinkingLabel = "En train d'écrire..." }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isThinking]);

  if (messages.length === 0 && !isThinking) {
    return (
      <div className="owllayer-empty">
        Envoyez un message pour démarrer.
      </div>
    );
  }

  return (
    <div className="owllayer-messages">
      {messages.map((msg) => (
        <div key={msg.id} className={`owllayer-msg ${msg.role}`}>
          <div
            className="owllayer-msg-content"
            dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
          />
          <div className="owllayer-msg-time">{formatTime(msg.timestamp)}</div>
        </div>
      ))}

      {isThinking && (
        <div className="owllayer-msg agent owllayer-thinking-msg">
          <div className="owllayer-typing">
            <span className="owllayer-typing-label">{thinkingLabel}</span>
            <div className="owllayer-typing-dots">
              <div className="owllayer-typing-dot" />
              <div className="owllayer-typing-dot" />
              <div className="owllayer-typing-dot" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
