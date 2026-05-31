import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type ApiError } from '@/lib/api';
import type { DashboardSummary } from '@/features/dashboards/types';
import type { Role } from '@/features/auth/types';
import type { AccessTuple, AdminUser, CreatedUserResponse } from './types';

// ─── Users ─────────────────────────────────────────────────────────────────

export function useAdminUsers() {
  return useQuery<AdminUser[], ApiError>({
    queryKey: ['admin', 'users'],
    queryFn: () => api('/admin/users'),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation<CreatedUserResponse, ApiError, { email: string; name: string; role: Role }>({
    mutationFn: (input) =>
      api('/admin/users', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, { id: string; name?: string; role?: Role }>({
    mutationFn: ({ id, ...rest }) =>
      api(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(rest) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api(`/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'access'] });
    },
  });
}

export function useResetPassword() {
  return useMutation<{ password: string }, ApiError, string>({
    mutationFn: (id) => api(`/admin/users/${id}/reset-password`, { method: 'POST' }),
  });
}

// ─── Dashboards (admin CRUD via routes phase 3) ───────────────────────────

export function useAdminDashboards() {
  return useQuery<DashboardSummary[], ApiError>({
    queryKey: ['dashboards'],
    queryFn: () => api('/dashboards'),
  });
}

export function useCreateDashboard() {
  const qc = useQueryClient();
  return useMutation<
    DashboardSummary,
    ApiError,
    { slug: string; title: string; description?: string; category?: string }
  >({
    mutationFn: (input) => api('/dashboards', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboards'] }),
  });
}

export function useUpdateDashboard() {
  const qc = useQueryClient();
  return useMutation<
    DashboardSummary,
    ApiError,
    { id: string; slug?: string; title?: string; description?: string; category?: string }
  >({
    mutationFn: ({ id, ...rest }) =>
      api(`/dashboards/${id}`, { method: 'PUT', body: JSON.stringify(rest) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboards'] }),
  });
}

export function useDeleteDashboard() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api(`/dashboards/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboards'] });
      qc.invalidateQueries({ queryKey: ['admin', 'access'] });
    },
  });
}

// ─── Access matrix ─────────────────────────────────────────────────────────

export function useAdminAccess() {
  return useQuery<AccessTuple[], ApiError>({
    queryKey: ['admin', 'access'],
    queryFn: () => api('/admin/access'),
  });
}

export function useGrantAccess() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, { dashboardId: string; userId: string }>({
    mutationFn: ({ dashboardId, userId }) =>
      api(`/dashboards/${dashboardId}/access`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'access'] }),
  });
}

export function useRevokeAccess() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, { dashboardId: string; userId: string }>({
    mutationFn: ({ dashboardId, userId }) =>
      api(`/dashboards/${dashboardId}/access/${userId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'access'] }),
  });
}
