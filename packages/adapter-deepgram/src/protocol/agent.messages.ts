// ============================================================
// Types de messages Voice Agent (wss agent.deepgram.com/v1/agent/converse)
// — prives, jamais exportes. Verifie (DG-7) sur
// developers.deepgram.com/reference/voice-agent/voice-agent,
// /docs/configure-voice-agent et /docs/voice-agent-llm-models.
// ============================================================

/** Message de contexte (`agent.context.messages`), forme `History` documentee. */
export interface AgentContextMessage {
  type: 'History';
  role: 'user' | 'assistant';
  content: string;
}

/** Fonction exposee au modele : jamais d'`endpoint`, l'execution revient toujours a OwlLayer. */
export interface AgentFunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  /** Attend la confirmation de fin de tour avant l'appel (tools `high`/`critical`). */
  defer_until_eot?: true;
}

export interface AgentEndpoint {
  url: string;
  headers?: Record<string, string>;
}

export interface AgentAwsCredentials {
  type: 'iam' | 'sts';
  region: string;
  access_key_id: string;
  secret_access_key: string;
  session_token?: string;
}

export interface AgentThinkConfig {
  provider: { type: string; model: string; temperature?: number; credentials?: AgentAwsCredentials };
  endpoint?: AgentEndpoint;
  prompt: string;
  functions: AgentFunctionDefinition[];
}

export interface AgentSpeakConfig {
  provider: Record<string, unknown> & { type: string };
  endpoint?: AgentEndpoint;
}

/** `{"type":"Settings", ...}` — premier message apres `Welcome`. */
export interface AgentSettingsMessage {
  type: 'Settings';
  audio: {
    input: { encoding: 'linear16'; sample_rate: number };
    output: { encoding: 'linear16'; sample_rate: number; container: 'none' };
  };
  agent: {
    language: string;
    context?: { messages: AgentContextMessage[] };
    listen: { provider: { type: 'deepgram'; version: 'v1' | 'v2'; model: string; keyterms?: string[] } };
    think: AgentThinkConfig;
    speak: AgentSpeakConfig;
    greeting?: string;
  };
}

/** Un appel de fonction demande par l'agent (`FunctionCallRequest.functions[]`). */
export interface AgentFunctionCall {
  id: string;
  name: string;
  /** Arguments JSON serialises. */
  arguments: string;
  client_side?: boolean;
}

export interface AgentFunctionCallRequestMessage {
  type: 'FunctionCallRequest';
  functions: AgentFunctionCall[];
}

export interface AgentFunctionCallCancelledMessage {
  type: 'FunctionCallCancelled';
  functions: Array<{ id: string; name?: string }>;
}

export interface AgentConversationTextMessage {
  type: 'ConversationText';
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentStartedSpeakingMessage {
  type: 'AgentStartedSpeaking';
  total_latency?: number;
  tts_latency?: number;
  ttt_latency?: number;
}

export interface AgentLatencyReportMessage {
  type: 'LatencyReport';
  total_latency?: number;
  tts_latency?: number;
}

export interface AgentProblemMessage {
  type: 'Error' | 'Warning';
  code?: string;
  description?: string;
}
