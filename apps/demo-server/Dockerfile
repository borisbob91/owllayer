# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/demo-server/package.json apps/demo-server/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/adapter-livekit/package.json packages/adapter-livekit/package.json
COPY packages/adapter-google/package.json packages/adapter-google/package.json
COPY packages/adapter-openai/package.json packages/adapter-openai/package.json
COPY packages/adapter-anthropic/package.json packages/adapter-anthropic/package.json
COPY packages/audio/package.json packages/audio/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY apps/demo-server apps/demo-server
COPY packages/core packages/core
COPY packages/server packages/server
COPY packages/adapter-livekit packages/adapter-livekit
COPY packages/adapter-google packages/adapter-google
COPY packages/adapter-openai packages/adapter-openai
COPY packages/adapter-anthropic packages/adapter-anthropic
COPY packages/audio packages/audio
RUN pnpm --filter @domos/demo-server... build
RUN pnpm deploy --filter @domos/demo-server --prod /prod/demo-server

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=4001
WORKDIR /app
RUN addgroup -S domos && adduser -S domos -G domos
COPY --from=builder --chown=domos:domos /prod/demo-server ./
USER domos
EXPOSE 4001
HEALTHCHECK --interval=30s --timeout=4s --start-period=15s --retries=3 \
  CMD node -e "const n=require('node:net');const s=n.connect(Number(process.env.PORT||4001),'127.0.0.1',()=>{s.end();process.exit(0)});s.setTimeout(3000,()=>process.exit(1));s.on('error',()=>process.exit(1))"
CMD ["node", "dist/server.js"]
