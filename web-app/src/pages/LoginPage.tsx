import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { useAuthStore, NO_REFEREE_ROLE_ERROR_KEY } from "@/stores/auth";
import { useDemoStore } from "@/stores/demo";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Volleyball } from "@/components/ui/icons";
import {
  extractCalendarCode,
  validateCalendarCode,
} from "@/utils/calendar-helpers";
import { HELP_SITE_URL } from "@/utils/constants";

// Demo-only mode restricts the app to demo mode (used in PR preview deployments)
const DEMO_MODE_ONLY = import.meta.env.VITE_DEMO_MODE_ONLY === "true";

type LoginMode = "full" | "calendar";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithCalendar, status, error, setDemoAuthenticated } =
    useAuthStore(
      useShallow((state) => ({
        login: state.login,
        loginWithCalendar: state.loginWithCalendar,
        status: state.status,
        error: state.error,
        setDemoAuthenticated: state.setDemoAuthenticated,
      })),
    );
  const initializeDemoData = useDemoStore((state) => state.initializeDemoData);
  const { t } = useTranslation();

  const [loginMode, setLoginMode] = useState<LoginMode>("calendar");
  const [username, setUsername] = useState("");
  const [calendarInput, setCalendarInput] = useState("");
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [isValidatingCalendar, setIsValidatingCalendar] = useState(false);
  // Use ref for password to minimize memory exposure (avoids re-renders with password in state)
  const passwordRef = useRef<HTMLInputElement>(null);
  // Form ref for manual validation trigger (needed since button is type="button")
  const formRef = useRef<HTMLFormElement>(null);
  const calendarFormRef = useRef<HTMLFormElement>(null);
  // Ref to prevent race condition with double submission
  // State updates are async, so we need a synchronous guard
  const isSubmittingRef = useRef(false);
  // AbortController ref for cancelling calendar validation on unmount
  const calendarValidationAbortRef = useRef<AbortController | null>(null);

  const isLoading = status === "loading" || isValidatingCalendar;

  const handleDemoLogin = useCallback(() => {
    // Initialize with SV (Swiss Volley national) association as default
    // User can switch to other associations via the occupation dropdown
    initializeDemoData("SV");
    setDemoAuthenticated();
    navigate("/");
  }, [initializeDemoData, setDemoAuthenticated, navigate]);

  // Auto-start demo mode in demo-only deployments (PR previews)
  // This runs once on mount - the functions are stable store actions
  useEffect(() => {
    if (DEMO_MODE_ONLY) {
      initializeDemoData("SV");
      setDemoAuthenticated();
      navigate("/");
    }
  }, [initializeDemoData, setDemoAuthenticated, navigate]);

  // Cleanup: abort any pending calendar validation on unmount
  useEffect(() => {
    return () => {
      calendarValidationAbortRef.current?.abort();
    };
  }, []);

  function handleCalendarInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCalendarInput(e.target.value);
    // Clear error when user starts typing
    if (calendarError) {
      setCalendarError(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    // Prevent native form submission - critical for iOS autofill compatibility
    // iOS Safari's password autofill can trigger native form submission,
    // bypassing React's event handling in some cases
    e.preventDefault();
    e.stopPropagation();
    await performLogin();
  }

  async function performLogin() {
    // Use ref for synchronous double-submit prevention (state updates are async)
    if (isSubmittingRef.current || isLoading) return;

    // Trigger HTML5 form validation (needed since button is type="button")
    // reportValidity() shows validation messages and returns false if invalid
    if (formRef.current && !formRef.current.reportValidity()) {
      return;
    }

    isSubmittingRef.current = true;

    try {
      const password = passwordRef.current?.value || "";
      const success = await login(username, password);
      if (success) {
        // Clear password field after successful login
        if (passwordRef.current) {
          passwordRef.current.value = "";
        }
        navigate("/");
      }
    } finally {
      isSubmittingRef.current = false;
    }
  }

  async function handleCalendarSubmit(e: FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    await performCalendarLogin();
  }

  async function performCalendarLogin() {
    if (isSubmittingRef.current || isLoading) return;

    if (calendarFormRef.current && !calendarFormRef.current.reportValidity()) {
      return;
    }

    // Extract calendar code from input (could be URL or just code)
    const code = extractCalendarCode(calendarInput);
    if (!code) {
      setCalendarError("auth.invalidCalendarCode");
      return;
    }

    // Abort any previous validation request
    calendarValidationAbortRef.current?.abort();
    const abortController = new AbortController();
    calendarValidationAbortRef.current = abortController;

    isSubmittingRef.current = true;
    setIsValidatingCalendar(true);
    setCalendarError(null);

    try {
      // Validate the calendar code by checking the API
      const result = await validateCalendarCode(code, abortController.signal);

      // Don't update state if the request was aborted (component unmounted)
      if (abortController.signal.aborted) {
        return;
      }

      if (!result.valid) {
        setCalendarError(result.error ?? "auth.calendarValidationFailed");
        return;
      }

      // Login with the validated calendar code
      await loginWithCalendar(code);
      navigate("/");
    } catch (error) {
      // Ignore AbortError - component was unmounted or new request started
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      setCalendarError("auth.calendarValidationFailed");
    } finally {
      isSubmittingRef.current = false;
      // Only update state if this controller wasn't aborted
      if (!abortController.signal.aborted) {
        setIsValidatingCalendar(false);
      }
    }
  }

  // Handle Enter key on password field to trigger login
  // This provides keyboard submit without relying on form submission
  function handlePasswordKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !isLoading) {
      e.preventDefault();
      performLogin();
    }
  }

  function handleCalendarInputKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Enter" && !isLoading) {
      e.preventDefault();
      performCalendarLogin();
    }
  }

  // Get translated error message
  function getErrorMessage(errorKey: string): string {
    if (errorKey === NO_REFEREE_ROLE_ERROR_KEY) {
      return t("auth.noRefereeRole");
    }
    if (errorKey === "auth.invalidCalendarCode") {
      return t("auth.invalidCalendarCode");
    }
    if (errorKey === "auth.calendarNotFound") {
      return t("auth.calendarNotFound");
    }
    if (errorKey === "auth.calendarValidationFailed") {
      return t("auth.calendarValidationFailed");
    }
    return errorKey;
  }

  // In demo-only mode, show a loading state while auto-redirecting
  if (DEMO_MODE_ONLY) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-page dark:bg-surface-page-dark px-4">
        <div className="text-center" role="status">
          <Volleyball
            className="w-16 h-16 text-primary-600 dark:text-primary-400 mx-auto"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-3xl font-bold text-text-primary dark:text-text-primary-dark">
            VolleyKit
          </h1>
          <p className="mt-4 text-text-muted dark:text-text-muted-dark">
            {t("auth.loadingDemo")}
          </p>
          <div className="mt-4">
            <LoadingSpinner size="md" />
          </div>
        </div>
      </div>
    );
  }

  const displayError = loginMode === "calendar" ? calendarError : error;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-page dark:bg-surface-page-dark px-4">
      <div className="w-full max-w-md">
        {/* Language Switcher */}
        <LanguageSwitcher className="mb-6" />

        {/* Logo */}
        <div className="text-center mb-8">
          <Volleyball
            className="w-16 h-16 text-primary-600 dark:text-primary-400 mx-auto"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-3xl font-bold text-text-primary dark:text-text-primary-dark">
            VolleyKit
          </h1>
          <p className="mt-2 text-text-muted dark:text-text-muted-dark">
            {t("auth.subtitle")}
          </p>
        </div>

        {/* Login form */}
        <div className="card p-6">
          {/* Login mode tabs */}
          <div
            className="flex mb-6 bg-surface-subtle dark:bg-surface-subtle-dark rounded-lg p-1"
            role="tablist"
            aria-label="Login mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={loginMode === "calendar"}
              aria-controls="calendar-login-panel"
              id="calendar-login-tab"
              data-testid="calendar-login-tab"
              onClick={() => setLoginMode("calendar")}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                loginMode === "calendar"
                  ? "bg-surface-card dark:bg-surface-card-dark text-text-primary dark:text-text-primary-dark shadow-sm"
                  : "text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark"
              }`}
            >
              {t("auth.calendarMode")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={loginMode === "full"}
              aria-controls="full-login-panel"
              id="full-login-tab"
              data-testid="full-login-tab"
              onClick={() => setLoginMode("full")}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                loginMode === "full"
                  ? "bg-surface-card dark:bg-surface-card-dark text-text-primary dark:text-text-primary-dark shadow-sm"
                  : "text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark"
              }`}
            >
              {t("auth.fullLogin")}
            </button>
          </div>

          {/* Full Login Panel */}
          {loginMode === "full" && (
            <div
              id="full-login-panel"
              role="tabpanel"
              aria-labelledby="full-login-tab"
            >
              {/* method="post" is defensive fallback if native submission somehow occurs */}
              <form
                ref={formRef}
                onSubmit={handleSubmit}
                method="post"
                className="space-y-6"
              >
                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2"
                  >
                    {t("auth.username")}
                  </label>
                  <input
                    id="username"
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
                    {t("auth.password")}
                  </label>
                  <input
                    id="password"
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
                  <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
                    <p className="text-sm text-danger-600 dark:text-danger-400">
                      {getErrorMessage(displayError)}
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  loading={isLoading}
                  onClick={performLogin}
                  data-testid="login-button"
                >
                  {isLoading ? t("auth.loggingIn") : t("auth.loginButton")}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border-strong dark:border-border-strong-dark" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-surface-card dark:bg-surface-card-dark px-2 text-text-muted dark:text-text-muted-dark">
                      {t("auth.or")}
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
                  {t("auth.demoMode")}
                </Button>
              </form>
            </div>
          )}

          {/* Calendar Mode Panel */}
          {loginMode === "calendar" && (
            <div
              id="calendar-login-panel"
              role="tabpanel"
              aria-labelledby="calendar-login-tab"
            >
              <form
                ref={calendarFormRef}
                onSubmit={handleCalendarSubmit}
                method="post"
                className="space-y-6"
              >
                {/* Info box */}
                <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                  <p className="text-sm text-primary-700 dark:text-primary-300">
                    {t("auth.calendarModeInfo")}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="calendar-input"
                    className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2"
                  >
                    {t("auth.calendarInputLabel")}
                  </label>
                  <input
                    id="calendar-input"
                    data-testid="calendar-input"
                    type="text"
                    value={calendarInput}
                    onChange={handleCalendarInputChange}
                    placeholder={t("auth.calendarInputPlaceholder")}
                    required
                    disabled={isLoading}
                    onKeyDown={handleCalendarInputKeyDown}
                    className="input"
                  />
                  <p className="mt-2 text-xs text-text-muted dark:text-text-muted-dark">
                    {t("auth.calendarModeHint")}
                  </p>
                </div>

                {displayError && (
                  <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
                    <p className="text-sm text-danger-600 dark:text-danger-400">
                      {getErrorMessage(displayError)}
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  loading={isLoading}
                  onClick={performCalendarLogin}
                  data-testid="calendar-login-button"
                >
                  {isLoading
                    ? t("auth.enteringCalendarMode")
                    : t("auth.enterCalendarMode")}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border-strong dark:border-border-strong-dark" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-surface-card dark:bg-surface-card-dark px-2 text-text-muted dark:text-text-muted-dark">
                      {t("auth.or")}
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
                  {t("auth.demoMode")}
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Info */}
        <p className="mt-6 text-center text-xs text-text-subtle dark:text-text-subtle-dark">
          {loginMode === "full" ? (
            <>
              {t("auth.loginInfo")}
              <br />
              {t("auth.privacyNote")}
            </>
          ) : (
            t("auth.calendarModeInfo")
          )}
        </p>

        {/* Help link */}
        <p className="mt-4 text-center">
          <a
            href={HELP_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-400 hover:text-primary-300 dark:text-primary-400 dark:hover:text-primary-300 transition-colors underline underline-offset-2"
          >
            {t("auth.learnHowItWorks")} &rarr;
          </a>
        </p>
      </div>
    </div>
  );
}
