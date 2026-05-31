// Rate-limit en couches :
//   - global : protection DoS basique sur tout /api
//   - sensitive : actions à fort impact (admin, reset-password)
//   - login : déjà défini dans routes/auth.ts (le plus strict)
//
// Important : ces limiteurs comptent par IP. La précision dépend de TRUST_PROXY
// (cf. env.ts) - sans config correcte derrière un reverse proxy, tout le trafic
// apparaît comme venant de 127.0.0.1 et le limiteur devient inutile.

import rateLimit from 'express-rate-limit';

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 300,          // 300 req/min/IP = 5 req/sec - large pour un usage normal
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'TooManyRequests' },
});

export const sensitiveLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 30,               // 30 actions admin / 5 min = ~1 par 10 sec en moyenne
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'TooManyRequests' },
});
