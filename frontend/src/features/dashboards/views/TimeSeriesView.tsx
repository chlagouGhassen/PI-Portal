import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Activity, Play, Sparkles } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { BracketBox } from '@/components/BracketBox';
import { ChartCard } from '@/components/ChartCard';
import { ChartTooltip } from '@/components/ChartTooltip';
import { chartColors, fmt, seriesColor } from '@/lib/chart-theme';
import { cn } from '@/lib/cn';
import {
  SUPPORTED_ENTREPRISES,
  useRunTimeseries,
  type SupportedEntreprise,
  type TimeseriesPoint,
  type TimeseriesResult,
} from '../use-timeseries';

const axisProps = {
  tick: { fill: chartColors.textMuted, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
  axisLine: { stroke: chartColors.grid },
  tickLine: false,
} as const;

export function TimeSeriesView(): JSX.Element {
  const [entreprise, setEntreprise] = useState<SupportedEntreprise>('EUROCYCLE');
  const ts = useRunTimeseries();

  const onRun = () => ts.mutate({ entreprise });

  return (
    <div className="space-y-6">
      {/* Panneau config */}
      <BracketBox className="border border-ink-700 bg-ink-900/40 p-5 space-y-5">
        <div className="flex flex-wrap items-end gap-6">
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Titre coté · cours journalier
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUPPORTED_ENTREPRISES.map((e) => {
                const isActive = e === entreprise;
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      setEntreprise(e);
                      ts.reset();
                    }}
                    disabled={ts.isPending}
                    className={cn(
                      'group inline-flex items-center gap-2 border pl-2 pr-3 py-1 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50',
                      isActive
                        ? 'border-accent/40 bg-accent/[0.07] text-slate-50'
                        : 'border-ink-700 bg-ink-900/40 text-slate-500 hover:border-ink-500 hover:text-slate-200',
                    )}
                  >
                    <span className={cn('h-3 w-[2px] transition', isActive ? 'bg-accent' : 'bg-ink-600')} />
                    <span className="truncate">{e}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ml-auto">
            <button
              onClick={onRun}
              disabled={ts.isPending}
              className="btn-primary text-xs uppercase tracking-widest font-mono"
            >
              {ts.isPending ? <Sparkles size={12} className="animate-pulse" /> : <Play size={12} />}
              {ts.isPending ? 'Pipeline ARIMA + SARIMA…' : 'Lancer l\'analyse'}
            </button>
          </div>
        </div>

        <p className="font-mono text-[10px] tracking-widest text-slate-600 leading-relaxed">
          // Pipeline : <span className="text-slate-400">décomposition STL multiplicative (période 252)</span> →{' '}
          <span className="text-slate-400">test ADF</span> sur série + différenciée →{' '}
          <span className="text-slate-400">ARIMA(2,1,1)</span> walk-forward one-step →{' '}
          <span className="text-slate-400">SARIMA(1,1,0)(5,1,0,5)</span> refit every-10 → métriques RMSE / MAE / MAPE
        </p>
      </BracketBox>

      {/* Erreur */}
      {ts.isError && (
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
            <p className="font-mono text-xs leading-relaxed break-all">{ts.error.message}</p>
          </div>
        </motion.div>
      )}

      {/* Loading skeleton */}
      {ts.isPending && (
        <div className="space-y-4">
          <div className="h-96 border border-ink-700 shimmer" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="h-48 border border-ink-700 shimmer" />
            <div className="h-48 border border-ink-700 shimmer" />
            <div className="h-48 border border-ink-700 shimmer" />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!ts.data && !ts.isPending && !ts.isError && (
        <div className="border border-ink-700 bg-ink-900/40 p-12 text-center">
          <Activity size={32} className="mx-auto text-slate-600 mb-3" strokeWidth={1.5} />
          <p className="display-l text-base text-slate-300">Pipeline ARIMA + SARIMA en attente</p>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Sélectionnez un titre puis cliquez <span className="text-accent font-mono">[Lancer l'analyse]</span>.
            Le pipeline tourne 20-60s selon la longueur de série.
          </p>
        </div>
      )}

      {/* Résultats */}
      {ts.data && !ts.isPending && <TimeseriesResultPanel result={ts.data} />}
    </div>
  );
}

// ─── Panneau résultats ──────────────────────────────────────────────────────

function TimeseriesResultPanel({ result }: { result: TimeseriesResult }): JSX.Element {
  // Fusion train + test + prédictions en une seule série par date pour le chart principal
  const mainChartData = useMemo(() => {
    const byDate = new Map<string, {
      date: string;
      train: number | null;
      test: number | null;
      arima: number | null;
      sarima: number | null;
    }>();

    const ensure = (date: string) => {
      if (!byDate.has(date)) {
        byDate.set(date, { date, train: null, test: null, arima: null, sarima: null });
      }
      return byDate.get(date)!;
    };

    for (const p of result.train) ensure(p.date).train = p.value;
    for (const p of result.test) ensure(p.date).test = p.value;
    for (const p of result.arimaPredictions) ensure(p.date).arima = p.value;
    for (const p of result.sarimaPredictions) ensure(p.date).sarima = p.value;

    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [result]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Synth chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SynthChip label="Titre" value={result.entreprise} mono accent />
        <SynthChip label="Observations" value={String(result.dateRange.nObservations)} />
        <SynthChip
          label="Plage"
          value={`${result.dateRange.start.slice(0, 4)} → ${result.dateRange.end.slice(0, 4)}`}
        />
        <SynthChip
          label="Modèle retenu"
          value={result.bestModel}
          accent
          signal={result.bestModel === 'ARIMA' ? 'good' : 'warn'}
        />
      </div>

      {/* Chart principal train+test+ARIMA+SARIMA */}
      <ChartCard
        index="T.01"
        title="Cours de clôture · prédiction walk-forward"
        subtitle={`Train ${result.split.trainSize} pts · Test ${result.split.testSize} pts · split ${result.split.trainEnd}`}
        meta="downsampling à ~500 points pour le rendu chart"
      >
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={mainChartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={chartColors.grid} vertical={false} />
            <XAxis
              dataKey="date"
              {...axisProps}
              tickFormatter={(d) => String(d).slice(0, 7)}
              minTickGap={40}
            />
            <YAxis tickFormatter={(v) => fmt.decimal(v as number)} {...axisProps} width={55} axisLine={false} />
            <Tooltip
              content={<ChartTooltip formatter={(v) => `${fmt.decimal(v)} TND`} labelPrefix="Date" />}
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
            <Line type="monotone" dataKey="train" name="Train" stroke={chartColors.series[1]} strokeWidth={1.5} dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="test" name="Test (réel)" stroke={chartColors.series[3]} strokeWidth={1.5} dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="arima" name="ARIMA" stroke={chartColors.series[0]} strokeWidth={1.8} strokeDasharray="5 4" dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="sarima" name="SARIMA" stroke={chartColors.series[2]} strokeWidth={1.8} strokeDasharray="3 3" dot={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Décomposition + stationnarité + métriques */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
        <ChartCard
          index="T.02"
          title="Tests de stationnarité (ADF)"
          subtitle="Augmented Dickey-Fuller · H₀ : série non-stationnaire"
        >
          <AdfTable
            originalLabel="Série originale"
            original={result.stationarity.original}
            diffLabel="Série différenciée d'ordre 1"
            diff={result.stationarity.differenced}
          />
        </ChartCard>

        <ChartCard
          index="T.03"
          title="Métriques de performance"
          subtitle="Walk-forward sur l'échantillon test"
          meta="best model retenu sur le RMSE le plus bas"
        >
          <ModelsTable models={result.models} bestModel={result.bestModel} />
        </ChartCard>
      </div>

      {/* Décomposition STL */}
      {result.decomposition && (
        <DecompositionPanel decomp={result.decomposition} />
      )}
    </motion.div>
  );
}

function DecompositionPanel({
  decomp,
}: {
  decomp: { trend: TimeseriesPoint[]; seasonal: TimeseriesPoint[]; residual: TimeseriesPoint[] };
}): JSX.Element {
  return (
    <div className="grid lg:grid-cols-3 gap-4 sm:gap-5">
      <DecompChart index="T.04" title="Tendance" data={decomp.trend} color={seriesColor(1)} />
      <DecompChart index="T.05" title="Saisonnalité" data={decomp.seasonal} color={seriesColor(3)} />
      <DecompChart index="T.06" title="Résidus" data={decomp.residual} color={seriesColor(2)} />
    </div>
  );
}

function DecompChart({
  index,
  title,
  data,
  color,
}: {
  index: string;
  title: string;
  data: TimeseriesPoint[];
  color: string;
}): JSX.Element {
  return (
    <ChartCard index={index} title={title} subtitle="Décomposition STL multiplicative">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid stroke={chartColors.grid} vertical={false} />
          <XAxis
            dataKey="date"
            {...axisProps}
            tickFormatter={(d) => String(d).slice(0, 4)}
            minTickGap={40}
          />
          <YAxis
            {...axisProps}
            width={50}
            axisLine={false}
            tickFormatter={(v) => fmt.decimal(v as number)}
          />
          <Tooltip
            content={<ChartTooltip formatter={(v) => fmt.decimal(v)} labelPrefix="Date" />}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function AdfTable({
  originalLabel,
  original,
  diffLabel,
  diff,
}: {
  originalLabel: string;
  original: { adf: number | null; pvalue: number | null; isStationary: boolean; n: number };
  diffLabel: string;
  diff: { adf: number | null; pvalue: number | null; isStationary: boolean; n: number };
}): JSX.Element {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs font-mono">
        <thead className="text-[10px] uppercase tracking-widest text-slate-500">
          <tr className="border-b border-ink-700">
            <th className="text-left px-2 py-2 font-medium">Série</th>
            <th className="text-right px-2 py-2 font-medium">ADF stat</th>
            <th className="text-right px-2 py-2 font-medium">p-value</th>
            <th className="text-right px-2 py-2 font-medium">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-700/60">
          {[
            { label: originalLabel, ...original },
            { label: diffLabel, ...diff },
          ].map((row) => (
            <tr key={row.label}>
              <td className="px-2 py-2 text-slate-300">{row.label}</td>
              <td className="px-2 py-2 text-right tabular-nums text-slate-200">
                {row.adf?.toFixed(3) ?? '—'}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-slate-200">
                {row.pvalue?.toFixed(4) ?? '—'}
              </td>
              <td className="px-2 py-2 text-right">
                {row.isStationary ? (
                  <span className="text-signal-good">stationnaire</span>
                ) : (
                  <span className="text-signal-warn">non-stationnaire</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModelsTable({
  models,
  bestModel,
}: {
  models: TimeseriesResult['models'];
  bestModel: string;
}): JSX.Element {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs font-mono">
        <thead className="text-[10px] uppercase tracking-widest text-slate-500">
          <tr className="border-b border-ink-700">
            <th className="text-left px-2 py-2 font-medium">Modèle</th>
            <th className="text-right px-2 py-2 font-medium">RMSE</th>
            <th className="text-right px-2 py-2 font-medium">MAE</th>
            <th className="text-right px-2 py-2 font-medium">MAPE</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-700/60">
          {models.map((m) => {
            const tag = m.name.startsWith('ARIMA') ? 'ARIMA' : 'SARIMA';
            const isBest = tag === bestModel;
            return (
              <tr key={m.name} className={cn(isBest && 'bg-accent/[0.05]')}>
                <td className="px-2 py-2 flex items-center gap-2">
                  {isBest && <span className="text-accent text-[10px]">▸</span>}
                  <span className={cn(isBest ? 'text-slate-50' : 'text-slate-400')}>{m.name}</span>
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-200">
                  {m.rmse.toFixed(4)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-400">
                  {m.mae.toFixed(4)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-400">
                  {m.mape !== null ? `${m.mape.toFixed(2)}%` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

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
  signal?: 'good' | 'bad' | 'warn' | 'neutral';
}): JSX.Element {
  return (
    <div className="border border-ink-700 bg-ink-900/40 p-3 border-l-2 border-l-accent">
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <p
        className={cn(
          'display-xl text-2xl mt-1 break-words',
          mono && 'font-mono uppercase tracking-wider text-xl',
          accent ? 'text-accent' : 'text-slate-50',
          signal === 'good' && 'text-signal-good',
          signal === 'warn' && 'text-signal-warn',
          signal === 'bad' && 'text-signal-bad',
        )}
      >
        {value}
      </p>
    </div>
  );
}
