import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './auth-store';

/**
 * Garde de route : redirige vers /login si l'utilisateur n'est pas authentifié.
 * Tant que le statut est 'unknown' (hydratation /me en cours), affiche null
 * pour éviter un flash de la page login.
 */
export function RequireAuth({ children }: { children: ReactNode }): JSX.Element | null {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === 'unknown') return null;
  if (status === 'guest') return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}
