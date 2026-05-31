import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface KpiCardProps {
  /** Numéro éditorial (ex. "K01") */
  index?: string;
  /** Label court - eyebrow mono */
  label: string;
  /** Valeur principale */
  value: string;
  /** Unité affichée à droite de la valeur (ex. €, %) */
  unit?: string;
  /** Delta vs période précédente (relatif, ex. 0.05 = +5%) */
  delta?: number;
  /** Texte additionnel ("vs 2023", "pts") */
  deltaLabel?: string;
  /** Couleur d'accent du label */
  accentColor?: string;
  /** Slot footnote (note méthodo, etc.) */
  footnote?: ReactNode;
  /** Forcer le tint signal (good/warn/bad) */
  signal?: 'good' | 'warn' | 'bad' | 'neutral';
}

export const kpiVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

/**
 * KPI card éditorial-data.
 * - Valeur en display-xl (text-4xl/5xl) - typo qui fait du bruit
 * - Eyebrow + n° à gauche, valeur dominante, delta en bas avec icône directionnelle
 * - Subtle border-l accent quand delta positif/négatif
 * - Tabular nums partout
 */
export function KpiCard({
  index,
  label,
  value,
  unit,
  delta,
  deltaLabel,
  accentColor,
  footnote,
  signal,
}: KpiCardProps): JSX.Element {
  // Calcul du signal effectif : prop ou dérivé du delta
  const effectiveSignal: 'good' | 'warn' | 'bad' | 'neutral' =
    signal ?? (delta === undefined ? 'neutral' : delta > 0.0005 ? 'good' : delta < -0.0005 ? 'bad' : 'neutral');

  const trendIcon =
    delta === undefined ? null : delta > 0.0005 ? <ArrowUpRight size={12} strokeWidth={2.5} /> : delta < -0.0005 ? <ArrowDownRight size={12} strokeWidth={2.5} /> : <Minus size={12} strokeWidth={2.5} />;

  const trendClass =
    effectiveSignal === 'good'
      ? 'text-signal-good'
      : effectiveSignal === 'bad'
        ? 'text-signal-bad'
        : effectiveSignal === 'warn'
          ? 'text-signal-warn'
          : 'text-slate-500';

  const signalBorderClass =
    effectiveSignal === 'good'
      ? 'before:bg-signal-good/70'
      : effectiveSignal === 'bad'
        ? 'before:bg-signal-bad/70'
        : effectiveSignal === 'warn'
          ? 'before:bg-signal-warn/70'
          : 'before:bg-ink-700';

  return (
    <motion.div
      variants={kpiVariants}
      className={cn(
        'relative bg-ink-900/40 border border-ink-700 p-4 sm:p-5',
        // barre verticale signal sur le bord gauche
        'before:content-[""] before:absolute before:left-0 before:top-3 before:bottom-3 before:w-[2px]',
        signalBorderClass,
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p
          className="font-mono text-[10px] uppercase tracking-widest leading-none"
          style={{ color: accentColor ?? undefined }}
        >
          <span className={accentColor ? '' : 'text-accent/80'}>{label}</span>
        </p>
        {index && (
          <span className="font-mono text-[9px] tracking-widest text-slate-600 tabular-nums">
            {index}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="display-xl text-3xl sm:text-4xl text-slate-50 leading-none">
          {value}
        </span>
        {unit && (
          <span className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-0.5">
            {unit}
          </span>
        )}
      </div>

      {delta !== undefined && (
        <div className={cn('mt-3 flex items-center gap-1.5 text-xs tabular-nums font-mono', trendClass)}>
          {trendIcon}
          <span>
            {delta > 0 ? '+' : ''}
            {(delta * 100).toFixed(1)}%
          </span>
          {deltaLabel && <span className="text-slate-500 normal-case">· {deltaLabel}</span>}
        </div>
      )}

      {footnote && (
        <div className="mt-3 pt-3 border-t border-ink-700/60 text-[10px] font-mono tracking-wider text-slate-500">
          {footnote}
        </div>
      )}
    </motion.div>
  );
}
