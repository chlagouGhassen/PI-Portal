# PI Portal / Performance Investissements

Portail web interne de visualisation de dashboards d'analyse financière, alimenté par les
données post-ETL d'un rapport Power BI Desktop. Authentification + RBAC (admin / utilisateur),
import automatique de `.pbix` via pipeline Python (pbixray), modèles ML embarqués.

Voir `CLAUDE.md` pour l'architecture détaillée, le modèle de données, et les règles de sécurité.

---

## Stack

| Couche | Tech |
|---|---|
| Frontend | React 18 · Vite · TypeScript · Tailwind · Framer Motion · Recharts · TanStack Query · Zustand · React Router |
| Backend | Express · TypeScript · Prisma · JWT (cookie httpOnly) · bcrypt · Zod · helmet · express-rate-limit |
| Backend Python | pbixray (extraction .pbix) · scikit-learn (Ridge / GBM / RF) · statsmodels (ARIMA / SARIMA) · psycopg2 |
| Base de données | PostgreSQL 16 |
| Infra | Docker Compose (postgres + backend + frontend nginx) |

## Dashboards livrés

| Slug | Type | Pipeline |
|---|---|---|
| `performance-investissements` | Évolution temporelle | Aggregations Postgres (KPI + 3 charts Recharts) |
| `analyse-comparative` | Benchmark inter-entreprises | Radar ROA/ROE/ROCE + bars liquidité/endettement + heatmap CSS |
| `prediction` | ML supervisé | Python sklearn : Ridge / GBM / RF + LOO Cross-Validation + projection multi-horizon |
| `serie-temporelle` | Séries temporelles | Python statsmodels : décomposition STL + ADF + ARIMA + SARIMA |

---

## Démarrage rapide

### Option A : Docker Compose (recommandé)

```bash
docker compose up -d --build               # 5-10 min au premier build (deps Python ML)
docker compose exec backend npm run seed   # crée les comptes par défaut
open http://localhost
```

Trois services démarrent :
- `postgres` (5432) — base de données
- `backend` (4000) — Express + Python venv embarqué
- `frontend` (80) — nginx serve le bundle Vite + proxy `/api/*` vers backend

Le `prisma migrate deploy` tourne automatiquement à chaque boot du conteneur backend.

### Option B : dev local sans docker

```bash
# 1. DB postgres
docker compose up -d postgres

# 2. Backend
cd backend
cp .env.example .env                                # ajuster JWT_SECRET (32+ chars)
npm install
python3 -m venv .venv && .venv/bin/pip install -r scripts/requirements.txt
npx prisma migrate dev --name init
npm run seed
npm run dev                                          # http://localhost:4000

# 3. Frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev                                          # http://localhost:5173
```

---

## Comptes de seed

| Email | Mot de passe | Rôle | Accès dashboards |
|---|---|---|---|
| `admin@pi-portal.local` | `ChangeMe!2026` | ADMIN | tous (court-circuit) |
| `demo@pi-portal.local` | `Demo!2026` | USER | 3/4 (sauf analyse-comparative) |

> À changer immédiatement après le premier login en prod. Le seed refuse les mots de passe par
> défaut quand `NODE_ENV=production`.

---

## Données

### Schéma .pbix (importé automatiquement)

Le fichier `data/PI_FINALE.pbix` est uploadé via **Admin → Données**. Pipeline :
1. Python pbixray décompresse le DataModel (XPress9, format SSAS Tabular)
2. Extraction des 6 tables (DimEntreprise, DimTemps, DimBilan, DimResultat, DimRatios, FactPerformance)
3. Import transactionnel Prisma (truncate + insert, rollback si erreur)

### Fichiers bourse pour la page « Série temporelle »

À uploader via **Admin → Données → section "Cours bourse journalier"** :
- `EUROCYCLES_stock bourse.xls`
- `NBL_stock bourse.xls`
- `SAH_stock bourse.xls`
- `PLAST_stock bourse.xls`

Stockés dans `data/bourse/` (gitignorés — données potentiellement sensibles).

---

## Commandes utiles

```bash
# Docker stack
docker compose up -d                       # démarrer
docker compose logs -f backend             # voir les logs backend
docker compose exec backend npm run seed   # re-seed
docker compose down                        # arrêter
docker compose down -v                     # arrêter + wipe postgres-data volume

# Backend (dev local)
cd backend
npm run dev                                # tsx watch
npm run build                              # tsc -> dist/
npm run lint
npm run prisma:studio                      # UI web pour inspecter la DB
npm run prisma:migrate                     # créer une migration depuis schema.prisma
npm run seed                               # users + dashboards de démo

# Frontend (dev local)
cd frontend
npm run dev                                # vite dev server
npm run build                              # build production
npm run lint
npm run typecheck                          # vérif TS sans build
```

---

## Phases livrées

Phases **1, 2, 3, 4, 6, 7, 8, 9** (5 sautée). Détails dans `CLAUDE.md`.

Ajouts post-phases : dashboards ML (Prédiction + Série temporelle), upload .xls bourse via UI,
dockerisation complète (Dockerfiles + nginx proxy + entrypoint Prisma migrate).

---

## Endpoints

```
# Auth
POST   /api/auth/login            login (rate-limit 10/15min)
POST   /api/auth/logout
GET    /api/auth/me

# Dashboards (accès filtré par DashboardAccess, 404 si non autorisé)
GET    /api/dashboards            liste filtrée
GET    /api/dashboards/:slug      détail
GET    /api/dashboards/:slug/data rows métier
POST   /api/dashboards            (ADMIN) créer
PUT    /api/dashboards/:id        (ADMIN) modifier
DELETE /api/dashboards/:id        (ADMIN) supprimer

# Pipelines ML
POST   /api/dashboards/prediction/run        Python sklearn (3-5s)
POST   /api/dashboards/serie-temporelle/run  Python statsmodels (3-5s)

# Accès
GET    /api/dashboards/:id/access            (ADMIN)
POST   /api/dashboards/:id/access            (ADMIN) grant
DELETE /api/dashboards/:id/access/:userId    (ADMIN) revoke

# Admin
GET    /api/admin/users                      (ADMIN)
POST   /api/admin/users                      (ADMIN) renvoie mot de passe généré une fois
PUT    /api/admin/users/:id                  (ADMIN)
DELETE /api/admin/users/:id                  (ADMIN)
POST   /api/admin/users/:id/reset-password   (ADMIN)
GET    /api/admin/access                     (ADMIN) matrice flat
POST   /api/admin/pbix/inspect               (ADMIN) métadonnées sans toucher DB
POST   /api/admin/pbix/import                (ADMIN) extraction + import transactionnel
GET    /api/admin/bourse/status              (ADMIN) statut fichiers bourse
POST   /api/admin/bourse/upload              (ADMIN) upload .xls

# Système
GET    /api/health                           ping + DB
```

---

## Déploiement en production — checklist

Le backend refuse de démarrer si certains points manquent (cf. `backend/src/lib/env.ts`).

### Secrets et configuration

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` : **64 caractères minimum** (`openssl rand -hex 32`). Stocké dans un
      gestionnaire de secrets (Vault / AWS Secrets Manager / GCP Secret Manager), jamais en clair.
- [ ] `COOKIE_SECURE=true` (impose HTTPS).
- [ ] `CORS_ORIGIN` : URL absolue HTTPS du frontend, sans wildcard, sans localhost.
- [ ] `DATABASE_URL` : connexion via SSL, utilisateur dédié avec droits CRUD seulement.
- [ ] `TRUST_PROXY` : nombre de hops du reverse proxy (1 pour nginx direct). **Sans cette config,
      le rate-limit ne fonctionne pas** (toutes les requêtes apparaissent comme venant de l'IP du
      proxy).

### Infrastructure

- [ ] HTTPS obligatoire (Let's Encrypt, Cloudflare, ou TLS managé du cloud provider).
- [ ] Reverse proxy (déjà inclus via le service `frontend` nginx du compose, peut être étendu).
- [ ] Postgres avec backups automatiques (quotidien minimum, restauration testée).
- [ ] Variables d'env injectées par le runtime (pas via `.env` commité).
- [ ] Volume persistent pour `data/` (PI_FINALE.pbix + bourse uploads).

### Initialisation

- [ ] `docker compose up -d` → `prisma migrate deploy` auto via entrypoint.
- [ ] `docker compose exec backend npm run seed` avec `SEED_ADMIN_PASSWORD` défini.
- [ ] Premier login admin → reset son propre mot de passe via l'UI admin.
- [ ] Upload du `.pbix` initial via Admin → Données.
- [ ] Upload des 4 `.xls` bourse via Admin → Données → section bourse.

### Observabilité

- [ ] Logs JSON (déjà actifs en prod via `lib/logger.ts`) → agrégateur centralisé.
- [ ] Événements `audit.*` (login, admin actions, ML runs) conservés 90+ jours.
- [ ] Monitoring : ping régulier sur `GET /api/health` (renvoie `{ status: 'ok', db: 'up' }`).
- [ ] Alertes sur taux 5xx anormal et sur explosion de `auth.login.failure`.

---

## Structure

```
.
├── CLAUDE.md                       # Contexte projet (architecture, décisions)
├── guide.md                        # Spécification initiale (partiellement obsolète)
├── docker-compose.yml              # Stack 3 services
├── README.md                       # Ce fichier
├── data/
│   ├── PI_FINALE.pbix              # Source de vérité financier (committed)
│   └── bourse/                     # .xls cours journaliers (gitignored)
├── preduction-scripts/             # Notebooks d'origine Prédiction (référence)
├── serie-temp-scripts/             # Notebooks d'origine Série temporelle (référence)
├── backend/
│   ├── Dockerfile                  # Multi-stage : tsc build + Python venv runtime
│   ├── entrypoint.sh               # Prisma migrate deploy au boot
│   ├── scripts/
│   │   ├── requirements.txt        # Python deps (pbixray, sklearn, statsmodels...)
│   │   ├── extract_pbix.py         # Extraction Power BI Desktop
│   │   ├── predict.py              # ML Ridge/GBM/RF + LOO CV
│   │   └── predict_timeseries.py   # ARIMA + SARIMA + STL
│   ├── prisma/
│   │   ├── schema.prisma           # Modèles app + métier (10 tables)
│   │   ├── seed.ts                 # Users + 4 dashboards de démo
│   │   └── migrations/
│   └── src/
│       ├── index.ts                # Express bootstrap
│       ├── lib/                    # env validation, logger, prisma client
│       ├── middleware/             # auth, rate-limit, upload, errors
│       ├── routes/                 # auth, dashboards, admin
│       └── services/               # business logic (dashboard, user, pbix, prediction...)
└── frontend/
    ├── Dockerfile                  # Multi-stage : vite build + nginx serve
    ├── nginx.conf                  # SPA fallback + proxy /api/
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── components/             # AppShell, Sidebar, BrandMark, ChartCard, etc.
        ├── features/
        │   ├── auth/               # login, RequireAuth, RequireRole
        │   ├── dashboards/         # gallery + 4 views
        │   ├── admin/              # users, dashboards, access matrix, data uploads
        │   └── system/             # 404
        └── lib/                    # api client, chart theme, utils
```
