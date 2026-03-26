import { Button } from '@/common/components/Button'
import { Volleyball } from '@/common/components/icons'
import { LanguageSwitcher } from '@/common/components/LanguageSwitcher'
import { getHelpSiteUrl } from '@/common/utils/constants'
import { LoginErrorWithUpdateHint } from '@/features/auth/components/LoginErrorWithUpdateHint'
import { LoginUpdateBanner } from '@/features/auth/components/LoginUpdateBanner'

import { useLoginPageLogic } from './hooks/useLoginPageLogic'

// Demo-only mode restricts the app to demo mode (used in PR preview deployments)
const DEMO_MODE_ONLY = import.meta.env.VITE_DEMO_MODE_ONLY === 'true'

export function LoginPage() {
  const {
    loginMode,
    setLoginMode,
    username,
    setUsername,
    calendarInput,
    isLoading,
    isLockedOut,
    isUpdating,
    isCheckingForUpdate,
    checkedForUpdateAfterError,
    needRefresh,
    displayError,
    passwordRef,
    formRef,
    calendarFormRef,
    handleSubmit,
    handleCalendarSubmit,
    performLogin,
    performCalendarLogin,
    handleDemoLogin,
    handleUpdate,
    handleCalendarInputChange,
    handlePasswordKeyDown,
    handleCalendarInputKeyDown,
    getErrorMessage,
    updateApp,
    t,
  } = useLoginPageLogic()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-page dark:bg-surface-page-dark px-4">
      <div className="w-full max-w-md">
        {/* Language Switcher */}
        <LanguageSwitcher className="mb-6" />

        {/* Logo */}
        <div className="text-center mb-8">
          <Volleyball
            className="w-16 h-16 text-secondary-500 dark:text-secondary-400 mx-auto"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-3xl font-bold text-text-primary dark:text-text-primary-dark">
            VolleyKit
          </h1>
          <p className="mt-2 text-text-muted dark:text-text-muted-dark">{t('auth.subtitle')}</p>
        </div>

        {/* Update banner - shown when PWA needs update to prevent login errors */}
        {needRefresh && <LoginUpdateBanner onUpdate={updateApp} />}

        {/* Login form */}
        <div className="card p-6">
          {/* Login mode tabs - hidden in demo-only mode since only calendar is allowed */}
          {!DEMO_MODE_ONLY && (
            <div
              className="flex mb-6 bg-surface-subtle dark:bg-surface-subtle-dark rounded-lg p-1"
              role="tablist"
              aria-label="Login mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={loginMode === 'calendar'}
                aria-controls="calendar-login-panel"
                id="calendar-login-tab"
                data-testid="calendar-login-tab"
                onClick={() => setLoginMode('calendar')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  loginMode === 'calendar'
                    ? 'bg-surface-card dark:bg-surface-card-dark text-text-primary dark:text-text-primary-dark shadow-sm'
                    : 'text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark'
                }`}
              >
                {t('auth.calendarMode')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={loginMode === 'full'}
                aria-controls="full-login-panel"
                id="full-login-tab"
                data-testid="full-login-tab"
                onClick={() => setLoginMode('full')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  loginMode === 'full'
                    ? 'bg-surface-card dark:bg-surface-card-dark text-text-primary dark:text-text-primary-dark shadow-sm'
                    : 'text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark'
                }`}
              >
                {t('auth.fullLogin')}
              </button>
            </div>
          )}

          {/* Full Login Panel - only shown when tab is selected (tabs hidden in demo-only mode) */}
          {loginMode === 'full' && (
            <div id="full-login-panel" role="tabpanel" aria-labelledby="full-login-tab">
              {/* method="post" and action are defensive fallback if native submission somehow occurs.
                  action="https://volleymanager.volleyball.ch" tells password managers to associate
                  credentials with volleymanager.volleyball.ch (same as the native app's associatedDomains). */}
              <form
                ref={formRef}
                onSubmit={handleSubmit}
                method="post"
                action="https://volleymanager.volleyball.ch"
                className="space-y-6"
              >
                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2"
                  >
                    {t('auth.username')}
                  </label>
                  <input
                    id="username"
                    name="username"
                    data-testid="username-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                    disabled={isLoading}
                    className="input"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2"
                  >
                    {t('auth.password')}
                  </label>
                  <input
                    id="password"
                    name="password"
                    data-testid="password-input"
                    type="password"
                    ref={passwordRef}
                    autoComplete="current-password"
                    required
                    disabled={isLoading}
                    onKeyDown={handlePasswordKeyDown}
                    className="input"
                  />
                </div>

                {displayError && (
                  <LoginErrorWithUpdateHint
                    errorMessage={getErrorMessage(displayError)}
                    showUpdateHint={checkedForUpdateAfterError && !isLockedOut}
                    updateAvailable={needRefresh}
                    onUpdate={handleUpdate}
                    isUpdating={isUpdating}
                    isCheckingForUpdate={isCheckingForUpdate}
                  />
                )}

                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  loading={isLoading}
                  disabled={isLockedOut || needRefresh}
                  onClick={performLogin}
                  data-testid="login-button"
                >
                  {isLoading ? t('auth.loggingIn') : t('auth.loginButton')}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border-strong dark:border-border-strong-dark" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-surface-card dark:bg-surface-card-dark px-2 text-text-muted dark:text-text-muted-dark">
                      {t('auth.or')}
                    </span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  onClick={handleDemoLogin}
                  disabled={isLoading}
                  fullWidth
                  data-testid="demo-button"
                >
                  {t('auth.demoMode')}
                </Button>
              </form>
            </div>
          )}

          {/* Calendar Mode Panel */}
          {loginMode === 'calendar' && (
            <div id="calendar-login-panel" role="tabpanel" aria-labelledby="calendar-login-tab">
              <form
                ref={calendarFormRef}
                onSubmit={handleCalendarSubmit}
                method="post"
                className="space-y-6"
              >
                {/* Info box */}
                <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                  <p className="text-sm text-primary-700 dark:text-primary-300">
                    {t('auth.calendarModeInfo')}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="calendar-input"
                    className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2"
                  >
                    {t('auth.calendarInputLabel')}
                  </label>
                  <input
                    id="calendar-input"
                    data-testid="calendar-input"
                    type="text"
                    value={calendarInput}
                    onChange={handleCalendarInputChange}
                    placeholder={t('auth.calendarInputPlaceholder')}
                    required
                    disabled={isLoading}
                    onKeyDown={handleCalendarInputKeyDown}
                    className="input"
                  />
                  <p className="mt-2 text-xs text-text-muted dark:text-text-muted-dark">
                    {t('auth.calendarModeHint')}
                  </p>
                </div>

                {displayError && (
                  <LoginErrorWithUpdateHint
                    errorMessage={getErrorMessage(displayError)}
                    showUpdateHint={checkedForUpdateAfterError}
                    updateAvailable={needRefresh}
                    onUpdate={handleUpdate}
                    isUpdating={isUpdating}
                    isCheckingForUpdate={isCheckingForUpdate}
                  />
                )}

                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  loading={isLoading}
                  disabled={needRefresh}
                  onClick={performCalendarLogin}
                  data-testid="calendar-login-button"
                >
                  {isLoading ? t('auth.enteringCalendarMode') : t('auth.enterCalendarMode')}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border-strong dark:border-border-strong-dark" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-surface-card dark:bg-surface-card-dark px-2 text-text-muted dark:text-text-muted-dark">
                      {t('auth.or')}
                    </span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  onClick={handleDemoLogin}
                  disabled={isLoading}
                  fullWidth
                  data-testid="demo-button"
                >
                  {t('auth.demoMode')}
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Info */}
        <p className="mt-6 text-center text-xs text-text-subtle dark:text-text-subtle-dark">
          {loginMode === 'full' ? (
            <>
              {t('auth.loginInfo')}
              <br />
              {t('auth.privacyNote')}
            </>
          ) : (
            t('auth.calendarModeInfo')
          )}
        </p>

        {/* Help link */}
        <p className="mt-4 text-center">
          <a
            href={getHelpSiteUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-text-muted dark:text-text-muted-dark hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            {t('auth.learnHowItWorks')} &rarr;
          </a>
        </p>
      </div>
    </div>
  )
}
