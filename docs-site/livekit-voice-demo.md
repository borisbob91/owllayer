# LiveKit Voice & WebRTC Demo Tutorial — Step-by-Step Guide

This guide walks you through setting up, configuring, and testing the **OwlLayer LiveKit WebRTC Voice Server** (`apps/demo-server-livekit`) connected to Gemini Live and browser clients.

You will learn how to configure environment variables, understand the **two integration points of LiveKit** in OwlLayer (Voice Brain with `GeminiLiveAdapter` and WebRTC Room Token Endpoint), handle **full bidirectional audio streaming with low latency and barge-in (interruption)**, configure **bilingual system prompts (FR 🇫🇷 / EN 🇬🇧)**, secure WebRTC room tokens with CORS policies, and test voice interactions end-to-end.

---

## ⚡ TL;DR — 2-Minute Quick Start

Get the LiveKit Voice demo server running in 3 minimal steps:

```bash
# 1. Install dependencies & build packages
pnpm install && pnpm build:packages

# 2. Configure environment variables in apps/demo-server-livekit/.env
cp apps/demo-server-livekit/.env.example apps/demo-server-livekit/.env
# Edit apps/demo-server-livekit/.env -> set GOOGLE_API_KEY=your_gemini_api_key

# 3. Start the LiveKit Voice Server
pnpm --filter @owllayer/demo-server-livekit dev
```

👉 The server starts listening on **`http://localhost:3002`** (WebSocket on `/owllayer` and Token signing on `/owllayer/livekit/token`)!

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Browser / Client Application                         │
│                                                                        │
│  1. Connects to AITP WebSocket (ws://localhost:3002/owllayer)          │
│  2. Requests WebRTC room token (POST /owllayer/livekit/token)           │
│  3. Joins LiveKit WebRTC Room for low-latency bidirectional PCM audio  │
│  4. Publishes local microphone track & subscribes to AI speaker track  │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
                                    │ (A) WebSocket AITP Protocol (JSON control)
                                    │ (B) WebRTC Media Tracks (Opus / PCM Audio)
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│               OwlLayer LiveKit Server (Port 3002)                      │
│                                                                        │
│  - OwlLayerServer:                                                     │
│      ├── llm: GoogleAdapter (Text reasoning & tool orchestration)      │
│      └── live: GeminiLiveAdapter (Voice brain with LiveKit transport)  │
│  - Token Endpoint (POST /owllayer/livekit/token):                       │
│      ├── Verifies AITP session & API key                               │
│      ├── createLiveKitRoomToken: Signs short-lived room token JWT      │
│      └── CORS enforcement via parseLiveKitTokenAllowedOrigins          │
│  - Bilingual Voice Prompts: Automatic English / French adaptation      │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
                                    │ WebRTC Cloud / Self-Hosted
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              LiveKit Cloud / Server & Gemini Live API                  │
│                                                                        │
│  - Ultra-low latency audio transport (< 300ms roundtrip)               │
│  - Server-side voice activity detection (VAD) & Barge-In handling      │
│  - Real-time PCM audio streaming with Gemini 2.0 Flash                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Test Environment Requirements & Configuration

### Prerequisites
- **Node.js**: v18+ or v20+
- **pnpm**: v9+
- **Google Gemini API Key**: Obtain from [Google AI Studio](https://aistudio.google.com/)
- **LiveKit Project (Optional for local testing / Required for full WebRTC)**: Get free credentials from [LiveKit Cloud](https://cloud.livekit.io/) or run a local LiveKit server.

### Environment Configuration (`apps/demo-server-livekit/.env`)

```env
PORT=3002
LOG_LEVEL=info

# Default server language (fr or en)
OWLLAYER_LANG=fr

# Google Gemini API & Model Configuration
GOOGLE_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash

# AITP API Key for Client Authentication
OWLLAYER_API_KEY=pk_livekit_demo

# LiveKit Credentials (Optional for local mock, Required for cloud WebRTC)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# CORS Allowed Origins for Token Signing
OWLLAYER_LIVEKIT_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4400,http://localhost:4300,http://localhost:4200,http://localhost:3000
```

---

## 2. The Two Connection Points of LiveKit

LiveKit requires only **two straightforward hooks** in your server:

### Connection Point A: The Voice Brain (`GeminiLiveAdapter`)
Passed to `live` in `OwlLayerServer`. The server treats it as any standard `LiveAdapter`:

```typescript
import { OwlLayerServer } from '@owllayer/server';
import { GoogleAdapter } from '@owllayer/adapter-google';
import { GeminiLiveAdapter } from '@owllayer/adapter-livekit';

const SYSTEM_PROMPTS = {
  fr: {
    text: "Tu es l'assistant IA OwlLayer. Tu aides l'utilisateur à interagir avec l'interface.",
    voice: "Tu es l'assistant vocal OwlLayer. Réponds de façon concise et naturelle en français ou en anglais.",
  },
  en: {
    text: "You are the OwlLayer AI Assistant. You assist users with interface actions.",
    voice: "You are the OwlLayer voice assistant. Keep answers concise, helpful and natural in English or French.",
  },
};

const server = new OwlLayerServer({
  // Text reasoning (required)
  llm: new GoogleAdapter({
    apiKey: GOOGLE_API_KEY,
    model: GEMINI_MODEL,
    systemPrompt: SYSTEM_PROMPTS[DEFAULT_LANG].text,
  }),

  // Voice brain via LiveKit (optional)
  live: GOOGLE_API_KEY
    ? new GeminiLiveAdapter({
        apiKey: GOOGLE_API_KEY,
        voice: 'Puck',
        systemPrompt: SYSTEM_PROMPTS[DEFAULT_LANG].voice,
      })
    : undefined,

  port: PORT,
  server: httpServer,
  path: '/owllayer',
  client: { requireApiKey: true },
});
```

### Connection Point B: The Room Token Endpoint (`createLiveKitRoomToken`)
The browser calls `POST /owllayer/livekit/token` to obtain a signed JWT to join the WebRTC room. Your `LIVEKIT_API_SECRET` remains strictly secured on the server:

```typescript
import {
  createLiveKitRoomToken,
  resolveLiveKitRuntimeConfig,
  resolveLiveKitTokenCorsOrigin,
} from '@owllayer/adapter-livekit';

const liveKitConfig = resolveLiveKitRuntimeConfig({}, process.env);

httpServer.on('request', async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'POST' && url.pathname === '/owllayer/livekit/token') {
    // 1. Verify CORS origin
    const origin = req.headers.origin;
    const corsOrigin = resolveLiveKitTokenCorsOrigin(origin, ALLOWED_ORIGINS);
    if (!corsOrigin) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Origin not allowed' }));
      return;
    }

    // 2. Parse request body and sign token
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { sessionId } = JSON.parse(body || '{}');
        const token = await createLiveKitRoomToken(liveKitConfig, {
          roomName: `owllayer-${sessionId}`,
          participantIdentity: `user-${sessionId}`,
        });

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': corsOrigin,
        });
        res.end(JSON.stringify({ token, url: liveKitConfig.url }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to create room token' }));
      }
    });
  }
});
```

---

## 3. Bilingual Voice Interactions & Interruption (Barge-In)

- **Bilingual Adaptability**: The voice brain automatically listens in both French and English and replies in the user's spoken language.
- **Barge-In (Interruption)**: Because audio flows through full-duplex WebRTC channels, the user can speak while the AI is responding. LiveKit's server-side Voice Activity Detection immediately dispatches an `INTERRUPT` event to halt speech playback on the client and cancel stale token generation on Gemini Live.

---

## 4. Testing & Verification Scenarios

### 🧪 Test Scenario 1: Health & Token Endpoint Verification
Run curl to test the room token generation:

```bash
curl -X POST http://localhost:3002/owllayer/livekit/token \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"sessionId": "test-session-123"}'
```

Expected Response:
```json
{
  "token": "eyJhbGciOi...",
  "url": "wss://your-project.livekit.cloud"
}
```

### 🧪 Test Scenario 2: Connecting an OwlLayer Client
Configure any client app (such as `apps/demo-browser` or `apps/demo-angular`) to point to `ws://localhost:3002/owllayer` with API key `pk_livekit_demo`:

1. Open the app in your browser.
2. Click the microphone button to initiate voice mode.
3. Observe the WebRTC room connection handshake.
4. Speak in French: *"Bonjour, montre-moi les articles en promotion"*.
5. Observe the low-latency response and waveform visualization.

---

## 5. Build Command

```bash
# Build TypeScript output
pnpm --filter @owllayer/demo-server-livekit build
```
