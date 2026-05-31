import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Clock } from 'lucide-react';

import { api, type ApiError } from '@/lib/api';
import { SectionHeader } from '@/components/SectionHeader';
import type { DashboardSummary } from './types';
import { useDashboardData } from './use-dashboard-data';
import { formatRelative, useDataFreshness } from './use-data-freshness';
import { PerformanceInvestissementsView } from './views/PerformanceInvestissementsView';
import { AnalyseComparativeView } from './views/AnalyseComparativeView';
import { PredictionView } from './views/PredictionView';
import { TimeSeriesView } from './views/TimeSeriesView';

// Slugs qui s'appuient sur les données importées via .pbix (vs séries bourse)
const PBIX_DEPENDENT_SLUGS = new Set([
  'performance-investissements',
  'analyse-comparative',
  'prediction',
]);

export function DashboardViewPage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();

  const meta = useQuery<DashboardSummary, ApiError>({
    queryKey: ['dashboard', slug],
    queryFn: () => api<DashboardSummary>(`/dashboards/${slug}`),
    enabled: !!slug,
    retry: false,
  });

  const data = useDashboardData(slug);
  const freshness = useDataFreshness();

  // Calcul du timestamp à afficher selon le type de dashboard.
  const updatedAt = (() => {
    if (!meta.data || !freshness.data) return null;
    if (PBIX_DEPENDENT_SLUGS.has(meta.data.slug)) return freshness.data.pbix;
    if (meta.data.slug === 'serie-temporelle') {
      // Plus récent des 4 .xls
      const mtimes = Object.values(freshness.data.bourse).filter((m): m is string => !!m);
      if (mtimes.length === 0) return null;
      return mtimes.sort().reverse()[0]!;
    }
    return null;
  })();

  return (
    <div className="p-5 sm:p-8 lg:p-12 max-w-7xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-slate-500 hover:text-accent transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
      >
        <ArrowLeft size={12} strokeWidth={2.5} />
        Retour dashboards
      </Link>

      {(meta.isLoading || data.isLoading) && (
        <div className="mt-8 space-y-6">
          <div className="h-16 w-2/3 shimmer" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 border border-ink-700 shimmer" />
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="h-80 border border-ink-700 shimmer" />
            <div className="h-80 border border-ink-700 shimmer" />
          </div>
        </div>
      )}

      {meta.isError && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="mt-8 flex items-start gap-3 border border-signal-bad/40 bg-signal-bad/10 p-5 text-rose-200"
        >
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-display text-base">
              {meta.error.status === 404 ? 'Dashboard introuvable' : 'Erreur de chargement'}
            </p>
            <p className="text-sm text-rose-300/80 mt-1">
              {meta.error.status === 404
                ? "Ce dashboard n'existe pas ou ne vous est pas attribué."
                : 'Réessayez plus tard.'}
            </p>
          </div>
        </motion.div>
      )}

      {meta.data && data.data && (
        <section>
          <SectionHeader
            index={
              meta.data.slug === 'performance-investissements'
                ? '01'
                : meta.data.slug === 'analyse-comparative'
                  ? '02'
                  : meta.data.slug === 'prediction'
                    ? '03'
                    : meta.data.slug === 'serie-temporelle'
                      ? '04'
                      : '05'
            }
            eyebrow={meta.data.category ?? 'Dashboard'}
            title={meta.data.title}
            description={meta.data.description}
            size="page"
            className="mt-8 mb-6"
          />
          {updatedAt && (
            <p
              className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-8 inline-flex items-center gap-2"
              title={new Date(updatedAt).toLocaleString('fr-FR')}
            >
              <Clock size={11} className="text-accent" />
              <span>
                données importées <span className="text-slate-300">{formatRelative(updatedAt)}</span>
              </span>
            </p>
          )}
          {renderView(meta.data.slug, data.data.rows)}
        </section>
      )}
    </div>
  );
}

function renderView(slug: string, rows: Parameters<typeof PerformanceInvestissementsView>[0]['rows']): JSX.Element {
  switch (slug) {
    case 'performance-investissements':
      return <PerformanceInvestissementsView rows={rows} />;
    case 'analyse-comparative':
      return <AnalyseComparativeView rows={rows} />;
    case 'prediction':
      return <PredictionView rows={rows} />;
    case 'serie-temporelle':
      return <TimeSeriesView />;
    default:
      return (
        <div className="border border-ink-700 bg-ink-900/40 p-10 text-center text-slate-400">
          Aucune vue n'est encore associée au slug{' '}
          <code className="font-mono text-accent">{slug}</code>.
        </div>
      );
  }
}
