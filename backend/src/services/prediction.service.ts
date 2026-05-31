// Bridge Node.js → script Python predict.py.
//
// Spawn la même infra que pbix-extractor mais avec des args CLI au lieu d'un
// fichier temp. Pas de fichier sur disque, juste stdin/stdout/stderr.

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

import { env } from '../lib/env.js';

const SCRIPT_PATH = resolve(process.cwd(), 'scripts/predict.py');
const PYTHON_BIN = process.env.PYTHON_BIN ?? resolve(process.cwd(), '.venv/bin/python');
const TIMEOUT_MS = 30_000; // 30s : le pipeline ML tourne en quelques s sur n=14

export interface PredictionModel {
  name: string;
  r2_cv: number;
  r2_train: number;
  mae: number;
}

export interface PredictionHistoricalRow {
  annee: number;
  ca: number | null;
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

export class PredictionError extends Error {
  constructor(message: string, public readonly stderr?: string) {
    super(message);
  }
}

export async function runPrediction(
  entreprise: string,
  horizon: number,
  excludeLastYear: boolean,
): Promise<PredictionResult> {
  const args = [
    SCRIPT_PATH,
    '--entreprise', entreprise,
    '--horizon', String(horizon),
    '--database-url', env.DATABASE_URL,
  ];
  if (excludeLastYear) args.push('--exclude-last-year');

  const { stdout, stderr, code } = await runPython(args);

  if (code !== 0) {
    // Le script écrit ses erreurs en JSON sur stderr
    let parsedErr: { error?: string } = {};
    try {
      parsedErr = JSON.parse(stderr) as { error?: string };
    } catch {
      /* stderr non-JSON, on garde tel quel */
    }
    throw new PredictionError(
      parsedErr.error ?? `Python exit ${code}`,
      stderr.slice(0, 500),
    );
  }

  try {
    return JSON.parse(stdout) as PredictionResult;
  } catch {
    throw new PredictionError('Python a renvoyé un JSON invalide', stdout.slice(0, 500));
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
      rejectP(new PredictionError(`Python timeout (>${TIMEOUT_MS}ms)`));
    }, TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
    child.on('error', (err) => {
      clearTimeout(timer);
      rejectP(new PredictionError(`Spawn Python échec: ${err.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolveP({ stdout, stderr, code });
    });
  });
}
