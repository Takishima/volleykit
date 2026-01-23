/**
 * useAuth hook - Authentication state hook
 *
 * This will be extracted from web-app/src/features/auth/hooks/
 * Placeholder for now - implementation in Phase 2
 */

import { useAuthStore } from '../stores/auth'

export const useAuth = () => {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const error = useAuthStore((state) => state.error)
  const logout = useAuthStore((state) => state.logout)

  return {
    status,
    user,
    error,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    logout,
  }
}
