import { useLanguageStore } from "@/stores/language";
import { t, tInterpolate } from "@/i18n";

/**
 * Hook for translations that automatically re-renders when locale changes.
 *
 * @example
 * const { t, tInterpolate, locale } = useTranslation();
 * return <h1>{t('auth.login')}</h1>;
 * return <p>{tInterpolate('search.results', { count: 5 })}</p>;
 */
export function useTranslation() {
  const locale = useLanguageStore((state) => state.locale);
  return { t, tInterpolate, locale };
}
