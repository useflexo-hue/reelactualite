# syntax=docker/dockerfile:1

# --- Build stage: install deps with Bun (matches bun.lock) and build a plain
# Node.js server bundle via Nitro's node-server preset ---
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

COPY . .

# VITE_* values are public and get inlined into the client bundle at build time.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

RUN bun run build:node

# --- Runtime stage: the node-server output is self-contained, no node_modules needed ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.output ./.output

EXPOSE 3000
ENV PORT=3000
CMD ["node", ".output/server/index.mjs"]
