import { useEffect, useRef } from 'react';
import type { WidgetMessage } from '@domos/core';

interface MessageListProps {
  messages: WidgetMessage[];
  isThinking: boolean;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageList({ messages, isThinking }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isThinking]);

  if (messages.length === 0 && !isThinking) {
    return (
      <div className="domos-empty">
        Envoyez un message pour d\u00e9marrer.
      </div>
    );
  }

  return (
    <div className="domos-messages">
      {messages.map((msg) => (
        <div key={msg.id} className={`domos-msg ${msg.role}`}>
          <div>{msg.content}</div>
          <div className="domos-msg-time">{formatTime(msg.timestamp)}</div>
        </div>
      ))}

      {isThinking && (
        <div className="domos-typing">
          <div className="domos-typing-dot" />
          <div className="domos-typing-dot" />
          <div className="domos-typing-dot" />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
