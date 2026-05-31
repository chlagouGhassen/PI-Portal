import { useId } from 'react';
import { cn } from '@/lib/cn';

interface YearRangeFilterProps {
  years: number[];
  range: [number, number];
  onChange: (range: [number, number]) => void;
}

/**
 * Sélecteur de plage d'années avec deux <select> stylés "console".
 * - Select "from" filtré <= to (impossible de choisir une borne incohérente)
 * - Select "to"   filtré >= from
 * - Bouton reset si la plage actuelle != [min, max]
 */
export function YearRangeFilter({ years, range, onChange }: YearRangeFilterProps): JSX.Element {
  const id = useId();
  if (years.length === 0) return <></>;
  const [from, to] = range;
  const minYear = years[0]!;
  const maxYear = years[years.length - 1]!;
  const isFullRange = from === minYear && to === maxYear;

  return (
    <div className="inline-flex items-stretch border border-ink-700 bg-ink-900/40 font-mono text-xs">
      <span className="px-3 inline-flex items-center text-[10px] uppercase tracking-widest text-slate-500 border-r border-ink-700">
        Plage
      </span>

      <label htmlFor={`${id}-from`} className="sr-only">Année de début</label>
      <select
        id={`${id}-from`}
        value={from}
        onChange={(e) => onChange([Number(e.target.value), to])}
        className="bg-transparent text-slate-100 px-3 py-1.5 pr-7 tabular-nums focus:outline-none cursor-pointer border-r border-ink-700"
      >
        {years.filter((y) => y <= to).map((y) => (
          <option key={y} value={y} className="bg-ink-950">{y}</option>
        ))}
      </select>

      <span className="px-2 inline-flex items-center text-slate-600 select-none">→</span>

      <label htmlFor={`${id}-to`} className="sr-only">Année de fin</label>
      <select
        id={`${id}-to`}
        value={to}
        onChange={(e) => onChange([from, Number(e.target.value)])}
        className="bg-transparent text-slate-100 px-3 py-1.5 pr-7 tabular-nums focus:outline-none cursor-pointer"
      >
        {years.filter((y) => y >= from).map((y) => (
          <option key={y} value={y} className="bg-ink-950">{y}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => onChange([minYear, maxYear])}
        disabled={isFullRange}
        title={isFullRange ? 'Déjà la plage complète' : 'Réinitialiser la plage'}
        className={cn(
          'px-3 inline-flex items-center text-[10px] uppercase tracking-widest border-l border-ink-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          isFullRange
            ? 'text-slate-700 cursor-not-allowed'
            : 'text-slate-500 hover:text-accent hover:bg-accent/[0.06]',
        )}
      >
        reset
      </button>
    </div>
  );
}
