#!/bin/sh
set -e

echo "╔═══════════════════════════════════════════╗"
echo "║         DomOS Server — Starting           ║"
echo "╚═══════════════════════════════════════════╝"

# Vérifier la config YAML
if [ ! -f "$DOMOS_CONFIG_PATH" ]; then
  echo "⚠️  Aucune config trouvée à $DOMOS_CONFIG_PATH"
  echo "   Le serveur utilisera les variables d'environnement."
fi

# Vérifier qu'au moins une API key LLM est définie
if [ -z "$GOOGLE_API_KEY" ] && [ -z "$OPENAI_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "❌ Aucune API key LLM détectée."
  echo "   Définissez au moins : GOOGLE_API_KEY, OPENAI_API_KEY, ou ANTHROPIC_API_KEY"
  exit 1
fi

echo "✅ LLM provider : ${LLM_PROVIDER:-auto-detect}"
echo "🚀 Démarrage sur port ${PORT:-3000}..."
echo ""

exec "$@"
