import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { useAuthStore } from '@/features/auth/auth-store';
import { useLogout } from '@/features/auth/use-auth';
import { BrandMark } from './BrandMark';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onToggle, onNavigate }: SidebarProps): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  const items = [
    { to: '/', label: 'Dashboards', code: '01', icon: LayoutDashboard },
    ...(user?.role === 'ADMIN'
      ? [{ to: '/admin', label: 'Administration', code: '02', icon: ShieldCheck }]
      : []),
  ];

  return (
    <aside
      className={cn(
        'flex flex-col h-full border-r border-ink-700 bg-ink-950/90 backdrop-blur transition-[width] duration-200',
        collapsed ? 'w-[68px]' : 'w-60',
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-3.5 h-[68px] border-b border-ink-700">
        <BrandMark size={36} />
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="display-l text-base leading-none text-slate-50">
              PI Portal
            </p>
            <p className="font-mono text-[9px] uppercase tracking-ultrawide text-accent/70 mt-1.5">
              v.0.1 / build 2026
            </p>
          </div>
        )}
      </div>

      {/* Nav header */}
      {!collapsed && (
        <p className="px-4 pt-5 pb-2 font-mono text-[9px] uppercase tracking-ultrawide text-slate-600">
          Navigation
        </p>
      )}

      <nav className={cn('flex-1 px-2 py-1 space-y-0.5 overflow-y-auto', collapsed && 'pt-4')}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center rounded-sm text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                collapsed ? 'h-11 justify-center' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'text-accent'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-ink-900/60',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-rail"
                    className={cn(
                      'absolute left-0 w-[2px] bg-accent',
                      collapsed ? 'inset-y-2' : 'top-1.5 bottom-1.5',
                    )}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <item.icon size={16} className="shrink-0 relative" strokeWidth={isActive ? 2.5 : 2} />
                {!collapsed && (
                  <>
                    <span className="relative truncate flex-1">{item.label}</span>
                    <span
                      className={cn(
                        'relative font-mono text-[9px] tabular-nums tracking-widest',
                        isActive ? 'text-accent/70' : 'text-slate-600 group-hover:text-slate-500',
                      )}
                    >
                      {item.code}
                    </span>
                  </>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User card + actions */}
      <div className="border-t border-ink-700 p-2.5 space-y-1.5">
        {!collapsed && user && (
          <div className="px-3 py-2 border-l-2 border-accent/60">
            <p className="text-sm text-slate-100 truncate leading-tight">{user.name}</p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mt-1 truncate">
              {user.email}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-ultrawide text-accent/80 mt-0.5">
              role: {user.role}
            </p>
          </div>
        )}
        <div className="flex gap-1">
          <button
            onClick={() => logout.mutate()}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-2 border border-ink-700 px-3 py-2 text-[11px] font-mono uppercase tracking-widest text-slate-500 hover:text-slate-100 hover:border-ink-500 hover:bg-ink-900 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              collapsed && 'flex-none w-12',
            )}
            title="Déconnexion"
          >
            <LogOut size={12} />
            {!collapsed && 'logout'}
          </button>
          <button
            onClick={onToggle}
            className="hidden lg:inline-flex items-center justify-center w-10 border border-ink-700 text-slate-500 hover:bg-ink-900 hover:text-slate-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title={collapsed ? 'Déplier' : 'Replier'}
            aria-label={collapsed ? 'Déplier la sidebar' : 'Replier la sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
