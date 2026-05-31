import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { env } from './lib/env.js';
import { log } from './lib/logger.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { globalLimiter, sensitiveLimiter } from './middleware/rate-limit.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { dashboardsRouter } from './routes/dashboards.js';
import { healthRouter } from './routes/health.js';

const app = express();

// Trust proxy : indispensable derrière nginx / Cloud Run / etc. pour que
// `req.ip` et express-rate-limit voient la VRAIE IP du client (via X-Forwarded-For).
// 0 en local, 1 derrière un reverse proxy, N pour N hops.
app.set('trust proxy', env.TRUST_PROXY);

app.use(
  helmet({
    // L'app sert du JSON uniquement (le frontend est servi ailleurs en prod).
    // CSP n'a aucun effet sur des réponses JSON ; on garde le défaut helmet.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // HSTS : 1 an, includeSubDomains. Effectif uniquement sur HTTPS.
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: false, // mettre true uniquement si le domaine est dans la liste HSTS de Chromium
    },
  }),
);
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

// Body parser avec limite stricte. Les payloads attendus (login, création user,
// CRUD dashboard) ne dépassent jamais quelques KB. 256kb = très large marge.
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

// Logs HTTP. Morgan -> stdout via le logger structuré.
const morganFormat = env.NODE_ENV === 'development' ? 'dev' : 'combined';
if (env.NODE_ENV !== 'test') {
  app.use(
    morgan(morganFormat, {
      stream: { write: (msg) => process.stdout.write(msg) },
    }),
  );
}

// Health hors rate-limit (utile pour les probes Kubernetes/Cloud Run).
app.use('/api/health', healthRouter);

// Rate-limit global sur l'API ensuite.
app.use('/api', globalLimiter);

app.use('/api/auth', authRouter);
app.use('/api/dashboards', dashboardsRouter);
app.use('/api/admin', sensitiveLimiter, adminRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, () => {
  log.info('server.ready', {
    port: env.PORT,
    env: env.NODE_ENV,
    trustProxy: env.TRUST_PROXY,
    corsOrigin: env.CORS_ORIGIN,
  });
});
