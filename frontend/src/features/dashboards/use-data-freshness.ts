import { useQuery } from '@tanstack/react-query';
import { api, type ApiError } from '@/lib/api';

export type BourseEntreprise = 'EUROCYCLE' | 'NBL' | 'SAH' | 'PLAST';

export interface DataFreshness {
  pbix: string | null;
  bourse: Record<BourseEntreprise, string | null>;
}

export function useDataFreshness() {
  return useQuery<DataFreshness, ApiError>({
    queryKey: ['dashboards', 'data-freshness'],
    queryFn: () => api<DataFreshness>('/dashboards/data-freshness'),
    refetchInterval: 60_000, // refresh chaque minute
    staleTime: 30_000,
  });
}

/**
 * Helper de formatage : "il y a 2 heures" / "le 30 mai 2026 à 18:42".
 * < 1 min → "à l'instant" / < 60 min → "il y a Nmin" / < 24h → "il y a Nh" / sinon date complète.
 */
export function formatRelative(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  const now = Date.now();
  const deltaMs = now - then.getTime();
  if (deltaMs < 60_000) return "à l'instant";
  const deltaMin = Math.floor(deltaMs / 60_000);
  if (deltaMin < 60) return `il y a ${deltaMin} min`;
  const deltaH = Math.floor(deltaMin / 60);
  if (deltaH < 24) return `il y a ${deltaH} h`;
  const deltaD = Math.floor(deltaH / 24);
  if (deltaD < 7) return `il y a ${deltaD} j`;
  // Au-delà : date absolue
  return then.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
