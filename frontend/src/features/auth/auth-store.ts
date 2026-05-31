import { create } from 'zustand';
import type { AuthUser } from './types';

interface AuthState {
  user: AuthUser | null;
  status: 'unknown' | 'authenticated' | 'guest';
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'unknown',
  setUser: (user) => set({ user, status: user ? 'authenticated' : 'guest' }),
}));
