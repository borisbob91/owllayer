# Règles strictes — Pipeline audio PCM (OwlLayer)

> **Statut : OBLIGATOIRE**
> Ces règles s'appliquent à tout code manipulant `AudioContext`, `playAudioChunk`, `playbackContext` ou `nextStartTime` dans n'importe quel package OwlLayer (`react`, `vue`, `svelte`, `browser`).
> Toute PR qui les viole DOIT être rejetée en review.

---

## Contexte

OwlLayer reçoit de l'audio PCM 24 kHz depuis Gemini Live sous forme de chunks base64. Ces chunks arrivent de façon asynchrone et irrégulière via WebSocket. Un pipeline audio incorrect cause :

- **Chevauchements** : deux chunks joués en même temps → bruit, distorsion
- **Silences** : gap entre chunks → voix hachée
- **Crash `RangeError`** : `Int16Array` construit sur un buffer de taille impaire
- **Silence total** : `AudioContext` en état `suspended` non repris (politique autoplay navigateur)
- **Mic coupé** : fermeture du `playbackContext` en dehors du `destroy` → le contexte de capture peut être impacté, et surtout la session Gemini Live perd l'audio → timeout → `Erreur session audio`

---

## Règles

### R1 — Scheduling séquentiel OBLIGATOIRE

```ts
// ✅ CORRECT
const startTime = Math.max(ctx.currentTime, nextStartTime);
source.start(startTime);
nextStartTime = startTime + buffer.duration;

// ❌ INTERDIT
source.start(); // ordre non garanti en réseau variable
```

`nextStartTime` doit être une variable de module (ou ref), **jamais locale** à la fonction.

---

### R2 — Alignement 2 octets OBLIGATOIRE

```ts
// ✅ CORRECT
const validLength = binary.length - (binary.length % 2);
const bytes = new Uint8Array(validLength);
for (let i = 0; i < validLength; i++) { bytes[i] = binary.charCodeAt(i); }

// ❌ INTERDIT
const bytes = new Uint8Array(binary.length); // peut être impair → RangeError ou corruption silencieuse
```

**Raison** : PCM 16-bit = 2 octets par sample. Un `Int16Array` sur un `ArrayBuffer` de taille impaire lève `RangeError` sur certains moteurs JS. Sur d'autres, le dernier sample est corrompu sans exception.

---

### R3 — Guard `suspended` OBLIGATOIRE

```ts
// ✅ CORRECT
if (ctx.state === 'suspended') {
  void ctx.resume().catch(() => {});
}

// ❌ MANQUANT
// Si l'AudioContext est suspendu (politique autoplay Chrome/Safari), aucun son ne sort
```

---

### R4 — Guard `!audioBase64` OBLIGATOIRE

```ts
// ✅ CORRECT
if (!audioBase64) return;

// ❌ MANQUANT
// atob('') lève une exception, binary.length = 0 → buffer vide → plantage silencieux
```

---

### R5 — Reset de `nextStartTime` lors d'un NOUVEAU contexte seulement

```ts
// ✅ CORRECT — reset uniquement si le contexte a été recréé
if (!playbackContext || playbackContext.state === 'closed') {
  playbackContext = new AudioContext({ sampleRate: outputRate });
  nextStartTime = 0; // ← ici seulement
}

// ❌ INTERDIT — reset à chaque appel
nextStartTime = 0; // ← dans le corps principal de playAudioChunk → détruit le scheduling
```

---

### R6 — `playbackContext.close()` UNIQUEMENT dans le lifecycle destroy

```ts
// ✅ CORRECT — fermeture propre à la destruction du composant
onUnmounted(() => {
  if (playbackContext && playbackContext.state !== 'closed') {
    void playbackContext.close().catch(() => {});
  }
  playbackContext = null;
  nextStartTime = 0;
});

// ❌ INTERDIT — fermeture dans handleHangUp / stopRecording / close panel
function handleHangUp() {
  playbackContext?.close(); // ← BOGUE CRITIQUE : tue le contexte audio actif
  playbackContext = null;   //   le mic peut toujours être actif, Gemini Live perd l'audio
}
```

**Raison** : Fermer le `playbackContext` pendant que l'utilisateur est toujours connecté (ex. hangup de l'UI) provoque :
1. La perte des chunks audio entrants
2. Le timeout Gemini Live → `onError` → `Erreur session audio` côté Provider

---

### R7 — Vérification `!== 'closed'` avant `close()`

```ts
// ✅ CORRECT
if (ctx && ctx.state !== 'closed') {
  void ctx.close().catch(() => {});
}

// ❌ INCORRECT
ctx?.close(); // peut lever une exception si déjà closed
```

---

## Architecture : widget vs composable

| Lieu | Règle |
|---|---|
| **Composable** (`useVoiceMode`, `createVoiceMode`) | Implémente le pipeline audio complet avec toutes les règles ci-dessus |
| **Widget React** (`OwlLayerWidget.tsx` / `WidgetInner.tsx`) | **NE PAS** dupliquer `playAudioChunk` — déléguer au composable `useVoiceMode` uniquement |
| **Widget Vue** (`OwlLayerWidget.vue`) | Possède un `playAudioChunk` inline — doit respecter toutes les règles R1–R7 |
| **Widget Svelte** (`OwlLayerWidget.svelte`) | Idem Vue — `playAudioChunk` inline avec toutes les règles R1–R7 |

> **Règle architecturale** : si un widget doit gérer l'audio directement (sans composable), le code de `playAudioChunk` doit être un copier-coller identique de la version dans les composables. **Aucune simplification n'est autorisée.**

---

## Pattern de référence complet

```ts
let playbackContext: AudioContext | null = null;
let nextStartTime = 0;

function playAudioChunk(audioBase64: string, mimeType: string) {
  try {
    if (!audioBase64) return;                                          // R4

    const rateMatch = mimeType.match(/rate=(\d+)/);
    const outputRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

    if (!playbackContext || playbackContext.state === 'closed') {
      playbackContext = new AudioContext({ sampleRate: outputRate });
      nextStartTime = 0;                                               // R5
    }

    const ctx = playbackContext;

    if (ctx.state === 'suspended') {                                   // R3
      void ctx.resume().catch(() => {});
    }

    const binary = atob(audioBase64);
    const validLength = binary.length - (binary.length % 2);          // R2
    const bytes = new Uint8Array(validLength);
    for (let i = 0; i < validLength; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const buffer = ctx.createBuffer(1, float32.length, outputRate);
    buffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startTime = Math.max(ctx.currentTime, nextStartTime);        // R1
    source.start(startTime);
    nextStartTime = startTime + buffer.duration;                       // R1
  } catch (err) {
    console.error('Erreur lecture audio:', err);
  }
}

// Cleanup — SEUL endroit autorisé pour close()
function destroy() {
  if (playbackContext && playbackContext.state !== 'closed') {         // R6, R7
    void playbackContext.close().catch(() => {});
  }
  playbackContext = null;
  nextStartTime = 0;
}
```

---

## Checklist review PR audio

Avant de merger tout code touchant `playAudioChunk`, `AudioContext`, `playbackContext` ou `nextStartTime` :

- [ ] R1 — `source.start(startTime)` avec `Math.max(ctx.currentTime, nextStartTime)` présent
- [ ] R2 — `validLength = binary.length - (binary.length % 2)` présent
- [ ] R3 — guard `ctx.state === 'suspended'` + `ctx.resume()` présent
- [ ] R4 — guard `if (!audioBase64) return` présent
- [ ] R5 — `nextStartTime = 0` uniquement dans le bloc de (re)création du contexte
- [ ] R6 — `playbackContext.close()` absent de `handleHangUp` / `stop` / `close panel`
- [ ] R7 — `state !== 'closed'` vérifié avant tout appel à `.close()`
- [ ] Architecture — le widget React délègue au composable, pas de duplication

---

## Historique des incidents

| Date | Bug | Cause racine | Règle violée |
|---|---|---|---|
| 2026-03 | `Erreur session audio` + mic silencieux | `playbackContext.close()` dans `handleHangUp` (Vue + Svelte widget) | R6 |
| 2026-03 | Animations audio figées (Svelte) | `untrack(() => cfg.mode)` cassant la réactivité de `currentMode` | Non-audio, réactivité Svelte 5 |
| 2026-03 | Chunks chevauchés / silences | `source.start()` sans scheduling dans les widgets | R1 |
