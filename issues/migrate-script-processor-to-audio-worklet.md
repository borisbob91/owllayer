# Migration : `createScriptProcessor` → `AudioWorkletNode`

## Contexte

Les trois composables de capture audio utilisent actuellement l'API `ScriptProcessorNode` via `createScriptProcessor()`, qui est **officiellement dépréciée** dans la spécification Web Audio API. Les navigateurs continuent de la supporter mais émettent des warnings et sa suppression est prévue.

**Fichiers concernés :**
- `packages/react/src/voice/useVoiceMode.ts` — ligne ~163
- `packages/vue/src/composables/useVoiceMode.ts` — ligne ~156
- `packages/svelte/src/composables/createVoiceMode.ts` — ligne ~149

**Pattern actuel (à remplacer dans les 3 fichiers) :**
```ts
processor = audioContext.createScriptProcessor(4096, 1, 1);
captureKeepAliveGain = audioContext.createGain();
captureKeepAliveGain.gain.value = 0;

processor.onaudioprocess = (event) => {
  const pcmData = event.inputBuffer.getChannelData(0);
  // Float32 → Int16 → base64 → send
};

source.connect(processor);
processor.connect(captureKeepAliveGain);
captureKeepAliveGain.connect(audioContext.destination);
```

---

## Ce qu'est AudioWorkletNode

`AudioWorkletNode` est le remplacement moderne. Le traitement audio s'exécute dans un thread dédié (l'*audio rendering thread*), isolé du thread JS principal, ce qui élimine les glitches dus au GC et aux longs tasks JS.

Le code du processeur doit être dans un fichier séparé **ou un Blob URL** (approche recommandée ici — pas de fichier supplémentaire dans le bundle).

---

## Plan de migration

### 1. Processeur inline (Blob URL)

Définir le code du worklet comme une constante string en haut de chaque composable :

```ts
const PCM_CAPTURE_WORKLET = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this._chunkSize = options.processorOptions?.chunkSize ?? 4096;
    this._buf = [];
  }

  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;

    for (let i = 0; i < ch.length; i++) {
      this._buf.push(ch[i]);
    }

    if (this._buf.length >= this._chunkSize) {
      const chunk = this._buf.splice(0, this._chunkSize);
      const int16 = new Int16Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        const s = Math.max(-1, Math.min(1, chunk[i]));
        int16[i] = s < 0 ? s * 32768 : s * 32767;
      }
      // Transfert zero-copy vers le thread principal
      this.port.postMessage(int16, [int16.buffer]);
    }
    return true; // rester actif même si l'entrée devient silencieuse
  }
}
registerProcessor('pcm-capture', PcmCaptureProcessor);
`;
```

> **Note :** `sampleRate` est un global dans `AudioWorkletGlobalScope` — le ratio de downsample peut être calculé dans le constructeur si on crée le contexte à un taux natif (ex: 48kHz) et qu'on veut 16kHz en sortie. Ici on suppose que le `AudioContext` est créé à `sampleRate: 16000` (comportement actuel), donc pas de downsample nécessaire.

---

### 2. Remplacement dans `startRecording`

**Avant :**
```ts
const processor = audioContext.createScriptProcessor(4096, 1, 1);
const keepAliveGain = audioContext.createGain();
keepAliveGain.gain.value = 0;

processor.onaudioprocess = (event) => {
  const pcmData = event.inputBuffer.getChannelData(0);
  // ... conversion + envoi
};

source.connect(processor);
processor.connect(keepAliveGain);
keepAliveGain.connect(audioContext.destination);
```

**Après :**
```ts
// Charger le worklet via Blob URL (pas de fichier séparé nécessaire)
const blob = new Blob([PCM_CAPTURE_WORKLET], { type: 'application/javascript' });
const blobUrl = URL.createObjectURL(blob);
await audioContext.audioWorklet.addModule(blobUrl);
URL.revokeObjectURL(blobUrl);

const workletNode = new AudioWorkletNode(audioContext, 'pcm-capture', {
  numberOfInputs: 1,
  numberOfOutputs: 0,          // pas de sortie audio — capture uniquement
  processorOptions: { chunkSize: 4096 },
});

workletNode.port.onmessage = (e) => {
  const int16: Int16Array = e.data;
  // Encoder en base64
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  const mime = `audio/pcm;rate=${sampleRate}`;
  if (live) sendAudioStream(base64, mime);
  else      sendAudio(base64, mime);
};

source.connect(workletNode);
// Pas besoin de keepAliveGain : numberOfOutputs=0 + return true dans process() suffit
```

---

### 3. Changements de type / refs

| Avant | Après |
|---|---|
| `processorRef: ScriptProcessorNode` | `processorRef: AudioWorkletNode` |
| `captureKeepAliveGainRef: GainNode` | **Supprimer** (plus nécessaire) |
| `processor.onaudioprocess = ...` | `workletNode.port.onmessage = ...` |

---

### 4. Nettoyage dans `stopRecording`

```ts
// Avant
processor?.disconnect();
captureKeepAliveGain?.disconnect();

// Après
if (processorRef.current) {
  processorRef.current.port.onmessage = null; // stopper les messages
  processorRef.current.disconnect();
}
// captureKeepAliveGain supprimé
```

---

## Caveats importants

| Point | Détail |
|---|---|
| **Taille de buffer fixe** | `process()` reçoit toujours **128 samples** par appel (non configurable). L'accumulateur dans le worklet regroupe les chunks jusqu'à `chunkSize` avant d'envoyer. |
| **HTTPS / localhost requis** | `addModule()` échoue sur HTTP non-sécurisé. En pratique le SDK n'est utilisé que sur localhost (dev) ou HTTPS (prod). |
| **Pas de `window`, pas de DOM** | Le worklet tourne dans `AudioWorkletGlobalScope`. Pas de `fetch`, pas de `localStorage`. Garder le code du processeur minimal. |
| **Transferables** | `postMessage(int16, [int16.buffer])` transfère la propriété du buffer sans copie — essentiel pour les performances. |
| **`return true` obligatoire** | Sans ça, le processeur peut être GC quand le micro est silencieux (ex: pause entre phrases). |
| **TypeScript** | `AudioWorkletNode` et `AudioWorkletProcessor` sont dans `lib.dom.d.ts` depuis TS 4.x. Pas de types additionnels nécessaires. |

---

## Ordre de migration suggéré

1. `packages/vue/src/composables/useVoiceMode.ts` — le plus simple (pas de hooks React)
2. `packages/svelte/src/composables/createVoiceMode.ts` — quasi-identique à Vue
3. `packages/react/src/voice/useVoiceMode.ts` — nécessite de passer `AudioWorkletNode` dans un `useRef<AudioWorkletNode | null>`
