import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { useDemoStore } from "@/stores/demo";
import { useTranslation } from "@/hooks/useTranslation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Volleyball } from "@/components/ui/icons";

// Demo-only mode restricts the app to demo mode (used in PR preview deployments)
const DEMO_MODE_ONLY = import.meta.env.VITE_DEMO_MODE_ONLY === "true";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, status, error, setDemoAuthenticated } = useAuthStore();
  const { initializeDemoData } = useDemoStore();
  const { t } = useTranslation();

  const [username, setUsername] = useState("");
  // Use ref for password to minimize memory exposure (avoids re-renders with password in state)
  const passwordRef = useRef<HTMLInputElement>(null);

  const isLoading = status === "loading";

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const password = passwordRef.current?.value || "";
    const success = await login(username, password);
    if (success) {
      // Clear password field after successful login
      if (passwordRef.current) {
        passwordRef.current.value = "";
      }
      navigate("/");
    }
  }

  // In demo-only mode, show a loading state while auto-redirecting
  if (DEMO_MODE_ONLY) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-page dark:bg-surface-page-dark px-4">
        <div className="text-center" role="status">
          <Volleyball className="w-16 h-16 text-primary-600 dark:text-primary-400 mx-auto" aria-hidden="true" />
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-page dark:bg-surface-page-dark px-4">
      <div className="w-full max-w-md">
        {/* Language Switcher */}
        <LanguageSwitcher className="mb-6" />

        {/* Logo */}
        <div className="text-center mb-8">
          <Volleyball className="w-16 h-16 text-primary-600 dark:text-primary-400 mx-auto" aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-bold text-text-primary dark:text-text-primary-dark">
            VolleyKit
          </h1>
          <p className="mt-2 text-text-muted dark:text-text-muted-dark">
            {t("auth.subtitle")}
          </p>
        </div>

        {/* Login form */}
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                className="input"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
                <p className="text-sm text-danger-600 dark:text-danger-400">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              data-testid="login-button"
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>{t("auth.loggingIn")}</span>
                </>
              ) : (
                t("auth.loginButton")
              )}
            </button>

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

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoading}
              data-testid="demo-button"
              className="btn btn-secondary w-full"
            >
              {t("auth.demoMode")}
            </button>
          </form>
        </div>

        {/* Info */}
        <p className="mt-6 text-center text-xs text-text-subtle dark:text-text-subtle-dark">
          {t("auth.loginInfo")}
          <br />
          {t("auth.privacyNote")}
        </p>
      </div>
    </div>
  );
}
