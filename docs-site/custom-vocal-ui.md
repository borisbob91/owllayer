# Custom Vocal UI & Voice Mode

While the `DomOSWidget` provides a standard out-of-the-box floating chat bubble, many applications require custom vocal layouts (e.g. voice-only interfaces, round microphone action buttons, or hands-free dashboards). You can build these custom interfaces using the SDK hooks.

---

## 1. Managing States with the `VoiceStateMachine`

The core audio pipeline coordinates user audio capture and agent speech playback through the `VoiceStateMachine` inside `@domos/core`. This state machine transitions through five main states:

| State | Purpose | Typical UI Representation |
|---|---|---|
| `idle` | Waiting for user trigger. Microphone and speakers are inactive. | Microphone icon (dimmed/grayed). |
| `capturing` | Microphone is recording and streaming user voice chunks. | Pulse wave animation, microphone glows red/green. |
| `awaiting_model` | Client stopped capturing; waiting for LLM audio processing. | Loading spinner, "Thinking..." indicator. |
| `playing` | Speaker is playing back high-fidelity vocal chunks from the agent. | Audio waveform/spectrum animations, avatar talking. |
| `interrupted` | User starts speaking over the agent. Speaker immediately stops. | Return to microphone active state. |

---

## 2. Implementing a Custom Microphone Button (React)

Here is a full code example of a custom round vocal action button using `useVoiceMode`:

```tsx
import React from 'react';
import { useVoiceMode } from '@domos/react';

export function CustomMicrophoneButton() {
  const { voiceState, isCapturing, startCapture, stopCapture, error } = useVoiceMode();

  const handleToggle = async () => {
    if (isCapturing) {
      stopCapture();
    } else {
      try {
        await startCapture();
      } catch (err) {
        console.error("Failed to access microphone:", err);
      }
    }
  };

  return (
    <div className="voice-control-panel">
      <button 
        onClick={handleToggle}
        className={`mic-button state-${voiceState}`}
      >
        {isCapturing ? (
          <span className="icon">Stop Recording</span>
        ) : (
          <span className="icon">Start Talking</span>
        )}
      </button>

      {voiceState === 'playing' && (
        <div className="waveform-animation">Agent is speaking...</div>
      )}

      {voiceState === 'awaiting_model' && (
        <div className="thinking-dots">Agent is planning...</div>
      )}

      {error && <p className="error-message">Error: {error.message}</p>}
    </div>
  );
}
```

---

## 3. Interruptions Handling (Barge-In)

**Barge-In** allows users to interrupt the AI agent while it is speaking. 

### How Barge-In Works
1. While the agent is in the `playing` state, the browser speakers output audio chunks.
2. If the user starts speaking, the microphone capture begins streaming PCM chunks.
3. The server-side orchestration receives user input chunks and immediately sends an `INTERRUPT` frame to the client.
4. The client SDK receives the `INTERRUPT` signal, stops the active HTML5 Audio Context queue, and transitions the client state machine from `playing` to `interrupted`.

### Programmatic Barge-In Configuration
You can configure the voice detection sensitivity threshold directly inside the client options:

```typescript
import { DomOSClient } from '@domos/core';

const client = new DomOSClient({
  apiKey: 'pk_live_xxxx',
  endpoint: 'wss://api.domos.dev/domos',
  voice: {
    bargeInEnabled: true,
    // Threshold in decibels (-100 to 0). Lower value = more sensitive.
    voiceActivityThreshold: -45, 
    voiceActivityDebounceMs: 150
  }
});
```
