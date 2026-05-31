import { cn } from '@/lib/cn';

interface YearFilterProps {
  years: number[];
  selected: number | 'all';
  onChange: (year: number | 'all') => void;
  /** Quand on a beaucoup d'années, restreindre l'affichage en chips compactes */
  compact?: boolean;
}

/**
 * Sélecteur d'année avec deux modes :
 * - <8 années : segmented control horizontal
 * - >=8 années : select natif stylé (évite l'overflow)
 */
export function YearFilter({ years, selected, onChange, compact }: YearFilterProps): JSX.Element {
  const useSelect = compact || years.length >= 8;

  if (useSelect) {
    return (
      <div className="inline-flex items-stretch border border-ink-700 bg-ink-900/40 font-mono text-xs">
        <span className="px-3 inline-flex items-center text-[10px] uppercase tracking-widest text-slate-500 border-r border-ink-700">
          Année
        </span>
        <select
          value={selected}
          onChange={(e) => onChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="bg-transparent text-slate-100 px-3 py-1.5 pr-8 tabular-nums focus:outline-none cursor-pointer"
        >
          <option value="all" className="bg-ink-950">Toutes</option>
          {years.map((y) => (
            <option key={y} value={y} className="bg-ink-950">{y}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center border border-ink-700 bg-ink-900/40 font-mono text-xs">
      <span className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-500 border-r border-ink-700">
        Année
      </span>
      <button
        onClick={() => onChange('all')}
        className={cn(
          'px-3 py-1.5 transition border-r border-ink-700/60 last:border-r-0',
          selected === 'all'
            ? 'bg-accent text-ink-950 font-semibold'
            : 'text-slate-400 hover:text-slate-100 hover:bg-ink-900',
        )}
      >
        Toutes
      </button>
      {years.map((year, i) => (
        <button
          key={year}
          onClick={() => onChange(year)}
          className={cn(
            'px-3 py-1.5 transition tabular-nums',
            i < years.length - 1 && 'border-r border-ink-700/60',
            selected === year
              ? 'bg-accent text-ink-950 font-semibold'
              : 'text-slate-400 hover:text-slate-100 hover:bg-ink-900',
          )}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
