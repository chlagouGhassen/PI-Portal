import { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, LayoutGrid, ShieldCheck, Users } from 'lucide-react';

import { cn } from '@/lib/cn';
import { SectionHeader } from '@/components/SectionHeader';
import { UsersPanel } from './UsersPanel';
import { DashboardsPanel } from './DashboardsPanel';
import { AccessMatrix } from './AccessMatrix';
import { DataPanel } from './DataPanel';

type Tab = 'users' | 'dashboards' | 'access' | 'data';

const TABS: { id: Tab; label: string; code: string; icon: typeof Users; sub: string }[] = [
  { id: 'users', label: 'Utilisateurs', code: '2.1', icon: Users, sub: 'comptes & rôles' },
  { id: 'dashboards', label: 'Dashboards', code: '2.2', icon: LayoutGrid, sub: 'registre' },
  { id: 'access', label: 'Accès', code: '2.3', icon: ShieldCheck, sub: 'matrice' },
  { id: 'data', label: 'Données', code: '2.4', icon: Database, sub: 'import .pbix' },
];

export function AdminPage(): JSX.Element {
  const [tab, setTab] = useState<Tab>('users');
  const activeMeta = TABS.find((t) => t.id === tab)!;

  return (
    <div className="p-5 sm:p-8 lg:p-12 max-w-7xl mx-auto">
      <SectionHeader
        index="02"
        eyebrow="Administration"
        title={
          <>
            Console
            <span className="text-accent">.</span>
          </>
        }
        italicNote={activeMeta.sub}
        size="page"
        className="mb-10"
      />

      {/* Tabs : sous-format "tabs / codes" */}
      <nav className="flex border border-ink-700 bg-ink-900/40 mb-6 overflow-x-auto" role="tablist">
        {TABS.map((t, i) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                'group relative flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent shrink-0',
                i < TABS.length - 1 && 'border-r border-ink-700',
                active
                  ? 'bg-accent/[0.07] text-slate-50'
                  : 'text-slate-500 hover:text-slate-100 hover:bg-ink-900',
              )}
            >
              {active && (
                <motion.span
                  layoutId="admin-tab-rail"
                  className="absolute top-0 left-0 right-0 h-[2px] bg-accent"
                />
              )}
              <Icon size={14} strokeWidth={active ? 2.5 : 2} className={active ? 'text-accent' : ''} />
              <span>{t.label}</span>
              <span className={cn('font-mono text-[9px] tabular-nums tracking-widest', active ? 'text-accent/70' : 'text-slate-600')}>
                {t.code}
              </span>
            </button>
          );
        })}
      </nav>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        role="tabpanel"
      >
        {tab === 'users' && <UsersPanel />}
        {tab === 'dashboards' && <DashboardsPanel />}
        {tab === 'access' && <AccessMatrix />}
        {tab === 'data' && <DataPanel />}
      </motion.div>
    </div>
  );
}
