// Service "data freshness" : timestamps des dernières mises à jour des
// sources de données (PI_FINALE.pbix import, bourse .xls uploads).
//
// Stratégie : marker file pour le .pbix (écrit après import transactionnel
// réussi), fs.statSync pour les .xls bourse (déjà persistés sur disque).

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { BOURSE_FILES, type BourseEntreprise } from './bourse-storage.service.js';

const DATA_DIR_ROOT =
  process.env.DATA_DIR ?? resolve(process.cwd(), '..', 'data');
const PBIX_MARKER = resolve(DATA_DIR_ROOT, '.pbix-imported-at');
const BOURSE_DIR =
  process.env.BOURSE_DATA_DIR ?? resolve(DATA_DIR_ROOT, 'bourse');

export interface DataFreshness {
  pbix: string | null; // ISO timestamp ou null si jamais importé
  bourse: Record<BourseEntreprise, string | null>;
}

/** Appelé en fin d'importExtractedPbix après commit transactionnel. */
export function markPbixImported(at: Date = new Date()): void {
  mkdirSync(DATA_DIR_ROOT, { recursive: true });
  writeFileSync(PBIX_MARKER, at.toISOString());
}

export function getDataFreshness(): DataFreshness {
  // PBIX : lit le marker file. Si absent → null (jamais importé).
  let pbix: string | null = null;
  if (existsSync(PBIX_MARKER)) {
    try {
      pbix = readFileSync(PBIX_MARKER, 'utf8').trim() || null;
    } catch {
      pbix = null;
    }
  }

  // Bourse : statSync les .xls connus.
  const bourse = {} as Record<BourseEntreprise, string | null>;
  for (const entreprise of Object.keys(BOURSE_FILES) as BourseEntreprise[]) {
    const filename = BOURSE_FILES[entreprise]!;
    const fullPath = resolve(BOURSE_DIR, filename);
    try {
      const stat = statSync(fullPath);
      bourse[entreprise] = stat.mtime.toISOString();
    } catch {
      bourse[entreprise] = null;
    }
  }

  return { pbix, bourse };
}
