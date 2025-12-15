import { useMemo, useState, useEffect, useRef } from "react";
import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  isPast,
  isValid,
} from "date-fns";
import { type Locale as DateFnsLocale } from "date-fns/locale";
import { enUS } from "date-fns/locale/en-US";
import { t } from "@/i18n";
import { useLanguageStore } from "@/stores/language";
import { logger } from "@/utils/logger";

const localeCache = new Map<string, DateFnsLocale>();
// Pre-populate English as fallback to prevent FOUC
localeCache.set("en", enUS);

const localeLoaders: Record<string, () => Promise<DateFnsLocale>> = {
  de: () => import("date-fns/locale/de").then((m) => m.de),
  fr: () => import("date-fns/locale/fr").then((m) => m.fr),
  it: () => import("date-fns/locale/it").then((m) => m.it),
  en: () => Promise.resolve(enUS),
};

export async function preloadDateLocales(): Promise<void> {
  await Promise.all(
    Object.keys(localeLoaders).map((locale) => loadDateLocale(locale)),
  );
}

async function loadDateLocale(locale: string): Promise<DateFnsLocale> {
  const cached = localeCache.get(locale);
  if (cached) return cached;

  const loader = localeLoaders[locale];
  if (!loader) {
    return enUS;
  }

  try {
    const loadedLocale = await loader();
    localeCache.set(locale, loadedLocale);
    return loadedLocale;
  } catch (error) {
    logger.error("[useDateFormat] Failed to load locale, falling back to English:", error);
    return enUS;
  }
}

/**
 * Get the date-fns locale matching the given i18n locale synchronously.
 * Returns the cached locale if available, otherwise falls back to English.
 */
export function getDateLocale(locale: string): DateFnsLocale {
  return localeCache.get(locale) ?? enUS;
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
  const [locale, setLocale] = useState<DateFnsLocale>(
    () => localeCache.get(currentLocale) ?? enUS,
  );
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    loadDateLocale(currentLocale)
      .then((loadedLocale) => {
        if (requestId === requestIdRef.current) {
          setLocale(loadedLocale);
        }
      })
      .catch(() => {
        // loadDateLocale already logs errors and falls back to English
      });
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
      dateLabel = format(date, formatPattern, { locale });
    }

    return {
      date,
      dateLabel,
      timeLabel: format(date, "HH:mm", { locale }),
      isToday: todayCheck,
      isTomorrow: tomorrowCheck,
      isPast: isPast(date),
    };
  }, [dateString, formatPattern, locale]);
}
