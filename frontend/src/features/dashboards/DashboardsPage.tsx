import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Inbox, Search, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useAuthStore } from '@/features/auth/auth-store';
import { SectionHeader } from '@/components/SectionHeader';
import { DashboardCard } from './DashboardCard';
import { useDashboards } from './use-dashboards';

const galleryVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

export function DashboardsPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const dashboards = useDashboards();
  const [query, setQuery] = useState('');

  // Recherche tolérante : titre, slug, catégorie, description (insensible à la casse + accents)
  const filtered = useMemo(() => {
    if (!dashboards.data) return undefined;
    if (query.trim().length === 0) return dashboards.data;
    const q = query
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
    return dashboards.data.filter((d) => {
      const hay = [d.title, d.slug, d.category ?? '', d.description ?? '']
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
      return hay.includes(q);
    });
  }, [dashboards.data, query]);

  if (!user) return <></>;

  const showSearch = (dashboards.data?.length ?? 0) > 2;

  return (
    <div className="p-5 sm:p-8 lg:p-12 max-w-7xl mx-auto">
      <SectionHeader
        index="01"
        eyebrow="Index"
        title={
          <>
            Dashboards
            <span className="text-accent">.</span>
          </>
        }
        italicNote={user.role === 'ADMIN' ? 'vue admin' : 'votre sélection'}
        description={
          user.role === 'ADMIN'
            ? "Tous les dashboards enregistrés. Gestion des accès via l'onglet Administration."
            : 'Dashboards qui vous ont été attribués. Contactez un administrateur pour demander un nouvel accès.'
        }
        actions={
          showSearch ? (
            // Pattern "input group" : c'est le container qui prend le focus
            // visuel quand l'input ou le bouton à l'intérieur est focused.
            // focus-within:border-accent → bordure pleine ambre (vs /50 avant)
            // + focus-within:bg-ink-900/70 → contraste sur fond
            // L'input interne neutralise la règle globale focus-visible:ring (qui
            // mettait un ring laid à l'intérieur du container).
            <div
              className={cn(
                'inline-flex items-center border bg-ink-900/40 font-mono text-xs transition-colors',
                'border-ink-700 hover:border-ink-500',
                'focus-within:border-accent focus-within:bg-ink-900/70',
              )}
            >
              <Search size={12} className="ml-3 text-slate-500" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="filtrer…"
                aria-label="Rechercher un dashboard"
                className="bg-transparent text-slate-100 px-2.5 py-1.5 w-40 placeholder:text-slate-600 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Effacer la recherche"
                  className="px-2 text-slate-500 hover:text-accent transition focus:outline-none focus-visible:ring-0"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ) : null
        }
        size="page"
        className="mb-10 sm:mb-14"
      />

      {dashboards.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 border border-ink-700 shimmer" />
          ))}
        </div>
      )}

      {dashboards.isError && (
        <div className="border border-signal-bad/40 bg-signal-bad/10 p-6 text-rose-200 text-sm">
          <p className="font-mono uppercase tracking-widest text-xs text-signal-bad mb-1">Erreur</p>
          Impossible de charger les dashboards. Vérifiez le statut de l'API dans la barre du bas.
        </div>
      )}

      {dashboards.data && dashboards.data.length === 0 && (
        <div className="border border-ink-700 bg-ink-900/40 p-10 sm:p-14 text-center">
          <Inbox size={32} className="mx-auto text-slate-600 mb-4" strokeWidth={1.5} />
          <p className="display-l text-lg text-slate-300">Aucun dashboard attribué</p>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            Contactez un administrateur pour qu'il vous accorde l'accès à un ou plusieurs dashboards.
          </p>
        </div>
      )}

      {filtered && filtered.length === 0 && (dashboards.data?.length ?? 0) > 0 && (
        <div className="border border-ink-700 bg-ink-900/40 p-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-2">
            aucun résultat
          </p>
          <p className="text-sm text-slate-400">
            Aucun dashboard ne correspond à <span className="text-accent font-mono">"{query}"</span>.
          </p>
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <motion.div
          key={query}
          variants={galleryVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {filtered.map((d, i) => (
            <DashboardCard key={d.id} dashboard={d} index={i + 1} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
