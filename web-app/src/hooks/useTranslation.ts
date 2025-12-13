import { useLanguageStore } from "@/stores/language";
import { t } from "@/i18n";

/**
 * Hook for translations that automatically re-renders when locale changes.
 *
 * @example
 * const { t, locale } = useTranslation();
 * return <h1>{t('auth.login')}</h1>;
 */
export function useTranslation() {
  const locale = useLanguageStore((state) => state.locale);
  return { t, locale };
}
