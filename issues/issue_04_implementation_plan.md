# Issue #04 — Plan d'implementation : Gemini Live Voice Architecture

**Branche** : `feat/voice-end-of-turn`
**Statut** : Phase 2 en cours

---

## Diagnostic

Le mode vocal Live a un bug critique : quand l'utilisateur clique "J'ai fini de parler", `stopRecording()` coupe le micro **mais n'envoie aucun signal au serveur ni a Gemini Live**. Le SDK `@google/genai@1.40.0` supporte `sendRealtimeInput({ audioStreamEnd: true })` mais il n'est jamais appele. Gemini reste en `waitingForInput` et ne repond jamais.

Les evenements `interrupted` et `waitingForInput` de Gemini sont lus dans l'adapter mais n'ont aucun handler.

---

## Phase 1 — Signal VOICE_INPUT_END bout-en-bout (bug fix critique) ✅

- [x] **1.1** `core/src/protocol/adtp.types.ts` — `VOICE_INPUT_END` enum + `VoiceInputEndPayload` + union
- [x] **1.2** `core/src/protocol/adtp.validator.ts` — Schema Zod `voiceInputEndPayload`
- [x] **1.3** `core/src/protocol/adtp.serializer.ts` — `Messages.voiceInputEnd(reason)`
- [x] **1.4** `core/src/client/DomOSClient.ts` — Methode `sendAudioEnd(reason)`
- [x] **1.5** `server/src/llm/types.ts` — `endAudioTurn?()` dans `LiveSession`
- [x] **1.6** `adapter-google/src/GoogleLiveAdapter.ts` — `endAudioTurn()` → `sendRealtimeInput({ audioStreamEnd: true })`
- [x] **1.7** `server/src/core/DomOSServer.ts` — Routing `VOICE_INPUT_END`
- [x] **1.8** React : Context + Provider + useAgent + useVoiceMode — `sendAudioEnd`
- [x] **1.8** Vue : useAgent + useVoiceMode — `sendAudioEnd`
- [x] **1.8** Svelte : domos.store + createVoiceMode — `sendAudioEnd`
- [x] **1.9** `core/src/index.ts` — Export `VoiceInputEndPayload`
- [x] **Build** — `pnpm build` sans erreur TypeScript

### Flux resultant Phase 1

```
User clique "J'ai fini de parler"
  → stopRecording()
  → sendAudioEnd('user_stop')
  → DomOSClient.sendAudioEnd() → VOICE_INPUT_END msg
  → WebSocket
  → DomOSServer.handleVoiceInputEnd()
  → liveSession.endAudioTurn()
  → geminiSession.sendRealtimeInput({ audioStreamEnd: true })
  → Gemini traite l'audio et genere sa reponse
  → turnComplete → onTextOutput('', true) → AGENT_RESPONSE { done: true }
  → Client: thinking → speaking → connected
```

---

## Phase 2 — Evenements Gemini + barge-in

### 2.1 Protocol : nouveaux messages ADTP

**Fichier** : `core/src/protocol/adtp.types.ts`

**A) VOICE_STATE_EVENT (Downstream — Server → Client)**

Ajouter dans l'enum `MessageType` section Downstream (apres `AUDIO_STREAM`, ligne 25) :
```ts
VOICE_STATE_EVENT = 'VOICE_STATE_EVENT',
```

Ajouter le payload (apres `AudioStreamPayload`) :
```ts
export interface VoiceStateEventPayload {
  event: 'turn_complete' | 'interrupted' | 'waiting_for_input';
  reason?: string;
}
```

Ajouter la variante dans l'union `ADTPMessage` (apres AUDIO_STREAM).

**B) VOICE_INTERRUPT (Upstream — Client → Server)**

Ajouter dans l'enum `MessageType` section Upstream (apres `VOICE_INPUT_END`, ligne 19) :
```ts
VOICE_INTERRUPT = 'VOICE_INTERRUPT',
```

Ajouter le payload (apres `VoiceInputEndPayload`) :
```ts
export interface VoiceInterruptPayload {
  reason: 'barge_in';
}
```

Ajouter la variante dans l'union `ADTPMessage` (apres VOICE_INPUT_END).

### 2.2 Validators Zod

**Fichier** : `core/src/protocol/adtp.validator.ts`

Ajouter apres `voiceInputEndPayload` :
```ts
const voiceInterruptPayload = z.object({
  reason: z.enum(['barge_in']),
});
```

Ajouter dans la section downstream (apres `audioStreamPayload`) :
```ts
const voiceStateEventPayload = z.object({
  event: z.enum(['turn_complete', 'interrupted', 'waiting_for_input']),
  reason: z.string().optional(),
});
```

Ajouter dans `payloadSchemas` :
```ts
[MessageType.VOICE_INTERRUPT]: voiceInterruptPayload,
[MessageType.VOICE_STATE_EVENT]: voiceStateEventPayload,
```

### 2.3 Factories Messages

**Fichier** : `core/src/protocol/adtp.serializer.ts`

Ajouter apres `voiceInputEnd()` :
```ts
voiceInterrupt(reason: 'barge_in' = 'barge_in') {
  return createMessage(MessageType.VOICE_INTERRUPT, { reason });
},

voiceStateEvent(event: 'turn_complete' | 'interrupted' | 'waiting_for_input', reason?: string) {
  return createMessage(MessageType.VOICE_STATE_EVENT, { event, reason });
},
```

### 2.4 Client : handler + methode sendInterrupt()

**Fichier** : `core/src/client/DomOSClient.ts`

**A)** Ajouter dans `ClientEventHandlers` (apres `onAudioOutput`, ligne 82) :
```ts
onVoiceStateEvent?: (event: 'turn_complete' | 'interrupted' | 'waiting_for_input', reason?: string) => void;
```

**B)** Ajouter methode publique apres `sendAudioEnd()` (ligne ~534) :
```ts
/**
 * Interrompre l'agent en train de parler (barge-in).
 */
sendInterrupt(): void {
  this.send(Messages.voiceInterrupt());
}
```

**C)** Ajouter case dans `handleMessage()` (apres `AUDIO_STREAM`, ligne ~604) :
```ts
case MessageType.VOICE_STATE_EVENT: {
  const payload = message.payload as VoiceStateEventPayload;
  this.handlers.onVoiceStateEvent?.(payload.event, payload.reason);

  // Mise a jour automatique de l'etat client
  if (payload.event === 'turn_complete') {
    this.setState('connected');
  } else if (payload.event === 'interrupted') {
    this.setState('listening');
  } else if (payload.event === 'waiting_for_input') {
    this.setState('listening');
  }
  break;
}
```

### 2.5 Callbacks dans LiveSessionConfig

**Fichier** : `server/src/llm/types.ts`

Ajouter dans `LiveSessionConfig` (apres `onClose`, ligne ~114) :
```ts
/** Le modele a ete interrompu (barge-in) */
onInterrupted?: () => void;

/** Le modele attend l'input de l'utilisateur */
onWaitingForInput?: () => void;
```

Ajouter dans `LiveSession` (apres `endAudioTurn`, ligne ~137) :
```ts
/** Interrompre le modele (barge-in) */
interrupt?(): Promise<void>;
```

### 2.6 Gestion events dans GoogleLiveAdapter

**Fichier** : `adapter-google/src/GoogleLiveAdapter.ts`

**A)** Dans `onmessage`, apres le handler `turnComplete` (ligne ~141), ajouter :
```ts
// ---- Modele interrompu (barge-in) ----
if (msg.serverContent?.interrupted) {
  log.info('Gemini Live: modele interrompu (barge-in)');
  config.onInterrupted?.();
}

// ---- Gemini attend l'input utilisateur ----
if (msg.serverContent?.waitingForInput) {
  log.debug('Gemini Live: en attente d\'input utilisateur');
  config.onWaitingForInput?.();
}
```

**B)** Ajouter methode `interrupt()` dans l'objet session (apres `endAudioTurn`, ligne ~222) :
```ts
async interrupt() {
  if (!isSessionActive) return;
  // Gemini gere nativement le barge-in quand on envoie de l'audio
  // pendant qu'il parle. Ce signal est principalement pour le logging.
  log.info('Signal barge-in recu pour session Gemini Live');
},
```

### 2.7 Wire dans DomOSServer

**Fichier** : `server/src/core/DomOSServer.ts`

**A)** Ajouter `VOICE_INTERRUPT` a l'exemption rate-limit (ligne ~410) :
```ts
const isStreaming =
  message.type === MessageType.AUDIO_STREAM ||
  message.type === MessageType.VOICE_INPUT_END ||
  message.type === MessageType.VOICE_INTERRUPT ||
  message.type === MessageType.CONTEXT_UPDATE ||
  message.type === MessageType.TOOL_RESULT;
```

**B)** Ajouter case dans le switch `handleMessage` (apres `VOICE_INPUT_END`) :
```ts
case MessageType.VOICE_INTERRUPT:
  await this.handleVoiceInterrupt(session);
  break;
```

**C)** Ajouter handler :
```ts
private async handleVoiceInterrupt(session: any): Promise<void> {
  const liveSession = this.liveSessions.get(session.id);
  if (!liveSession?.isActive) {
    log.warn(`VOICE_INTERRUPT sans LiveSession active: ${session.id}`);
    return;
  }
  try {
    if (liveSession.interrupt) {
      await liveSession.interrupt();
    }
    // Notifier le client que l'interruption a ete prise en compte
    this.transport.send(
      session.connId,
      Messages.voiceStateEvent('interrupted', 'barge_in')
    );
    log.info(`Barge-in traite pour session ${session.id}`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log.error(`Erreur VOICE_INTERRUPT pour session ${session.id}:`, error);
  }
}
```

**D)** Dans `getOrCreateLiveSession()`, ajouter les callbacks (apres `onTranscript`, ligne ~1118) :
```ts
onInterrupted: () => {
  this.transport.send(
    session.connId,
    Messages.voiceStateEvent('interrupted')
  );
},
onWaitingForInput: () => {
  this.transport.send(
    session.connId,
    Messages.voiceStateEvent('waiting_for_input')
  );
},
```

### 2.8 Exposer sendInterrupt dans les frameworks

**React** :
- `react/src/provider/DomOSContext.ts` — Ajouter `sendInterrupt: () => void;` + `onVoiceStateEvent` callback dans `DomOSContextValue`
- `react/src/provider/DomOSProvider.tsx` — Ajouter callback `sendInterrupt` + passer `onVoiceStateEvent` dans les handlers
- `react/src/hooks/useAgent.ts` — Exposer `sendInterrupt`

**Vue** :
- `vue/src/composables/useAgent.ts` — Ajouter `sendInterrupt` dans le return

**Svelte** :
- `svelte/src/stores/domos.store.ts` — Ajouter `sendInterrupt()` + `onVoiceStateEvent()`

### 2.9 Barge-in dans les hooks voice

**React** : `react/src/voice/useVoiceMode.ts`
- Importer `sendInterrupt` depuis `useAgent()`
- Dans `startRecording()`, si l'agent est en etat `speaking` :
  1. `sendInterrupt()` pour notifier le serveur
  2. Fermer `playbackContextRef.current` (arrete la lecture immediatement)
  3. Reset `nextStartTimeRef.current = 0`
  4. Continuer la capture normalement

**Vue** : `vue/src/composables/useVoiceMode.ts`
- Importer `sendInterrupt` depuis `useAgent()`
- Meme logique dans `startRecording()`

**Svelte** : `svelte/src/composables/createVoiceMode.ts`
- Importer `sendInterrupt` depuis le store
- Meme logique dans `startRecording()`

### 2.10 Exports

**Fichier** : `core/src/index.ts`
- Ajouter `VoiceStateEventPayload`, `VoiceInterruptPayload` dans les exports de types

### Build — Verifier `pnpm build` sans erreur TypeScript

### Flux resultant Phase 2

```
=== Evenement turn_complete ===
Gemini finit de parler
  → onmessage: turnComplete → config.onTextOutput('', true)
  → (deja gere en Phase 1)

=== Evenement interrupted (barge-in declenche par Gemini) ===
User envoie audio pendant que Gemini parle
  → Gemini s'interrompt automatiquement
  → onmessage: interrupted → config.onInterrupted()
  → DomOSServer → Messages.voiceStateEvent('interrupted')
  → WebSocket → Client
  → DomOSClient.handleMessage() → onVoiceStateEvent('interrupted')
  → Client passe en etat 'listening'

=== Barge-in initie par le client ===
User clique "Parler" pendant que l'agent parle
  → startRecording() detecte etat 'speaking'
  → sendInterrupt() → VOICE_INTERRUPT msg → WebSocket
  → DomOSServer.handleVoiceInterrupt()
  → liveSession.interrupt() (logging)
  → Repond VOICE_STATE_EVENT('interrupted', 'barge_in')
  → Client: ferme playbackContext, reset nextStartTime
  → Commence la capture audio normalement

=== Evenement waiting_for_input ===
Gemini attend l'input utilisateur
  → onmessage: waitingForInput → config.onWaitingForInput()
  → DomOSServer → Messages.voiceStateEvent('waiting_for_input')
  → Client passe en etat 'listening'
```

---

## Phase 3 — State machine vocale + observabilite (optionnelle)

Voir `issues/issue_04_phase3_state_machine.md`

---

## Fichiers touches (recapitulatif)

| Fichier | Phase |
|---------|-------|
| `core/src/protocol/adtp.types.ts` | 1 ✅ + 2 |
| `core/src/protocol/adtp.validator.ts` | 1 ✅ + 2 |
| `core/src/protocol/adtp.serializer.ts` | 1 ✅ + 2 |
| `core/src/client/DomOSClient.ts` | 1 ✅ + 2 |
| `core/src/index.ts` | 1 ✅ + 2 |
| `server/src/llm/types.ts` | 1 ✅ + 2 |
| `server/src/core/DomOSServer.ts` | 1 ✅ + 2 |
| `adapter-google/src/GoogleLiveAdapter.ts` | 1 ✅ + 2 |
| `react/src/provider/DomOSContext.ts` | 1 ✅ + 2 |
| `react/src/provider/DomOSProvider.tsx` | 1 ✅ + 2 |
| `react/src/hooks/useAgent.ts` | 1 ✅ + 2 |
| `react/src/voice/useVoiceMode.ts` | 1 ✅ + 2 |
| `vue/src/composables/useAgent.ts` | 1 ✅ + 2 |
| `vue/src/composables/useVoiceMode.ts` | 1 ✅ + 2 |
| `svelte/src/stores/domos.store.ts` | 1 ✅ + 2 |
| `svelte/src/composables/createVoiceMode.ts` | 1 ✅ + 2 |
| `core/src/voice/VoiceStateMachine.ts` | 3 (nouveau) |

---

## Verification

1. `pnpm build` dans `domos/` — pas de type errors
2. Demarrer demo-server + demo app, activer vocal, parler, cliquer "J'ai fini de parler" → Gemini repond (audio)
3. Pendant que l'agent parle, reparler → la lecture s'arrete, nouvelle capture demarre (barge-in)
4. Console serveur : logs `audioStreamEnd envoye`, `Gemini Live: modele interrompu`
