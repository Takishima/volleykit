/**
 * Date helper utilities
 *
 * This will be extracted from web-app/src/shared/utils/date-helpers.ts
 * Placeholder for now - implementation in Phase 2
 */

import { format, parseISO, isValid } from 'date-fns';

export const formatDate = (dateString: string, formatString = 'dd.MM.yyyy'): string => {
  const date = parseISO(dateString);
  if (!isValid(date)) return dateString;
  return format(date, formatString);
};

export const formatTime = (timeString: string): string => {
  // Format HH:mm time string
  return timeString;
};

export const formatDateTime = (
  dateString: string,
  formatString = 'dd.MM.yyyy HH:mm'
): string => {
  const date = parseISO(dateString);
  if (!isValid(date)) return dateString;
  return format(date, formatString);
};

export const isDateInPast = (dateString: string): boolean => {
  const date = parseISO(dateString);
  return isValid(date) && date < new Date();
};

export const isDateToday = (dateString: string): boolean => {
  const date = parseISO(dateString);
  if (!isValid(date)) return false;
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};
