import type { Role } from '@/features/auth/types';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  accessCount: number;
}

export interface AccessTuple {
  userId: string;
  dashboardId: string;
}

export interface CreatedUserResponse {
  user: { id: string; email: string; name: string; role: Role; createdAt: string };
  password: string;
}
