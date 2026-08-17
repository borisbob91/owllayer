# Voice State Machine & Audio Pipeline Rules

OwlLayer includes a native bidirectional vocal streaming pipeline designed to stream real-time PCM audio packages over WebSockets.

---

## The Voice State Machine

To prevent conflicts between microphone capture and agent speech, the Agentic UI SDKs utilize a central `VoiceStateMachine` to orchestrate states:

```
                  ┌───────────────┐
                  │     idle      │◄────────────────────┐
                  └───────┬───────┘                     │
                          │ START_CAPTURE               │
                          ▼                             │
                  ┌───────────────┐                     │
                  │   capturing   │                     │
                  └───────┬───────┘                     │
                          │ STOP_CAPTURE                │ TURN_COMPLETE
                          ▼                             │ ERROR
                  ┌───────────────┐                     │
                  │awaiting_model │                     │
                  └───────┬───────┘                     │
                          │ MODEL_SPEAKING              │
                          ▼                             │
┌───────────────┐ MODEL_  ┌───────────────┐             │
│  interrupted  │◄────────┤    playing    ├─────────────┘
└───────┬───────┘ SPEAKING └───────────────┘
        │ BARGE_IN (user interrupts model)
        └─────────────────►
```

### State Transitions
1. **idle**: Rest state. Speaker and microphone are inactive.
2. **capturing**: Browser is recording user audio chunks via microphone and forwarding them to the server.
3. **awaiting_model**: Capture has stopped, client is waiting for the LLM to process input and send response audio data.
4. **playing**: Client is playing back audio segments sent by the server.
5. **interrupted**: The user started speaking while the model was still talking. The active audio playback is immediately stopped.

---

## Audio Pipeline Engineering Rules (R1 - R7)

Vocal streaming over websockets requires strict memory management and precision scheduling. Follow these rules when working with the audio layers:

### R1: Audio Sample Specifications
All speech streaming uses **16kHz, 16-bit Mono Linear PCM** format. This matches standard LLM audio API specifications, minimizing transcoding latency.

### R2: Audio Chunk Sizes
Microphone chunk deliveries must be dispatched in intervals of **20ms to 50ms** (typically 320 to 800 samples per block) to avoid packet overload while preventing latency gaps.

### R3: Prevent Data Corruption (Int16Array Alignment)
When decoding raw base64 binary chunks into 16-bit integers, ensure the byte length is even. Odd lengths will throw errors when creating buffer arrays.
```ts
// Calculate safe length before creating view
const validLength = binary.length - (binary.length % 2);
const samples = new Int16Array(binary.buffer, 0, validLength / 2);
```

### R4: Downsampling & Resampling
If the microphone records at 44.1kHz or 48kHz, it must be resampled down to 16kHz in the browser using an `AudioWorklet` before sending.

### R5: Resuming Suspended AudioContext
Modern browsers suspend the `AudioContext` automatically to save power or enforce click-to-play rules. Always check state and resume before planning or playing chunks:
```ts
if (audioContext.state === 'suspended') {
  await audioContext.resume();
}
```

### R6: Audio Queue Scheduling (Next Start Time)
Never play received audio chunks using `source.start(0)`. This causes overlaps or clicking sounds between adjacent chunks. Instead, queue them sequentially using a tracked `nextStartTime`:
```ts
const playTime = Math.max(nextStartTime, audioContext.currentTime);
source.start(playTime);
nextStartTime = playTime + buffer.duration;
```

### R7: Stop and Release (Never call `AudioContext.close()`)
> [!IMPORTANT]
> When stopping microphone capture, **never** call `AudioContext.close()`. Calling `.close()` triggers thread locks in the browser, blocking the main UI thread for up to 256ms.
> Instead, disconnect the audio routing nodes and stop the `MediaStreamTrack` elements individually:
```ts
// Correct: Disconnect tracks and nodes
mediaStream.getTracks().forEach(track => track.stop());
microphoneNode.disconnect();
// Keep the AudioContext instance alive in a suspended state
```

---

## Browser Capturing: `AudioWorkletNode` Architecture

To achieve low-latency vocal interactions without impacting UI reactivity, the Agentic UI SDKs utilize the modern browser **`AudioWorkletNode`** API rather than the legacy, deprecated `ScriptProcessorNode`.

### Thread-Level Isolation
The processing of Float32 audio samples from the microphone and their transformation into Int16 format runs inside the browser’s **audio rendering thread** instead of the main Javascript execution thread. This prevents UI stuttering and frame drops during heavy GC (Garbage Collection) runs or prolonged UI interactions.

### Dynamic Inline Loading (Blob URL)
To avoid bundling and loading external asset files, the audio capture processor is loaded inline using a **Blob URL**:

```typescript
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
      // Zero-copy transfer to the main thread
      this.port.postMessage(int16, [int16.buffer]);
    }
    return true; // Keep the processor alive even during silent periods
  }
}
registerProcessor('pcm-capture', PcmCaptureProcessor);
`;

// Instantiating the Worklet Node
const blob = new Blob([PCM_CAPTURE_WORKLET], { type: 'application/javascript' });
const blobUrl = URL.createObjectURL(blob);
await audioContext.audioWorklet.addModule(blobUrl);
URL.revokeObjectURL(blobUrl);

const workletNode = new AudioWorkletNode(audioContext, 'pcm-capture', {
  numberOfInputs: 1,
  numberOfOutputs: 0, // capture-only
  processorOptions: { chunkSize: 4096 }
});

workletNode.port.onmessage = (event) => {
  const pcmInt16Array: Int16Array = event.data;
  // Send bytes over WebSocket...
};
```

### Key Considerations and Troubleshooting
- **Zero-Copy Performance**: Using the second argument of `postMessage` (`[int16.buffer]`) transfers the ownership of the ArrayBuffer memory block directly to the main thread without copy overhead.
- **Microphone Silences**: Returning `true` from the worklet's `process()` method is required to prevent the browser engine from garbage collecting the worklet node when the user stops speaking.
- **Secure Origin Requirement**: Because it runs on dedicated threads, `audioContext.audioWorklet.addModule()` will fail under insecure HTTP origins. Developers **must** serve their front-end over `localhost` (development) or `HTTPS` (production).

