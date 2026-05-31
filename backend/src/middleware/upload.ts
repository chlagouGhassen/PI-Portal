// Multer en mémoire pour l'upload de .pbix par l'admin.
// Le fichier est traité par le pipeline Python (pbixray) puis libéré.

import multer, { type Multer } from 'multer';

const PBIX_MAX_BYTES = 100 * 1024 * 1024; // 100 MiB - large pour les .pbix riches
const BOURSE_MAX_BYTES = 10 * 1024 * 1024; // 10 MiB - largement assez pour 10 ans de cours journaliers

export const uploadPbix: Multer = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PBIX_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.pbix')) {
      cb(new Error('Fichier attendu : .pbix'));
      return;
    }
    cb(null, true);
  },
});

// Pour les .xls bourse : mémoire (on les écrit sur disque dans le handler après
// avoir validé l'entreprise cible — évite multer disk-storage qui exigerait
// de connaître le chemin AVANT de parser le body).
export const uploadBourse: Multer = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: BOURSE_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const lower = file.originalname.toLowerCase();
    if (!lower.endsWith('.xls') && !lower.endsWith('.csv')) {
      cb(new Error('Fichier attendu : .xls ou .csv'));
      return;
    }
    cb(null, true);
  },
});
