import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface BracketBoxProps extends HTMLAttributes<HTMLDivElement> {
  /** Désactive les équerres (utile pour variantes) */
  noBrackets?: boolean;
  children: ReactNode;
}

/**
 * Conteneur avec coins équerres ┌ ┐ └ ┘ ambre - terminologie console.
 * Les équerres sont des pseudo-éléments + un span enfant pour les 2 autres coins.
 * Pas un cadre complet : les bordures restent la `border` Tailwind, les équerres
 * s'ajoutent par-dessus en surimpression. Distinctif sans alourdir.
 */
export function BracketBox({
  noBrackets = false,
  className,
  children,
  ...rest
}: BracketBoxProps): JSX.Element {
  return (
    <div
      className={cn(
        'relative',
        !noBrackets && 'bracket-card',
        className,
      )}
      {...rest}
    >
      {!noBrackets && (
        <>
          <span className="bracket-tr" />
          <span className="bracket-bl" />
        </>
      )}
      {children}
    </div>
  );
}
