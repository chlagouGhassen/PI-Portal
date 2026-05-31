import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SectionHeaderProps {
  /** Numéro de section style éditorial (ex. "01", "02") */
  index?: string;
  /** Eyebrow au-dessus du titre - uppercase mono */
  eyebrow?: string;
  /** Titre principal */
  title: ReactNode;
  /** Note italique en complément du titre */
  italicNote?: string;
  /** Description sous-titre */
  description?: ReactNode;
  /** Slot droit pour actions / filtres */
  actions?: ReactNode;
  /** Taille : `page` (massif) ou `section` (mid) */
  size?: 'page' | 'section';
  className?: string;
}

/**
 * Header éditorial avec n° de section, hairline ambre, et titre dramatique.
 * Inspiration : magazine de finance / quotidien financier (FT, Bloomberg print).
 */
export function SectionHeader({
  index,
  eyebrow,
  title,
  italicNote,
  description,
  actions,
  size = 'section',
  className,
}: SectionHeaderProps): JSX.Element {
  return (
    <header className={cn('relative', className)}>
      <div className="flex items-baseline gap-4 mb-4">
        {index && (
          <span
            className="section-no text-[10px] sm:text-xs tabular-nums select-none shrink-0 pt-2"
            aria-hidden
          >
            {index}
          </span>
        )}
        <div className="flex-1 hairline-accent" />
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="font-mono text-[10px] sm:text-xs uppercase tracking-ultrawide text-accent/80 mb-2">
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              size === 'page' ? 'display-xl text-4xl sm:text-5xl lg:text-6xl' : 'display-l text-2xl sm:text-3xl',
              'text-slate-50',
            )}
          >
            {title}
            {italicNote && (
              <span className="font-display italic text-slate-400 font-normal ml-2">
                / {italicNote}
              </span>
            )}
          </h1>
          {description && (
            <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
