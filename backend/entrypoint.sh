#!/bin/sh
# Entrypoint runtime backend.
# 1) applique les migrations Prisma (idempotent — no-op si DB déjà à jour)
# 2) lance le process Node passé en CMD
set -e

echo "[entrypoint] Applying Prisma migrations..."
npx prisma migrate deploy

echo "[entrypoint] Starting backend..."
exec "$@"
