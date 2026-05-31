import { useId } from 'react';
import { cn } from '@/lib/cn';

interface EntrepriseFilterProps {
  entreprises: string[];
  selected: Set<string>;
  onToggle: (entreprise: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}

/**
 * Sélecteur multiple d'entreprises avec :
 * - Eyebrow mono + compteur N/M en gros (signal d'état)
 * - Chips ronds avec barre signal à gauche (active = ambre)
 * - Bouton Tout/Aucun à droite, discret
 */
export function EntrepriseFilter({
  entreprises,
  selected,
  onToggle,
  onSelectAll,
  onClear,
}: EntrepriseFilterProps): JSX.Element {
  const allSelected = entreprises.length > 0 && selected.size === entreprises.length;
  const groupId = useId();

  return (
    <div className="space-y-3" role="group" aria-labelledby={`${groupId}-label`}>
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span
            id={`${groupId}-label`}
            className="font-mono text-[10px] uppercase tracking-widest text-slate-500"
          >
            Filtre · Entreprises
          </span>
          <span className="font-mono text-xs tabular-nums">
            <span className={selected.size === 0 ? 'text-signal-bad' : 'text-accent'}>
              {String(selected.size).padStart(2, '0')}
            </span>
            <span className="text-slate-600">/{String(entreprises.length).padStart(2, '0')}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={allSelected ? onClear : onSelectAll}
          className="text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:text-accent transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
        >
          {allSelected ? '[-] aucun' : '[+] tout'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {entreprises.map((nom) => {
          const isActive = selected.has(nom);
          return (
            <button
              key={nom}
              type="button"
              onClick={() => onToggle(nom)}
              aria-pressed={isActive}
              className={cn(
                'group inline-flex items-center gap-2 border pl-2 pr-3 py-1 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                isActive
                  ? 'border-accent/40 bg-accent/[0.07] text-slate-50'
                  : 'border-ink-700 bg-ink-900/40 text-slate-500 hover:border-ink-500 hover:text-slate-200',
              )}
            >
              <span
                className={cn(
                  'h-3 w-[2px] transition',
                  isActive ? 'bg-accent' : 'bg-ink-600 group-hover:bg-ink-500',
                )}
              />
              <span className="truncate">{nom}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
