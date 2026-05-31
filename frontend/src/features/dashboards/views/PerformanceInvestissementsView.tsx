import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
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
import { KpiCard } from '@/components/KpiCard';
import { YearRangeFilter } from '@/components/YearRangeFilter';
import { chartColors, fmt } from '@/lib/chart-theme';
import type { PerformanceRow } from '../use-dashboard-data';

const gridStagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } };

interface ByYear {
  annee: number;
  totalActif: number;
  capitauxPropres: number;
  chiffreAffaires: number;
  resultatNet: number;
  roe: number;
  roa: number;
  roce: number;
}

function aggregateByYear(rows: PerformanceRow[]): ByYear[] {
  const groups = new Map<number, PerformanceRow[]>();
  for (const r of rows) {
    const arr = groups.get(r.annee) ?? [];
    arr.push(r);
    groups.set(r.annee, arr);
  }
  const result: ByYear[] = [];
  for (const [annee, group] of groups) {
    result.push({
      annee,
      totalActif: sumOrZero(group, 'totalActif'),
      capitauxPropres: sumOrZero(group, 'capitauxPropres'),
      chiffreAffaires: sumOrZero(group, 'chiffreAffaires'),
      resultatNet: sumOrZero(group, 'resultatNet'),
      roe: avgOrZero(group, 'roe'),
      roa: avgOrZero(group, 'roa'),
      roce: avgOrZero(group, 'roce'),
    });
  }
  return result.sort((a, b) => a.annee - b.annee);
}

function sumOrZero<T extends Record<K, number | null>, K extends keyof T>(rows: T[], key: K): number {
  return rows.reduce((acc, r) => acc + (r[key] ?? 0), 0);
}

function avgOrZero<T extends Record<K, number | null>, K extends keyof T>(rows: T[], key: K): number {
  const values: number[] = [];
  for (const r of rows) {
    const v = r[key];
    if (v !== null) values.push(v as number);
  }
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

const axisProps = {
  tick: { fill: chartColors.textMuted, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' },
  axisLine: { stroke: chartColors.grid },
  tickLine: false,
} as const;

export function PerformanceInvestissementsView({ rows }: { rows: PerformanceRow[] }): JSX.Element {
  const allEntreprises = useMemo(
    () => [...new Set(rows.map((r) => r.entrepriseNom))].sort(),
    [rows],
  );
  const allYears = useMemo(() => [...new Set(rows.map((r) => r.annee))].sort((a, b) => a - b), [rows]);

  const [selectedEntreprises, setSelectedEntreprises] = useState<Set<string>>(
    () => new Set(allEntreprises),
  );
  const [yearRange, setYearRange] = useState<[number, number]>(() => {
    const minY = allYears[0] ?? 0;
    const maxY = allYears[allYears.length - 1] ?? 0;
    return [minY, maxY];
  });

  // Resync quand la donnée change (re-import .pbix)
  useEffect(() => {
    setSelectedEntreprises(new Set(allEntreprises));
  }, [allEntreprises.join('|')]);
  useEffect(() => {
    const minY = allYears[0] ?? 0;
    const maxY = allYears[allYears.length - 1] ?? 0;
    setYearRange([minY, maxY]);
  }, [allYears.join('|')]);

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          selectedEntreprises.has(r.entrepriseNom) &&
          r.annee >= yearRange[0] &&
          r.annee <= yearRange[1],
      ),
    [rows, selectedEntreprises, yearRange],
  );
  const byYear = useMemo(() => aggregateByYear(filteredRows), [filteredRows]);
  const latest = byYear[byYear.length - 1];
  const previous = byYear[byYear.length - 2];

  const toggleEntreprise = (nom: string) =>
    setSelectedEntreprises((prev) => {
      const next = new Set(prev);
      if (next.has(nom)) next.delete(nom);
      else next.add(nom);
      return next;
    });

  if (!latest) {
    return (
      <div className="space-y-4">
        <BracketBox className="border border-ink-700 bg-ink-900/40 p-5">
          <EntrepriseFilter
            entreprises={allEntreprises}
            selected={selectedEntreprises}
            onToggle={toggleEntreprise}
            onSelectAll={() => setSelectedEntreprises(new Set(allEntreprises))}
            onClear={() => setSelectedEntreprises(new Set())}
          />
        </BracketBox>
        <div className="border border-ink-700 bg-ink-900/40 p-10 text-center text-slate-400">
          <p className="font-display text-base">
            {rows.length === 0 ? 'Aucune donnée importée' : 'Aucune entreprise sélectionnée'}
          </p>
          <p className="text-sm text-slate-500 mt-2">
            {rows.length === 0
              ? "Uploadez votre .pbix depuis Administration → Données."
              : 'Cochez au moins une entreprise pour voir les données.'}
          </p>
        </div>
      </div>
    );
  }

  const delta = (key: keyof ByYear): number | undefined =>
    !previous || previous[key] === 0 ? undefined : (latest[key] - previous[key]) / Math.abs(previous[key]);

  const periodCount = byYear.length;
  const entreprisesCount = selectedEntreprises.size;

  return (
    <motion.div variants={gridStagger} initial="hidden" animate="visible" className="space-y-6">
      {/* Filtres */}
      <BracketBox className="border border-ink-700 bg-ink-900/40 p-5 space-y-4">
        <EntrepriseFilter
          entreprises={allEntreprises}
          selected={selectedEntreprises}
          onToggle={toggleEntreprise}
          onSelectAll={() => setSelectedEntreprises(new Set(allEntreprises))}
          onClear={() => setSelectedEntreprises(new Set())}
        />
        {allYears.length > 1 && (
          <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-ink-700/60">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 tabular-nums">
              {byYear.length} exercice{byYear.length > 1 ? 's' : ''} affiché{byYear.length > 1 ? 's' : ''} ·{' '}
              {yearRange[0]} → {yearRange[1]}
            </p>
            <YearRangeFilter years={allYears} range={yearRange} onChange={setYearRange} />
          </div>
        )}
      </BracketBox>

      {/* Section KPI */}
      <div>
        <div className="flex items-baseline gap-3 mb-4">
          <span className="font-mono text-[10px] uppercase tracking-ultrawide text-accent/70 tabular-nums">
            01.A · Indicateurs
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
            {entreprisesCount} entité{entreprisesCount > 1 ? 's' : ''} · {periodCount} exercice{periodCount > 1 ? 's' : ''} · dernier {latest.annee}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <KpiCard
            index="K.01"
            label={`CA · ${latest.annee}`}
            value={fmt.eurCompact(latest.chiffreAffaires)}
            delta={delta('chiffreAffaires')}
            deltaLabel={previous ? `vs ${previous.annee}` : undefined}
          />
          <KpiCard
            index="K.02"
            label="Résultat Net"
            value={fmt.eurCompact(latest.resultatNet)}
            delta={delta('resultatNet')}
            deltaLabel={previous ? `vs ${previous.annee}` : undefined}
            accentColor={chartColors.series[1]}
          />
          <KpiCard
            index="K.03"
            label="ROE moyen"
            value={fmt.pct(latest.roe)}
            delta={previous ? latest.roe - previous.roe : undefined}
            deltaLabel="pts"
            accentColor={chartColors.series[2]}
          />
          <KpiCard
            index="K.04"
            label="ROA moyen"
            value={fmt.pct(latest.roa)}
            delta={previous ? latest.roa - previous.roa : undefined}
            deltaLabel="pts"
            accentColor={chartColors.series[3]}
          />
          <KpiCard
            index="K.05"
            label="ROCE moyen"
            value={fmt.pct(latest.roce)}
            delta={previous ? latest.roce - previous.roce : undefined}
            deltaLabel="pts"
            accentColor={chartColors.series[4]}
          />
        </div>
      </div>

      {/* Section charts */}
      <div>
        <div className="flex items-baseline gap-3 mb-4">
          <span className="font-mono text-[10px] uppercase tracking-ultrawide text-accent/70 tabular-nums">
            01.B · Évolution temporelle
          </span>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
          <ChartCard
            index="C.01"
            title="Actif total & Capitaux propres"
            subtitle="Cumul toutes entités sélectionnées"
            meta={`série · agrégation par exercice · ${entreprisesCount} entité${entreprisesCount > 1 ? 's' : ''}`}
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={byYear} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="grad-actif" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.series[1]} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={chartColors.series[1]} stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="grad-cp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.series[0]} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={chartColors.series[0]} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="annee" {...axisProps} />
                <YAxis tickFormatter={(v) => fmt.compact(v as number)} {...axisProps} width={50} axisLine={false} />
                <Tooltip
                  content={<ChartTooltip formatter={(v) => fmt.eurCompact(v)} labelPrefix="Exercice" />}
                  cursor={{ stroke: chartColors.grid, strokeDasharray: '3 3' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: chartColors.text }}
                  iconType="square"
                  iconSize={8}
                />
                <Area type="monotone" dataKey="totalActif" name="Actif total" stroke={chartColors.series[1]} strokeWidth={2} fill="url(#grad-actif)" />
                <Area type="monotone" dataKey="capitauxPropres" name="Capitaux propres" stroke={chartColors.series[0]} strokeWidth={2} fill="url(#grad-cp)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            index="C.02"
            title="CA & Résultat net"
            subtitle="Barres = CA / Ligne = Résultat net"
            meta="échelle gauche EUR · échelle droite EUR"
          >
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={byYear} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="annee" {...axisProps} />
                <YAxis yAxisId="left" tickFormatter={(v) => fmt.compact(v as number)} {...axisProps} width={50} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => fmt.compact(v as number)} {...axisProps} width={50} axisLine={false} />
                <Tooltip
                  content={<ChartTooltip formatter={(v) => fmt.eurCompact(v)} labelPrefix="Exercice" />}
                  cursor={{ fill: 'rgba(245,166,35,0.04)' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: chartColors.text }}
                  iconType="square"
                  iconSize={8}
                />
                <ReferenceLine yAxisId="right" y={0} stroke={chartColors.grid} strokeDasharray="2 2" />
                <Bar yAxisId="left" dataKey="chiffreAffaires" name="CA" fill={chartColors.series[3]} radius={[2, 2, 0, 0]} maxBarSize={48} />
                <Line yAxisId="right" type="monotone" dataKey="resultatNet" name="Résultat net" stroke={chartColors.series[0]} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            index="C.03"
            title="Ratios de rentabilité"
            subtitle="ROE · ROA · ROCE moyens par exercice"
            meta="agrégation : moyenne arithmétique"
            className="lg:col-span-2"
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={byYear} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="annee" {...axisProps} />
                <YAxis tickFormatter={(v) => `${((v as number) * 100).toFixed(0)}%`} {...axisProps} width={50} axisLine={false} />
                <Tooltip
                  content={<ChartTooltip formatter={(v) => fmt.pct(v)} labelPrefix="Exercice" />}
                  cursor={{ stroke: chartColors.grid, strokeDasharray: '3 3' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: chartColors.text }}
                  iconType="square"
                  iconSize={8}
                />
                <ReferenceLine y={0} stroke={chartColors.grid} strokeDasharray="2 2" />
                <Line type="monotone" dataKey="roe" name="ROE" stroke={chartColors.series[2]} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="roa" name="ROA" stroke={chartColors.series[3]} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="roce" name="ROCE" stroke={chartColors.series[4]} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </motion.div>
  );
}
