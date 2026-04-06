# @domos/browser — Roadmap audio (post Sprint 3)

> Fonctionnalités planifiées pour les sprints futurs.
> Interface stable : toute nouvelle implémentation audio doit exposer `start()`, `stop()`, `muteMic()`, `playChunk()`, `interrupt()`, `destroy()` — BrowserDomOS ne change pas.

## Fichier clé : `src/runtime/VoiceManager.ts`

Architecture : VoiceManager est INTERNE à BrowserDomOS. Seule interface exposée à BrowserDomOS : `start()`, `stop()`, `muteMic()`, `playChunk()`, `interrupt()`, `destroy()`. Pour upgrader l'implémentation audio → créer une nouvelle classe qui répond à ces méthodes, l'injecter, BrowserDomOS ne change pas.

---

## 1. AudioWorklet — remplacement de ScriptProcessor

### Quoi
`ScriptProcessorNode` est **deprecated** dans le standard Web Audio API. C'est ce qu'on utilise maintenant (buffer 4096 / `onaudioprocess`). Les navigateurs ne l'ont pas encore retiré mais la spec prévoit sa suppression.

`AudioWorklet` est le remplaçant officiel — il tourne dans un **thread audio dédié** séparé du thread principal, ce qui évite les glitches audio en cas de charge CPU élevée.

### Pourquoi le faire plus tard et pas maintenant
- ScriptProcessor fonctionne encore dans tous les browsers cibles
- AudioWorklet nécessite un fichier JS séparé servi en HTTPS (worklet processor), ce qui complique le build esbuild actuel
- Les hooks React/Vue/Svelte existants utilisent aussi ScriptProcessor — migration simultanée à terme

### Comment l'implémenter
```ts
// Dans VoiceManager.ts, remplacer le bloc ScriptProcessor par :
await captureCtx.audioWorklet.addModule('/domos-pcm-processor.js');
const workletNode = new AudioWorkletNode(captureCtx, 'domos-pcm-processor');
workletNode.port.onmessage = (e) => {
  // e.data = Float32Array ou base64 selon l'implémentation du processor
  this.client.sendAudioStream(VoiceManager.encodeFloat32ToPcmBase64(e.data), mime);
};
source.connect(workletNode);
```
Le fichier `domos-pcm-processor.js` (registerProcessor) doit être servi statiquement par le site hôte ou bundlé en inline via esbuild worker plugin.

**Sprint cible :** Sprint 5+ (quand ScriptProcessor devient problème réel en production)

---

## 2. VAD — Voice Activity Detection

### Quoi
VAD = détecter automatiquement quand l'utilisateur **s'arrête de parler**, sans qu'il ait à appuyer sur un bouton "stop". L'agent peut répondre dès le silence détecté.

Actuellement : l'utilisateur doit appeler `stopVoice()` manuellement. Avec VAD : l'arrêt est automatique après N ms de silence.

### Deux niveaux de VAD

**Niveau 1 — VAD léger (energy-based)** — faisable sans dépendance :
- Calculer RMS du buffer PCM dans `onaudioprocess`
- Si RMS < seuil pendant N frames consécutives → appeler `sendAudioEnd('vad')` + `this.stop()`
- Paramètres : `vadSilenceThreshold` (défaut `0.01`), `vadSilenceDurationMs` (défaut `800ms`)
- Pro : zéro dépendance, ~15 lignes dans VoiceManager
- Con : sensible au bruit ambiant (ventilateur, clavier, etc.)

**Niveau 2 — VAD ML (Silero VAD / @ricky0123/vad-web)** — modèle ONNX en WASM :
- Précision supérieure (distingue silence réel vs souffle/bruit de fond)
- Poids ~1–2 MB à charger
- Activer via option `vadEngine: 'silero'` dans `VoiceManagerOptions`

### Comment l'implémenter (niveau 1)
```ts
// Dans VoiceManager.ts :
// Ajouter propriété privée : private silentFrames = 0;

processor.onaudioprocess = (event) => {
  const pcm = event.inputBuffer.getChannelData(0);

  // VAD energy-based
  if (this.opts.vad?.enabled) {
    let sum = 0;
    for (let i = 0; i < pcm.length; i++) sum += pcm[i] * pcm[i];
    const rms = Math.sqrt(sum / pcm.length);
    const isSilent = rms < (this.opts.vad.threshold ?? 0.01);

    if (isSilent) {
      this.silentFrames++;
      const silentMs = (this.silentFrames * 4096 / this.opts.sampleRate) * 1000;
      if (silentMs >= (this.opts.vad.silenceDurationMs ?? 800)) {
        this.stop(); // déclenche sendAudioEnd('vad') + ferme la capture
        return;
      }
    } else {
      this.silentFrames = 0; // reset dès qu'il y a du son
    }
  }

  // ... encoder + envoyer comme avant
};
```
BrowserDomOS ne change pas — VAD est entièrement caché dans VoiceManager.

Config exposée dans `DomOSBrowserConfig.voice` :
```ts
voice: {
  vad: {
    enabled: true,
    threshold: 0.01,           // RMS en dessous = silence
    silenceDurationMs: 800,    // délai avant arrêt automatique
  }
}
```

**Sprint cible :** Sprint 3 ou 4 (impact UX immédiat, faible effort)

---

## 3. LiveKit / WebRTC

### Quoi
Actuellement l'audio passe en raw PCM base64 sur WebSocket (protocole ADTP). C'est simple mais :
- Pas d'echo cancellation au niveau transport
- PCM 16kHz mono = ~256 KB/s (lourd sur connexions lentes)
- Pas de full-duplex natif optimisé — le serveur et le client ne parlent pas "en même temps" facilement

LiveKit est un serveur WebRTC open source (SFU). En mode LiveKit :
- Transport = WebRTC (DTLS + SRTP), chiffré et optimisé réseau
- Codec = Opus (~6–40 KB/s selon qualité), bien plus léger que PCM
- Echo cancellation + noise suppression natifs WebRTC (au niveau du navigateur)
- Gemini Live API supporte nativement WebRTC avec `gemini-2.5-flash-native-audio-preview`

### Architecture cible
```
Browser VoiceManagerLiveKit
  → @livekit/client (Room API)
  → LiveKit Server (domos-livekit.server ou cloud)
  → Gemini MultimodalAgent (@livekit/agents + @livekit/agents-plugin-google)
```
Le code serveur LiveKit existe déjà dans `livekit-agent/`. Le client React de démonstration est dans `livekit-agent/client/`.

### Comment l'implémenter côté browser
```ts
// Créer : packages/browser/src/runtime/VoiceManagerLiveKit.ts
import { Room } from '@livekit/client';

export class VoiceManagerLiveKit {
  // Implémente la même interface : start(), stop(), muteMic(), playChunk(), interrupt(), destroy()

  async start(): Promise<void> {
    const room = new Room();
    await room.connect(this.opts.livekitUrl, this.opts.token);
    await room.localParticipant.setMicrophoneEnabled(true);
    // L'audio sort vers l'agent via WebRTC — DomOSClient.sendAudioStream() non utilisé
  }

  muteMic(): void {
    // LiveKit expose setMicrophoneEnabled(false) sans déconnecter
    this.room?.localParticipant.setMicrophoneEnabled(false);
  }

  // playChunk() devient no-op — LiveKit gère le playback via les remote audio tracks
  playChunk(): void {}

  interrupt(): void {
    this.client.sendInterrupt(); // signal serveur
    // LiveKit côté serveur gère l'interruption de l'agent
  }
}
```

Injection dans BrowserDomOS selon la config :
```ts
this.voiceManager = config.voice?.transport === 'livekit'
  ? new VoiceManagerLiveKit(this.client, opts)
  : new VoiceManager(this.client, opts);  // défaut : WebSocket PCM
```

### Token LiveKit
La génération de token est déjà documentée dans `livekit-agent/tokenServer.js`. Il faudra exposer un endpoint `/livekit/token` côté backend DomOS.

### Quand activer
- Quand le serveur DomOS aura un endpoint LiveKit exposé
- Pour les cas d'usage "qualité audio haute" (call center, assistant vocal premium)

**Sprint cible :** Sprint 4+ (après que le transport WebSocket soit stabilisé en production)

---

## Priorités suggérées

| # | Feature | Effort | Impact | Sprint cible |
|---|---|---|---|---|
| 1 | VAD léger (energy-based) | Faible (~15 lignes) | Élevé (UX) | Sprint 3–4 |
| 2 | LiveKit/WebRTC transport | Moyen (nouveau fichier) | Élevé (qualité audio) | Sprint 4+ |
| 3 | AudioWorklet | Moyen (build à adapter) | Moyen (stabilité) | Sprint 5+ |
| 4 | VAD ML (Silero) | Élevé (+2 MB) | Élevé (précision) | Sprint 5+ |
