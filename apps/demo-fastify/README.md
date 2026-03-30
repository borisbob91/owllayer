# Demo Fastify + DomOS

Exemples et benchmarks pour évaluer l'intégration de Fastify avec DomOS Server.

## Installation

```bash
pnpm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env et ajouter votre GOOGLE_API_KEY
```

## Configuration

Créer un fichier `.env` avec votre clé API Google Gemini:

```bash
GOOGLE_API_KEY=your_google_api_key_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
PORT=3000
```

Obtenir une clé API: https://makersuite.google.com/app/apikey

## Lancer les exemples

```bash
# Exemple basique (Fastify + DomOS + routes health/ping)
pnpm basic

# Exemple avancé (avec helmet, cors, rate-limiting)
pnpm advanced

# Benchmark Fastify vs Native
pnpm benchmark
```

## Utilitaires

```bash
# Si le benchmark plante et laisse des serveurs en écoute
pnpm kill
```

Ce script tue tous les processus écoutant sur les ports 9100, 9101, 9200, 9201, 3000.

## Tests

```bash
pnpm test
```

## Évaluation (Mai 2026)

Ces exemples seront utilisés pour l'évaluation post-lancement de Fastify.

**Critères de décision:**
- Gain de performance ≥30% requis pour migration
- Latence P99 <100ms sous charge réelle
- Stabilité équivalente au serveur natif

Voir `docs/standalone-server/CLEANUP-AND-FASTIFY-EVAL.md` pour le plan complet.
