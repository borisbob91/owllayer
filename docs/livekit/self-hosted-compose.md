# LiveKit self-hosted avec Docker Compose

Ce profil fournit une reference **single-node** pour le widget web DomOS. Il lance DomOS Server, LiveKit Server et Redis. Il ne contient ni SIP, ni ingress/egress, ni cluster multi-node.

## Prerequis

- deux domaines DNS : `api.example.com` pour DomOS et `livekit.example.com` pour LiveKit ;
- ports publics `80/tcp`, `443/tcp`, `443/udp`, `7881/tcp` et `7882/udp` ;
- une adresse IP publique joignable par LiveKit ;
- Docker Engine avec Compose v2.

Le proxy Caddy termine TLS pour les APIs HTTP/WebSocket. Les medias WebRTC utilisent directement `7881/tcp` et `7882/udp`. Le proxy HTTP ne remplace pas ces ports RTC.

## Configuration

```bash
cp deploy/.env.example .env
```

Generez des valeurs longues et aleatoires pour :

```ini
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_REDIS_PASSWORD=...
```

Gardez `LIVEKIT_URL=wss://livekit.example.com`. Les memes key/secret sont utilises par DomOS pour signer les tokens et par LiveKit pour les verifier.

## Demarrage

```bash
docker compose --profile livekit-selfhosted --profile proxy config
docker compose --profile livekit-selfhosted --profile proxy up -d --build
docker compose ps
```

Sans Caddy, pour un test local uniquement :

```bash
docker compose --profile livekit-selfhosted up -d --build
```

## Pare-feu

Ouvrez :

- `80/tcp` et `443/tcp` pour TLS ;
- `443/udp` pour HTTP/3 de Caddy, optionnel ;
- `7881/tcp` pour le fallback RTC/TCP ;
- `7882/udp` pour le media WebRTC single-node.

N'exposez pas Redis. Pour un deploiement distribue, remplacez le port UDP unique par une plage RTC et utilisez la topologie officielle LiveKit.

## Verification

1. `https://api.example.com` atteint DomOS.
2. `wss://api.example.com/domos` ouvre la session ADTP.
3. `https://livekit.example.com` atteint l'API LiveKit.
4. Le token endpoint DomOS retourne `livekitUrl: wss://livekit.example.com`.
5. Le widget rejoint une room et publie le microphone.
6. Couper `livekit` laisse le chat texte DomOS actif.

## Limites de cette reference

- single-node uniquement ;
- pas de TURN/TLS integre dans LiveKit ; pour les reseaux restrictifs, ajoutez un TURN public correctement configure ;
- pas de SIP, ingress ou egress ;
- pas de haute disponibilite Redis ;
- la validation sur un domaine public reste obligatoire avant production.

Pour une premiere mise en ligne, LiveKit Cloud reste plus simple. Ce profil self-hosted sert lorsque le controle de l'infrastructure est un besoin explicite.
