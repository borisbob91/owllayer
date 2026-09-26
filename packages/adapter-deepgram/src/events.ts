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

/** Evenements du flux `DeepgramAuraSpeechStream` (TTS streaming). */
export interface DeepgramAuraEventMap {
  'aura.audio.first_chunk': { latencyMs?: number };
  'aura.speech.flushed': Record<string, never>;
  'aura.speech.interrupted': Record<string, never>;
  'aura.warning': { message: string };
  'aura.error': { error: Error; message: string };
  'aura.closed': { code?: number | string; reason?: string; fatal: boolean };
}

/** Evenements de la session `DeepgramVoiceAgentSession` (realtime). */
export interface DeepgramVoiceAgentEventMap {
  'agent.session.opened': { model?: string; voice?: string };
  'agent.latency.reported': { totalLatencyMs?: number; ttsLatencyMs?: number };
  'agent.tool.cancelled': { callIds: string[] };
  'agent.warning': { message: string };
  'agent.error': { error: Error; message: string };
  'agent.closed': { code?: number | string; reason?: string; fatal: boolean };
}
