/**
 * MessageBubble — Bulle de message individuelle.
 * Composant Preact pur, remplaçable librement.
 */
import { h } from 'preact';
import { formatMarkdown } from '../../markdown.util.js';

export interface MessageData {
  id: string;
  role: 'user' | 'agent';
  content: string;
}

export function MessageBubble({ message }: { message: MessageData }) {
  const isUser = message.role === 'user';
  return h('div', {
    className: `owllayer-msg ${message.role}`,
    style: {
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      background: isUser ? '#0ea5e9' : '#1e293b',
      color: '#f8fafc',
      borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
      padding: '8px 11px',
      maxWidth: '82%',
      wordBreak: 'break-word',
      fontSize: '13px',
      lineHeight: '1.45',
    },
    dangerouslySetInnerHTML: { __html: formatMarkdown(message.content) },
  });
}

