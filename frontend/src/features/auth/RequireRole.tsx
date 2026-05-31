import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from './auth-store';
import type { Role } from './types';

/**
 * Garde de route RBAC : exige que l'utilisateur (déjà authentifié) ait l'un des
 * rôles fournis. À placer SOUS RequireAuth.
 *
 * Rappel : c'est un garde UI. La sécurité réelle est côté backend
 * (requireRole). Ne jamais s'appuyer uniquement sur ce composant pour cacher
 * des données sensibles - le filtrage doit avoir lieu côté serveur.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}): JSX.Element {
  const user = useAuthStore((s) => s.user);
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
