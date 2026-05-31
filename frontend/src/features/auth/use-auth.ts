import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, ApiError } from '@/lib/api';
import { useAuthStore } from './auth-store';
import type { AuthUser } from './types';

/**
 * Hydrate le store auth depuis /api/auth/me au montage de l'app.
 * À placer une seule fois dans App (au-dessus du routeur).
 */
export function useHydrateAuth(): void {
  const setUser = useAuthStore((s) => s.setUser);

  const { data, isError, isPending } = useQuery<AuthUser, ApiError>({
    queryKey: ['auth', 'me'],
    queryFn: () => api<AuthUser>('/auth/me'),
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (isPending) return;
    setUser(isError ? null : (data ?? null));
  }, [data, isError, isPending, setUser]);
}

export function useLogin() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation<AuthUser, ApiError, { email: string; password: string }>({
    mutationFn: (creds) =>
      api<AuthUser>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(creds),
      }),
    onSuccess: async (user) => {
      // /auth/login renvoie {id, email, role} - on récupère le profil complet via /me.
      try {
        const me = await api<AuthUser>('/auth/me');
        setUser(me);
        queryClient.setQueryData(['auth', 'me'], me);
      } catch {
        setUser(user as AuthUser);
      }
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation<void, ApiError, void>({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      setUser(null);
      queryClient.clear();
    },
  });
}
