import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import type { Role, User } from '@prisma/client';

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error-handler.js';

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
  accessCount: number;
}

export async function listUsers(): Promise<UserSummary[]> {
  const rows = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      _count: { select: { access: true } },
    },
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
  });
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    createdAt: r.createdAt,
    accessCount: r._count.access,
  }));
}

export interface CreateUserInput {
  email: string;
  name: string;
  role: Role;
  password?: string;
}

/** Génère un mot de passe alphanumérique de 12 caractères (~72 bits d'entropie). */
export function generatePassword(): string {
  return randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12);
}

export async function createUser(
  input: CreateUserInput,
): Promise<{ user: Omit<User, 'password'>; password: string }> {
  const password = input.password ?? generatePassword();
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const created = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        role: input.role,
        password: passwordHash,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
    return { user: created as Omit<User, 'password'>, password };
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new HttpError(409, 'EmailAlreadyExists');
    }
    throw err;
  }
}

export interface UpdateUserInput {
  name?: string;
  role?: Role;
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  actingUserId: string,
): Promise<Omit<User, 'password'>> {
  // Self-protection : un admin ne peut pas se rétrograder lui-même. Il doit
  // demander à un autre admin (ou être supprimé par lui).
  if (id === actingUserId && input.role && input.role !== 'ADMIN') {
    throw new HttpError(400, 'CannotDemoteSelf');
  }

  try {
    return (await prisma.user.update({
      where: { id },
      data: input,
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    })) as Omit<User, 'password'>;
  } catch (err) {
    if (isNotFoundError(err)) throw new HttpError(404, 'NotFound');
    throw err;
  }
}

export async function deleteUser(id: string, actingUserId: string): Promise<void> {
  if (id === actingUserId) {
    throw new HttpError(400, 'CannotDeleteSelf');
  }
  try {
    await prisma.user.delete({ where: { id } });
  } catch (err) {
    if (isNotFoundError(err)) throw new HttpError(404, 'NotFound');
    throw err;
  }
}

/** Réinitialise le mot de passe d'un user et renvoie le nouveau en clair (à montrer une fois). */
export async function resetPassword(id: string): Promise<{ password: string }> {
  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await prisma.user.update({ where: { id }, data: { password: passwordHash } });
    return { password };
  } catch (err) {
    if (isNotFoundError(err)) throw new HttpError(404, 'NotFound');
    throw err;
  }
}

/** Liste plate des tuples (userId, dashboardId) pour construire la matrice d'accès. */
export async function listAllAccess(): Promise<{ userId: string; dashboardId: string }[]> {
  return prisma.dashboardAccess.findMany({ select: { userId: true, dashboardId: true } });
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
