import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Search } from 'lucide-react';
import { BracketBox } from '@/components/BracketBox';

export function NotFoundPage(): JSX.Element {
  return (
    <div className="min-h-full flex items-center justify-center p-6 sm:p-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-2xl"
      >
        <p className="font-mono text-[10px] uppercase tracking-ultrawide text-accent/80">
          err / 404 / route_not_found
        </p>
        <div className="hairline-accent mt-2 mb-6" />

        <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr] gap-6">
          <div>
            <h1 className="display-mega text-7xl sm:text-8xl text-slate-50 caret">
              404
            </h1>
            <p className="display-l text-xl sm:text-2xl text-slate-300 mt-4">
              Hors carte<span className="text-accent">.</span>
            </p>
            <p className="mt-3 text-slate-400 text-sm leading-relaxed max-w-md">
              Cette route n'existe pas - ou vous n'y avez pas accès. Si vous pensez
              que c'est une erreur, contactez un administrateur.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 border border-accent bg-accent/10 text-accent px-4 py-2.5 hover:bg-accent hover:text-ink-950 transition font-mono text-xs uppercase tracking-widest focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
            >
              <ArrowLeft size={12} strokeWidth={2.5} />
              Retour galerie
            </Link>
          </div>

          <BracketBox className="border border-ink-700 bg-ink-900/40 p-5 self-start">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
              <Search size={11} className="text-accent" />
              Diagnostic
            </p>
            <div className="space-y-2.5 font-mono text-xs">
              {[
                ['signal', '404'],
                ['ressource', '∅'],
                ['cause', 'route inconnue'],
                ['retry', 'non'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 pb-2 border-b border-ink-700/60 last:border-0 last:pb-0">
                  <span className="text-slate-500 uppercase tracking-widest text-[10px]">{k}</span>
                  <span className="text-slate-200">{v}</span>
                </div>
              ))}
            </div>
          </BracketBox>
        </div>
      </motion.div>
    </div>
  );
}
