import { generateId } from '../utils/uuid.js';

// ============================================================
// VoiceStateMachine — Machine a etats pour le flux vocal
// ============================================================

/**
 * Etats possibles du flux vocal.
 */
export type VoiceState =
  | 'idle'
  | 'capturing'
  | 'awaiting_model'
  | 'playing'
  | 'interrupted'
  | 'error';

/**
 * Evenements qui declenchent des transitions.
 */
export type VoiceEvent =
  | 'START_CAPTURE'
  | 'STOP_CAPTURE'
  | 'MODEL_SPEAKING'
  | 'TURN_COMPLETE'
  | 'BARGE_IN'
  | 'ERROR'
  | 'TIMEOUT'
  | 'RESET';

export interface VoiceStateMachineOptions {
  /** Callback a chaque transition valide */
  onStateChange?: (from: VoiceState, to: VoiceState, event: VoiceEvent) => void;
  /** Callback quand une transition est invalide */
  onInvalidTransition?: (state: VoiceState, event: VoiceEvent) => void;
}

/**
 * Table de transitions : [etat actuel][evenement] → etat suivant.
 */
const transitions: Record<VoiceState, Partial<Record<VoiceEvent, VoiceState>>> = {
  idle: {
    START_CAPTURE: 'capturing',
  },
  capturing: {
    STOP_CAPTURE: 'awaiting_model',
    ERROR: 'error',
  },
  awaiting_model: {
    MODEL_SPEAKING: 'playing',
    ERROR: 'error',
    TIMEOUT: 'error',
  },
  playing: {
    TURN_COMPLETE: 'idle',
    BARGE_IN: 'interrupted',
    ERROR: 'error',
  },
  interrupted: {
    START_CAPTURE: 'capturing',
    RESET: 'idle',
  },
  error: {
    RESET: 'idle',
  },
};

/**
 * Machine a etats formelle pour le flux vocal.
 *
 * Modelise les transitions du cycle de vie d'un tour vocal :
 * idle → capturing → awaiting_model → playing → idle
 *
 * Supporte le barge-in (playing → interrupted → capturing)
 * et la recuperation d'erreur (error → idle via RESET).
 *
 * Chaque tour de parole recoit un `turnId` unique pour la correlation des logs.
 *
 * @example
 * ```ts
 * const machine = new VoiceStateMachine({
 *   onStateChange: (from, to, event) => console.log(`${from} → ${to} (${event})`),
 * });
 *
 * machine.dispatch('START_CAPTURE');  // idle → capturing
 * machine.dispatch('STOP_CAPTURE');   // capturing → awaiting_model
 * machine.dispatch('MODEL_SPEAKING'); // awaiting_model → playing
 * machine.dispatch('TURN_COMPLETE');  // playing → idle
 * ```
 */
export class VoiceStateMachine {
  private _state: VoiceState = 'idle';
  private _turnId: string | null = null;
  private readonly options: VoiceStateMachineOptions;

  constructor(options?: VoiceStateMachineOptions) {
    this.options = options ?? {};
  }

  /** Etat courant */
  get state(): VoiceState {
    return this._state;
  }

  /** ID du tour de parole en cours (null si idle) */
  get turnId(): string | null {
    return this._turnId;
  }

  /**
   * Tenter une transition.
   * @returns true si la transition a eu lieu, false si invalide.
   */
  dispatch(event: VoiceEvent): boolean {
    const nextState = transitions[this._state]?.[event];

    if (!nextState) {
      this.options.onInvalidTransition?.(this._state, event);
      return false;
    }

    const from = this._state;
    this._state = nextState;

    // Generer un turnId au debut d'un nouveau tour
    if (event === 'START_CAPTURE' && from === 'idle') {
      this._turnId = generateId();
    }

    // Reset le turnId quand on revient a idle
    if (nextState === 'idle') {
      this._turnId = null;
    }

    this.options.onStateChange?.(from, nextState, event);
    return true;
  }

  /**
   * Verifier si une transition est possible sans l'executer.
   */
  canDispatch(event: VoiceEvent): boolean {
    return transitions[this._state]?.[event] !== undefined;
  }

  /**
   * Forcer un reset a idle (cleanup / unmount).
   */
  reset(): void {
    if (this._state === 'idle') return;
    const from = this._state;
    this._state = 'idle';
    this._turnId = null;
    this.options.onStateChange?.(from, 'idle', 'RESET');
  }
}
