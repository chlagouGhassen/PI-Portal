// Stockage des fichiers bourse (.xls) sur disque + métadonnées via stat().
//
// Convention : data/bourse/<filename> au project root, mêmes noms que ceux
// référencés dans les notebooks d'origine (avec l'espace avant "bourse.xls").
// Le service Python predict_timeseries lit ce dossier via env BOURSE_DATA_DIR.

import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Map entreprise -> nom de fichier exact (matche le script Python)
export const BOURSE_FILES: Record<string, string> = {
  EUROCYCLE: 'EUROCYCLES_stock bourse.xls',
  NBL: 'NBL_stock bourse.xls',
  SAH: 'SAH_stock bourse.xls',
  PLAST: 'PLAST_stock bourse.xls',
};

export type BourseEntreprise = keyof typeof BOURSE_FILES;

const DATA_DIR =
  process.env.BOURSE_DATA_DIR ?? resolve(process.cwd(), '..', 'data', 'bourse');

export interface BourseFileStatus {
  entreprise: BourseEntreprise;
  filename: string;
  exists: boolean;
  sizeBytes: number | null;
  uploadedAt: string | null; // ISO mtime
}

function ensureDir(): void {
  mkdirSync(DATA_DIR, { recursive: true });
}

export function listBourseStatus(): BourseFileStatus[] {
  ensureDir();
  return (Object.keys(BOURSE_FILES) as BourseEntreprise[]).map((entreprise) => {
    const filename = BOURSE_FILES[entreprise]!;
    const fullPath = resolve(DATA_DIR, filename);
    try {
      const stat = statSync(fullPath);
      return {
        entreprise,
        filename,
        exists: true,
        sizeBytes: stat.size,
        uploadedAt: stat.mtime.toISOString(),
      };
    } catch {
      return { entreprise, filename, exists: false, sizeBytes: null, uploadedAt: null };
    }
  });
}

/**
 * Écrit le buffer dans data/bourse/<filename> selon l'entreprise.
 * Écrase l'existant. Renvoie le statut post-upload pour réponse client.
 */
export function saveBourseFile(
  entreprise: BourseEntreprise,
  buffer: Buffer,
): BourseFileStatus {
  ensureDir();
  const filename = BOURSE_FILES[entreprise];
  if (!filename) throw new Error(`Entreprise inconnue : ${entreprise}`);
  const fullPath = resolve(DATA_DIR, filename);
  writeFileSync(fullPath, buffer);
  const stat = statSync(fullPath);
  return {
    entreprise,
    filename,
    exists: true,
    sizeBytes: stat.size,
    uploadedAt: stat.mtime.toISOString(),
  };
}
