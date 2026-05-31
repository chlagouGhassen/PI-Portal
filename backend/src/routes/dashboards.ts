import { Router } from 'express';
import { z } from 'zod';

import { log } from '../lib/logger.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error-handler.js';
import {
  createDashboard,
  deleteDashboard,
  getDashboardForUser,
  grantAccess,
  listAccessForDashboard,
  listDashboardsForUser,
  revokeAccess,
  updateDashboard,
} from '../services/dashboard.service.js';
import { getDashboardData } from '../services/dashboard-data.service.js';
import { getDataFreshness } from '../services/data-freshness.service.js';
import { PredictionError, runPrediction } from '../services/prediction.service.js';
import {
  SUPPORTED_ENTREPRISES,
  TimeseriesError,
  runTimeseries,
  type SupportedEntreprise,
} from '../services/prediction-timeseries.service.js';

export const dashboardsRouter: Router = Router();

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createSchema = z.object({
  slug: z.string().min(2).max(80).regex(slugRegex, 'kebab-case lowercase'),
  title: z.string().min(1).max(120),
  description: z.string().max(500).nullish(),
  category: z.string().max(80).nullish(),
});

const updateSchema = createSchema.partial();

const idParam = z.object({ id: z.string().cuid() });
const slugParam = z.object({ slug: z.string().min(1).max(80) });
const grantSchema = z.object({ userId: z.string().cuid() });

const predictionSchema = z.object({
  entrepriseNom: z.string().min(1).max(100),
  horizon: z.number().int().min(1).max(10),
  excludeLastYear: z.boolean().default(false),
});

const timeseriesSchema = z.object({
  entreprise: z.enum(SUPPORTED_ENTREPRISES),
});

// ─── Toutes les routes nécessitent au minimum d'être authentifié ──────────
dashboardsRouter.use(requireAuth);

// ─── Freshness : timestamps des dernières mises à jour des sources ────────
dashboardsRouter.get('/data-freshness', (_req, res, next) => {
  try {
    res.json(getDataFreshness());
  } catch (err) {
    next(err);
  }
});

// ─── Liste filtrée (ADMIN ou USER) ─────────────────────────────────────────
dashboardsRouter.get('/', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    const dashboards = await listDashboardsForUser(req.user.id, req.user.role);
    res.json(dashboards);
  } catch (err) {
    next(err);
  }
});

// ─── Détail (par slug, vérifie l'accès) ────────────────────────────────────
dashboardsRouter.get('/:slug', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    const { slug } = slugParam.parse(req.params);
    const dashboard = await getDashboardForUser(slug, req.user.id, req.user.role);
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
});

// ─── Données métier d'un dashboard ─────────────────────────────────────────
dashboardsRouter.get('/:slug/data', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    const { slug } = slugParam.parse(req.params);
    const data = await getDashboardData(slug, req.user.id, req.user.role);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── Pipeline série temporelle (slug: serie-temporelle) ───────────────────
dashboardsRouter.post('/serie-temporelle/run', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    await getDashboardForUser('serie-temporelle', req.user.id, req.user.role);

    const { entreprise } = timeseriesSchema.parse(req.body);
    const t0 = Date.now();
    const result = await runTimeseries(entreprise as SupportedEntreprise);
    log.audit('dashboard.timeseries.run', {
      userId: req.user.id,
      entreprise,
      bestModel: result.bestModel,
      durationMs: Date.now() - t0,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof TimeseriesError) {
      next(new HttpError(400, `Timeseries: ${err.message}`, err.stderr));
      return;
    }
    next(err);
  }
});

// ─── Pipeline de prédiction CA (slug: prediction) ──────────────────────────
// L'accès au dashboard est vérifié AVANT de lancer le subprocess Python
// (évite de gaspiller des ressources sur un user non autorisé).
dashboardsRouter.post('/prediction/run', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    // Vérif que l'user a accès au dashboard "prediction" — 404 si pas autorisé
    await getDashboardForUser('prediction', req.user.id, req.user.role);

    const { entrepriseNom, horizon, excludeLastYear } = predictionSchema.parse(req.body);
    const t0 = Date.now();
    const result = await runPrediction(entrepriseNom, horizon, excludeLastYear);
    log.audit('dashboard.prediction.run', {
      userId: req.user.id,
      entrepriseNom,
      horizon,
      excludeLastYear,
      bestModel: result.bestModel,
      durationMs: Date.now() - t0,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof PredictionError) {
      next(new HttpError(400, `Prediction: ${err.message}`, err.stderr));
      return;
    }
    next(err);
  }
});

// ─── CRUD admin ────────────────────────────────────────────────────────────
dashboardsRouter.post('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const dashboard = await createDashboard(input);
    res.status(201).json(dashboard);
  } catch (err) {
    next(err);
  }
});

dashboardsRouter.put('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const input = updateSchema.parse(req.body);
    const dashboard = await updateDashboard(id, input);
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
});

dashboardsRouter.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    await deleteDashboard(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ─── Gestion des accès (admin) ─────────────────────────────────────────────
dashboardsRouter.get('/:id/access', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const access = await listAccessForDashboard(id);
    res.json(access);
  } catch (err) {
    next(err);
  }
});

dashboardsRouter.post('/:id/access', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { userId } = grantSchema.parse(req.body);
    await grantAccess(id, userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

dashboardsRouter.delete('/:id/access/:userId', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const params = z
      .object({ id: z.string().cuid(), userId: z.string().cuid() })
      .parse(req.params);
    await revokeAccess(params.id, params.userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
