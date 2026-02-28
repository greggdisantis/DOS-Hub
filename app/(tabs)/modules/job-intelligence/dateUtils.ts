/**
 * Job Intelligence Module - Date Utilities
 */

/**
 * Adds a specified number of business days (Mon-Fri) to a date.
 * @param date The starting date.
 * @param days The number of business days to add.
 * @returns The new date.
 */
export function addBusinessDays(date: Date, days: number): Date {
  let result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
      added++;
    }
  }
  return result;
}

/**
 * Adds a specified number of weeks to a date.
 * @param date The starting date.
 * @param weeks The number of weeks to add.
 * @returns The new date.
 */
export function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

/**
 * Formats a date as YYYY-MM (year-month).
 * @param date The date to format.
 * @returns The formatted date string.
 */
export function formatYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Formats a date as a readable string (e.g., "Feb 28, 2026").
 * @param date The date to format.
 * @returns The formatted date string.
 */
export function formatReadableDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Parses a date string in YYYY-MM format.
 * @param dateString The date string to parse.
 * @returns A Date object, or null if parsing fails.
 */
export function parseYearMonth(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') return null;
  const match = dateString.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  if (month < 1 || month > 12) return null;
  return new Date(year, month - 1, 1);
}

/**
 * Safely parses a value into a Date object.
 * Handles strings, numbers (Excel timestamps), and existing Date objects.
 * @param value The value to parse.
 * @returns A Date object, or null if parsing fails.
 */
export function safeParseDate(value: any): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return !isNaN(value.getTime()) ? value : null;
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return !isNaN(date.getTime()) ? date : null;
  }
  // Handle Excel's epoch (days since 1900-01-01, with a bug for 1900 leap year)
  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return !isNaN(date.getTime()) ? date : null;
  }
  return null;
}

/**
 * Gets the current date in YYYY-MM format.
 * @returns The current month as a string.
 */
export function getCurrentMonth(): string {
  return formatYearMonth(new Date());
}
