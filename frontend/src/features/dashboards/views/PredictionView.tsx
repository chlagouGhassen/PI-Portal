import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Play, Sparkles, TrendingUp } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { BracketBox } from '@/components/BracketBox';
import { ChartCard } from '@/components/ChartCard';
import { ChartTooltip } from '@/components/ChartTooltip';
import { chartColors, fmt } from '@/lib/chart-theme';
import { cn } from '@/lib/cn';
import type { PerformanceRow } from '../use-dashboard-data';
import {
  useRunPrediction,
  type PredictionModel,
  type PredictionResult,
} from '../use-prediction';

const HORIZONS = [3, 5, 7, 10] as const;

const axisProps = {
  tick: { fill: chartColors.textMuted, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' },
  axisLine: { stroke: chartColors.grid },
  tickLine: false,
} as const;

export function PredictionView({ rows }: { rows: PerformanceRow[] }): JSX.Element {
  const entreprises = useMemo(
    () => [...new Set(rows.map((r) => r.entrepriseNom))].sort(),
    [rows],
  );

  const [entrepriseNom, setEntrepriseNom] = useState<string>(() => entreprises[0] ?? '');
  const [horizon, setHorizon] = useState<number>(5);
  const [excludeLastYear, setExcludeLastYear] = useState<boolean>(false);

  // Détecte la dernière année disponible pour l'entreprise sélectionnée — affichée dans le label
  // du toggle pour clarifier ce qui serait exclu.
  const lastAvailableYear = useMemo(() => {
    if (!entrepriseNom) return null;
    const years = rows.filter((r) => r.entrepriseNom === entrepriseNom).map((r) => r.annee);
    return years.length === 0 ? null : Math.max(...years);
  }, [rows, entrepriseNom]);

  const prediction = useRunPrediction();

  useEffect(() => {
    if (entreprises.length > 0 && !entreprises.includes(entrepriseNom)) {
      setEntrepriseNom(entreprises[0] ?? '');
      prediction.reset();
    }
  }, [entreprises.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  if (entreprises.length === 0) {
    return (
      <div className="border border-ink-700 bg-ink-900/40 p-10 text-center text-slate-400">
        <p className="font-display text-base">Aucune donnée disponible</p>
        <p className="text-sm text-slate-500 mt-2">
          Importez d'abord un .pbix depuis Administration → Données.
        </p>
      </div>
    );
  }

  const onRun = () => prediction.mutate({ entrepriseNom, horizon, excludeLastYear });

  return (
    <div className="space-y-6">
      {/* Panneau de configuration */}
      <BracketBox className="border border-ink-700 bg-ink-900/40 p-5 space-y-5">
        <div className="flex flex-wrap items-end gap-6">
          {/* Sélection entreprise */}
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Entité · Cible de la prédiction
            </p>
            <div className="flex flex-wrap gap-1.5">
              {entreprises.map((nom) => {
                const isActive = nom === entrepriseNom;
                return (
                  <button
                    key={nom}
                    type="button"
                    onClick={() => {
                      setEntrepriseNom(nom);
                      prediction.reset();
                    }}
                    disabled={prediction.isPending}
                    className={cn(
                      'group inline-flex items-center gap-2 border pl-2 pr-3 py-1 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50',
                      isActive
                        ? 'border-accent/40 bg-accent/[0.07] text-slate-50'
                        : 'border-ink-700 bg-ink-900/40 text-slate-500 hover:border-ink-500 hover:text-slate-200',
                    )}
                  >
                    <span className={cn('h-3 w-[2px] transition', isActive ? 'bg-accent' : 'bg-ink-600')} />
                    <span className="truncate">{nom}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sélection horizon */}
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Horizon · Années à prédire
            </p>
            <div className="inline-flex items-center border border-ink-700 bg-ink-900/40 font-mono text-xs">
              <span className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-500 border-r border-ink-700">
                T+N
              </span>
              {HORIZONS.map((h, i) => (
                <button
                  key={h}
                  onClick={() => {
                    setHorizon(h);
                    prediction.reset();
                  }}
                  disabled={prediction.isPending}
                  className={cn(
                    'px-3 py-1.5 transition tabular-nums',
                    i < HORIZONS.length - 1 && 'border-r border-ink-700/60',
                    horizon === h
                      ? 'bg-accent text-ink-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-ink-900 disabled:opacity-50',
                  )}
                >
                  {h}{h === horizon ? ' ans' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Bouton run */}
          <div className="ml-auto">
            <button
              onClick={onRun}
              disabled={prediction.isPending || !entrepriseNom}
              className="btn-primary text-xs uppercase tracking-widest font-mono"
            >
              {prediction.isPending ? <Sparkles size={12} className="animate-pulse" /> : <Play size={12} />}
              {prediction.isPending ? 'Pipeline ML…' : 'Lancer la prédiction'}
            </button>
          </div>
        </div>

        {/* Toggle exclude-last-year, sur sa propre ligne pour ne pas surcharger le row config */}
        <div className="pt-4 border-t border-ink-700/60">
          <label
            className={cn(
              'group inline-flex items-start gap-3 cursor-pointer text-xs',
              prediction.isPending && 'opacity-50 cursor-not-allowed',
            )}
          >
            <button
              type="button"
              role="switch"
              aria-checked={excludeLastYear}
              onClick={() => {
                if (!prediction.isPending) {
                  setExcludeLastYear((v) => !v);
                  prediction.reset();
                }
              }}
              disabled={prediction.isPending}
              className={cn(
                'relative shrink-0 mt-0.5 w-9 h-5 border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                excludeLastYear
                  ? 'bg-accent/15 border-accent/50'
                  : 'bg-ink-900/60 border-ink-700 group-hover:border-ink-500',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-3.5 w-3.5 transition-all',
                  excludeLastYear ? 'left-[18px] bg-accent' : 'left-0.5 bg-slate-500',
                )}
              />
            </button>
            <div className="space-y-0.5">
              <p className="font-mono text-[11px] uppercase tracking-widest text-slate-300">
                Exclure le dernier exercice
                {lastAvailableYear !== null && (
                  <span className="ml-2 text-accent tabular-nums">
                    ({lastAvailableYear})
                  </span>
                )}
              </p>
              <p className="font-mono text-[10px] tracking-wider text-slate-600 leading-relaxed normal-case">
                Recommandé si l'année courante est partielle (saisie en cours). Améliore généralement
                la qualité du LOO-CV en évitant de fausser l'extrapolation linéaire.
              </p>
            </div>
          </label>
        </div>

        <p className="font-mono text-[10px] tracking-widest text-slate-600 leading-relaxed">
          // Pipeline : <span className="text-slate-400">StandardScaler</span> →{' '}
          <span className="text-slate-400">LOO-CV</span> sur 4 modèles{' '}
          (<span className="text-slate-400">Ridge α=1, α=0.1 · GradientBoosting · RandomForest</span>) → sélection par R²_cv max →{' '}
          <span className="text-slate-400">extrapolation linéaire</span> des features sur l'horizon → bande de confiance ±8%
        </p>
      </BracketBox>

      {/* Erreur */}
      {prediction.isError && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="flex items-start gap-3 border border-signal-bad/40 bg-signal-bad/10 p-4 text-sm text-rose-200"
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-signal-bad mb-1">
              Erreur pipeline
            </p>
            <p className="font-mono text-xs leading-relaxed break-all">
              {prediction.error.message}
            </p>
          </div>
        </motion.div>
      )}

      {/* Loading skeleton */}
      {prediction.isPending && (
        <div className="space-y-4">
          <div className="h-96 border border-ink-700 shimmer" />
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="h-48 border border-ink-700 shimmer" />
            <div className="h-48 border border-ink-700 shimmer" />
          </div>
        </div>
      )}

      {/* Résultats */}
      {prediction.data && !prediction.isPending && (
        <PredictionResultPanel result={prediction.data} />
      )}

      {/* Empty state initial */}
      {!prediction.data && !prediction.isPending && !prediction.isError && (
        <div className="border border-ink-700 bg-ink-900/40 p-12 text-center">
          <TrendingUp size={32} className="mx-auto text-slate-600 mb-3" strokeWidth={1.5} />
          <p className="display-l text-base text-slate-300">Configuration prête</p>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Cliquez <span className="text-accent font-mono">[Lancer la prédiction]</span> pour exécuter le pipeline ML
            sur <span className="text-slate-300 font-mono">{entrepriseNom || '—'}</span> avec un horizon de{' '}
            <span className="text-accent tabular-nums font-mono">{horizon} ans</span>.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Panneau de résultats (séparé pour clarté) ──────────────────────────────

function PredictionResultPanel({ result }: { result: PredictionResult }): JSX.Element {
  // Construit la série combinée pour le chart : historique + prédiction.
  // Note : la dernière année historique = pont visuel avec la première année prédite.
  const chartData = useMemo(() => {
    const last = result.historical[result.historical.length - 1];
    const points = result.historical.map((h) => ({
      annee: h.annee,
      historical: h.ca,
      predicted: null as number | null,
      lower: null as number | null,
      upper: null as number | null,
    }));

    // Bridge : la dernière année historique répétée comme point prédit
    if (last) {
      points[points.length - 1]!.predicted = last.ca;
      points[points.length - 1]!.lower = last.ca;
      points[points.length - 1]!.upper = last.ca;
    }

    for (const p of result.predictions) {
      points.push({
        annee: p.annee,
        historical: null,
        predicted: p.caPredicted,
        lower: p.caLower,
        upper: p.caUpper,
      });
    }
    return points;
  }, [result]);

  const lastHistoricalYear = result.yearRange.max;
  const firstPredictedYear = result.predictions[0]?.annee;
  const lastPredictedValue = result.predictions[result.predictions.length - 1]?.caPredicted;
  const lastHistoricalValue = result.historical[result.historical.length - 1]?.ca;
  const growthRate =
    lastHistoricalValue && lastPredictedValue && lastHistoricalValue !== 0
      ? (lastPredictedValue - lastHistoricalValue) / Math.abs(lastHistoricalValue)
      : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Synthèse */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SynthChip label="Entité" value={result.entreprise} mono />
        <SynthChip
          label="Modèle retenu"
          value={result.bestModel}
          accent
        />
        <SynthChip
          label={`CA ${result.predictions[result.predictions.length - 1]?.annee ?? '—'}`}
          value={lastPredictedValue !== undefined ? fmt.eurCompact(lastPredictedValue) : '—'}
        />
        <SynthChip
          label={`Croissance cumul. vs ${lastHistoricalYear}`}
          value={growthRate !== null ? `${growthRate > 0 ? '+' : ''}${(growthRate * 100).toFixed(1)}%` : '—'}
          signal={growthRate !== null ? (growthRate > 0 ? 'good' : growthRate < 0 ? 'bad' : 'neutral') : 'neutral'}
        />
      </div>

      {/* Chart combiné */}
      <ChartCard
        index="P.01"
        title={`Projection CA · ${result.entreprise}`}
        subtitle={`Historique ${result.yearRange.min}-${lastHistoricalYear}${
          result.excludedYear !== null ? ` (exercice ${result.excludedYear} exclu)` : ''
        } · prédit ${firstPredictedYear ?? '?'}-${result.predictions[result.predictions.length - 1]?.annee ?? '?'}`}
        meta={`modèle : ${result.bestModel} · bande de confiance ±8%`}
      >
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <defs>
              <linearGradient id="grad-band" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.series[0]} stopOpacity={0.35} />
                <stop offset="100%" stopColor={chartColors.series[0]} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartColors.grid} vertical={false} />
            <XAxis dataKey="annee" {...axisProps} />
            <YAxis
              tickFormatter={(v) => fmt.compact(v as number)}
              {...axisProps}
              width={55}
              axisLine={false}
            />
            <Tooltip
              content={<ChartTooltip formatter={(v) => fmt.eurCompact(v)} labelPrefix="Exercice" />}
              cursor={{ stroke: chartColors.grid, strokeDasharray: '3 3' }}
            />
            <Legend
              wrapperStyle={{
                fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: chartColors.text,
              }}
              iconType="square"
              iconSize={8}
            />
            {firstPredictedYear !== undefined && (
              <ReferenceLine
                x={lastHistoricalYear}
                stroke={chartColors.textMuted}
                strokeDasharray="2 4"
                label={{
                  value: '→ Projection',
                  position: 'insideTopRight',
                  fontSize: 9,
                  fill: chartColors.textMuted,
                  fontFamily: 'JetBrains Mono',
                }}
              />
            )}
            {/* Bande de confiance */}
            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill="url(#grad-band)"
              connectNulls
              activeDot={false}
              legendType="none"
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="none"
              fill={chartColors.tooltipBg}
              fillOpacity={1}
              connectNulls
              activeDot={false}
              legendType="none"
            />
            {/* Courbe historique */}
            <Line
              type="monotone"
              dataKey="historical"
              name="Historique"
              stroke={chartColors.series[1]}
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 0, fill: chartColors.series[1] }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
            {/* Courbe prédiction */}
            <Line
              type="monotone"
              dataKey="predicted"
              name="Prédit"
              stroke={chartColors.series[0]}
              strokeWidth={2.5}
              strokeDasharray="5 4"
              dot={{ r: 3, strokeWidth: 0, fill: chartColors.series[0] }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Tableaux : modèles + prédictions */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
        <ChartCard
          index="P.02"
          title="Comparaison des modèles"
          subtitle="R² Cross-Validation + R² Train + MAE"
          meta="LOO-CV (Leave-One-Out) · n petits → R²_cv pessimiste, voir insight"
        >
          <ModelsTable models={result.models} bestModel={result.bestModel} />
        </ChartCard>

        <ChartCard
          index="P.03"
          title="Prédictions futures"
          subtitle={`Horizon ${result.predictions.length} ans · bande ±8%`}
        >
          <PredictionsTable predictions={result.predictions} />
        </ChartCard>
      </div>
    </motion.div>
  );
}

// ─── Sous-composants ────────────────────────────────────────────────────────

function SynthChip({
  label,
  value,
  mono,
  accent,
  signal,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
  signal?: 'good' | 'bad' | 'neutral';
}): JSX.Element {
  const valueClass = cn(
    'display-xl text-2xl text-slate-50 mt-1 break-words',
    mono && 'font-mono uppercase tracking-wider text-xl',
    signal === 'good' && 'text-signal-good',
    signal === 'bad' && 'text-signal-bad',
    accent && 'text-accent',
  );
  return (
    <div className="border border-ink-700 bg-ink-900/40 p-3 border-l-2 border-l-accent">
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className={valueClass}>{value}</p>
    </div>
  );
}

function ModelsTable({
  models,
  bestModel,
}: {
  models: PredictionModel[];
  bestModel: string;
}): JSX.Element {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs font-mono">
        <thead className="text-[10px] uppercase tracking-widest text-slate-500">
          <tr className="border-b border-ink-700">
            <th className="text-left px-2 py-2 font-medium">Modèle</th>
            <th className="text-right px-2 py-2 font-medium">R²_cv</th>
            <th className="text-right px-2 py-2 font-medium">R²_train</th>
            <th className="text-right px-2 py-2 font-medium">MAE</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-700/60">
          {models.map((m) => {
            const isBest = m.name === bestModel;
            return (
              <tr key={m.name} className={cn(isBest && 'bg-accent/[0.05]')}>
                <td className="px-2 py-2 flex items-center gap-2">
                  {isBest && <span className="text-accent text-[10px]">▸</span>}
                  <span className={cn(isBest ? 'text-slate-50' : 'text-slate-400')}>{m.name}</span>
                </td>
                <td className={cn('px-2 py-2 text-right tabular-nums', r2Color(m.r2_cv))}>
                  {m.r2_cv.toFixed(3)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-400">
                  {m.r2_train.toFixed(3)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-400">
                  {fmt.eurCompact(m.mae)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PredictionsTable({
  predictions,
}: {
  predictions: PredictionResult['predictions'];
}): JSX.Element {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs font-mono">
        <thead className="text-[10px] uppercase tracking-widest text-slate-500">
          <tr className="border-b border-ink-700">
            <th className="text-left px-2 py-2 font-medium">Année</th>
            <th className="text-right px-2 py-2 font-medium">CA prédit</th>
            <th className="text-right px-2 py-2 font-medium">Borne -8%</th>
            <th className="text-right px-2 py-2 font-medium">Borne +8%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-700/60">
          {predictions.map((p) => (
            <tr key={p.annee}>
              <td className="px-2 py-2 tabular-nums text-accent">{p.annee}</td>
              <td className="px-2 py-2 text-right tabular-nums text-slate-50">
                {fmt.eurCompact(p.caPredicted)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-slate-500">
                {fmt.eurCompact(p.caLower)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-slate-500">
                {fmt.eurCompact(p.caUpper)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function r2Color(value: number): string {
  if (value >= 0.75) return 'text-signal-good';
  if (value >= 0.5) return 'text-signal-warn';
  if (value >= 0) return 'text-slate-400';
  return 'text-signal-bad';
}
