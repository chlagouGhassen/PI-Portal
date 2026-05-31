import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Info,
  Layers,
  Upload,
} from 'lucide-react';

import { BracketBox } from '@/components/BracketBox';
import { BoursePanel } from './BoursePanel';
import { FileDropzone } from './FileDropzone';
import {
  useImportPbix,
  useInspectPbix,
  type ImportSummary,
  type PbixMetadata,
} from './use-data';

export function DataPanel(): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const inspect = useInspectPbix();
  const importPbix = useImportPbix();

  const onChangeFile = (f: File | null) => {
    setFile(f);
    inspect.reset();
    importPbix.reset();
  };

  return (
    <div className="space-y-6">
      {/* Banner editorial */}
      <BracketBox className="border border-accent/30 bg-accent/[0.05] p-5">
        <div className="flex items-start gap-3">
          <Info size={16} className="shrink-0 mt-0.5 text-accent" />
          <div className="text-sm leading-relaxed text-slate-200">
            <p className="font-mono text-[10px] uppercase tracking-ultrawide text-accent mb-1.5">
              Pipeline / pbixray → postgres
            </p>
            <p className="text-slate-300/85">
              Uploadez votre fichier <code className="font-mono text-accent bg-ink-950 px-1.5 py-0.5 text-xs">.pbix</code>. Un script
              Python (pbixray) le décompresse - y compris le DataModel compressé en XPress9 - extrait
              toutes les tables et toutes les lignes, puis le backend les importe dans Postgres en
              une transaction unique avec rollback si erreur.
            </p>
          </div>
        </div>
      </BracketBox>

      {/* Dropzone */}
      <FileDropzone
        accept=".pbix"
        label="Déposez votre fichier .pbix ou cliquez pour sélectionner"
        helper="Limite 100 MB · utilisé pour l'inspection ET l'import"
        file={file}
        onChange={onChangeFile}
        disabled={inspect.isPending || importPbix.isPending}
      />

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => file && inspect.mutate(file)}
          disabled={!file || inspect.isPending || importPbix.isPending}
          className="btn-ghost text-xs uppercase tracking-widest font-mono"
        >
          <FileSearch size={12} />
          {inspect.isPending ? 'lecture…' : 'inspecter'}
        </button>
        <button
          onClick={() => file && importPbix.mutate(file)}
          disabled={!file || inspect.isPending || importPbix.isPending}
          className="btn-primary text-xs uppercase tracking-widest font-mono"
        >
          <Upload size={12} />
          {importPbix.isPending ? 'import…' : 'lancer l\'import'}
        </button>
      </div>

      {/* Avertissement */}
      <div className="flex items-start gap-2.5 border border-signal-bad/30 bg-signal-bad/5 px-4 py-3 text-xs text-rose-200/85 font-mono leading-relaxed">
        <AlertTriangle size={12} className="shrink-0 mt-0.5 text-signal-bad" />
        <p>
          <span className="font-semibold text-rose-200 uppercase tracking-widest text-[10px]">truncate + insert</span> · les
          6 tables métier seront remplacées intégralement. Rollback automatique si une ligne casse.
        </p>
      </div>

      {/* Résultats */}
      {inspect.isError && <ErrorBanner message={inspect.error.message} />}
      {importPbix.isError && <ErrorBanner message={importPbix.error.message} />}
      {inspect.data && <PbixMetadataView metadata={inspect.data} />}
      {importPbix.data && <ImportSummaryView summary={importPbix.data} />}

      {/* Séparateur visuel + section bourse */}
      <div className="pt-8 mt-4 border-t border-ink-700/60 space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-ultrawide text-accent/70">
          Section 2 / Cours bourse journalier
        </p>
        <p className="font-mono text-[10px] tracking-widest text-slate-600">
          // données utilisées par le dashboard Série temporelle
        </p>
      </div>
      <BoursePanel />
    </div>
  );
}

function PbixMetadataView({ metadata }: { metadata: PbixMetadata }): JSX.Element {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'pages', value: metadata.pages.length },
          { label: 'visuels', value: metadata.totalVisuals },
          { label: 'tables', value: metadata.tables.length },
          { label: 'colonnes', value: metadata.columns.length },
        ].map((s) => (
          <div key={s.label} className="border border-ink-700 bg-ink-900/40 p-3 border-l-2 border-l-accent">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{s.label}</p>
            <p className="display-xl text-3xl text-slate-50 tabular-nums mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <BracketBox className="border border-ink-700 bg-ink-900/40 p-5">
        <h3 className="font-mono text-[10px] uppercase tracking-ultrawide text-accent/80 mb-3 flex items-center gap-2">
          <Layers size={11} />
          Pages du rapport
        </h3>
        <div className="space-y-2">
          {metadata.pages.map((p, i) => (
            <div key={p.id} className="border border-ink-700 bg-ink-900/40 p-3">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <p className="text-sm text-slate-200 flex items-baseline gap-2">
                  <span className="font-mono text-[9px] text-slate-600 tabular-nums">P.{String(i + 1).padStart(2, '0')}</span>
                  {p.displayName}
                </p>
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 tabular-nums">
                  {p.visualCount} visuels
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(p.visualTypes).map(([type, count]) => (
                  <span key={type} className="inline-flex items-center gap-1 bg-ink-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                    {type}
                    <span className="text-accent tabular-nums">×{count}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </BracketBox>

      {metadata.tables.length > 0 && (
        <BracketBox className="border border-ink-700 bg-ink-900/40 p-5">
          <h3 className="font-mono text-[10px] uppercase tracking-ultrawide text-accent/80 mb-3">
            Tables référencées
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {metadata.tables.map((t) => (
              <span key={t} className="border-l-2 border-accent pl-2 pr-3 py-1 bg-accent/[0.06] text-accent text-xs font-mono">
                {t}
              </span>
            ))}
          </div>
        </BracketBox>
      )}
    </motion.div>
  );
}

function ImportSummaryView({ summary }: { summary: ImportSummary }): JSX.Element {
  const total = summary.dimEntreprise + summary.dimTemps + summary.dimBilan + summary.dimResultat + summary.dimRatios + summary.factPerformance;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <BracketBox className="border border-signal-good/40 bg-signal-good/[0.06] p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-signal-good" />
          <div className="text-sm w-full">
            <p className="font-mono text-[10px] uppercase tracking-ultrawide text-signal-good">
              Import terminé
            </p>
            <p className="display-xl text-3xl text-slate-50 tabular-nums mt-1">
              {total} <span className="text-base text-slate-500 font-sans normal-case tracking-normal">lignes au total</span>
            </p>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-2 font-mono text-xs">
              {[
                ['DimEntreprise', summary.dimEntreprise],
                ['DimTemps', summary.dimTemps],
                ['DimBilan', summary.dimBilan],
                ['DimResultat', summary.dimResultat],
                ['DimRatios', summary.dimRatios],
                ['FactPerformance', summary.factPerformance],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between gap-2 border-b border-ink-700/50 pb-1.5">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-slate-200 tabular-nums">{value}</span>
                </div>
              ))}
            </div>
            {summary.skippedOrphans > 0 && (
              <p className="mt-4 text-xs text-signal-warn flex items-start gap-1.5 font-mono">
                <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                <span>
                  {summary.skippedOrphans} ligne{summary.skippedOrphans > 1 ? 's' : ''} ignorée{summary.skippedOrphans > 1 ? 's' : ''} (FK vers IDs absents)
                </span>
              </p>
            )}
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-4">
              Les dashboards rechargeront automatiquement.
            </p>
          </div>
        </div>
      </BracketBox>
    </motion.div>
  );
}

function ErrorBanner({ message }: { message: string }): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      className="flex items-start gap-3 border border-signal-bad/40 bg-signal-bad/10 p-4 text-sm text-rose-200"
    >
      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-signal-bad mb-1">Erreur</p>
        <p className="font-mono text-xs leading-relaxed break-all">{message}</p>
      </div>
    </motion.div>
  );
}
