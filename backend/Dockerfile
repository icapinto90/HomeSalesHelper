# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Installation de tous les outils nécessaires
RUN apt-get update && apt-get install -y openssl python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:22-slim AS production

WORKDIR /app
ENV NODE_ENV=production

# 1. On installe OpenSSL ET les outils de compilation
RUN apt-get update && apt-get install -y openssl python3 make g++

COPY package*.json ./
# 2. Sentry peut maintenant se compiler sans erreur
RUN npm ci --omit=dev

# 3. On supprime proprement les outils de compilation (mais on garde openssl pour Prisma)
RUN apt-get purge -y python3 make g++ && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Copie des fichiers depuis le builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/server.js"]
