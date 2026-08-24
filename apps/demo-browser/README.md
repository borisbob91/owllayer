# OwlLayer Demo — Browser (vanilla)

This is a minimal browser demo that uses the workspace `packages/browser` CDN bundle to connect to a OwlLayer demo server.

Prerequisites
- Node + pnpm installed

Run the demo server

```bash
cd apps/demo-server
pnpm install
pnpm run dev
```

Run the demo app

```bash
cd apps/demo-browser
pnpm install
pnpm run dev
# open http://localhost:5173
```

Notes
- The demo loads `../../packages/browser/dist/owllayer.min.js` (the IIFE bundle). Make sure you have built `packages/browser` or that `dist/owllayer.min.js` exists.
- The demo also opens a raw WebSocket to the configured endpoint for a simple send/receive UI.
- Configure endpoint/API key via `.env` (see `VITE_OWLLAYER_ENDPOINT`).
