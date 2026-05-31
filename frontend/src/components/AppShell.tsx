import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

import { BrandMark } from './BrandMark';
import { GrainOverlay } from './GrainOverlay';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';

const STORAGE_KEY = 'pi-sidebar-collapsed';

export function AppShell(): JSX.Element {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    // flex-col : sidebar+main en haut, StatusBar full-width en bas.
    // Sans ça, la StatusBar étant fille de la colonne droite, son border-t
    // s'arrête au bord de la sidebar quand collapsée -> discontinuité visuelle.
    <div className="relative flex flex-col h-screen overflow-hidden bg-ink-950">
      <GrainOverlay />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar desktop */}
        <div className="hidden lg:flex relative z-10">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        </div>

        {/* Drawer mobile */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="lg:hidden fixed inset-0 z-30 bg-ink-950/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
                className="lg:hidden fixed inset-y-0 left-0 z-40 w-64"
              >
                <Sidebar collapsed={false} onToggle={() => {}} onNavigate={() => setMobileOpen(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Topbar mobile */}
        <div className="lg:hidden fixed top-0 inset-x-0 z-20 flex items-center justify-between px-3 h-14 border-b border-ink-700 bg-ink-950/90 backdrop-blur">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex items-center justify-center h-10 w-10 border border-ink-700 text-slate-300 hover:bg-ink-900 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          <div className="flex items-center gap-2.5">
            <BrandMark size={26} />
            <p className="display-l text-sm">PI Portal</p>
          </div>
          <span className="w-10" />
        </div>

        {/* Main content (frère de la sidebar) */}
        <main className="relative z-10 flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="min-h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* StatusBar : full-width sous le couple sidebar+main */}
      <StatusBar />
    </div>
  );
}
