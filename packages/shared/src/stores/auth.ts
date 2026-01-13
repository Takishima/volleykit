/**
 * Authentication store - Platform-agnostic auth state
 *
 * This will be extracted from web-app/src/shared/stores/auth.ts
 * Note: No persist middleware - platform adapters handle storage
 */

import { create } from 'zustand';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  profilePictureUrl?: string;
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';
export type DataSource = 'api' | 'demo' | 'calendar';

export interface AuthState {
  status: AuthStatus;
  user: UserProfile | null;
  dataSource: DataSource;
  error: string | null;
  // Actions
  setUser: (user: UserProfile) => void;
  setStatus: (status: AuthStatus) => void;
  setError: (error: string | null) => void;
  setDataSource: (source: DataSource) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  user: null,
  dataSource: 'api',
  error: null,

  setUser: (user) => set({ user, status: 'authenticated', error: null }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: 'error' }),
  setDataSource: (dataSource) => set({ dataSource }),
  logout: () => set({ user: null, status: 'idle', error: null }),
}));
