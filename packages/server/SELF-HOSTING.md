# DomOS — Self-Hosting Guide

## Déploiement rapide (5 commandes)

```bash
# 1. Cloner le monorepo
git clone https://github.com/your-org/domos.git && cd domos

# 2. Configurer les variables d'environnement
cp packages/server/docker/.env.example packages/server/docker/.env
# → Éditez .env avec vos API keys

# 3. (Optionnel) Personnaliser la config YAML
# → Éditez packages/server/docker/config/domos.config.yml

# 4. Lancer
cd packages/server && pnpm docker:up

# 5. Vérifier
curl http://localhost:3000/health
# → {"status":"healthy","version":"...","uptime":...}
```

## Sans Docker

```bash
pnpm install
pnpm turbo build --filter @domos/server...

# Configurer les envs
export GOOGLE_API_KEY=your-key
export ADMIN_PASSWORD=your-password

# Lancer
cd packages/server && pnpm start
```

## Configuration

Le serveur cherche la configuration dans cet ordre :
1. `$DOMOS_CONFIG_PATH` (variable d'env)
2. `./domos.config.yml` (répertoire courant)
3. Variables d'environnement uniquement (mode minimal)

### Variables d'environnement

| Variable | Requis | Default | Description |
|----------|--------|---------|-------------|
| `PORT` | Non | `3000` | Port d'écoute |
| `ADMIN_PASSWORD` | Oui | — | Mot de passe admin |
| `LLM_PROVIDER` | Non | `google` | Provider LLM |
| `GOOGLE_API_KEY` | Si google | — | Clé API Google |
| `OPENAI_API_KEY` | Si openai | — | Clé API OpenAI |
| `ANTHROPIC_API_KEY` | Si anthropic | — | Clé API Anthropic |
| `DOMOS_CONFIG_PATH` | Non | `./domos.config.yml` | Chemin config YAML |

## Endpoints

| Route | Méthode | Description |
|-------|---------|-------------|
| `/health` | GET | Health check JSON |
| `/admin/capabilities` | GET | Modèles et voix disponibles |
| `/_domos/panel` | GET | Dashboard embarqué |
| `/domos` | WS | WebSocket ADTP |

## Commandes disponibles

```bash
pnpm build          # Build TypeScript
pnpm start          # Démarrer le serveur buildé
pnpm dev            # Dev avec hot-reload (tsx)
pnpm docker:build   # Build image Docker
pnpm docker:up      # Démarrer la stack Docker
pnpm docker:down    # Arrêter la stack Docker
pnpm docker:logs    # Suivre les logs
```

## Upgrade

```bash
git pull
pnpm docker:build
pnpm docker:up
```
