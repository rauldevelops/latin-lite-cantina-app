/**
 * Timezone utilities for consistent Eastern Time handling
 */

export const TIMEZONE = "America/New_York";

/**
 * Format a date in Eastern timezone
 */
export function formatDateET(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    ...options,
  }).format(d);
}

/**
 * Format a date as "Month Day" (e.g., "Jan 15") in Eastern timezone
 */
export function formatShortDate(date: Date | string): string {
  return formatDateET(date, { month: "short", day: "numeric" });
}

/**
 * Format a date as full date (e.g., "Monday, January 15, 2024") in Eastern timezone
 */
export function formatFullDate(date: Date | string): string {
  return formatDateET(date, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a date with time (e.g., "Jan 15, 2024 at 3:30 PM") in Eastern timezone
 */
export function formatDateTime(date: Date | string): string {
  return formatDateET(date, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Get the current date in Eastern timezone as a Date object
 * Note: The returned Date is still in UTC internally, but represents "now" in ET
 */
export function nowET(): Date {
  return new Date();
}

/**
 * Get the day of week (0-6, Sunday-Saturday) in Eastern timezone
 */
export function getDayOfWeekET(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const dayStr = formatDateET(d, { weekday: "short" });
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.indexOf(dayStr);
}

/**
 * Check if a date is today in Eastern timezone
 */
export function isTodayET(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = formatDateET(new Date(), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateStr = formatDateET(d, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return today === dateStr;
}
