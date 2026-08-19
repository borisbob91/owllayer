import { useEffect, useRef, useState } from 'preact/hooks';
import type { DevToolsConfig } from './index.js';
import type { OwlLayerClientEvent } from '@owllayer/core';

const TEXT  = '#edf2ff';
const MUTED = '#666680';
const ACCENT = '#a78bfa';
const BORDER = '#2d3355';
const SURFACE = '#12172d';
const SURFACE_ALT = '#181e38';
const EVENT_LIMIT = 24;
const MESSAGE_LIMIT = 18;

const STREAM_BOUNDARY_TYPES = new Set([
  'connection.state.changed',
  'session.started',
  'turn.started',
  'turn.completed',
  'turn.interrupted',
  'turn.waiting_for_input',
]);

interface StateMonitorProps {
  config: DevToolsConfig;
}

interface Snapshot {
  ts: number;
  state: string;
  sessionId: string | null;
}

interface EventSnapshot {
  ts: number;
  type: string;
  summary: string;
}

type MonitorRole = 'user' | 'assistant';

type TranscriptFallbackEvent = {
  type: `${string}transcript${string}`;
  payload?: {
    text?: string;
    done?: boolean;
    sessionId?: string;
  };
};

type MonitorEvent = OwlLayerClientEvent | TranscriptFallbackEvent;

interface TextMessageSnapshot {
  id: string;
  ts: number;
  updatedAt: number;
  role: MonitorRole;
  channel: 'response' | 'transcript';
  status: 'streaming' | 'done';
  text: string;
  sessionId: string | null;
}

interface TextStreamDescriptor {
  role: MonitorRole;
  channel: 'response' | 'transcript';
  streamKey: string;
  text: string;
  done: boolean;
  sessionId: string | null;
}

export function StateMonitor({ config }: StateMonitorProps) {
  const [current, setCurrent] = useState<Snapshot>({ ts: Date.now(), state: config.getAgentState(), sessionId: config.getSessionId() });
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [messages, setMessages] = useState<TextMessageSnapshot[]>([]);
  const [events, setEvents] = useState<EventSnapshot[]>([]);
  const activeStreamIds = useRef<Record<string, string>>({});
  const messageCounter = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      const next: Snapshot = { ts: Date.now(), state: config.getAgentState(), sessionId: config.getSessionId() };
      setCurrent(prev => {
        if (prev.state !== next.state || prev.sessionId !== next.sessionId) {
          setHistory(h => [...h.slice(-19), prev]);
        }
        return next;
      });
    }, 500);
    return () => clearInterval(id);
  }, [config]);

  useEffect(() => {
    if (!config.subscribeAnyEvent) return;

    return config.subscribeAnyEvent((event) => {
      const monitorEvent = event as MonitorEvent;
      const textStream = getTextStreamDescriptor(monitorEvent);

      if (textStream) {
        const messageId = `message_${++messageCounter.current}`;
        setMessages((previous) => upsertTextMessage(previous, textStream, Date.now(), activeStreamIds.current, messageId));
        return;
      }

      if (STREAM_BOUNDARY_TYPES.has(monitorEvent.type)) {
        activeStreamIds.current = {};
      }

      const next: EventSnapshot = {
        ts: Date.now(),
        type: monitorEvent.type,
        summary: describeEvent(monitorEvent),
      };
      setEvents((previous) => [...previous.slice(-(EVENT_LIMIT - 1)), next]);
    });
  }, [config]);

  const stateColor = (s: string) =>
    s === 'running' ? '#22c55e' : s === 'error' ? '#ef4444' : s === 'idle' ? '#eab308' : MUTED;

  const roleColor = (role: MonitorRole) =>
    role === 'assistant' ? '#60a5fa' : '#f59e0b';

  const fmt = (ts: number) => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 1 as any });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Current state */}
      <div style={{ background: SURFACE, borderRadius: 10, padding: 14, border: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>État courant</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: stateColor(current.state), display: 'inline-block', flexShrink: 0, boxShadow: `0 0 6px ${stateColor(current.state)}` }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: stateColor(current.state) }}>{current.state}</span>
        </div>
        {current.sessionId && (
          <div style={{ marginTop: 8, fontSize: 11, color: MUTED }}>
            Session{': '}
            <span style={{ color: ACCENT, fontFamily: 'monospace' }}>{current.sessionId}</span>
          </div>
        )}
        <div style={{ marginTop: 4, fontSize: 10, color: MUTED }}>mis à jour : {fmt(current.ts)}</div>
      </div>

      {/* History */}
      <div style={{ background: SURFACE, borderRadius: 10, padding: 14, border: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>
          Historique des transitions ({history.length})
        </div>
        {history.length === 0 && (
          <div style={{ fontSize: 12, color: MUTED }}>Aucune transition enregistrée.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[...history].reverse().map((snap, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '8px 10px', background: SURFACE_ALT, borderRadius: 8 }}>
              <span style={{ color: MUTED, flexShrink: 0, width: 80 }}>{fmt(snap.ts)}</span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: stateColor(snap.state), display: 'inline-block', flexShrink: 0 }} />
              <span style={{ color: TEXT }}>{snap.state}</span>
              {snap.sessionId && <span style={{ color: MUTED, fontFamily: 'monospace', fontSize: 10 }}>{snap.sessionId.slice(0, 8)}…</span>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: SURFACE, borderRadius: 10, padding: 14, border: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>
          Flux textuels ({messages.length})
        </div>
        {messages.length === 0 && (
          <div style={{ fontSize: 12, color: MUTED }}>
            Aucun flux textuel agrégé pour le moment.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...messages].reverse().map((message) => (
            <div key={message.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, padding: '10px 12px', background: SURFACE_ALT, borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: MUTED, flexShrink: 0, width: 80 }}>{fmt(message.updatedAt)}</span>
                <span style={{ color: roleColor(message.role), fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{message.role}</span>
                <span style={{ color: MUTED, fontSize: 10 }}>{message.channel === 'response' ? 'reponse' : 'transcript'}</span>
                <span style={{ color: message.status === 'streaming' ? '#f59e0b' : '#22c55e', fontSize: 10, fontWeight: 700 }}>
                  {message.status === 'streaming' ? 'en cours' : 'termine'}
                </span>
              </div>
              <div style={{ color: TEXT, whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const, lineHeight: 1.45 }}>
                {message.text || '...'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: SURFACE, borderRadius: 10, padding: 14, border: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>
          Événements non textuels ({events.length})
        </div>
        {events.length === 0 && (
          <div style={{ fontSize: 12, color: MUTED }}>
            Aucun événement non textuel remonté par le bridge. Le monitor reste en fallback polling.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[...events].reverse().map((event, index) => (
            <div key={`${event.ts}_${index}`} style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, padding: '8px 10px', background: SURFACE_ALT, borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: MUTED, flexShrink: 0, width: 80 }}>{fmt(event.ts)}</span>
                <span style={{ color: ACCENT, fontFamily: 'monospace', fontSize: 10 }}>{event.type}</span>
              </div>
              <div style={{ color: TEXT }}>{event.summary}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function describeEvent(event: MonitorEvent): string {
  switch (event.type) {
    case 'connection.state.changed':
      return `${event.payload.previous} -> ${event.payload.current}`;
    case 'session.started':
      return `session ${event.payload.sessionId}`;
    case 'agent.response.delta':
    case 'agent.response.done':
      return event.payload.text ? `texte: ${event.payload.text.slice(0, 80)}` : 'réponse vide';
    case 'turn.started':
    case 'turn.completed':
    case 'turn.waiting_for_input':
      return `source: ${event.payload.source}`;
    case 'turn.interrupted':
      return `source: ${event.payload.source}${event.payload.reason ? ` · ${event.payload.reason}` : ''}`;
    case 'playback.completed':
      return `source: ${event.payload.source}`;
    case 'tool.registry.synced':
      return `${event.payload.tools.length} tool(s)`;
    case 'tool.registry.effective':
      return `${event.payload.effectiveTools.length} effectif(s)${event.payload.ignoredClientTools.length > 0 ? ` · ${event.payload.ignoredClientTools.length} collision(s)` : ''}`;
    case 'tool.call.requested':
      return event.payload.toolCall.name;
    case 'approval.requested':
      return `${event.payload.request.toolName} (${event.payload.request.risk})`;
    case 'audio.output.chunk':
      return event.payload.mimeType;
    case 'line.state.changed':
      return `${event.payload.state}${event.payload.lineNumber ? ` · ${event.payload.lineNumber}` : ''}`;
    case 'system.error':
      return event.payload.message;
    default:
      if (hasTextPayload(event)) {
        return event.payload.text ? `texte: ${event.payload.text.slice(0, 80)}` : 'flux texte';
      }
      return 'événement';
  }
}

function upsertTextMessage(
  previous: TextMessageSnapshot[],
  descriptor: TextStreamDescriptor,
  ts: number,
  activeStreamIds: Record<string, string>,
  nextId: string
): TextMessageSnapshot[] {
  const activeId = activeStreamIds[descriptor.streamKey];

  if (activeId) {
    let found = false;
    const nextMessages: TextMessageSnapshot[] = previous.map((message) => {
      if (message.id !== activeId) {
        return message;
      }

      found = true;
      return {
        ...message,
        updatedAt: ts,
        text: mergeText(message.text, descriptor.text),
        status: descriptor.done ? 'done' : 'streaming',
      };
    });

    if (found) {
      if (descriptor.done) {
        delete activeStreamIds[descriptor.streamKey];
      }
      return nextMessages.slice(-MESSAGE_LIMIT);
    }

    delete activeStreamIds[descriptor.streamKey];
  }

  if (!descriptor.text) {
    return previous;
  }

  const nextMessage: TextMessageSnapshot = {
    id: nextId,
    ts,
    updatedAt: ts,
    role: descriptor.role,
    channel: descriptor.channel,
    status: descriptor.done ? 'done' : 'streaming',
    text: descriptor.text,
    sessionId: descriptor.sessionId,
  };

  if (!descriptor.done) {
    activeStreamIds[descriptor.streamKey] = nextId;
  }

  return [...previous.slice(-(MESSAGE_LIMIT - 1)), nextMessage];
}

function mergeText(current: string, incoming: string): string {
  if (!incoming) {
    return current;
  }

  if (!current) {
    return incoming;
  }

  if (incoming.startsWith(current)) {
    return incoming;
  }

  if (current.endsWith(incoming)) {
    return current;
  }

  return `${current}${incoming}`;
}

function getTextStreamDescriptor(event: MonitorEvent): TextStreamDescriptor | null {
  if (!hasTextPayload(event)) {
    return null;
  }

  const sessionId = typeof event.payload.sessionId === 'string' ? event.payload.sessionId : null;

  if (event.type === 'agent.response.delta' || event.type === 'agent.response.done') {
    return {
      role: 'assistant',
      channel: 'response',
      streamKey: `agent.response:${sessionId ?? 'global'}`,
      text: event.payload.text,
      done: event.type === 'agent.response.done',
      sessionId,
    };
  }

  const lowerType = event.type.toLowerCase();
  if (!lowerType.includes('transcript')) {
    return null;
  }

  let role: MonitorRole | null = null;
  if (lowerType.includes('.user.')) {
    role = 'user';
  }
  if (lowerType.includes('.assistant.') || lowerType.includes('.agent.')) {
    role = 'assistant';
  }
  if (!role) {
    return null;
  }

  const done = lowerType.endsWith('.done') || event.payload.done === true;
  const isDelta = lowerType.endsWith('.delta');

  if (!done && !isDelta) {
    return null;
  }

  return {
    role,
    channel: 'transcript',
    streamKey: `transcript:${role}:${sessionId ?? 'global'}`,
    text: event.payload.text,
    done,
    sessionId,
  };
}

function hasTextPayload(event: MonitorEvent): event is MonitorEvent & { payload: { text: string; done?: boolean; sessionId?: string } } {
  const { payload } = event;

  if (!payload || typeof payload !== 'object' || !('text' in payload)) {
    return false;
  }

  return typeof payload.text === 'string';
}
