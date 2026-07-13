# ============================================================
# DomOS Demo Server — multi-stage build
# Build context MUST be the repo root (pnpm monorepo).
#   docker build -f apps/demo-server/Dockerfile -t domos-demo-server .
# ============================================================

# ---- Stage 1: build the workspace ----
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9.15.9

WORKDIR /app

# Copy workspace manifests first (better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./

# Copy the full source (packages + apps). A .dockerignore keeps this lean.
COPY packages ./packages
COPY plugins ./plugins
COPY apps/demo-server ./apps/demo-server

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Build the demo-server and everything it depends on
RUN pnpm --filter @domos/demo-server... build

# ---- Stage 2: runtime ----
FROM node:20-alpine AS runtime

RUN npm install -g pnpm@9.15.9

WORKDIR /app
ENV NODE_ENV=production

# Copy built workspace from the builder
COPY --from=builder /app ./

# The DomOS server listens on PORT (HTTP + WebSocket on the same port)
EXPOSE 3001

WORKDIR /app/apps/demo-server

# start = node dist/server.js
CMD ["pnpm", "start"]
