import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Role } from '@prisma/client';

import { COOKIE_NAME, verifySessionToken } from '../services/auth.service.js';
import { HttpError } from './error-handler.js';

/**
 * requireAuth : lit le cookie de session, vérifie le JWT, attache `req.user`.
 * Renvoie 401 si absent/invalide/expiré. Ne fait AUCUN contrôle de rôle.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) {
    next(new HttpError(401, 'Unauthenticated'));
    return;
  }

  try {
    const payload = verifySessionToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(new HttpError(401, 'Unauthenticated'));
  }
}

/**
 * requireRole : autorise la requête uniquement si l'utilisateur authentifié
 * a l'un des rôles fournis. À utiliser APRÈS requireAuth dans la chaîne.
 *
 * Sémantique stricte : aucune hiérarchie implicite. requireRole('USER') ne
 * laisse PAS passer un ADMIN. Pour autoriser les deux, on liste explicitement :
 * requireRole('ADMIN', 'USER').
 *
 * Codes :
 *   - 401 si req.user absent (= erreur de wiring : requireAuth non appelé avant)
 *   - 403 si le rôle n'est pas dans la liste (= authentifié mais pas autorisé)
 *
 * Usage :
 *   router.post('/users', requireAuth, requireRole('ADMIN'), createUser);
 */
export function requireRole(...allowed: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new HttpError(401, 'Unauthenticated'));
      return;
    }
    if (!allowed.includes(req.user.role)) {
      next(new HttpError(403, 'Forbidden'));
      return;
    }
    next();
  };
}
