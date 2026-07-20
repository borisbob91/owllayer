# demo-server-livekit

A minimal DomOS server that **actually wires LiveKit** — the concrete answer to "where is LiveKit plugged in?".

## The one thing to understand

LiveKit is **not** a special subsystem. `GeminiLiveAdapter` implements the same `LiveAdapter` interface as `GoogleLiveAdapter`, so it plugs into the **exact same `live` slot** of `DomOSServer`:

```ts
// Native Gemini audio (no LiveKit):
live: new GoogleLiveAdapter({ ... })

// Gemini audio via LiveKit — same slot, one line changes:
live: new GeminiLiveAdapter({ ... })
```

That's the whole "branchement". The server only ever sees a `LiveAdapter`; it doesn't know or care that LiveKit is behind it.

## Two pieces, not one

| Piece | What | Where |
|---|---|---|
| **(A) Voice brain** | `GeminiLiveAdapter` | `new DomOSServer({ live })` |
| **(B) Room transport** | token endpoint (`createLiveKitRoomToken`) | an HTTP route on your server |

(A) is identical to every other live adapter. (B) is the only LiveKit-specific extra, because the media flows through a WebRTC **room** that the browser must join with a signed token.

Both are shown, fully commented, in [`src/server.ts`](./src/server.ts).

## Run it

```bash
cp .env.example .env      # set GOOGLE_API_KEY + LIVEKIT_* keys
pnpm install
pnpm --filter @domos/demo-server-livekit dev
```

You also need a LiveKit server reachable at `LIVEKIT_URL` (self-hosted via `deploy/`, or LiveKit Cloud).

## The full flow

1. Browser connects to DomOS over ADTP (`ws://localhost:3002/domos`) and gets a `sessionId`.
2. Browser calls `POST /domos/livekit/token` with `{ sessionId, apiKey }`.
3. Server verifies the session belongs to that API key, then signs a 5-min room token. **Secrets never leave the server.**
4. Browser joins the LiveKit room with the token (`useDomOSLiveKitRoom` in React).
5. Voice flows through LiveKit; tool calls still route through DomOS (Shadow Context, HITL, ToolRouter) exactly as in text mode.

## Compared to `apps/demo-server`

`apps/demo-server` uses `GoogleLiveAdapter` in the `live` slot (native audio, no LiveKit). This app swaps in `GeminiLiveAdapter` and adds the token endpoint. Same DomOS, different voice transport.
