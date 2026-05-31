import { useEffect, useState } from 'react';
import { Activity, Wifi } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/features/auth/auth-store';

interface Health {
  status: string;
  db: string;
}

/**
 * Status bar fixe en bas - clin d'œil console / terminal financier.
 * Affiche : heure FR live, état backend (ping /health), session user.
 * Optionnel : caché en dessous de `sm:` pour ne pas voler de place mobile.
 */
export function StatusBar(): JSX.Element {
  const [now, setNow] = useState(() => new Date());
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const health = useQuery<Health, ApiError>({
    queryKey: ['health'],
    queryFn: () => api<Health>('/health'),
    refetchInterval: 30_000,
    retry: 1,
    staleTime: 25_000,
  });

  const isUp = health.data?.status === 'ok' && health.data?.db === 'up';
  const statusColor = health.isError
    ? 'text-signal-bad'
    : isUp
      ? 'text-signal-good'
      : 'text-slate-500';

  return (
    <div className="hidden sm:flex relative z-10 shrink-0 h-7 border-t border-ink-700 bg-ink-950/90 backdrop-blur items-center justify-between px-4 font-mono text-[10px] uppercase tracking-widest text-slate-500 select-none">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <Wifi size={10} className={statusColor} />
          <span className="text-slate-400">api</span>
          <span className={statusColor}>{health.isError ? 'offline' : isUp ? 'connected' : 'pinging'}</span>
        </span>
        {user && (
          <span className="hidden md:inline-flex items-center gap-1.5">
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">session</span>
            <span className="text-slate-300 normal-case lowercase">{user.email}</span>
            <span className="text-accent">[{user.role.toLowerCase()}]</span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 tabular-nums">
        <Activity size={10} className="text-accent" />
        <span>{now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        <span className="text-slate-600">·</span>
        <span>{now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
      </div>
    </div>
  );
}
