# DomOS Deployment Stack

Ready-to-run Docker setup that boots the **DomOS server** and a **self-hosted LiveKit server** together.

## Contents

| File | Role |
|---|---|
| `docker-compose.yml` | Orchestrates `livekit` + `domos-server` |
| `livekit.yaml` | LiveKit server config (ports, keys) |
| `.env.example` | All environment variables to fill in |
| `../apps/demo-server/Dockerfile` | Builds the DomOS server from the monorepo |

## Quick Start

```bash
cd deploy
cp .env.example .env      # fill in GOOGLE_API_KEY + secrets
docker compose up --build
```

Once up:

| Service | URL |
|---|---|
| DomOS WebSocket | `ws://localhost:3001/domos` |
| DomOS dashboard | `http://localhost:3001/domos-ui` |
| LiveKit token endpoint | `http://localhost:3001/domos/livekit/token` |
| LiveKit signaling | `ws://localhost:7880` |

## How the two services connect

1. The browser connects to the **DomOS server** over ADTP (WebSocket).
2. For a voice room, the client calls `/domos/livekit/token`. The DomOS server verifies the session + API key and signs a short-lived room token with `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`.
3. The client joins the **LiveKit** room with that token. Secrets never reach the browser.

`LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` **must match** on both sides (`livekit.yaml` and the DomOS server env).

## Production Notes

- **TLS:** put a reverse proxy (Caddy / Nginx / cloud LB) in front. LiveKit signaling should be `wss://` and DomOS `wss://` in production.
- **WebRTC media:** LiveKit needs its UDP port (`7882/udp`) reachable from clients. On cloud, open the security group and set `use_external_ip: true` (already set).
- **Scaling LiveKit:** more than one node requires Redis (commented in `livekit.yaml`).
- **Secrets:** never commit `.env`. Rotate `LIVEKIT_API_SECRET` and `ADMIN_PASSWORD` for production.
- **Self-host vs LiveKit Cloud:** to use LiveKit Cloud instead of the bundled server, drop the `livekit` service and point `LIVEKIT_URL` / keys at your Cloud project.
