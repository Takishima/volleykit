import { useMemo, useState, useEffect } from "react";
import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  isPast,
  isValid,
} from "date-fns";
import { type Locale as DateFnsLocale } from "date-fns/locale";
import { t } from "@/i18n";
import { useLanguageStore } from "@/stores/language";

const localeCache = new Map<string, DateFnsLocale>();

const localeLoaders: Record<string, () => Promise<DateFnsLocale>> = {
  de: () => import("date-fns/locale/de").then((m) => m.de),
  fr: () => import("date-fns/locale/fr").then((m) => m.fr),
  it: () => import("date-fns/locale/it").then((m) => m.it),
  en: () => import("date-fns/locale/en-US").then((m) => m.enUS),
};

/**
 * Preload all date-fns locales. Useful for testing.
 */
export async function preloadDateLocales(): Promise<void> {
  await Promise.all(
    Object.keys(localeLoaders).map((locale) => loadDateLocale(locale)),
  );
}

/**
 * Load a date-fns locale asynchronously.
 * Returns cached locale if already loaded.
 */
async function loadDateLocale(locale: string): Promise<DateFnsLocale> {
  const cached = localeCache.get(locale);
  if (cached) return cached;

  const loader = localeLoaders[locale] ?? localeLoaders.de;
  const loadedLocale = await loader!();
  localeCache.set(locale, loadedLocale);
  return loadedLocale;
}

/**
 * Get the date-fns locale matching the given i18n locale synchronously.
 * Returns undefined if locale hasn't been loaded yet.
 */
export function getDateLocale(locale: string): DateFnsLocale | undefined {
  return localeCache.get(locale);
}

/**
 * Safely parse an ISO date string, returning null if invalid.
 */
export function safeParseISO(
  dateString: string | undefined | null,
): Date | null {
  if (!dateString) return null;
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

interface FormattedDate {
  /** Parsed Date object or null if invalid */
  date: Date | null;
  /** Formatted date label (Today, Tomorrow, or formatted date) */
  dateLabel: string;
  /** Formatted time (HH:mm) or empty string */
  timeLabel: string;
  /** Whether the date is today */
  isToday: boolean;
  /** Whether the date is tomorrow */
  isTomorrow: boolean;
  /** Whether the date is in the past */
  isPast: boolean;
}

/**
 * Hook for formatting dates with i18n-aware labels.
 * Returns "Today", "Tomorrow" (translated), or formatted date string.
 *
 * @param dateString - ISO date string to parse and format
 * @param formatPattern - Optional format pattern for non-today/tomorrow dates (default: 'EEE, d. MMM')
 */
export function useDateFormat(
  dateString: string | undefined | null,
  formatPattern = "EEE, d. MMM",
): FormattedDate {
  const currentLocale = useLanguageStore((state) => state.locale);
  const [locale, setLocale] = useState<DateFnsLocale | undefined>(
    () => localeCache.get(currentLocale),
  );

  useEffect(() => {
    let cancelled = false;
    loadDateLocale(currentLocale).then((loadedLocale) => {
      if (!cancelled) {
        setLocale(loadedLocale);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentLocale]);

  return useMemo(() => {
    const date = safeParseISO(dateString);

    if (!date) {
      return {
        date: null,
        dateLabel: "TBD",
        timeLabel: "",
        isToday: false,
        isTomorrow: false,
        isPast: false,
      };
    }

    const todayCheck = isToday(date);
    const tomorrowCheck = isTomorrow(date);

    let dateLabel: string;
    if (todayCheck) {
      dateLabel = t("common.today");
    } else if (tomorrowCheck) {
      dateLabel = t("common.tomorrow");
    } else {
      dateLabel = format(date, formatPattern, locale ? { locale } : undefined);
    }

    return {
      date,
      dateLabel,
      timeLabel: format(date, "HH:mm", locale ? { locale } : undefined),
      isToday: todayCheck,
      isTomorrow: tomorrowCheck,
      isPast: isPast(date),
    };
  }, [dateString, formatPattern, locale]);
}
