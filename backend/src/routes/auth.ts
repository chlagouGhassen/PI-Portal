import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { env } from '../lib/env.js';
import { log } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import {
  COOKIE_MAX_AGE_MS,
  COOKIE_NAME,
  authenticate,
  signSessionToken,
} from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error-handler.js';

export const authRouter: Router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'TooManyRequests' },
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(255),
});

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  const attemptedEmail = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : 'unknown';
  try {
    const { email, password } = loginSchema.parse(req.body);
    const payload = await authenticate(email, password);
    const token = signSessionToken(payload);

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAMESITE,
      maxAge: COOKIE_MAX_AGE_MS,
      path: '/',
    });

    log.audit('auth.login.success', { userId: payload.sub, email: payload.email, ip: req.ip });
    res.json({ id: payload.sub, email: payload.email, role: payload.role });
  } catch (err) {
    if (err instanceof HttpError && err.status === 401) {
      log.audit('auth.login.failure', { email: attemptedEmail, ip: req.ip, reason: 'InvalidCredentials' });
    }
    next(err);
  }
});

authRouter.post('/logout', requireAuth, (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  if (req.user) log.audit('auth.logout', { userId: req.user.id, ip: req.ip });
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) throw new HttpError(401, 'Unauthenticated');
    res.json(user);
  } catch (err) {
    next(err);
  }
});
