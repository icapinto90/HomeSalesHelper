# ── Build stage ──────────────────────────────────────────────────────────────
# Base image: node:22-alpine (Alpine Linux 3.21)
FROM node:22-alpine AS builder

# Apply latest OS-level security patches from Alpine repos
RUN apk upgrade --no-cache

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
# Base image: node:22-alpine (Alpine Linux 3.21)
FROM node:22-alpine AS production

# Apply latest OS-level security patches from Alpine repos
RUN apk upgrade --no-cache

WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output and Prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
