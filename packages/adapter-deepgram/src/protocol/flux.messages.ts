// ============================================================
// Types de messages Flux (wss /v2/listen) — prives, jamais exportes.
// Verifie contre developers.deepgram.com/reference/speech-to-text/listen-flux.md,
// developers.deepgram.com/docs/flux/configure.md et
// developers.deepgram.com/docs/flux/quickstart.md le DEEPGRAM_CATALOG_VERIFIED_AT
// de models.ts (re-verification DG-4). Le type de message d'erreur terminale
// documente est `FatalError` (code + description) ; certains exemples
// communautaires utilisent aussi `Error` pour le meme cas — les deux noms
// sont acceptes en reception (voir DeepgramFluxTurnStream).
// ============================================================

/** `{"type":"Connected"}` — confirmation initiale de connexion (avant tout `TurnInfo`). */
export interface FluxConnectedMessage {
  type: 'Connected';
  request_id?: string;
  sequence_id?: number;
}

/** Evenement de tour transmis par `TurnInfo` (recherche DG-4). */
export type FluxTurnInfoEvent = 'StartOfTurn' | 'Update' | 'EagerEndOfTurn' | 'TurnResumed' | 'EndOfTurn';

/** `{"type":"TurnInfo", ...}` — etat courant du tour de parole. */
export interface FluxTurnInfoMessage {
  type: 'TurnInfo';
  event: FluxTurnInfoEvent;
  turn_index: number;
  /** Texte reconnu jusqu'ici (present sur `Update`, `EagerEndOfTurn`, `EndOfTurn`). */
  transcript?: string;
  /** Present uniquement sur `EndOfTurn`. */
  end_of_turn_confidence?: number;
  /** Present uniquement sur `EndOfTurn`. */
  languages?: string[];
}

/** Seuils de detection de fin de tour, cotes fournisseur (`Configure`/`ConfigureSuccess`). */
export interface FluxThresholds {
  eot_threshold?: number;
  eager_eot_threshold?: number;
  eot_timeout_ms?: number;
}

/** `{"type":"Configure", ...}` — mise a jour locale avant envoi (tous les champs optionnels). */
export interface FluxConfigureMessage {
  type: 'Configure';
  thresholds?: FluxThresholds;
  keyterms?: string[];
  language_hints?: string[];
}

/** `{"type":"ConfigureSuccess", ...}` — confirmation, valeurs effectives renvoyees. */
export interface FluxConfigureSuccessMessage {
  type: 'ConfigureSuccess';
  thresholds?: FluxThresholds;
  keyterms?: string[];
  language_hints?: string[];
}

/** `{"type":"ConfigureFailure", ...}` — mise a jour rejetee, configuration precedente conservee. */
export interface FluxConfigureFailureMessage {
  type: 'ConfigureFailure';
  sequence_id?: number;
  code?: string;
  description?: string;
}

/** `{"type":"FatalError"|"Error", ...}` — erreur terminale, la connexion se ferme. */
export interface FluxFatalErrorMessage {
  type: 'FatalError' | 'Error';
  sequence_id?: number;
  code?: string;
  description?: string;
}

/** `{"type":"ForceEndTurn"}` — force la fin du tour courant. */
export interface FluxForceEndTurnMessage {
  type: 'ForceEndTurn';
}

/** `{"type":"CloseStream"}` — ferme proprement le flux ; le close 1005 qui suit est normal. */
export interface FluxCloseStreamMessage {
  type: 'CloseStream';
}

export type FluxServerMessage =
  | FluxConnectedMessage
  | FluxTurnInfoMessage
  | FluxConfigureSuccessMessage
  | FluxConfigureFailureMessage
  | FluxFatalErrorMessage;
