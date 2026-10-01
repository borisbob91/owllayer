import { useEffect, useRef } from 'react';
import type { WidgetMessage } from '@owllayer/core';
import { formatMarkdown } from './markdown.util.js';
import { SparkIcon } from './icons.js';

interface MessageListProps {
  messages: WidgetMessage[];
  isThinking: boolean;
  thinkingLabel: string;
  emptyTitle: string;
  emptyText: string;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageList({ messages, isThinking, thinkingLabel, emptyTitle, emptyText }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastContent = messages[messages.length - 1]?.content;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, lastContent, isThinking]);

  return (
    <div className="owllayer-messages" role="log" aria-live="polite">
      {messages.length === 0 && !isThinking && (
        <div className="owllayer-empty">
          <div className="owllayer-empty-icon"><SparkIcon /></div>
          <div className="owllayer-empty-title">{emptyTitle}</div>
          <div className="owllayer-empty-text">{emptyText}</div>
        </div>
      )}

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
            <div className="owllayer-typing-dots">
              <div className="owllayer-typing-dot" />
              <div className="owllayer-typing-dot" />
              <div className="owllayer-typing-dot" />
            </div>
            <span className="owllayer-typing-label">{thinkingLabel}</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
