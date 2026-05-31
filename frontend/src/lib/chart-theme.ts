// Thème centralisé pour Recharts - sync avec tailwind.config.ts.
// Modifier ces constantes propage sur tous les charts.

export const chartColors = {
  axis: '#475569',          // slate-600
  grid: '#1e2733',          // ink-700
  tooltipBg: '#0e131a',     // ink-900
  tooltipBorder: '#2a3441', // ink-600
  text: '#cbd5e1',          // slate-300
  textMuted: '#64748b',     // slate-500

  // Palette de séries (à la place de la palette Recharts par défaut).
  series: [
    '#f5a623', // gold (accent)
    '#14b8a6', // teal
    '#fb7185', // coral
    '#a78bfa', // violet
    '#34d399', // mint
    '#60a5fa', // sky
    '#f472b6', // pink
    '#facc15', // yellow
    '#22d3ee', // cyan
    '#fb923c', // orange
  ],

  // Statut (KPI / coloration conditionnelle de fallback).
  good: '#34d399',     // mint
  warning: '#f59e0b',  // amber
  bad: '#fb7185',      // coral
};

export function seriesColor(index: number): string {
  return chartColors.series[index % chartColors.series.length] ?? chartColors.series[0]!;
}

// ─── Formatters FR ─────────────────────────────────────────────────────────

const eurFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat('fr-FR', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const decimalFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 2,
});

export const fmt = {
  eur: (n: number): string => eurFormatter.format(n),
  eurCompact: (n: number): string => `${compactFormatter.format(n)} €`,
  compact: (n: number): string => compactFormatter.format(n),
  pct: (n: number): string => percentFormatter.format(n),
  decimal: (n: number): string => decimalFormatter.format(n),
};
