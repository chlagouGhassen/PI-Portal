import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { DashboardSummary } from './types';

export const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

interface DashboardCardProps {
  dashboard: DashboardSummary;
  /** Numéro éditorial (01, 02…) injecté par le parent */
  index?: number;
}

/**
 * Card éditoriale : numéro géant en filigrane à droite, eyebrow catégorie,
 * titre en display, description, "voir →" en bas. Pas de parallax (trop bruyant
 * sur 2-3 cards), juste un hover propre : border ambre + flèche translate.
 */
export function DashboardCard({ dashboard, index }: DashboardCardProps): JSX.Element {
  return (
    <motion.div variants={cardVariants}>
      <Link
        to={`/dashboards/${dashboard.slug}`}
        className="group relative block border border-ink-700 bg-ink-900/40 p-5 sm:p-6 transition hover:border-accent/50 hover:bg-ink-900/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 active:scale-[0.99] overflow-hidden h-full flex flex-col"
      >
        {/* Numéro en filigrane */}
        {index !== undefined && (
          <span
            aria-hidden
            className="absolute top-2 right-3 font-display tabular-nums text-7xl sm:text-8xl text-ink-700/70 select-none leading-none pointer-events-none transition-colors group-hover:text-accent/15"
            style={{ fontVariationSettings: "'opsz' 96, 'wght' 700" }}
          >
            {String(index).padStart(2, '0')}
          </span>
        )}

        {/* Hairline ambre du haut, dévoile au hover */}
        <span className="absolute top-0 left-0 h-[2px] w-12 bg-accent transition-all duration-300 group-hover:w-1/3" />

        <div className="relative z-10 flex-1 flex flex-col">
          {dashboard.category && (
            <p className="font-mono text-[10px] uppercase tracking-ultrawide text-accent/70 mb-3 truncate">
              {dashboard.category}
            </p>
          )}
          <h3 className="display-l text-lg sm:text-xl text-slate-50 leading-tight break-words tracking-tight">
            {dashboard.title}
          </h3>
          {dashboard.description && (
            <p className="mt-3 text-sm leading-relaxed text-slate-400 line-clamp-3">
              {dashboard.description}
            </p>
          )}

          <div className="mt-auto pt-5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-slate-500 group-hover:text-accent transition">
            <span>Ouvrir</span>
            <ArrowRight
              size={12}
              strokeWidth={2.5}
              className="transition-transform group-hover:translate-x-1"
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
