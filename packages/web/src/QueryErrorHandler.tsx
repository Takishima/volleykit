/**
 * QueryErrorHandler monitors React Query errors and redirects to login on auth failures.
 * This catches stale session errors (401, 403, 406) that occur after initial auth check.
 */

import { useEffect, useRef } from 'react'

import { useNavigate } from 'react-router-dom'

import { queryClient } from '@/queryClientConfig'
import { useAuthStore } from '@/shared/stores/auth'
import { logger } from '@/shared/utils/logger'
import { isAuthError } from '@/shared/utils/query-error-utils'

export function QueryErrorHandler({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const dataSource = useAuthStore((state) => state.dataSource)
  const isRedirectingRef = useRef(false)

  useEffect(() => {
    const handleQueryError = (error: unknown) => {
      // Only handle auth errors for API mode - demo and calendar modes don't use server auth
      if (dataSource !== 'api' || isRedirectingRef.current) return

      if (isAuthError(error)) {
        isRedirectingRef.current = true
        logger.warn('Authentication error detected, redirecting to login:', error)
        logout()
          .catch((err) => logger.error('Logout failed during redirect:', err))
          .finally(() => {
            navigate('/login', { replace: true })
          })
      }
    }

    const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.error) {
        handleQueryError(event.query.state.error)
      }
    })

    const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.mutation.state.error) {
        handleQueryError(event.mutation.state.error)
      }
    })

    return () => {
      unsubscribeQueries()
      unsubscribeMutations()
    }
  }, [navigate, logout, dataSource])

  return <>{children}</>
}
