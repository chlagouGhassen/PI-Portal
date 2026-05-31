// Logger structuré minimaliste : JSON one-line vers stdout (info) / stderr (warn, error).
// Compatible avec n'importe quel agrégateur de logs (Loki, Datadog, CloudWatch).
//
// Choix : pas de dépendance externe (pino, winston) pour rester léger. Si le
// besoin évolue (sampling, transports multiples), pino reste l'option naturelle.

import { env } from './env.js';

type Level = 'info' | 'warn' | 'error' | 'audit';

interface LogFields {
  event: string;
  [key: string]: unknown;
}

function emit(level: Level, fields: LogFields): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    ...fields,
  };
  const stream = level === 'info' || level === 'audit' ? process.stdout : process.stderr;
  // En dev, format lisible. En prod, JSON pur pour l'agrégation.
  if (env.NODE_ENV === 'development') {
    const { ts, event, ...rest } = payload;
    const tag = level === 'audit' ? '[AUDIT]' : `[${level.toUpperCase()}]`;
    stream.write(`${ts} ${tag} ${event} ${Object.keys(rest).length > 1 ? JSON.stringify(rest) : ''}\n`);
  } else {
    stream.write(`${JSON.stringify(payload)}\n`);
  }
}

export const log = {
  info: (event: string, meta: Record<string, unknown> = {}) => emit('info', { event, ...meta }),
  warn: (event: string, meta: Record<string, unknown> = {}) => emit('warn', { event, ...meta }),
  error: (event: string, meta: Record<string, unknown> = {}) => emit('error', { event, ...meta }),
  /**
   * Événement d'audit : action sensible (auth, admin, accès). Toujours loggué,
   * jamais filtré, niveau dédié pour faciliter le grep / les rétentions séparées.
   */
  audit: (event: string, meta: Record<string, unknown> = {}) => emit('audit', { event, ...meta }),
};
