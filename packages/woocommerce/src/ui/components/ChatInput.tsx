import { h } from 'preact';
import { useRef, useState } from 'preact/hooks';
import type { AgentState } from '../types';

interface Props {
  agentState: AgentState;
  isMicOn: boolean;
  onSend: (text: string) => void;
  onToggleMic: () => void;
}

const MicOnIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 14a6 6 0 0 0 6-6H6a6 6 0 0 0 6 6zm-1 4v-2.07A8 8 0 0 1 4 5H2a10 10 0 0 0 9 9.93V19H9v2h6v-2h-2v-.07z" />
  </svg>
);

const MicOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 11a7 7 0 0 1-7 7m0 0v3m0 0H9m3 0h3m-9.07-10A7 7 0 0 1 12 4m0 0a4 4 0 0 1 4 4v4M8 8v3a4 4 0 0 0 7.75 1.45M3.27 3.27l17.46 17.46" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

export function ChatInput({ agentState, isMicOn, onSend, onToggleMic }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const disabled = agentState === 'connecting';

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div class="chat-input-bar">
      <button
        class={`mic-btn ${isMicOn ? 'on' : 'off'}`}
        onClick={onToggleMic}
        disabled={disabled}
        aria-label={isMicOn ? 'Désactiver le micro' : 'Activer le micro'}
        title={isMicOn ? 'Désactiver le micro' : 'Activer le micro'}
      >
        {isMicOn ? <MicOnIcon /> : <MicOffIcon />}
      </button>
      <textarea
        ref={inputRef}
        class="chat-input"
        value={text}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
        onKeyDown={handleKeyDown}
        placeholder="Votre message…"
        rows={1}
        disabled={disabled}
        aria-label="Message"
      />
      <button
        class="send-btn"
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        aria-label="Envoyer"
      >
        <SendIcon />
      </button>
    </div>
  );
}
