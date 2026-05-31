import { Router } from 'express';
import { z } from 'zod';

import { log } from '../lib/logger.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error-handler.js';
import { uploadBourse, uploadPbix } from '../middleware/upload.js';
import {
  BOURSE_FILES,
  listBourseStatus,
  saveBourseFile,
  type BourseEntreprise,
} from '../services/bourse-storage.service.js';
import {
  extractPbixFromBuffer,
  PbixExtractionError,
} from '../services/pbix-extractor.service.js';
import { importExtractedPbix, PbixImportError } from '../services/pbix-import.service.js';
import { extractPbixMetadata } from '../services/pbix.service.js';
import {
  createUser,
  deleteUser,
  listAllAccess,
  listUsers,
  resetPassword,
  updateUser,
} from '../services/user.service.js';

export const adminRouter: Router = Router();

adminRouter.use(requireAuth, requireRole('ADMIN'));

const roleSchema = z.enum(['ADMIN', 'USER']);

const createUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(120),
  role: roleSchema,
  password: z.string().min(8).max(255).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: roleSchema.optional(),
});

const idParam = z.object({ id: z.string().cuid() });

// ─── Users ─────────────────────────────────────────────────────────────────

adminRouter.get('/users', async (_req, res, next) => {
  try {
    res.json(await listUsers());
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    const input = createUserSchema.parse(req.body);
    const result = await createUser(input);
    log.audit('admin.user.create', {
      actorId: req.user.id,
      targetId: result.user.id,
      targetEmail: result.user.email,
      role: result.user.role,
    });
    res.status(201).json(result); // { user, password }
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/users/:id', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    const { id } = idParam.parse(req.params);
    const input = updateUserSchema.parse(req.body);
    const user = await updateUser(id, input, req.user.id);
    log.audit('admin.user.update', {
      actorId: req.user.id,
      targetId: id,
      changes: input,
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/users/:id', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    const { id } = idParam.parse(req.params);
    await deleteUser(id, req.user.id);
    log.audit('admin.user.delete', { actorId: req.user.id, targetId: id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users/:id/reset-password', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    const { id } = idParam.parse(req.params);
    const result = await resetPassword(id);
    log.audit('admin.user.reset-password', { actorId: req.user.id, targetId: id });
    res.json(result); // { password }
  } catch (err) {
    next(err);
  }
});

// ─── Accès (flat liste pour la matrice) ────────────────────────────────────

adminRouter.get('/access', async (_req, res, next) => {
  try {
    res.json(await listAllAccess());
  } catch (err) {
    next(err);
  }
});

// ─── Inspection d'un .pbix (métadonnées uniquement, pas de modif DB) ──────

adminRouter.post('/pbix/inspect', uploadPbix.single('pbix'), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    if (!req.file) throw new HttpError(400, 'NoFileUploaded');
    const metadata = extractPbixMetadata(req.file.buffer);
    log.audit('admin.pbix.inspect', {
      actorId: req.user.id,
      filename: req.file.originalname,
      sizeBytes: req.file.size,
      pages: metadata.pages.length,
      visuals: metadata.totalVisuals,
    });
    res.json(metadata);
  } catch (err) {
    if (err instanceof Error && !(err instanceof HttpError)) {
      next(new HttpError(400, err.message));
      return;
    }
    next(err);
  }
});

// ─── Import automatique des données depuis un .pbix (via Python pbixray) ──
//
// Pipeline : upload .pbix → extraction Python → import transactionnel Prisma.
// Pas de CSV intermédiaire, pas de manipulation manuelle.

adminRouter.post('/pbix/import', uploadPbix.single('pbix'), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    if (!req.file) throw new HttpError(400, 'NoFileUploaded');

    const extracted = await extractPbixFromBuffer(req.file.buffer);
    const summary = await importExtractedPbix(extracted);

    log.audit('admin.pbix.import', {
      actorId: req.user.id,
      filename: req.file.originalname,
      sizeBytes: req.file.size,
      ...summary,
    });
    res.json(summary);
  } catch (err) {
    if (err instanceof PbixExtractionError) {
      next(new HttpError(400, `PbixExtraction: ${err.message}`, err.stderr));
      return;
    }
    if (err instanceof PbixImportError) {
      next(new HttpError(400, `PbixImport: ${err.message}`));
      return;
    }
    next(err);
  }
});

// ─── Données bourse (.xls) — uploads pour le pipeline série temporelle ────

const bourseUploadSchema = z.object({
  entreprise: z.enum(Object.keys(BOURSE_FILES) as [BourseEntreprise, ...BourseEntreprise[]]),
});

adminRouter.get('/bourse/status', (_req, res, next) => {
  try {
    res.json(listBourseStatus());
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/bourse/upload', uploadBourse.single('file'), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthenticated');
    if (!req.file) throw new HttpError(400, 'NoFileUploaded');

    const { entreprise } = bourseUploadSchema.parse(req.body);
    const status = saveBourseFile(entreprise, req.file.buffer);

    log.audit('admin.bourse.upload', {
      actorId: req.user.id,
      entreprise,
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
      storedAs: status.filename,
    });
    res.json(status);
  } catch (err) {
    if (err instanceof Error && !(err instanceof HttpError)) {
      next(new HttpError(400, err.message));
      return;
    }
    next(err);
  }
});
