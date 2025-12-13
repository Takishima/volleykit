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
    initializeDemoData();
    setDemoAuthenticated();
    navigate("/");
  }, [initializeDemoData, setDemoAuthenticated, navigate]);

  // Auto-start demo mode in demo-only deployments (PR previews)
  // This runs once on mount - the functions are stable store actions
  useEffect(() => {
    if (DEMO_MODE_ONLY) {
      initializeDemoData();
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="text-center" role="status">
          <span className="text-6xl" aria-hidden="true">
            🏐
          </span>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
            VolleyKit
          </h1>
          <p className="mt-4 text-gray-500 dark:text-gray-400">
            {t("auth.loadingDemo")}
          </p>
          {/* Use visual-only spinner since parent has role="status" */}
          <div
            className="w-8 h-8 border-3 border-gray-200 border-t-orange-500 rounded-full animate-spin mt-4 mx-auto"
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Language Switcher */}
        <LanguageSwitcher className="mb-6" />

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-6xl">🏐</span>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
            VolleyKit
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {t("auth.subtitle")}
          </p>
        </div>

        {/* Login form */}
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t("auth.username")}
              </label>
              <input
                id="username"
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
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t("auth.password")}
              </label>
              <input
                id="password"
                type="password"
                ref={passwordRef}
                autoComplete="current-password"
                required
                disabled={isLoading}
                className="input"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
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
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                  {t("auth.or")}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="btn btn-secondary w-full"
            >
              {t("auth.demoMode")}
            </button>
          </form>
        </div>

        {/* Info */}
        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          {t("auth.loginInfo")}
          <br />
          {t("auth.privacyNote")}
        </p>
      </div>
    </div>
  );
}
