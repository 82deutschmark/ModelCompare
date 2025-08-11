# File: Dockerfile
# Purpose: Build and run the full-stack app (Express API + Vite React client) on Railway using a multi-stage Docker build.
# How it works: Stage 1 installs deps and runs `npm run build` to produce the client at `dist/public`.
#               Stage 2 copies built assets and TS server sources, then starts with `tsx server/index.ts` (no esbuild bundling).
# How the project uses it: Railway detects this Dockerfile (via railway.json builder) and deploys a single container serving API and static UI.
# Author: Cascade (Windsurf)

# Multi-stage Dockerfile for Railway deployment
# Stage 1: Build (install dev deps and build client+server)
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies first for layer caching
COPY package.json package-lock.json* ./
# Prefer clean reproducible installs; fall back to install if lockfile absent
RUN npm ci || npm install

# Copy source
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY client ./client
COPY server ./server
COPY shared ./shared
COPY attached_assets ./attached_assets

# Build: produces client at dist/public and server bundle at dist/index.js
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Runtime (only required files)
FROM node:20-slim AS runner

ENV NODE_ENV=production
WORKDIR /app

# Copy only the production node_modules and built artifacts
COPY --from=builder /app/node_modules ./node_modules

# No additional runtime dependencies needed for compiled JS
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared

# Document default port; Railway will inject its own PORT
EXPOSE 5000

# Start the bundled server; serves API + static from one port
CMD ["node", "dist/index.js"]
