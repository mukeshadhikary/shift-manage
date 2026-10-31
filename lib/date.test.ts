import { describe, it, expect } from 'vitest';
import {
  getTodayJST,
  parseDateParts,
  formatJapaneseDate,
  getDayOfWeekIndex,
  getWeekdayJST,
  getShortWeekdayJST,
  addDays,
  isNationalHolidayJST,
  isSaturday,
  isSundayOrHoliday,
  formatTimeHM,
  formatTime24H,
  parseTimeToMinutes,
  timeToExcelFraction,
  generateDateRange,
} from './date';

describe('JST Date Helpers', () => {
  it('correctly calculates JST date at 00:30 JST (15:30 UTC previous day)', () => {
    // 2026-10-31 00:30:00 JST is 2026-10-30 15:30:00 UTC
    const dateAtMidnightJST = new Date('2026-10-30T15:30:00Z');
    expect(getTodayJST(dateAtMidnightJST)).toBe('2026-10-31');
  });

  it('correctly calculates JST date at 23:30 JST (14:30 UTC same day)', () => {
    // 2026-10-31 23:30:00 JST is 2026-10-31 14:30:00 UTC
    const dateAtNightJST = new Date('2026-10-31T14:30:00Z');
    expect(getTodayJST(dateAtNightJST)).toBe('2026-10-31');
  });

  it('parses YYYY-MM-DD correctly', () => {
    expect(parseDateParts('2026-10-31')).toEqual({ year: 2026, month: 10, day: 31 });
    expect(parseDateParts('2026-01-05')).toEqual({ year: 2026, month: 1, day: 5 });
    expect(() => parseDateParts('invalid')).toThrow();
  });

  it('formats Japanese date string without zero padding', () => {
    expect(formatJapaneseDate('2026-10-31')).toBe('10月31日');
    expect(formatJapaneseDate('2026-01-05')).toBe('1月5日');
    expect(formatJapaneseDate('2026-07-09')).toBe('7月9日');
  });

  it('calculates weekday deterministically regardless of local timezone', () => {
    // 2026-10-31 is Saturday (土曜日)
    expect(getDayOfWeekIndex('2026-10-31')).toBe(6);
    expect(getWeekdayJST('2026-10-31')).toBe('土曜日');
    expect(getShortWeekdayJST('2026-10-31')).toBe('土');
    expect(isSaturday('2026-10-31')).toBe(true);

    // 2026-11-01 is Sunday (日曜日)
    expect(getDayOfWeekIndex('2026-11-01')).toBe(0);
    expect(getWeekdayJST('2026-11-01')).toBe('日曜日');
    expect(getShortWeekdayJST('2026-11-01')).toBe('日');
    expect(isSundayOrHoliday('2026-11-01')).toBe(true);
  });

  it('adds and subtracts days correctly across month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    // Leap year check: 2024 was leap year
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
  });

  it('detects Japanese national holidays', () => {
    // 2026-11-03 is 文化の日 (Culture Day)
    expect(isNationalHolidayJST('2026-11-03')).toBe(true);
    expect(isSundayOrHoliday('2026-11-03')).toBe(true);

    // 2026-11-04 is a regular Wednesday
    expect(isNationalHolidayJST('2026-11-04')).toBe(false);
  });

  it('generates date range correctly', () => {
    const range = generateDateRange('2026-10-31', 2, 2);
    expect(range).toEqual([
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
  });

  it('formats time to H:mm properly', () => {
    expect(formatTimeHM('09:00')).toBe('9:00');
    expect(formatTimeHM('18:00')).toBe('18:00');
    expect(formatTimeHM('00:30')).toBe('0:30');
    expect(formatTimeHM('0:00')).toBe('0:00');
    expect(formatTimeHM(null)).toBe('');
    expect(formatTimeHM('')).toBe('');
  });

  it('formats time strictly to 24-hour HH:mm', () => {
    expect(formatTime24H('9:00')).toBe('09:00');
    expect(formatTime24H('09:00')).toBe('09:00');
    expect(formatTime24H('18:00')).toBe('18:00');
    expect(formatTime24H('0:30')).toBe('00:30');
    expect(formatTime24H('23:45')).toBe('23:45');
    expect(formatTime24H(null)).toBe('');
    expect(formatTime24H('')).toBe('');
  });

  it('parses time to minutes and Excel fractions', () => {
    expect(parseTimeToMinutes('9:00')).toBe(540);
    expect(parseTimeToMinutes('18:30')).toBe(1110);
    expect(timeToExcelFraction('12:00')).toBeCloseTo(0.5, 4);
    expect(timeToExcelFraction('06:00')).toBeCloseTo(0.25, 4);
    expect(timeToExcelFraction(null)).toBeNull();
  });
});
