# Stage 1: Build the VitePress documentation site
FROM node:20-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm@9.15.9

WORKDIR /app

# Copy package configurations to leverage caching layers
COPY package.json ./

# Install dependencies
RUN pnpm install

# Copy source directories
COPY . .

# Compile static assets
RUN pnpm run build

# Stage 2: Serve the compiled site using Nginx
FROM nginx:alpine

# Copy custom configuration for clean VitePress URLs routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled assets from builder
COPY --from=builder /app/.vitepress/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
