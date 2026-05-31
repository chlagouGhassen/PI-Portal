import { useMutation } from '@tanstack/react-query';
import { api, type ApiError } from '@/lib/api';

export interface PredictionModel {
  name: string;
  r2_cv: number;
  r2_train: number;
  mae: number;
}

export interface PredictionHistoricalRow {
  annee: number;
  ca: number | null;
  // features dynamiques, le backend en renvoie 7
  [feature: string]: number | null;
}

export interface PredictionFutureRow {
  annee: number;
  caPredicted: number;
  caLower: number;
  caUpper: number;
}

export interface PredictionResult {
  entreprise: string;
  yearRange: { min: number; max: number };
  excludedYear: number | null;
  features: string[];
  target: string;
  historical: PredictionHistoricalRow[];
  predictions: PredictionFutureRow[];
  models: PredictionModel[];
  bestModel: string;
}

export interface PredictionInput {
  entrepriseNom: string;
  horizon: number;
  excludeLastYear: boolean;
}

export function useRunPrediction() {
  return useMutation<PredictionResult, ApiError, PredictionInput>({
    mutationFn: (input) =>
      api<PredictionResult>('/dashboards/prediction/run', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  });
}
