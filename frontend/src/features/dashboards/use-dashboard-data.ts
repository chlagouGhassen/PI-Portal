import { useQuery } from '@tanstack/react-query';
import { api, type ApiError } from '@/lib/api';

export interface PerformanceRow {
  factId: number;
  entrepriseId: number;
  entrepriseNom: string;
  annee: number;
  periodeLabel: string | null;

  totalActif: number | null;
  capitauxPropres: number | null;
  bfr: number | null;

  chiffreAffaires: number | null;
  resultatNet: number | null;
  ebit: number | null;

  roe: number | null;
  roa: number | null;
  roce: number | null;
  margeNette: number | null;
  margeBrute: number | null;

  currentRatio: number | null;
  tauxEndettement: number | null;
  autonomieFinanciere: number | null;
}

export function useDashboardData(slug: string | undefined) {
  return useQuery<{ rows: PerformanceRow[] }, ApiError>({
    queryKey: ['dashboard-data', slug],
    queryFn: () => api(`/dashboards/${slug}/data`),
    enabled: !!slug,
  });
}
