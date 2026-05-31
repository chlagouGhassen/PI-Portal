import type { TooltipProps } from 'recharts';
import { chartColors } from '@/lib/chart-theme';

interface ChartTooltipProps extends TooltipProps<number, string> {
  formatter?: (value: number) => string;
  /** Préfixe optionnel pour le label (ex. "Année") */
  labelPrefix?: string;
}

/**
 * Tooltip Recharts custom : remplace la boîte par défaut par un layout
 * éditorial avec eyebrow mono + valeur tabular, pastille colorée par série.
 * Distinctif et lisible. Pas de rounded corner - bords nets.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelPrefix,
}: ChartTooltipProps): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="bg-ink-950/95 backdrop-blur border border-ink-600 px-3 py-2.5 shadow-lifted min-w-[160px]"
      style={{ borderTop: `2px solid ${chartColors.series[0]}` }}
    >
      {label !== undefined && (
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-2">
          {labelPrefix && <span>{labelPrefix} </span>}
          <span className="text-accent tabular-nums">{label}</span>
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, i) => {
          const value = typeof entry.value === 'number' ? entry.value : 0;
          return (
            <div key={i} className="flex items-center gap-2.5 text-xs">
              <span
                className="inline-block h-2 w-2 shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-400 truncate flex-1 min-w-0">{entry.name}</span>
              <span className="font-mono text-slate-100 tabular-nums">
                {formatter ? formatter(value) : value.toLocaleString('fr-FR')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
