// Bridge Node.js → script Python pbixray.
//
// Le .pbix arrive en buffer mémoire (multer). On le persiste dans un fichier
// temporaire (pbixray exige un path), on spawn Python, on capture stdout/stderr,
// on parse, on supprime le temp. Timeout strict pour éviter les blocages.

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT_PATH = resolve(process.cwd(), 'scripts/extract_pbix.py');
const PYTHON_BIN = process.env.PYTHON_BIN ?? resolve(process.cwd(), '.venv/bin/python');
const TIMEOUT_MS = 60_000; // 1 min - un .pbix de 100 Mo prend ~15 s, marge confortable

export interface ExtractedTable {
  columns: string[];
  rowCount: number;
  rows: Record<string, unknown>[];
}

export interface ExtractedRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface ExtractedPbix {
  tables: Record<string, ExtractedTable | { error: string }>;
  relationships: ExtractedRelationship[];
}

export class PbixExtractionError extends Error {
  constructor(message: string, public readonly stderr?: string) {
    super(message);
  }
}

export async function extractPbixFromBuffer(buffer: Buffer): Promise<ExtractedPbix> {
  const tmp = mkdtempSync(join(tmpdir(), 'pbix-'));
  const pbixPath = join(tmp, 'upload.pbix');
  writeFileSync(pbixPath, buffer);

  try {
    const { stdout, stderr, code } = await runPython(SCRIPT_PATH, pbixPath);

    if (code !== 0) {
      throw new PbixExtractionError(
        `Python extraction failed (exit ${code})`,
        stderr || stdout.slice(0, 500),
      );
    }

    let parsed: ExtractedPbix;
    try {
      parsed = JSON.parse(stdout) as ExtractedPbix;
    } catch {
      throw new PbixExtractionError('Python returned invalid JSON', stdout.slice(0, 500));
    }

    return parsed;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function runPython(
  scriptPath: string,
  pbixPath: string,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(PYTHON_BIN, [scriptPath, pbixPath], { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      rejectP(new PbixExtractionError(`Python timeout (>${TIMEOUT_MS}ms)`));
    }, TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
    child.on('error', (err) => {
      clearTimeout(timer);
      rejectP(new PbixExtractionError(`Failed to spawn Python: ${err.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolveP({ stdout, stderr, code });
    });
  });
}
