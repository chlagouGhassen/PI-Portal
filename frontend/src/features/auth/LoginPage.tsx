import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, AlertCircle, Lock } from 'lucide-react';

import { ApiError } from '@/lib/api';
import { BrandMark } from '@/components/BrandMark';
import { BracketBox } from '@/components/BracketBox';
import { useLogin } from './use-auth';

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: () => navigate(fromPath, { replace: true }),
      },
    );
  };

  const errorMessage = (() => {
    if (!login.isError) return null;
    const err = login.error;
    if (err instanceof ApiError) {
      if (err.status === 401) return 'Identifiants invalides.';
      if (err.status === 429) return 'Trop de tentatives. Réessayez dans quelques minutes.';
    }
    return 'Erreur de connexion. Réessayez.';
  })();

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-950">
      {/* Background : grid pattern + radial glow */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #1e2733 1px, transparent 1px), linear-gradient(to bottom, #1e2733 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 0%, transparent 75%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 50% 40% at 20% 20%, rgba(245, 166, 35, 0.12), transparent 60%), radial-gradient(ellipse 40% 30% at 80% 80%, rgba(20, 184, 166, 0.08), transparent 60%)',
        }}
      />

      <div className="relative z-10 min-h-screen grid lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[1.2fr_1fr]">
        {/* Colonne gauche : éditorial */}
        <aside className="hidden lg:flex flex-col justify-between p-10 xl:p-16 border-r border-ink-800">
          <div className="flex items-center gap-3">
            <BrandMark size={42} />
            <div>
              <p className="display-l text-xl">PI Portal</p>
              <p className="font-mono text-[10px] uppercase tracking-ultrawide text-accent/70 mt-1">
                Performance / Investissements
              </p>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-ultrawide text-slate-600 mb-2">
                01 / Mission
              </p>
              <div className="hairline-accent mb-4" />
              <h2 className="display-xl text-3xl xl:text-4xl text-slate-100 max-w-md">
                Console d'analyse financière
                <span className="text-accent">.</span>
              </h2>
              <p className="mt-4 text-slate-400 max-w-sm leading-relaxed">
                Visualisation comparée des indicateurs de rentabilité, liquidité
                et endettement, par entreprise et par exercice.
              </p>
            </div>

            {/* Mini stat ticker - données décoratives */}
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {[
                { label: 'Entités', value: '04', mute: 'sociétés' },
                { label: 'Exercices', value: '14', mute: '12 → 25' },
                { label: 'Mesures', value: '17', mute: 'KPIs' },
              ].map((s) => (
                <div key={s.label} className="border-l-2 border-ink-700 pl-3 py-1">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-slate-600">
                    {s.label}
                  </p>
                  <p className="display-l text-2xl text-slate-100 tabular-nums mt-1">
                    {s.value}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-slate-600 mt-1">
                    {s.mute}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-ultrawide text-slate-600">
            © PI Portal · Accès réservé
          </p>
        </aside>

        {/* Colonne droite : formulaire */}
        <section className="flex items-center justify-center p-6 sm:p-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-md"
          >
            {/* Mobile-only brand */}
            <div className="lg:hidden flex items-center gap-3 mb-10">
              <BrandMark size={32} />
              <p className="display-l text-base">PI Portal</p>
            </div>

            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-ultrawide text-accent/80">
                02 / Authentification
              </p>
              <div className="hairline-accent mt-2 mb-5" />
              <h1 className="display-xl text-4xl sm:text-5xl text-slate-50">
                Connexion<span className="text-accent">.</span>
              </h1>
              <p className="text-slate-400 text-sm mt-3 flex items-center gap-2">
                <Lock size={12} className="text-slate-500" />
                Accès réservé - email professionnel.
              </p>
            </div>

            <BracketBox className="border border-ink-700 bg-ink-900/40 p-6 sm:p-8">
              <form onSubmit={onSubmit} className="space-y-5" noValidate>
                <div>
                  <label
                    htmlFor="email"
                    className="block font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-2"
                  >
                    Email <span className="text-accent/60">/ identifier</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@société.com"
                    className="w-full border border-ink-700 bg-ink-900/60 px-3 py-2.5 text-slate-100 placeholder:text-slate-600 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 transition font-mono text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-2"
                  >
                    Mot de passe <span className="text-accent/60">/ key</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-ink-700 bg-ink-900/60 px-3 py-2.5 text-slate-100 placeholder:text-slate-600 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 transition font-mono text-sm"
                  />
                </div>

                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    className="flex items-center gap-2 border border-signal-bad/40 bg-signal-bad/10 px-3 py-2 text-sm text-rose-200"
                  >
                    <AlertCircle size={14} className="shrink-0" />
                    {errorMessage}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={login.isPending}
                  className="w-full inline-flex items-center justify-between gap-2 bg-accent text-ink-950 font-semibold px-4 py-3 hover:bg-accent-soft disabled:opacity-60 disabled:cursor-not-allowed transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
                >
                  <span className="font-mono text-xs uppercase tracking-widest">
                    {login.isPending ? 'authentification…' : 'se connecter'}
                  </span>
                  <ArrowRight size={14} strokeWidth={2.5} />
                </button>
              </form>
            </BracketBox>

            <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-widest text-slate-600">
              Session protégée par cookie httpOnly · 7 jours
            </p>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
