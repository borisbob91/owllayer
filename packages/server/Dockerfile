# ——— Stage 1 : Build ———
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Manifests pour le cache des dépendances
COPY pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/server/package.json packages/server/
COPY packages/core/package.json packages/core/
COPY packages/adapter-google/package.json packages/adapter-google/
COPY packages/adapter-openai/package.json packages/adapter-openai/
COPY packages/adapter-anthropic/package.json packages/adapter-anthropic/
COPY tsconfig.base.json ./

# Installer les dépendances
RUN pnpm install --frozen-lockfile \
    --filter @domos/server... \
    --filter @domos/adapter-google... \
    --filter @domos/adapter-openai... \
    --filter @domos/adapter-anthropic...

# Copier les sources
COPY packages/ packages/

# Build tous les packages nécessaires
RUN pnpm turbo build \
    --filter @domos/server... \
    --filter @domos/adapter-google... \
    --filter @domos/adapter-openai... \
    --filter @domos/adapter-anthropic...

# ——— Stage 2 : Production ———
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@9 --activate

# Sécurité : utilisateur non-root
RUN addgroup -S domos && adduser -S domos -G domos

WORKDIR /app

# Copier manifest + lockfile pour prod install
COPY --from=build /app/pnpm-lock.yaml ./
COPY --from=build /app/pnpm-workspace.yaml ./
COPY --from=build /app/packages/server/package.json ./packages/server/
COPY --from=build /app/packages/core/package.json ./packages/core/
COPY --from=build /app/packages/adapter-google/package.json ./packages/adapter-google/
COPY --from=build /app/packages/adapter-openai/package.json ./packages/adapter-openai/
COPY --from=build /app/packages/adapter-anthropic/package.json ./packages/adapter-anthropic/

# Installer uniquement les dépendances de production
RUN pnpm install --frozen-lockfile --prod \
    --filter @domos/server... \
    --filter @domos/adapter-google... \
    --filter @domos/adapter-openai... \
    --filter @domos/adapter-anthropic...

# Copier les builds compilés
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/adapter-google/dist ./packages/adapter-google/dist
COPY --from=build /app/packages/adapter-openai/dist ./packages/adapter-openai/dist
COPY --from=build /app/packages/adapter-anthropic/dist ./packages/adapter-anthropic/dist

# Script d'entrée
COPY packages/server/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Dossier pour config montée en volume
RUN mkdir -p /config /data && chown -R domos:domos /config /data

USER domos

ENV NODE_ENV=production
ENV DOMOS_CONFIG_PATH=/config/domos.config.yml

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "packages/server/dist/standalone/main.js"]
