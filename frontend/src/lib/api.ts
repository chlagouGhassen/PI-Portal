/**
 * Normalise la valeur de VITE_API_URL pour gérer tous les cas :
 *  - Vide → fallback "/api" (dev local avec proxy Vite, ou même-origin)
 *  - URL complète "https://foo.com/api" → utilisée telle quelle
 *  - URL complète "https://foo.com" (sans /api) → on ajoute "/api"
 *  - Hostname seul "pi-portal-backend.onrender.com" → préfixe https:// + /api
 *  - Nom de service Render "pi-portal-backend" → https://NOM.onrender.com/api
 */
function resolveApiBase(): string {
  const raw = (import.meta.env.VITE_API_URL ?? '').trim();
  if (!raw) return '/api';

  let base = raw.replace(/\/$/, ''); // strip trailing slash

  // Ajoute le schéma si absent
  if (!base.startsWith('http://') && !base.startsWith('https://')) {
    // Si pas de TLD apparent, assume Render service shortname
    base = base.includes('.') ? https://${base} : https://${base}.onrender.com;
  }

  // S'assure que la base finit par /api
  if (!base.endsWith('/api')) base = ${base}/api;

  return base;
}

export const API_BASE = resolveApiBase();

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(${API_BASE}${path}, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; details?: unknown };
    throw new ApiError(res.status, body.error ?? res.statusText, body.details);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}