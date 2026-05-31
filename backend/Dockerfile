###############################################################################
# Stage 1 : build TypeScript -> dist/
###############################################################################
FROM node:22-bookworm AS builder
WORKDIR /app

# Install deps (avec dev pour la build : prisma CLI, tsc, etc.)
COPY package.json package-lock.json* ./
RUN npm ci

# Génération du client Prisma (basée sur schema.prisma uniquement)
COPY prisma ./prisma
RUN npx prisma generate

# Compilation TS -> dist/
COPY tsconfig.json ./
COPY src ./src
RUN npm run build


###############################################################################
# Stage 2 : runtime (Node 22 + Python venv pour pbixray / sklearn / statsmodels)
###############################################################################
FROM node:22-bookworm
WORKDIR /app

# Python 3 + venv (pour isoler les deps ML du système). Pas de build-essential
# car scikit-learn et statsmodels distribuent des wheels pré-compilées.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Crée le venv + install requirements Python EN PREMIER pour maximiser le cache
# (les requirements.txt changent moins souvent que le code TS).
COPY scripts/requirements.txt ./scripts/requirements.txt
RUN python3 -m venv /app/.venv \
    && /app/.venv/bin/pip install --no-cache-dir --upgrade pip \
    && /app/.venv/bin/pip install --no-cache-dir -r scripts/requirements.txt

# Copie le résultat de la build + node_modules (inclut prisma CLI pour migrate)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
COPY prisma ./prisma
COPY scripts ./scripts

# Entrypoint : applique migrations Prisma puis exec CMD
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Variables d'env par défaut surchargées par docker-compose
ENV NODE_ENV=production \
    PORT=4000 \
    PYTHON_BIN=/app/.venv/bin/python

EXPOSE 4000

# Healthcheck via fetch natif Node 18+ (pas besoin de curl/wget supplémentaire)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/index.js"]
