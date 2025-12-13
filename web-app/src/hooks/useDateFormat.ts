import { useMemo } from "react";
import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  isPast,
  isValid,
} from "date-fns";
import {
  de,
  fr,
  it,
  enUS,
  type Locale as DateFnsLocale,
} from "date-fns/locale";
import { t } from "@/i18n";
import { useLanguageStore } from "@/stores/language";

// Map i18n locale to date-fns locale
const dateLocales: Record<string, DateFnsLocale> = {
  de: de,
  fr: fr,
  it: it,
  en: enUS,
};

/**
 * Get the date-fns locale matching the given i18n locale.
 */
export function getDateLocale(locale: string): DateFnsLocale {
  return dateLocales[locale] || de;
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

  return useMemo(() => {
    const locale = getDateLocale(currentLocale);
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
  }, [dateString, formatPattern, currentLocale]);
}
