import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';

import { env } from '../lib/env.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error-handler.js';

export interface JwtPayload {
  sub: string;   // user id
  email: string;
  role: Role;
}

const JWT_EXPIRES_IN = '7d';
export const COOKIE_NAME = 'pi_session';
export const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7j

export function signSessionToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifySessionToken(token: string): JwtPayload {
  // jsonwebtoken throws on invalid/expired - catch côté caller.
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }
  return decoded as JwtPayload;
}

/**
 * Authentifie un user par email+mot de passe.
 * Renvoie toujours la même erreur générique en cas d'échec (ne révèle pas
 * si l'email existe ou si c'est le mot de passe qui est faux - anti-énumération).
 */
export async function authenticate(email: string, password: string): Promise<JwtPayload> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Délai constant : on hashe quand même un mot de passe bidon si l'email
  // n'existe pas, pour éviter qu'un attaquant détecte les emails valides
  // via le temps de réponse.
  const passwordHash = user?.password ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const ok = await bcrypt.compare(password, passwordHash);

  if (!user || !ok) {
    throw new HttpError(401, 'InvalidCredentials');
  }

  return { sub: user.id, email: user.email, role: user.role };
}
