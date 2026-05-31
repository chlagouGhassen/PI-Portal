import { useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { Check, Download, Loader2 } from 'lucide-react';

import { cn } from '@/lib/cn';
import { BracketBox } from './BracketBox';

interface ChartCardProps {
  /** Index éditorial type "C01" */
  index?: string;
  title: string;
  subtitle?: string;
  /** Slot d'actions à droite du titre (rendu AVANT le bouton export) */
  actions?: ReactNode;
  /** Slot status bar en bas - méthodo, source */
  meta?: ReactNode;
  /** Désactive le bouton d'export PNG (par défaut activé) */
  noExport?: boolean;
  className?: string;
  children: ReactNode;
}

export const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Card "data console" :
 * - BracketBox (équerres ambre)
 * - Header avec index editorial + titre + slot actions + bouton export PNG
 * - Footer optionnel pour méthodologie/source
 * - Capture la zone chart (children) en PNG via html-to-image
 */
export function ChartCard({
  index,
  title,
  subtitle,
  actions,
  meta,
  noExport,
  className,
  children,
}: ChartCardProps): JSX.Element {
  const chartRef = useRef<HTMLDivElement>(null);
  const [exportState, setExportState] = useState<'idle' | 'busy' | 'done'>('idle');

  const handleExport = async () => {
    if (!chartRef.current) return;
    setExportState('busy');
    try {
      // Background = ink-900/40 réel → on force opaque pour éviter la transparence
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: '#0e131a',
        pixelRatio: 2,
        cacheBust: true,
      });
      const slug = title
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${slug}-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      setExportState('done');
      setTimeout(() => setExportState('idle'), 1800);
    } catch {
      setExportState('idle');
    }
  };

  return (
    <motion.div variants={cardVariants} className={className}>
      <BracketBox className="bg-ink-900/40 border border-ink-700 p-4 sm:p-5 h-full flex flex-col">
        <header className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2.5 mb-1">
              {index && (
                <span className="font-mono text-[9px] tracking-widest text-accent/70 tabular-nums shrink-0">
                  {index}
                </span>
              )}
              <h3 className="font-display text-base sm:text-lg text-slate-50 leading-tight tracking-tight">
                {title}
              </h3>
            </div>
            {subtitle && (
              <p className="text-xs text-slate-500 leading-relaxed">{subtitle}</p>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            {actions}
            {!noExport && (
              <button
                type="button"
                onClick={handleExport}
                disabled={exportState === 'busy'}
                aria-label="Télécharger en PNG"
                title="Télécharger en PNG"
                className="inline-flex items-center justify-center h-7 w-7 border border-ink-700 text-slate-500 hover:text-accent hover:border-accent/50 hover:bg-accent/[0.06] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60 disabled:cursor-wait"
              >
                {exportState === 'busy' ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : exportState === 'done' ? (
                  <Check size={11} className="text-signal-good" strokeWidth={2.5} />
                ) : (
                  <Download size={11} />
                )}
              </button>
            )}
          </div>
        </header>

        <div ref={chartRef} className="w-full flex-1 min-h-0">{children}</div>

        {meta && (
          <footer className={cn(
            'mt-4 pt-3 border-t border-ink-700/60',
            'font-mono text-[10px] tracking-wider text-slate-500 uppercase',
          )}>
            {meta}
          </footer>
        )}
      </BracketBox>
    </motion.div>
  );
}
