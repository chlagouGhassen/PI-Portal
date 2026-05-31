# Déploiement sur Render (free tier)

Guide pas-à-pas pour déployer PI Portal sur Render.com sans coût.

## Architecture choisie

```
┌──────────────────────────┐         ┌──────────────────────────┐
│  Frontend Static (CDN)   │ ───────▶│  Backend Docker (Node+Py)│
│  pi-portal-frontend      │  HTTPS  │  pi-portal-backend       │
│  *.onrender.com          │         │  *.onrender.com          │
└──────────────────────────┘         └─────────┬────────────────┘
                                                │
                                                ▼
                                     ┌──────────────────────────┐
                                     │  Postgres 1GB (free)     │
                                     │  pi-portal-db            │
                                     └──────────────────────────┘
```

| Service | Plan | Limites free | Coût |
|---|---|---|---|
| Frontend | Static Site | CDN global illimité | **0 $/mo** |
| Backend | Web Service Docker | 512 MB RAM, spin-down 15min idle, cold start ~30s | **0 $/mo** |
| Postgres | DB free | 1 GB, expire à 90 jours (recréation manuelle) | **0 $/mo** |
| Persistent disk (optionnel) | Disk | 1 GB pour persister uploads | 1 $/mo |

**Coût minimum : 0 $/mo**. Avec disque persistant pour les uploads `.pbix` et `.xls` : **1 $/mo**.

## Caveats (à connaître avant de déployer)

1. **Cold start 30s** : le backend free spin-down après 15min sans requête. La première requête après un idle prend ~30s (boot du conteneur + connexion DB). Mitigation : un ping `GET /api/health` toutes les 10min via [cron-job.org](https://cron-job.org) gratuit.
2. **Postgres expire à J+90** : Render désactive la DB. Solution : `pg_dump` avant J+90, créer une nouvelle DB free, `pg_restore`. Ou passer au plan Postgres payant ($7/mo). Alternative gratuite : [Neon](https://neon.tech) (3 GB pas d'expiration) ou [Supabase](https://supabase.com) (500 MB pas d'expiration) → remplacer `DATABASE_URL` dans Render.
3. **Uploads éphémères sans disque persistant** : sans le disk $1/mo, à chaque redéploiement ou cold start, les `.pbix` et `.xls` uploadés disparaissent. Vous devrez les re-uploader via l'UI admin. Acceptable pour une démo, pas pour de la prod.

## Étapes (10 min)

### 1. Push le repo sur GitHub

```bash
cd /app/ghassen-projet
git remote add origin git@github.com:VOTRE-USER/pi-portal.git
git push -u origin main
```

### 2. Connecter Render à GitHub

- Aller sur https://render.com et créer un compte (login GitHub recommandé)
- Dashboard → **New +** → **Blueprint**
- Sélectionner le repo `pi-portal`
- Render détecte automatiquement le fichier `render.yaml` à la racine
- Cliquer **Apply** → Render crée :
  - 1 Postgres free (`pi-portal-db`)
  - 1 Web Service backend (`pi-portal-backend`)
  - 1 Static Site frontend (`pi-portal-frontend`)
- Les env vars sont câblées automatiquement (CORS_ORIGIN du backend pointe vers l'URL du frontend, VITE_API_URL du frontend pointe vers le backend)

### 3. Attendre le premier build

- Backend Docker : ~8 min (pip install des libs ML)
- Frontend Vite : ~2 min
- Postgres : ~1 min

Suivre les logs depuis le dashboard Render. Le backend lancera automatiquement `prisma migrate deploy` via `entrypoint.sh`.

### 4. Seed initial des comptes

Le seed n'est **pas auto**. Une fois le backend "Live" :

- Dashboard Render → backend → **Shell** (en haut à droite)
- Lancer :
  ```bash
  SEED_ADMIN_PASSWORD='UnVraiMotDePasse2026!' npm run seed
  ```
  > Le seed refuse les mots de passe par défaut en `NODE_ENV=production`. Définir explicitement `SEED_ADMIN_PASSWORD` (et `SEED_DEMO_PASSWORD` si vous voulez le compte démo).

### 5. Premier login

- Ouvrir https://pi-portal-frontend.onrender.com
- Login `admin@pi-portal.local` / le mot de passe défini à l'étape 4
- Aller dans **Administration → Données** :
  - Uploader le `.pbix` (la donnée métier sera importée dans Postgres)
  - Uploader les 4 `.xls` bourse si vous voulez la page Série temporelle
- Changer le mot de passe admin via la matrice d'accès (ou via une nouvelle UI à venir)

## Configuration alternative : Frontend Vercel + Backend Render

Si vous voulez les avantages Vercel (edge CDN ultra-rapide, déploiements preview par PR) côté frontend :

1. **Vercel** :
   - Importer le repo
   - Root Directory : `frontend`
   - Build Command : `npm run build`
   - Output Directory : `dist`
   - Env var : `VITE_API_URL=https://pi-portal-backend.onrender.com`
2. **Render** : créer seulement le backend + Postgres (supprimer la section frontend du `render.yaml`)
3. Sur le backend Render, mettre à jour `CORS_ORIGIN` avec l'URL Vercel (ex. `https://pi-portal.vercel.app`)
4. `COOKIE_SAMESITE=none` est déjà bon pour cross-origin

## Checklist déploiement

- [ ] Repo pushé sur GitHub avec `render.yaml` à la racine
- [ ] Blueprint Render appliqué avec succès (3 services créés)
- [ ] Backend healthy (Live · `/api/health` répond)
- [ ] Frontend accessible (HTML PI Portal sert)
- [ ] Migrations Prisma appliquées (logs backend : "No pending migrations to apply")
- [ ] Seed exécuté avec mot de passe custom
- [ ] Login admin réussi
- [ ] `.pbix` uploadé et import OK
- [ ] (Optionnel) `.xls` bourse uploadés
- [ ] Premier dashboard chargé avec données réelles
- [ ] Cron de keep-alive configuré (cron-job.org pinge `/api/health` toutes les 10 min)

## Récap des URLs après deploy

| Service | URL (à adapter selon ton compte) |
|---|---|
| Frontend | `https://pi-portal-frontend.onrender.com` |
| Backend API | `https://pi-portal-backend.onrender.com/api/...` |
| Backend health | `https://pi-portal-backend.onrender.com/api/health` |
| Render dashboard | `https://dashboard.render.com` |
