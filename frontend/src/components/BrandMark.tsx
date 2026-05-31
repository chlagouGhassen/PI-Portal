import { cn } from '@/lib/cn';

interface BrandMarkProps {
  size?: number;
  className?: string;
}

/**
 * Monogramme "PI" géométrique pour Performance Investissements.
 * Conçu comme une barre de chart (P) + une moyenne (I). Lecture immédiate
 * comme "PI" mais évoque la donnée. Architectural, pas SaaS-magic.
 */
export function BrandMark({ size = 40, className }: BrandMarkProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      {/* Fond ambre arrondi */}
      <rect width="40" height="40" rx="9" fill="#f5a623" />

      {/* Glyphe "P" géométrique - barre verticale + arche compacte */}
      <path
        d="M11 9 L11 31"
        stroke="#0a0d12"
        strokeWidth="2.5"
        strokeLinecap="square"
      />
      <path
        d="M11 9 L18 9 Q23 9 23 14 Q23 19 18 19 L11 19"
        stroke="#0a0d12"
        strokeWidth="2.5"
        strokeLinejoin="miter"
        strokeLinecap="square"
        fill="none"
      />

      {/* "I" minimal */}
      <path
        d="M29 9 L29 31"
        stroke="#0a0d12"
        strokeWidth="2.5"
        strokeLinecap="square"
      />

      {/* Tick "moyenne" en bas, signal data */}
      <path
        d="M11 34.5 L29 34.5"
        stroke="#0a0d12"
        strokeWidth="1"
        strokeOpacity="0.4"
      />
    </svg>
  );
}
