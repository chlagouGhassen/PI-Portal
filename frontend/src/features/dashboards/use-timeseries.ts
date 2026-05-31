import { useMutation } from '@tanstack/react-query';
import { api, type ApiError } from '@/lib/api';

export const SUPPORTED_ENTREPRISES = ['EUROCYCLE', 'NBL', 'SAH', 'PLAST'] as const;
export type SupportedEntreprise = (typeof SUPPORTED_ENTREPRISES)[number];

export interface TimeseriesPoint {
  date: string;
  value: number | null;
}

export interface AdfResult {
  adf: number | null;
  pvalue: number | null;
  isStationary: boolean;
  n: number;
}

export interface TimeseriesModel {
  name: string;
  rmse: number;
  mae: number;
  mape: number | null;
}

export interface TimeseriesDecomposition {
  trend: TimeseriesPoint[];
  seasonal: TimeseriesPoint[];
  residual: TimeseriesPoint[];
}

export interface TimeseriesResult {
  entreprise: SupportedEntreprise;
  dataSource: string;
  dateRange: { start: string; end: string; nObservations: number };
  split: { trainEnd: string; testStart: string; trainSize: number; testSize: number };
  stationarity: { original: AdfResult; differenced: AdfResult };
  decomposition: TimeseriesDecomposition | null;
  train: TimeseriesPoint[];
  test: TimeseriesPoint[];
  arimaPredictions: TimeseriesPoint[];
  sarimaPredictions: TimeseriesPoint[];
  models: TimeseriesModel[];
  bestModel: 'ARIMA' | 'SARIMA';
}

export function useRunTimeseries() {
  return useMutation<TimeseriesResult, ApiError, { entreprise: SupportedEntreprise }>({
    mutationFn: (input) =>
      api<TimeseriesResult>('/dashboards/serie-temporelle/run', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  });
}
