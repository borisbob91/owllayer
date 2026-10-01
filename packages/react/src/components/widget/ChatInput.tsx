import { useState, useCallback, type KeyboardEvent } from 'react';
import type { WidgetLabels } from '@owllayer/core';
import { SendIcon } from './icons.js';

interface ChatInputProps {
  labels: Required<WidgetLabels>;
  onSendText: (text: string) => void;
}


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
        aria-label={labels.textPlaceholder}
        placeholder={labels.textPlaceholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
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
