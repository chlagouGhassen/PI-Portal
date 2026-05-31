#!/bin/sh
# Entrypoint runtime backend.
# 1) applique les migrations Prisma (idempotent — no-op si DB déjà à jour)
# 2) optionnellement seed si SEED_ADMIN_PASSWORD est défini (upsert = idempotent)
# 3) lance le process Node passé en CMD
set -e

echo "[entrypoint] Applying Prisma migrations..."
npx prisma migrate deploy

# Seed automatique si SEED_ADMIN_PASSWORD est défini en env (utile sur Render
# free où on ne peut pas exécuter de commande manuellement). L'upsert garantit
# l'idempotence : 1er boot crée les users, boots suivants no-op (sauf si on
# supprime les users via l'admin UI puis redéploie).
# || true : ne bloque pas le démarrage si le seed échoue (DB déjà seedée et
# le seed refuse les mots de passe par défaut → exit 1 acceptable).
if [ -n "$SEED_ADMIN_PASSWORD" ]; then
  echo "[entrypoint] Running seed (SEED_ADMIN_PASSWORD detected)..."
  npm run seed || echo "[entrypoint] Seed skipped or failed (likely already seeded), continuing..."
fi

echo "[entrypoint] Starting backend..."
exec "$@"