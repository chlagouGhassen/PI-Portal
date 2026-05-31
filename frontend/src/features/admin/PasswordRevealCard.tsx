import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, KeyRound, X } from 'lucide-react';
import { BracketBox } from '@/components/BracketBox';

export function PasswordRevealCard({
  password,
  email,
  onClose,
}: {
  password: string;
  email: string;
  onClose: () => void;
}): JSX.Element {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <BracketBox className="border border-accent/40 bg-accent/[0.06] p-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center bg-accent/15 text-accent shrink-0">
            <KeyRound size={16} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-ultrawide text-accent">
              Mot de passe généré · à transmettre maintenant
            </p>
            <p className="text-sm text-slate-100 mt-1">
              Cible : <span className="font-mono text-accent">{email}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Ne sera plus jamais affiché. Communiquez-le par un canal sûr (Signal, sneakernet - pas par email).
            </p>
            <div className="mt-4 flex items-stretch gap-2">
              <code className="flex-1 border border-ink-700 bg-ink-950 px-3 py-2.5 font-mono text-sm text-slate-100 select-all overflow-x-auto">
                {password}
              </code>
              <button
                onClick={copy}
                className="inline-flex items-center gap-1.5 bg-accent text-ink-950 font-mono text-xs uppercase tracking-widest font-semibold px-3 hover:bg-accent-soft transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
              >
                {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
                {copied ? 'copié' : 'copier'}
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 transition shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </BracketBox>
  );
}
