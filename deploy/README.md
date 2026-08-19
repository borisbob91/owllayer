# OwlLayer Deployment Stack

Ready-to-run Docker setup for the **OwlLayer server**. LiveKit is **optional** and only needed for WebRTC voice rooms.

## Contents

| File | Role |
|---|---|
| `docker-compose.yml` | Runs `owllayer-server` (always) + `livekit` (optional profile) |
| `livekit.yaml` | LiveKit server config (ports, keys) — only used with the LiveKit profile |
| `.env.example` | All environment variables to fill in |
| `../apps/demo-server/Dockerfile` | Builds the OwlLayer server from the monorepo |

## Mode A — OwlLayer only (no LiveKit)

This is the default. You get WebSocket ADTP, text, tools, HITL and Gemini native audio. No LiveKit needed.

```bash
cd deploy
cp .env.example .env      # fill in GOOGLE_API_KEY + OwlLayer keys
docker compose up --build
```

You can leave all `LIVEKIT_*` variables empty. The server boots normally; only the `/owllayer/livekit/token` endpoint stays inactive.

| Service | URL |
|---|---|
| OwlLayer WebSocket | `ws://localhost:3001/owllayer` |
| OwlLayer dashboard | `http://localhost:3001/owllayer-ui` |

## Mode B — OwlLayer + LiveKit (voice rooms)

Adds a self-hosted LiveKit server for WebRTC rooms.

```bash
cd deploy
cp .env.example .env      # also fill in LIVEKIT_* + set LIVEKIT_URL=ws://livekit:7880
docker compose --profile livekit up --build
```

| Service | URL |
|---|---|
| OwlLayer WebSocket | `ws://localhost:3001/owllayer` |
| OwlLayer dashboard | `http://localhost:3001/owllayer-ui` |
| LiveKit token endpoint | `http://localhost:3001/owllayer/livekit/token` |
| LiveKit signaling | `ws://localhost:7880` |

### How the two services connect

1. The browser connects to the **OwlLayer server** over ADTP (WebSocket).
2. For a voice room, the client calls `/owllayer/livekit/token`. The OwlLayer server verifies the session + API key and signs a short-lived room token with `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`.
3. The client joins the **LiveKit** room with that token. Secrets never reach the browser.

`LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` **must match** on both sides (`livekit.yaml` and the OwlLayer server env).

## Production Notes

- **TLS:** put a reverse proxy (Caddy / Nginx / cloud LB) in front. Signaling should be `wss://` in production.
- **WebRTC media:** LiveKit needs its UDP port (`7882/udp`) reachable from clients. On cloud, open the security group and keep `use_external_ip: true`.
- **Scaling LiveKit:** more than one node requires Redis (commented in `livekit.yaml`).
- **Secrets:** never commit `.env`. Rotate `LIVEKIT_API_SECRET` and `ADMIN_PASSWORD` for production.
- **Self-host vs LiveKit Cloud:** to use LiveKit Cloud instead of the bundled server, run Mode A and point `LIVEKIT_URL` / keys at your Cloud project.
