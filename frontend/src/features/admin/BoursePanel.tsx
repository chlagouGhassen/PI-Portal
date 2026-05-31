import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  FileSpreadsheet,
  Info,
  Loader2,
  Upload,
} from 'lucide-react';

import { BracketBox } from '@/components/BracketBox';
import { cn } from '@/lib/cn';
import {
  useBourseStatus,
  useUploadBourse,
  type BourseEntreprise,
  type BourseFileStatus,
} from './use-bourse';

const ENTREPRISES_ORDER: BourseEntreprise[] = ['EUROCYCLE', 'NBL', 'SAH', 'PLAST'];

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BoursePanel(): JSX.Element {
  const status = useBourseStatus();

  const statusByEntreprise = new Map<BourseEntreprise, BourseFileStatus>();
  for (const s of status.data ?? []) statusByEntreprise.set(s.entreprise, s);

  const allPresent =
    status.data?.length === ENTREPRISES_ORDER.length && status.data.every((s) => s.exists);
  const presentCount = status.data?.filter((s) => s.exists).length ?? 0;

  return (
    <div className="space-y-5">
      {/* Bandeau d'info */}
      <BracketBox className="border border-accent/30 bg-accent/[0.05] p-5">
        <div className="flex items-start gap-3">
          <Info size={16} className="shrink-0 mt-0.5 text-accent" />
          <div className="text-sm leading-relaxed text-slate-200">
            <p className="font-mono text-[10px] uppercase tracking-ultrawide text-accent mb-1.5">
              Données bourse / .xls journaliers
            </p>
            <p className="text-slate-300/85">
              Uploadez les 4 fichiers de cours bourse (format CSV malgré l'extension <code className="font-mono text-accent bg-ink-950 px-1.5 py-0.5 text-xs">.xls</code>) qui alimentent le dashboard <strong>Série temporelle</strong>.
              Le pipeline ARIMA/SARIMA lit ces fichiers à chaque exécution. Le nom est fixe par entreprise — l'upload écrase le fichier précédent.
            </p>
          </div>
        </div>
      </BracketBox>

      {/* Compteur global */}
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 tabular-nums">
          {status.isLoading
            ? 'sync…'
            : `${String(presentCount).padStart(2, '0')}/04 fichiers disponibles`}
        </p>
        {allPresent && (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-signal-good">
            <Check size={11} strokeWidth={2.5} />
            pipeline série temporelle prêt
          </span>
        )}
      </div>

      {/* Grille des 4 entreprises */}
      <div className="grid sm:grid-cols-2 gap-4">
        {ENTREPRISES_ORDER.map((entreprise) => (
          <BourseSlot
            key={entreprise}
            entreprise={entreprise}
            status={statusByEntreprise.get(entreprise)}
            isLoading={status.isLoading}
          />
        ))}
      </div>
    </div>
  );
}

function BourseSlot({
  entreprise,
  status,
  isLoading,
}: {
  entreprise: BourseEntreprise;
  status: BourseFileStatus | undefined;
  isLoading: boolean;
}): JSX.Element {
  const upload = useUploadBourse();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    upload.mutate({ entreprise, file });
  };

  const exists = status?.exists ?? false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative border p-4 transition',
        // Bord gauche signal selon présence
        'border-l-2',
        exists ? 'border-l-signal-good border-ink-700' : 'border-l-signal-warn border-ink-700',
        upload.isPending && 'opacity-80',
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (!upload.isPending) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (upload.isPending) return;
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
      }}
    >
      {/* Header : nom entreprise + statut */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileSpreadsheet size={14} className="text-slate-500 shrink-0" />
          <span className="font-mono text-sm tracking-wider text-slate-100 truncate">
            {entreprise}
          </span>
        </div>
        {isLoading ? (
          <span className="font-mono text-[9px] uppercase tracking-widest text-slate-600">sync</span>
        ) : exists ? (
          <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-signal-good">
            <Check size={10} strokeWidth={3} />
            ok
          </span>
        ) : (
          <span className="font-mono text-[9px] uppercase tracking-widest text-signal-warn">
            absent
          </span>
        )}
      </div>

      {/* Metadata */}
      <div className="space-y-1 font-mono text-[10px] text-slate-500 leading-relaxed mb-4">
        <p className="truncate">
          <span className="text-slate-600">file:</span> {status?.filename ?? '—'}
        </p>
        {exists && (
          <>
            <p>
              <span className="text-slate-600">size:</span>{' '}
              <span className="text-slate-300 tabular-nums">{formatBytes(status?.sizeBytes ?? null)}</span>
            </p>
            <p>
              <span className="text-slate-600">uploaded:</span>{' '}
              <span className="text-slate-300">{formatDate(status?.uploadedAt ?? null)}</span>
            </p>
          </>
        )}
      </div>

      {/* Dropzone / bouton */}
      <input
        ref={inputRef}
        type="file"
        accept=".xls,.csv"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          if (inputRef.current) inputRef.current.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
        className={cn(
          'w-full inline-flex items-center justify-center gap-2 border border-dashed py-2 text-[11px] uppercase tracking-widest font-mono transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed',
          isDragging
            ? 'border-accent bg-accent/10 text-accent'
            : exists
              ? 'border-ink-600 text-slate-400 hover:border-accent/50 hover:text-accent'
              : 'border-accent/40 text-accent hover:bg-accent/[0.06]',
        )}
      >
        {upload.isPending ? (
          <Loader2 size={11} className="animate-spin" />
        ) : (
          <Upload size={11} />
        )}
        {upload.isPending ? 'upload…' : exists ? 'remplacer' : 'uploader'}
      </button>

      {/* Erreur upload */}
      {upload.isError && (
        <motion.div
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-start gap-1.5 border border-signal-bad/40 bg-signal-bad/10 px-2 py-1.5 text-[10px] text-rose-200 font-mono leading-relaxed"
        >
          <AlertTriangle size={10} className="shrink-0 mt-0.5" />
          {upload.error.message}
        </motion.div>
      )}
    </motion.div>
  );
}
