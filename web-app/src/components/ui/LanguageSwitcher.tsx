import { useLanguageStore } from "@/stores/language";
import { getAvailableLocales } from "@/i18n";

interface LanguageSwitcherProps {
  variant?: "compact" | "grid";
  className?: string;
}

export function LanguageSwitcher({
  variant = "compact",
  className = "",
}: LanguageSwitcherProps) {
  const { locale, changeLocale } = useLanguageStore();
  const languages = getAvailableLocales();

  const containerClass =
    variant === "grid"
      ? "grid grid-cols-2 sm:grid-cols-4 gap-2"
      : "flex justify-center gap-2";

  const getButtonClass = (isActive: boolean) => {
    if (variant === "grid") {
      return `flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
        isActive
          ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
      }`;
    }
    return `px-3 py-1 rounded-lg text-sm transition-colors ${
      isActive
        ? "bg-orange-500 text-white"
        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
    }`;
  };

  return (
    <div className={`${containerClass} ${className}`}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => changeLocale(lang.code)}
          aria-label={lang.name}
          aria-pressed={locale === lang.code}
          className={getButtonClass(locale === lang.code)}
        >
          {variant === "grid" ? (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {lang.name}
            </span>
          ) : (
            lang.name
          )}
        </button>
      ))}
    </div>
  );
}
