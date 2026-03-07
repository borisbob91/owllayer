# Issue #04 — Phase 3 : State machine vocale + observabilite

**Branche** : `feat/voice-end-of-turn`
**Statut** : A faire (optionnelle, apres Phase 2)
**Dependance** : Phase 2 terminee

---

## Objectif

Remplacer le flag boolean `isRecording` par une state machine formelle qui modelise tous les etats du flux vocal. Cela permet :
- Des transitions gardees (impossible de passer de `idle` a `playing`)
- Un `turnId` unique par tour de parole pour la correlation des logs
- Des metriques de latence bout-en-bout
- Un etat `voiceState` expose aux composants UI (plus riche que `isRecording`)

---

## 3.1 VoiceStateMachine

**Nouveau fichier** : `core/src/voice/VoiceStateMachine.ts`

### Etats

```
idle → capturing → awaiting_model → playing → idle
                                  → interrupted → capturing
                                  → error → idle
```

| Etat | Description |
|------|-------------|
| `idle` | Pas d'activite vocale |
| `capturing` | Micro actif, envoi audio au serveur |
| `awaiting_model` | Audio envoye (audioStreamEnd), attente reponse Gemini |
| `playing` | Lecture audio de la reponse agent |
| `interrupted` | Barge-in en cours (transition vers `capturing`) |
| `error` | Erreur recuperable (timeout, erreur micro) |

### Transitions

| De | Evenement | Vers |
|----|-----------|------|
| `idle` | `START_CAPTURE` | `capturing` |
| `capturing` | `STOP_CAPTURE` | `awaiting_model` |
| `capturing` | `ERROR` | `error` |
| `awaiting_model` | `MODEL_SPEAKING` | `playing` |
| `awaiting_model` | `ERROR` | `error` |
| `awaiting_model` | `TIMEOUT` | `error` |
| `playing` | `TURN_COMPLETE` | `idle` |
| `playing` | `BARGE_IN` | `interrupted` |
| `interrupted` | `START_CAPTURE` | `capturing` |
| `error` | `RESET` | `idle` |

### API

```ts
export type VoiceState = 'idle' | 'capturing' | 'awaiting_model' | 'playing' | 'interrupted' | 'error';

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
  onStateChange?: (from: VoiceState, to: VoiceState, event: VoiceEvent) => void;
  onInvalidTransition?: (state: VoiceState, event: VoiceEvent) => void;
  generateTurnId?: () => string;
}

export class VoiceStateMachine {
  readonly state: VoiceState;
  readonly turnId: string | null;

  constructor(options?: VoiceStateMachineOptions);

  /** Tenter une transition */
  dispatch(event: VoiceEvent): boolean;

  /** Forcer un reset a idle (cleanup) */
  reset(): void;

  /** Verifier si une transition est valide */
  canDispatch(event: VoiceEvent): boolean;
}
```

---

## 3.2 Integration dans les hooks

### React : `useVoiceMode.ts`

```ts
const voiceMachine = useRef(new VoiceStateMachine({
  onStateChange: (from, to, event) => {
    console.debug(`[Voice] ${from} → ${to} (${event})`);
  },
}));

// Exposer l'etat
const [voiceState, setVoiceState] = useState<VoiceState>('idle');

// Dans startRecording: voiceMachine.current.dispatch('START_CAPTURE');
// Dans stopRecording: voiceMachine.current.dispatch('STOP_CAPTURE');
// Sur VOICE_STATE_EVENT 'turn_complete': voiceMachine.current.dispatch('TURN_COMPLETE');
// Sur barge-in: voiceMachine.current.dispatch('BARGE_IN');

return { isRecording, voiceState, startRecording, stopRecording };
```

### Vue : `useVoiceMode.ts`

```ts
const voiceMachine = new VoiceStateMachine({ ... });
const voiceState = ref<VoiceState>('idle');

// Meme pattern que React avec ref au lieu de useState
return { isRecording, voiceState, startRecording, stopRecording };
```

### Svelte : `createVoiceMode.ts`

```ts
const voiceMachine = new VoiceStateMachine({ ... });
const voiceState = writable<VoiceState>('idle');

// Meme pattern avec writable store
return { isRecording, voiceState, startRecording, stopRecording };
```

---

## 3.3 Logs structures et metriques

### Serveur : `DomOSServer.ts`

Ajouter des timestamps a chaque etape du flux vocal :

```ts
// Dans handleAudioInput — debut du tour
const turnStart = Date.now();
session.voiceTurnStart = turnStart;

// Dans le callback onAudioOutput — premier byte de la reponse
if (!session.voiceFirstByte) {
  session.voiceFirstByte = Date.now();
  log.info(`voice_input_to_first_byte_ms: ${session.voiceFirstByte - session.voiceTurnStart}`);
}

// Dans le callback onTextOutput(done=true) — fin du tour
if (done) {
  const totalMs = Date.now() - session.voiceTurnStart;
  log.info(`voice_turn_total_ms: ${totalMs}`);
  session.voiceTurnStart = 0;
  session.voiceFirstByte = 0;
}
```

### Adapter : `GoogleLiveAdapter.ts`

Ajouter un `turnId` dans les logs pour la correlation :

```ts
// Genere a chaque debut de tour
let currentTurnId = generateId();

// Dans onmessage, prefixer les logs :
log.info(`[turn:${currentTurnId}] Audio output: ${data.length} chars`);
log.info(`[turn:${currentTurnId}] Turn complete`);
log.info(`[turn:${currentTurnId}] Interrupted`);
```

---

## Fichiers touches

| Fichier | Changement |
|---------|------------|
| `core/src/voice/VoiceStateMachine.ts` | **Nouveau** — State machine |
| `core/src/index.ts` | Export `VoiceStateMachine`, types |
| `react/src/voice/useVoiceMode.ts` | Integration state machine |
| `vue/src/composables/useVoiceMode.ts` | Integration state machine |
| `svelte/src/composables/createVoiceMode.ts` | Integration state machine |
| `server/src/core/DomOSServer.ts` | Metriques latence |
| `adapter-google/src/GoogleLiveAdapter.ts` | Logs structures + turnId |

---

## Verification

1. `pnpm build` sans erreur
2. Verifier que `voiceState` transite correctement : `idle → capturing → awaiting_model → playing → idle`
3. Verifier barge-in : `playing → interrupted → capturing`
4. Verifier logs serveur : `voice_input_to_first_byte_ms`, `voice_turn_total_ms`
5. Verifier correlation `turnId` dans les logs adapter
