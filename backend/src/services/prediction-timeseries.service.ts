// Bridge Node.js -> script Python predict_timeseries.py.
//
// Pattern identique à prediction.service.ts. Timeout étendu à 120s car le
// SARIMA walk-forward (refit every-10) peut prendre 30-60s sur 10 ans de
// données journalières.

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const SCRIPT_PATH = resolve(process.cwd(), 'scripts/predict_timeseries.py');
const PYTHON_BIN = process.env.PYTHON_BIN ?? resolve(process.cwd(), '.venv/bin/python');
const DATA_DIR = process.env.BOURSE_DATA_DIR ?? resolve(process.cwd(), '..', 'data', 'bourse');
const TIMEOUT_MS = 120_000;

export interface TimeseriesPoint {
  date: string; // ISO YYYY-MM-DD
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
  entreprise: string;
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

export class TimeseriesError extends Error {
  constructor(message: string, public readonly stderr?: string) {
    super(message);
  }
}

export const SUPPORTED_ENTREPRISES = ['EUROCYCLE', 'NBL', 'SAH', 'PLAST'] as const;
export type SupportedEntreprise = (typeof SUPPORTED_ENTREPRISES)[number];

export async function runTimeseries(entreprise: SupportedEntreprise): Promise<TimeseriesResult> {
  const args = [
    SCRIPT_PATH,
    '--entreprise', entreprise,
    '--data-dir', DATA_DIR,
  ];

  const { stdout, stderr, code } = await runPython(args);

  if (code !== 0) {
    let parsedErr: { error?: string } = {};
    try {
      parsedErr = JSON.parse(stderr) as { error?: string };
    } catch {
      /* stderr non-JSON */
    }
    throw new TimeseriesError(
      parsedErr.error ?? `Python exit ${code}`,
      stderr.slice(0, 500),
    );
  }

  try {
    return JSON.parse(stdout) as TimeseriesResult;
  } catch {
    throw new TimeseriesError('Python a renvoyé un JSON invalide', stdout.slice(0, 500));
  }
}

function runPython(
  args: string[],
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(PYTHON_BIN, args, { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      rejectP(new TimeseriesError(`Python timeout (>${TIMEOUT_MS}ms)`));
    }, TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
    child.on('error', (err) => {
      clearTimeout(timer);
      rejectP(new TimeseriesError(`Spawn Python échec: ${err.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolveP({ stdout, stderr, code });
    });
  });
}
