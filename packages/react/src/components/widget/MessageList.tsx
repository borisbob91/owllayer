import { useEffect, useRef } from 'react';
import type { WidgetMessage } from '@owllayer/core';

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
      <div className="owllayer-empty">
        Envoyez un message pour d\u00e9marrer.
      </div>
    );
  }

  return (
    <div className="owllayer-messages">
      {messages.map((msg) => (
        <div key={msg.id} className={`owllayer-msg ${msg.role}`}>
          <div>{msg.content}</div>
          <div className="owllayer-msg-time">{formatTime(msg.timestamp)}</div>
        </div>
      ))}

      {isThinking && (
        <div className="owllayer-typing">
          <div className="owllayer-typing-dot" />
          <div className="owllayer-typing-dot" />
          <div className="owllayer-typing-dot" />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
