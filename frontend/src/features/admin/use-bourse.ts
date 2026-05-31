[17:06, 31/05/2026] Hama: import { useMutation, useQueryClient } from '@tanstack/react-query';

import { API_BASE, ApiError } from '@/lib/api';

export interface PageMeta {
  id: string;
  displayName: string;
  visualCount: number;
  visualTypes: Record<string, number>;
}

export interface PbixMetadata {
  pages: PageMeta[];
  tables: string[];
  columns: string[];
  visualTypeCounts: Record<string, number>;
  customVisuals: string[];
  totalVisuals: number;
}

export interface ImportSummary {
  dimEntreprise: number;
  dimTemps: number;
  dimBilan: number;
  dimResultat: number;
  dimRatios: number;
  factPerformance: number;
  skippedOrphans: number;
}

async function uploadFile<T>(path: string, fieldName: string, file: File): Promise<T> {
  const formData = new FormData();
  form…
[17:06, 31/05/2026] Hama: import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, API_BASE, ApiError } from '@/lib/api';

export type BourseEntreprise = 'EUROCYCLE' | 'NBL' | 'SAH' | 'PLAST';

export interface BourseFileStatus {
  entreprise: BourseEntreprise;
  filename: string;
  exists: boolean;
  sizeBytes: number | null;
  uploadedAt: string | null;
}

export function useBourseStatus() {
  return useQuery<BourseFileStatus[], ApiError>({
    queryKey: ['admin', 'bourse', 'status'],
    queryFn: () => api<BourseFileStatus[]>('/admin/bourse/status'),
  });
}

export function useUploadBourse() {
  const qc = useQueryClient();
  return useMutation<BourseFileStatus, ApiError, { entreprise: BourseEntreprise; file: File }>({
    mutationFn: async ({ entreprise, file }) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('entreprise', entreprise);
      const res = await fetch(${API_BASE}/admin/bourse/upload, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new ApiError(res.status, body.error ?? res.statusText);
      }
      return (await res.json()) as BourseFileStatus;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bourse', 'status'] });
    },
  });
}