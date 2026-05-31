import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { RequireRole } from '@/features/auth/RequireRole';
import { useHydrateAuth } from '@/features/auth/use-auth';
import { AdminPage } from '@/features/admin/AdminPage';
import { DashboardsPage } from '@/features/dashboards/DashboardsPage';
import { DashboardViewPage } from '@/features/dashboards/DashboardViewPage';
import { NotFoundPage } from '@/features/system/NotFoundPage';

export function App(): JSX.Element {
  useHydrateAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<DashboardsPage />} />
          <Route path="/dashboards/:slug" element={<DashboardViewPage />} />
          <Route
            path="/admin"
            element={
              <RequireRole roles={['ADMIN']}>
                <AdminPage />
              </RequireRole>
            }
          />
          {/* 404 dans le shell → l'utilisateur authentifié garde sa sidebar. */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
