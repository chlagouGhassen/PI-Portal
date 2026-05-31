import 'dotenv/config';
import { z } from 'zod';

const DEFAULT_DEV_JWT = 'change-me-in-production-use-a-long-random-string';

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET doit faire au moins 32 caractères'),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  // SameSite du cookie de session. 'lax' = défaut sûr pour same-origin.
  // 'none' = obligatoire pour cross-origin (frontend / backend domaines
  // différents, ex. Vercel + Render). 'none' EXIGE COOKIE_SECURE=true.
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // Nombre de hops de reverse proxy pour express-rate-limit. 0 = pas de proxy.
  // Derrière nginx/Cloud Run/etc. : généralement 1.
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
});

const parsed = baseSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables d\'environnement invalides:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

// ─── Durcissement en production ────────────────────────────────────────────
if (data.NODE_ENV === 'production') {
  const issues: string[] = [];

  if (data.JWT_SECRET.length < 64) {
    issues.push('JWT_SECRET doit faire au moins 64 caractères en production');
  }
  if (data.JWT_SECRET === DEFAULT_DEV_JWT) {
    issues.push('JWT_SECRET utilise la valeur de dev par défaut - INACCEPTABLE en prod');
  }
  if (!data.COOKIE_SECURE) {
    issues.push('COOKIE_SECURE doit être true en production (HTTPS requis)');
  }
  if (data.CORS_ORIGIN.includes('localhost')) {
    issues.push('CORS_ORIGIN ne devrait pas contenir localhost en production');
  }
  if (data.COOKIE_SAMESITE === 'none' && !data.COOKIE_SECURE) {
    issues.push('COOKIE_SAMESITE=none exige COOKIE_SECURE=true (HTTPS)');
  }

  if (issues.length > 0) {
    console.error('❌ Configuration de production invalide :');
    for (const issue of issues) console.error(`  • ${issue}`);
    process.exit(1);
  }
}

export const env = data;
