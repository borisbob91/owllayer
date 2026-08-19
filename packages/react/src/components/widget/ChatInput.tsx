import { useState, useCallback, type KeyboardEvent } from 'react';
import type { WidgetLabels } from '@owllayer/core';

interface ChatInputProps {
  labels: Required<WidgetLabels>;
  onSendText: (text: string) => void;
}

/** SVG Send icon */
const SendIcon = () => (
  <svg viewBox="0 0 24 24">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export function ChatInput({ labels, onSendText }: ChatInputProps) {
  const [text, setText] = useState('');

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setText('');
  }, [text, onSendText]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="owllayer-text-bar">
      <input
        type="text"
        className="owllayer-text-input"
        placeholder={labels.textPlaceholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        className="owllayer-btn-send"
        onClick={handleSend}
        disabled={!text.trim()}
        aria-label={labels.send}
      >
        <SendIcon />
      </button>
    </div>
  );
}
