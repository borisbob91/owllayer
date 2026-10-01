---
"@owllayer/core": minor
"@owllayer/react": minor
"@owllayer/vue": patch
"@owllayer/svelte": patch
---

The voice widget no longer waits in silence when the microphone does not start.

- `@owllayer/core`: `createMicrophoneSource()` connects the microphone at 16 kHz when the browser accepts it, and otherwise at the device rate with `downsamplePcm()` (Firefox and older Safari refuse a 16 kHz context); `getMicrophoneErrorKind()` tells a refused permission from a missing device. New labels `micPermission` and `micUnavailable`.
- `@owllayer/react`: `useVoiceMode` uses them, exposes `micError`, and `startRecording()` resolves to `true` when recording (`false` on failure) instead of only logging the error.
- React, Vue and Svelte widgets: a refused or missing microphone is shown in voice mode (red orb, reason under it, short status in the header); the microphone button asks again. Opening directly in voice mode still falls back to text when `fallbackToText` is set.
