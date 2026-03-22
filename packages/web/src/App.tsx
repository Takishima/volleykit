import { lazy, Suspense } from 'react'

// features.offline — IndexedDB query cache persistence (delete this import when removing offline feature)
import { QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { ErrorBoundary } from '@/common/components/ErrorBoundary'
import { AppShell } from '@/common/components/layout/AppShell'
import { LoadingState } from '@/common/components/LoadingSpinner'
import { PageErrorBoundary } from '@/common/components/PageErrorBoundary'
import { ReloadPrompt } from '@/common/components/ReloadPrompt'
import { ToastContainer } from '@/common/components/Toast'
import { features } from '@/common/config/features'
import { usePreloadLocales } from '@/common/hooks/usePreloadLocales'
import { useViewportZoom } from '@/common/hooks/useViewportZoom'
// features.offline — IndexedDB persistence (delete this import when removing offline feature)
import { persistOptions } from '@/common/services/offline'
import { PWAProvider } from '@/contexts/PWAContext'
import { CalendarErrorHandler } from '@/features/assignments/components/CalendarErrorHandler'
import { useCalendarTheme } from '@/features/assignments/hooks/useCalendarTheme'
import { useAuthSync } from '@/hooks/useAuthSync'
import { queryClient } from '@/queryClientConfig'
import { QueryErrorHandler } from '@/QueryErrorHandler'
import { ProtectedRoute, PublicRoute } from '@/RouteGuards'

// Lazy load pages to reduce initial bundle size
// Each page becomes a separate chunk that loads on-demand
const LoginPage = lazy(() =>
  import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
)
const AssignmentsPage = lazy(() =>
  import('@/features/assignments/AssignmentsPage').then((m) => ({ default: m.AssignmentsPage }))
)
const CompensationsPage = lazy(() =>
  import('@/features/compensations/CompensationsPage').then((m) => ({
    default: m.CompensationsPage,
  }))
)
const ExchangePage = lazy(() =>
  import('@/features/exchanges/ExchangePage').then((m) => ({ default: m.ExchangePage }))
)
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)

// Lazy load TourProvider since it's only needed for first-time users (features.helpTours)
const TourProvider = features.helpTours
  ? lazy(() => import('@/common/components/tour').then((m) => ({ default: m.TourProvider })))
  : ({ children }: { children: React.ReactNode }) => <>{children}</>

// features.offline — Use PersistQueryClientProvider for IndexedDB cache persistence, or plain QueryClientProvider
const QueryProvider = features.offline
  ? ({ children }: { children: React.ReactNode }) => (
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        {children}
      </PersistQueryClientProvider>
    )
  : ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

// Base path for router - Vite sets BASE_URL from the `base` config
// Remove trailing slash for React Router basename (it adds its own)
// Handle edge case where BASE_URL is just "/" - use empty string instead
function getBasename(): string {
  const baseUrl = import.meta.env.BASE_URL
  if (baseUrl === '/') {
    return ''
  }
  return baseUrl.replace(/\/$/, '')
}
const BASE_PATH = getBasename()

export default function App() {
  usePreloadLocales()
  useViewportZoom()
  useCalendarTheme()
  useAuthSync()

  return (
    <ErrorBoundary>
      <PWAProvider>
        <QueryProvider>
          <BrowserRouter basename={BASE_PATH}>
            <QueryErrorHandler>
              <Routes>
                {/* Public routes */}
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Suspense fallback={<LoadingState />}>
                        <LoginPage />
                      </Suspense>
                    </PublicRoute>
                  }
                />

                {/* Protected routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <CalendarErrorHandler>
                        <Suspense fallback={null}>
                          <TourProvider>
                            <AppShell />
                          </TourProvider>
                        </Suspense>
                      </CalendarErrorHandler>
                    </ProtectedRoute>
                  }
                >
                  <Route
                    path="/"
                    element={
                      <PageErrorBoundary pageName="AssignmentsPage">
                        <Suspense fallback={<LoadingState />}>
                          <AssignmentsPage />
                        </Suspense>
                      </PageErrorBoundary>
                    }
                  />
                  <Route
                    path="/compensations"
                    element={
                      <PageErrorBoundary pageName="CompensationsPage">
                        <Suspense fallback={<LoadingState />}>
                          <CompensationsPage />
                        </Suspense>
                      </PageErrorBoundary>
                    }
                  />
                  <Route
                    path="/exchange"
                    element={
                      <PageErrorBoundary pageName="ExchangePage">
                        <Suspense fallback={<LoadingState />}>
                          <ExchangePage />
                        </Suspense>
                      </PageErrorBoundary>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <PageErrorBoundary pageName="SettingsPage">
                        <Suspense fallback={<LoadingState />}>
                          <SettingsPage />
                        </Suspense>
                      </PageErrorBoundary>
                    }
                  />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </QueryErrorHandler>
          </BrowserRouter>
          <ReloadPrompt />
          <ToastContainer />
        </QueryProvider>
      </PWAProvider>
    </ErrorBoundary>
  )
}
