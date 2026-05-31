import type { Dashboard, Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error-handler.js';

export interface DashboardSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
}

/**
 * Liste les dashboards visibles par un utilisateur.
 *
 * Règle critique (cf. CLAUDE.md) :
 *   - ADMIN : voit TOUS les dashboards.
 *   - USER  : voit UNIQUEMENT ceux liés via DashboardAccess.
 * Filtrage côté serveur - jamais se reposer sur le masquage UI.
 */
export async function listDashboardsForUser(
  userId: string,
  role: Role,
): Promise<DashboardSummary[]> {
  const where =
    role === 'ADMIN'
      ? undefined
      : { access: { some: { userId } } };

  return prisma.dashboard.findMany({
    where,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      category: true,
    },
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
  });
}

/**
 * Vérifie qu'un utilisateur a accès à un dashboard donné, puis le renvoie.
 * Renvoie 404 si le dashboard n'existe pas OU si l'utilisateur n'y a pas accès
 * (pas 403 - on ne révèle pas l'existence d'un dashboard auquel on n'a pas droit).
 */
export async function getDashboardForUser(
  slug: string,
  userId: string,
  role: Role,
): Promise<Dashboard> {
  const dashboard = await prisma.dashboard.findUnique({ where: { slug } });
  if (!dashboard) throw new HttpError(404, 'NotFound');

  if (role !== 'ADMIN') {
    const access = await prisma.dashboardAccess.findUnique({
      where: { userId_dashboardId: { userId, dashboardId: dashboard.id } },
    });
    if (!access) throw new HttpError(404, 'NotFound');
  }

  return dashboard;
}

// ─── CRUD admin ─────────────────────────────────────────────────────────────

export interface DashboardInput {
  slug: string;
  title: string;
  description?: string | null;
  category?: string | null;
}

export async function createDashboard(input: DashboardInput): Promise<Dashboard> {
  try {
    return await prisma.dashboard.create({ data: input });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new HttpError(409, 'SlugAlreadyExists');
    }
    throw err;
  }
}

export async function updateDashboard(id: string, input: Partial<DashboardInput>): Promise<Dashboard> {
  try {
    return await prisma.dashboard.update({ where: { id }, data: input });
  } catch (err) {
    if (isNotFoundError(err)) throw new HttpError(404, 'NotFound');
    if (isUniqueConstraintError(err)) throw new HttpError(409, 'SlugAlreadyExists');
    throw err;
  }
}

export async function deleteDashboard(id: string): Promise<void> {
  try {
    await prisma.dashboard.delete({ where: { id } });
  } catch (err) {
    if (isNotFoundError(err)) throw new HttpError(404, 'NotFound');
    throw err;
  }
}

// ─── Gestion des accès ──────────────────────────────────────────────────────

export async function grantAccess(dashboardId: string, userId: string): Promise<void> {
  try {
    await prisma.dashboardAccess.upsert({
      where: { userId_dashboardId: { userId, dashboardId } },
      update: {},
      create: { userId, dashboardId },
    });
  } catch (err) {
    if (isForeignKeyError(err)) throw new HttpError(404, 'NotFound');
    throw err;
  }
}

export async function revokeAccess(dashboardId: string, userId: string): Promise<void> {
  try {
    await prisma.dashboardAccess.delete({
      where: { userId_dashboardId: { userId, dashboardId } },
    });
  } catch (err) {
    if (isNotFoundError(err)) throw new HttpError(404, 'NotFound');
    throw err;
  }
}

export async function listAccessForDashboard(
  dashboardId: string,
): Promise<{ userId: string; email: string; name: string; grantedAt: Date }[]> {
  const rows = await prisma.dashboardAccess.findMany({
    where: { dashboardId },
    select: {
      userId: true,
      grantedAt: true,
      user: { select: { email: true, name: true } },
    },
  });
  return rows.map((r) => ({
    userId: r.userId,
    email: r.user.email,
    name: r.user.name,
    grantedAt: r.grantedAt,
  }));
}

// ─── Helpers d'erreur Prisma ────────────────────────────────────────────────

function isPrismaError(err: unknown, code: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === code
  );
}
function isUniqueConstraintError(err: unknown): boolean { return isPrismaError(err, 'P2002'); }
function isNotFoundError(err: unknown): boolean { return isPrismaError(err, 'P2025'); }
function isForeignKeyError(err: unknown): boolean { return isPrismaError(err, 'P2003'); }
