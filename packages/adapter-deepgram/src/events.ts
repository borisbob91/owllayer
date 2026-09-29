// ============================================================
// Cartes d'evenements Deepgram (recherche R18)
// Evenements d'observabilite types, motif `<scope>.<sujet>.<verbe>`
// (packages/adapter-google/src/events.ts). Les payloads ne contiennent
// jamais de transcription ni d'audio — seulement des durees et des
// identifiants. Le contenu reel (texte, audio) circule via les callbacks
// dedies de chaque flux/session, pas via ces evenements.
// ============================================================

/** Evenements du flux `DeepgramFluxTurnStream` (STT streaming). */
export interface DeepgramFluxEventMap {
  'flux.turn.started': { turnIndex: number };
  'flux.turn.tentative_end': { turnIndex: number };
  'flux.turn.resumed': { turnIndex: number };
  'flux.turn.ended': { turnIndex: number; confidence?: number; languages?: string[] };
  'flux.turn_detection.updated': { endOfTurnThreshold: number; tentativeEndOfTurnThreshold?: number };
  'flux.warning': { message: string };
  'flux.error': { error: Error; message: string };
  'flux.closed': { code?: number | string; reason?: string; fatal: boolean };
}

/** Type d'evenement Flux (cle litterale de `DeepgramFluxEventMap`). */
export type DeepgramFluxEventType = keyof DeepgramFluxEventMap & string;

/** Evenement Flux type `{ type, payload }` pour un type d'evenement donne. */
export type DeepgramFluxEventOf<TType extends DeepgramFluxEventType> = {
  type: TType;
  payload: DeepgramFluxEventMap[TType];
};

/** Union de tous les evenements Flux possibles (utilisee par `onAny`). */
export type DeepgramFluxEvent = {
  [TType in DeepgramFluxEventType]: DeepgramFluxEventOf<TType>;
}[DeepgramFluxEventType];

/** Ecouteur type pour un evenement Flux precis (`on`). */
export type DeepgramFluxEventListener<TType extends DeepgramFluxEventType> = (
  payload: DeepgramFluxEventMap[TType],
  event: DeepgramFluxEventOf<TType>,
) => void;

/** Ecouteur pour tout evenement Flux (`onAny`). */
export type DeepgramFluxAnyEventListener = (event: DeepgramFluxEvent) => void;

/** Evenements du flux `DeepgramAuraSpeechStream` (TTS streaming). */
export interface DeepgramAuraEventMap {
  'aura.audio.first_chunk': { latencyMs?: number };
  'aura.speech.flushed': Record<string, never>;
  'aura.speech.interrupted': Record<string, never>;
  'aura.warning': { message: string };
  'aura.error': { error: Error; message: string };
  'aura.closed': { code?: number | string; reason?: string; fatal: boolean };
}

/** Type d'evenement Aura (cle litterale de `DeepgramAuraEventMap`). */
export type DeepgramAuraEventType = keyof DeepgramAuraEventMap & string;

/** Evenement Aura type `{ type, payload }` pour un type d'evenement donne. */
export type DeepgramAuraEventOf<TType extends DeepgramAuraEventType> = {
  type: TType;
  payload: DeepgramAuraEventMap[TType];
};

/** Union de tous les evenements Aura possibles (utilisee par `onAny`). */
export type DeepgramAuraEvent = {
  [TType in DeepgramAuraEventType]: DeepgramAuraEventOf<TType>;
}[DeepgramAuraEventType];

/** Ecouteur type pour un evenement Aura precis (`on`). */
export type DeepgramAuraEventListener<TType extends DeepgramAuraEventType> = (
  payload: DeepgramAuraEventMap[TType],
  event: DeepgramAuraEventOf<TType>,
) => void;

/** Ecouteur pour tout evenement Aura (`onAny`). */
export type DeepgramAuraAnyEventListener = (event: DeepgramAuraEvent) => void;

/** Evenements de la session `DeepgramVoiceAgentSession` (realtime). */
export interface DeepgramVoiceAgentEventMap {
  'agent.session.opened': { model?: string; voice?: string };
  'agent.latency.reported': { totalLatencyMs?: number; ttsLatencyMs?: number };
  'agent.tool.cancelled': { callIds: string[] };
  'agent.warning': { message: string };
  'agent.error': { error: Error; message: string };
  'agent.closed': { code?: number | string; reason?: string; fatal: boolean };
}

/** Type d'evenement Voice Agent (cle litterale de `DeepgramVoiceAgentEventMap`). */
export type DeepgramVoiceAgentEventType = keyof DeepgramVoiceAgentEventMap & string;

/** Evenement Voice Agent type `{ type, payload }` pour un type d'evenement donne. */
export type DeepgramVoiceAgentEventOf<TType extends DeepgramVoiceAgentEventType> = {
  type: TType;
  payload: DeepgramVoiceAgentEventMap[TType];
};

/** Union de tous les evenements Voice Agent possibles (utilisee par `onAny`). */
export type DeepgramVoiceAgentEvent = {
  [TType in DeepgramVoiceAgentEventType]: DeepgramVoiceAgentEventOf<TType>;
}[DeepgramVoiceAgentEventType];
