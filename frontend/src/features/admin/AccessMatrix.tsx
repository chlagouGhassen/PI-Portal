import { useMemo, useState } from 'react';
import { Check, Loader2, ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/cn';
import {
  useAdminAccess,
  useAdminDashboards,
  useAdminUsers,
  useGrantAccess,
  useRevokeAccess,
} from './use-admin';

export function AccessMatrix(): JSX.Element {
  const users = useAdminUsers();
  const dashboards = useAdminDashboards();
  const access = useAdminAccess();
  const grant = useGrantAccess();
  const revoke = useRevokeAccess();

  const [pending, setPending] = useState<Set<string>>(new Set());

  const accessSet = useMemo(() => {
    const set = new Set<string>();
    for (const a of access.data ?? []) set.add(`${a.userId}|${a.dashboardId}`);
    return set;
  }, [access.data]);

  if (!users.data || !dashboards.data || !access.data) {
    return <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">sync…</p>;
  }

  const usersByRole = {
    USER: users.data.filter((u) => u.role === 'USER'),
    ADMIN: users.data.filter((u) => u.role === 'ADMIN'),
  };

  const toggle = async (userId: string, dashboardId: string) => {
    const key = `${userId}|${dashboardId}`;
    const had = accessSet.has(key);
    setPending((p) => new Set(p).add(key));
    try {
      if (had) await revoke.mutateAsync({ userId, dashboardId });
      else await grant.mutateAsync({ userId, dashboardId });
    } finally {
      setPending((p) => {
        const n = new Set(p);
        n.delete(key);
        return n;
      });
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
        Cliquez une case pour accorder ou révoquer l'accès. Les <span className="text-accent font-medium">administrateurs</span> voient
        automatiquement <span className="font-mono text-accent">tous</span> les dashboards
        (court-circuit du filtre côté serveur - règle non négociable du backend).
      </p>

      <div className="border border-ink-700 bg-ink-900/40 overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead className="bg-ink-900/80 border-b border-ink-700">
            <tr>
              <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-slate-500 font-medium sticky left-0 bg-ink-900/95 z-10 border-r border-ink-700">
                Dashboard
              </th>
              {usersByRole.USER.map((u, i) => (
                <th
                  key={u.id}
                  className="px-2 py-3 font-mono text-[10px] text-slate-400 font-normal text-center min-w-[80px] border-r border-ink-700/60 last:border-r-0"
                  title={u.email}
                >
                  <div className="text-slate-600 tabular-nums text-[9px] mb-1">U.{String(i + 1).padStart(2, '0')}</div>
                  <div className="truncate max-w-[100px] mx-auto text-slate-300 normal-case">{u.name}</div>
                  <div className="text-slate-600 font-normal mt-0.5 truncate max-w-[100px] mx-auto normal-case">{u.email}</div>
                </th>
              ))}
              {usersByRole.ADMIN.length > 0 && (
                <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-widest text-accent font-medium text-center border-l-2 border-accent/40">
                  <div className="inline-flex items-center gap-1">
                    <ShieldCheck size={11} />
                    admins
                  </div>
                  <div className="text-accent/60 mt-0.5 tabular-nums">({usersByRole.ADMIN.length})</div>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700/60">
            {dashboards.data.map((d, i) => (
              <tr key={d.id} className="hover:bg-ink-900/60 transition">
                <td className="px-4 py-2.5 sticky left-0 bg-ink-900/95 backdrop-blur z-10 border-r border-ink-700">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[10px] text-slate-600 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-slate-100">{d.title}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-600 ml-6">{d.slug}</div>
                </td>
                {usersByRole.USER.map((u) => {
                  const key = `${u.id}|${d.id}`;
                  const has = accessSet.has(key);
                  const isPending = pending.has(key);
                  return (
                    <td key={u.id} className="px-2 py-2 text-center border-r border-ink-700/60 last:border-r-0">
                      <button
                        onClick={() => toggle(u.id, d.id)}
                        disabled={isPending}
                        className={cn(
                          'inline-flex h-8 w-8 items-center justify-center border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                          has
                            ? 'border-accent bg-accent/15 text-accent hover:bg-accent/25'
                            : 'border-ink-700 bg-ink-900/60 text-slate-700 hover:border-slate-500 hover:text-slate-400',
                        )}
                        title={has ? 'Révoquer' : 'Accorder'}
                      >
                        {isPending ? <Loader2 size={12} className="animate-spin" /> : has ? <Check size={14} strokeWidth={3} /> : ''}
                      </button>
                    </td>
                  );
                })}
                {usersByRole.ADMIN.length > 0 && (
                  <td className="px-3 py-2 text-center border-l-2 border-accent/40">
                    <span className="inline-flex items-center px-2 py-0.5 bg-accent/15 text-accent text-[9px] font-mono uppercase tracking-widest">
                      auto
                    </span>
                  </td>
                )}
              </tr>
            ))}
            {dashboards.data.length === 0 && (
              <tr>
                <td colSpan={usersByRole.USER.length + 2} className="px-4 py-10 text-center text-slate-500">
                  Aucun dashboard. Ajoutez-en depuis l'onglet « Dashboards ».
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
