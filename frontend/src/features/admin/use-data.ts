import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

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
  formData.append(fieldName, file);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; details?: unknown };
    throw new ApiError(res.status, body.error ?? res.statusText, body.details);
  }
  return (await res.json()) as T;
}

export function useInspectPbix() {
  return useMutation<PbixMetadata, ApiError, File>({
    mutationFn: (file) => uploadFile<PbixMetadata>('/admin/pbix/inspect', 'pbix', file),
  });
}

export function useImportPbix() {
  const qc = useQueryClient();
  return useMutation<ImportSummary, ApiError, File>({
    mutationFn: (file) => uploadFile<ImportSummary>('/admin/pbix/import', 'pbix', file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
  });
}
