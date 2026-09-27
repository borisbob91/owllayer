// ============================================================
// Types de messages Aura streaming (wss /v1/speak) — prives, jamais
// exportes. Verifie contre developers.deepgram.com/reference/text-to-speech-api/speak-streaming,
// developers.deepgram.com/docs/tts-websocket, developers.deepgram.com/docs/tts-ws-flush et
// developers.deepgram.com/docs/streaming-text-to-speech le DEEPGRAM_CATALOG_VERIFIED_AT de
// models.ts (re-verification DG-5). A la difference de Flux (/v2/listen), ce
// websocket n'envoie aucun message de confirmation initial ("Connected") :
// le client peut envoyer `Speak` des l'evenement `open` du socket.
// ============================================================

/** `{"type":"Speak","text":"..."}` — ajoute un segment de texte au buffer courant. */
export interface SpeakTextMessage {
  type: 'Speak';
  text: string;
}

/** `{"type":"Flush"}` — traite le buffer de texte courant et renvoie l'audio final pour ce segment. */
export interface SpeakFlushMessage {
  type: 'Flush';
}

/** `{"type":"Clear"}` — vide les buffers texte et audio ; l'audio deja en vol doit etre ignore jusqu'a `Cleared`. */
export interface SpeakClearMessage {
  type: 'Clear';
}

/** `{"type":"Close"}` — traite le buffer restant puis ferme la connexion proprement. */
export interface SpeakCloseMessage {
  type: 'Close';
}

export type SpeakClientMessage = SpeakTextMessage | SpeakFlushMessage | SpeakClearMessage | SpeakCloseMessage;

/** `{"type":"Flushed","sequence_id":n}` — confirmation du traitement d'un `Flush`. */
export interface SpeakFlushedMessage {
  type: 'Flushed';
  sequence_id?: number;
}

/** `{"type":"Cleared","sequence_id":n}` — confirmation du traitement d'un `Clear`. */
export interface SpeakClearedMessage {
  type: 'Cleared';
  sequence_id?: number;
}

/** `{"type":"Warning","description":"...","code":"..."}` — probleme non fatal signale par le fournisseur. */
export interface SpeakWarningMessage {
  type: 'Warning';
  description?: string;
  code?: string;
}

/** `{"type":"Metadata","request_id":"...", ...}` — metadonnees de generation ; `request_id` est conserve pour le support. */
export interface SpeakMetadataMessage {
  type: 'Metadata';
  request_id?: string;
  model_name?: string;
  model_version?: string;
  model_uuid?: string;
}

export type SpeakServerJsonMessage = SpeakFlushedMessage | SpeakClearedMessage | SpeakWarningMessage | SpeakMetadataMessage;
