# ── Build stage ──────────────────────────────────────────────────────────────
# Base image: node:22-slim (Debian bookworm-slim)
FROM node:22-slim AS builder

WORKDIR /app

# Apply latest OS security patches + install build tools
RUN apt-get update && apt-get upgrade -y --no-install-recommends \
    && apt-get install -y --no-install-recommends openssl python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
# Base image: node:22-slim (Debian bookworm-slim)
FROM node:22-slim AS production

WORKDIR /app
ENV NODE_ENV=production

# Apply latest OS security patches + install runtime deps (openssl required by Prisma)
# Build tools are purged after npm ci to minimise attack surface
RUN apt-get update && apt-get upgrade -y --no-install-recommends \
    && apt-get install -y --no-install-recommends openssl python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev \
    && apt-get purge -y python3 make g++ \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled output and Prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/server.js"]
