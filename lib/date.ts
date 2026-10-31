import holiday_jp from '@holiday-jp/holiday_jp';

const WEEKDAYS_JA = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
const SHORT_WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * Returns today's date in Asia/Tokyo as 'YYYY-MM-DD'.
 * Accepts an optional Date instance for deterministic testing.
 */
export function getTodayJST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(now);
}

/**
 * Parses a 'YYYY-MM-DD' string into numeric year, month (1-12), and day (1-31).
 */
export function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format (expected YYYY-MM-DD): "${dateStr}"`);
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid date values: "${dateStr}"`);
  }

  return { year, month, day };
}

/**
 * Formats 'YYYY-MM-DD' into Japanese M月D日 format (no zero-padding, e.g. "10月31日").
 */
export function formatJapaneseDate(dateStr: string): string {
  const { month, day } = parseDateParts(dateStr);
  return `${month}月${day}日`;
}

/**
 * Computes day-of-week index (0 = Sun, 1 = Mon, ..., 6 = Sat) deterministically using Date.UTC.
 */
export function getDayOfWeekIndex(dateStr: string): number {
  const { year, month, day } = parseDateParts(dateStr);
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return d.getUTCDay();
}

/**
 * Returns full Japanese weekday with '曜日' suffix (e.g. "土曜日").
 */
export function getWeekdayJST(dateStr: string): string {
  return WEEKDAYS_JA[getDayOfWeekIndex(dateStr)];
}

/**
 * Returns single-character Japanese weekday (e.g. "土").
 */
export function getShortWeekdayJST(dateStr: string): string {
  return SHORT_WEEKDAYS_JA[getDayOfWeekIndex(dateStr)];
}

/**
 * Returns day number (1-31).
 */
export function getDayNumber(dateStr: string): number {
  return parseDateParts(dateStr).day;
}

/**
 * Deterministically adds or subtracts days to a 'YYYY-MM-DD' string.
 */
export function addDays(dateStr: string, days: number): string {
  const { year, month, day } = parseDateParts(dateStr);
  const d = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dt = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dt}`;
}

/**
 * Checks if a date string is a Japanese national holiday.
 */
export function isNationalHolidayJST(dateStr: string): boolean {
  return Boolean((holiday_jp.holidays as Record<string, unknown>)[dateStr]);
}

/**
 * Saturday check (blue on calendar strip).
 */
export function isSaturday(dateStr: string): boolean {
  return getDayOfWeekIndex(dateStr) === 6;
}

/**
 * Sunday or Japanese holiday check (red on calendar strip).
 */
export function isSundayOrHoliday(dateStr: string): boolean {
  const dow = getDayOfWeekIndex(dateStr);
  if (dow === 0) return true;
  return isNationalHolidayJST(dateStr);
}

/**
 * Generates an array of 'YYYY-MM-DD' dates around centerDate.
 */
export function generateDateRange(centerDate: string, daysBefore: number = 30, daysAfter: number = 30): string[] {
  const dates: string[] = [];
  for (let i = -daysBefore; i <= daysAfter; i++) {
    dates.push(addDays(centerDate, i));
  }
  return dates;
}

/**
 * Formats time string to H:mm (e.g. "09:00" -> "9:00", "00:30" -> "0:30", "18:00" -> "18:00").
 */
export function formatTimeHM(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return trimmed;
  const hours = parseInt(match[1], 10);
  const minutes = match[2];
  return `${hours}:${minutes}`;
}

/**
 * Formats time string strictly into 24-hour format HH:mm (e.g. "9:00" -> "09:00", "18:00" -> "18:00", "0:30" -> "00:30").
 */
export function formatTime24H(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return trimmed;
  const hours = String(parseInt(match[1], 10)).padStart(2, '0');
  const minutes = match[2];
  return `${hours}:${minutes}`;
}

/**
 * Parses "H:mm" or "HH:mm" to total minutes from start of day.
 */
export function parseTimeToMinutes(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
}

/**
 * Converts a time string "H:mm" or "HH:mm" to Excel time fraction (fraction of 24h day).
 */
export function timeToExcelFraction(timeStr: string | null | undefined): number | null {
  const minutes = parseTimeToMinutes(timeStr);
  if (minutes === null) return null;
  return minutes / (24 * 60);
}
