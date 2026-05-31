import { useQuery } from '@tanstack/react-query';
import { api, type ApiError } from '@/lib/api';
import type { DashboardSummary } from './types';

export function useDashboards() {
  return useQuery<DashboardSummary[], ApiError>({
    queryKey: ['dashboards'],
    queryFn: () => api<DashboardSummary[]>('/dashboards'),
  });
}
