import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { BracketBox } from '@/components/BracketBox';
import { ChartCard } from '@/components/ChartCard';
import { ChartTooltip } from '@/components/ChartTooltip';
import { EntrepriseFilter } from '@/components/EntrepriseFilter';
import { YearFilter } from '@/components/YearFilter';
import { YearRangeFilter } from '@/components/YearRangeFilter';
import { chartColors, fmt, seriesColor } from '@/lib/chart-theme';
import type { PerformanceRow } from '../use-dashboard-data';

const gridStagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };

const axisProps = {
  tick: { fill: chartColors.textMuted, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' },
  axisLine: { stroke: chartColors.grid },
  tickLine: false,
} as const;

export function AnalyseComparativeView({ rows }: { rows: PerformanceRow[] }): JSX.Element {
  const years = useMemo(() => [...new Set(rows.map((r) => r.annee))].sort((a, b) => a - b), [rows]);
  const allEntreprises = useMemo(() => [...new Set(rows.map((r) => r.entrepriseNom))].sort(), [rows]);

  const [year, setYear] = useState<number | 'all'>('all');
  const [yearRange, setYearRange] = useState<[number, number]>(() => {
    const minY = years[0] ?? 0;
    const maxY = years[years.length - 1] ?? 0;
    return [minY, maxY];
  });
  const [selectedEntreprises, setSelectedEntreprises] = useState<Set<string>>(
    () => new Set(allEntreprises),
  );

  useEffect(() => {
    setSelectedEntreprises(new Set(allEntreprises));
  }, [allEntreprises.join('|')]);
  useEffect(() => {
    const minY = years[0] ?? 0;
    const maxY = years[years.length - 1] ?? 0;
    setYearRange([minY, maxY]);
  }, [years.join('|')]);

  // Années disponibles dans le YearFilter restreintes à la plage active
  const yearsInRange = useMemo(
    () => years.filter((y) => y >= yearRange[0] && y <= yearRange[1]),
    [years, yearRange],
  );

  const filtered = useMemo(() => {
    const byEntreprise = rows.filter(
      (r) =>
        selectedEntreprises.has(r.entrepriseNom) &&
        r.annee >= yearRange[0] &&
        r.annee <= yearRange[1],
    );
    if (year === 'all') return aggregatePerEntreprise(byEntreprise);
    // Si l'utilisateur avait sélectionné une année puis a réduit la plage et l'a exclue,
    // on fallback sur 'all' implicite (rows vides pour cette année auraient été masquées).
    return byEntreprise.filter((r) => r.annee === year);
  }, [rows, year, yearRange, selectedEntreprises]);

  const displayedEntreprises = useMemo(
    () => allEntreprises.filter((e) => selectedEntreprises.has(e)),
    [allEntreprises, selectedEntreprises],
  );

  if (rows.length === 0) {
    return (
      <div className="border border-ink-700 bg-ink-900/40 p-10 text-center text-slate-400">
        <p className="font-display text-base">Aucune donnée importée</p>
        <p className="text-sm text-slate-500 mt-2">
          Uploadez votre .pbix depuis Administration → Données.
        </p>
      </div>
    );
  }

  const radarData = [
    { metric: 'ROE', ...metricByEntreprise(filtered, 'roe') },
    { metric: 'ROA', ...metricByEntreprise(filtered, 'roa') },
    { metric: 'ROCE', ...metricByEntreprise(filtered, 'roce') },
  ];

  const toggleEntreprise = (nom: string) =>
    setSelectedEntreprises((prev) => {
      const next = new Set(prev);
      if (next.has(nom)) next.delete(nom);
      else next.add(nom);
      return next;
    });

  const periodLabel = year === 'all' ? 'moyennes multi-exercices' : `exercice ${year}`;

  return (
    <motion.div variants={gridStagger} initial="hidden" animate="visible" className="space-y-6">
      {/* Filtres */}
      <BracketBox className="border border-ink-700 bg-ink-900/40 p-5 space-y-5">
        <EntrepriseFilter
          entreprises={allEntreprises}
          selected={selectedEntreprises}
          onToggle={toggleEntreprise}
          onSelectAll={() => setSelectedEntreprises(new Set(allEntreprises))}
          onClear={() => setSelectedEntreprises(new Set())}
        />
        <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-ink-700/60">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 tabular-nums">
            {filtered.length} ligne{filtered.length > 1 ? 's' : ''} · {periodLabel}
          </p>
          {years.length > 1 && (
            <YearRangeFilter years={years} range={yearRange} onChange={setYearRange} />
          )}
        </div>
        <div className="flex items-center justify-end pt-3 border-t border-ink-700/60">
          <YearFilter years={yearsInRange} selected={year} onChange={setYear} />
        </div>
      </BracketBox>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
        <ChartCard
          index="C.01"
          title="ROA · ROE · ROCE par entité"
          subtitle="Radar comparatif des ratios de rentabilité"
          meta={`série : ${displayedEntreprises.length} entité${displayedEntreprises.length > 1 ? 's' : ''} · ${periodLabel}`}
        >
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke={chartColors.grid} strokeDasharray="2 2" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: chartColors.text, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} />
              <PolarRadiusAxis tickFormatter={(v) => `${((v as number) * 100).toFixed(0)}%`} tick={{ fill: chartColors.textMuted, fontSize: 9 }} />
              <Tooltip content={<ChartTooltip formatter={(v) => fmt.pct(v)} labelPrefix="Métrique" />} />
              <Legend
                wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: 8 }}
                iconType="square"
                iconSize={8}
              />
              {displayedEntreprises.map((nom, idx) => (
                <Radar
                  key={nom}
                  name={nom}
                  dataKey={nom}
                  stroke={seriesColor(idx)}
                  fill={seriesColor(idx)}
                  fillOpacity={0.14}
                  strokeWidth={1.8}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          index="C.02"
          title="Ratio de liquidité (Current Ratio)"
          subtitle="Seuil de confort : ≥ 1,0 · idéal : ≥ 1,5"
          meta={`tri décroissant · ${displayedEntreprises.length} entité${displayedEntreprises.length > 1 ? 's' : ''}`}
        >
          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={[...filtered].sort((a, b) => (b.currentRatio ?? 0) - (a.currentRatio ?? 0))}
              margin={{ top: 10, right: 10, bottom: 70, left: 0 }}
            >
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="entrepriseNom" {...axisProps} tick={{ ...axisProps.tick, fontSize: 9 }} interval={0} angle={-35} textAnchor="end" height={70} />
              <YAxis tickFormatter={(v) => fmt.decimal(v as number)} {...axisProps} width={40} axisLine={false} />
              <Tooltip
                content={<ChartTooltip formatter={(v) => fmt.decimal(v)} />}
                cursor={{ fill: 'rgba(245,166,35,0.04)' }}
              />
              <ReferenceLine
                y={1}
                stroke={chartColors.grid}
                strokeDasharray="3 3"
                label={{ value: 'seuil 1,0', position: 'insideTopRight', fontSize: 9, fill: chartColors.textMuted, fontFamily: 'JetBrains Mono' }}
              />
              <ReferenceLine
                y={1.5}
                stroke={chartColors.grid}
                strokeDasharray="3 3"
                label={{ value: 'idéal 1,5', position: 'insideTopRight', fontSize: 9, fill: chartColors.textMuted, fontFamily: 'JetBrains Mono' }}
              />
              <Bar dataKey="currentRatio" name="Current Ratio" radius={[2, 2, 0, 0]}>
                {[...filtered]
                  .sort((a, b) => (b.currentRatio ?? 0) - (a.currentRatio ?? 0))
                  .map((r) => (
                    <Cell key={r.entrepriseNom} fill={ratioColor(r.currentRatio, 1.0, 1.5)} />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          index="C.03"
          title="Taux d'endettement"
          subtitle="Plus bas = structure plus saine"
          meta="tri croissant · seuils 50% / 70%"
        >
          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={[...filtered].sort((a, b) => (a.tauxEndettement ?? 0) - (b.tauxEndettement ?? 0))}
              margin={{ top: 10, right: 10, bottom: 70, left: 0 }}
            >
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="entrepriseNom" {...axisProps} tick={{ ...axisProps.tick, fontSize: 9 }} interval={0} angle={-35} textAnchor="end" height={70} />
              <YAxis tickFormatter={(v) => fmt.pct(v as number)} {...axisProps} width={45} axisLine={false} />
              <Tooltip
                content={<ChartTooltip formatter={(v) => fmt.pct(v)} />}
                cursor={{ fill: 'rgba(245,166,35,0.04)' }}
              />
              <Bar dataKey="tauxEndettement" name="Taux Endettement" radius={[2, 2, 0, 0]}>
                {[...filtered]
                  .sort((a, b) => (a.tauxEndettement ?? 0) - (b.tauxEndettement ?? 0))
                  .map((r) => (
                    <Cell key={r.entrepriseNom} fill={endettementColor(r.tauxEndettement)} />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          index="C.04"
          title="Heatmap ROE · entité × exercice"
          subtitle="Vert ≥ 15% / ambre 5-15% / rouge < 5%"
          meta="hover sur les cases pour les valeurs exactes"
        >
          <RoeHeatmap
            rows={rows.filter((r) => selectedEntreprises.has(r.entrepriseNom))}
            years={years}
            entreprises={displayedEntreprises}
          />
        </ChartCard>
      </div>
    </motion.div>
  );
}

function RoeHeatmap({
  rows,
  years,
  entreprises,
}: {
  rows: PerformanceRow[];
  years: number[];
  entreprises: string[];
}): JSX.Element {
  const lookup = new Map<string, PerformanceRow>();
  for (const r of rows) lookup.set(`${r.entrepriseNom}|${r.annee}`, r);

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid gap-[2px] min-w-full"
        style={{ gridTemplateColumns: `minmax(140px, 1.4fr) repeat(${years.length}, minmax(56px, 1fr))` }}
      >
        <div className="font-mono text-[9px] uppercase tracking-widest text-slate-600 py-1.5">
          Entité \ Exercice
        </div>
        {years.map((y) => (
          <div key={y} className="text-center font-mono text-[10px] tabular-nums tracking-widest text-slate-500 py-1.5">
            {y}
          </div>
        ))}
        {entreprises.map((nom) => (
          <FragmentRow key={nom} nom={nom} years={years} lookup={lookup} />
        ))}
      </div>
    </div>
  );
}

function FragmentRow({
  nom,
  years,
  lookup,
}: {
  nom: string;
  years: number[];
  lookup: Map<string, PerformanceRow>;
}): JSX.Element {
  return (
    <>
      <div className="flex items-center text-xs text-slate-300 truncate font-mono uppercase tracking-wider py-2 pr-2" title={nom}>
        {nom}
      </div>
      {years.map((y) => {
        const row = lookup.get(`${nom}|${y}`);
        if (!row || row.roe === null) {
          return (
            <div
              key={y}
              className="h-9 border border-ink-700/40 bg-ink-900/30 flex items-center justify-center font-mono text-[10px] text-slate-700"
              title={`${nom} ${y} - non renseigné`}
            >
              -
            </div>
          );
        }
        return (
          <div
            key={y}
            title={`${nom} ${y} - ROE ${fmt.pct(row.roe)}`}
            className="h-9 flex items-center justify-center font-mono text-[11px] text-ink-950 font-semibold transition hover:scale-110 hover:z-10 relative"
            style={{ backgroundColor: roeColor(row.roe) }}
          >
            {(row.roe * 100).toFixed(0)}
          </div>
        );
      })}
    </>
  );
}

function roeColor(roe: number): string {
  if (roe < 0.05) return chartColors.bad;
  if (roe < 0.15) return chartColors.warning;
  return chartColors.good;
}

function ratioColor(value: number | null, ok: number, great: number): string {
  if (value === null) return chartColors.grid;
  if (value < ok) return chartColors.bad;
  if (value < great) return chartColors.warning;
  return chartColors.good;
}

function endettementColor(value: number | null): string {
  if (value === null) return chartColors.grid;
  if (value > 0.7) return chartColors.bad;
  if (value > 0.5) return chartColors.warning;
  return chartColors.good;
}

function metricByEntreprise(rows: PerformanceRow[], key: 'roe' | 'roa' | 'roce'): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (r[key] !== null) out[r.entrepriseNom] = r[key];
  }
  return out;
}

function aggregatePerEntreprise(rows: PerformanceRow[]): PerformanceRow[] {
  const groups = new Map<string, PerformanceRow[]>();
  for (const r of rows) {
    const arr = groups.get(r.entrepriseNom) ?? [];
    arr.push(r);
    groups.set(r.entrepriseNom, arr);
  }
  const result: PerformanceRow[] = [];
  for (const [nom, group] of groups) {
    const first = group[0]!;
    const avgNum = (key: keyof PerformanceRow): number | null => {
      const vals = group.map((r) => r[key]).filter((v): v is number => typeof v === 'number');
      return vals.length === 0 ? null : vals.reduce((a, v) => a + v, 0) / vals.length;
    };
    result.push({
      ...first,
      entrepriseNom: nom,
      annee: 0,
      roe: avgNum('roe'),
      roa: avgNum('roa'),
      roce: avgNum('roce'),
      currentRatio: avgNum('currentRatio'),
      tauxEndettement: avgNum('tauxEndettement'),
      margeNette: avgNum('margeNette'),
      margeBrute: avgNum('margeBrute'),
    });
  }
  return result;
}
