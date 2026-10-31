import { describe, it, expect } from 'vitest';
import {
  employeeInputSchema,
  createShiftSchema,
  designSnapshotSchema,
  additionalSettingsSchema,
} from './schema';

describe('Zod Schema Validation Tests', () => {
  it('parses empty time strings as null instead of failing regex', () => {
    const input = {
      employee_name: '田中 太郎',
      actual_start_time: '',
      planned_start_time: '',
      planned_end_time: '',
      break_time: '',
    };

    const parsed = employeeInputSchema.parse(input);
    expect(parsed.employee_name).toBe('田中 太郎');
    expect(parsed.actual_start_time).toBeNull();
    expect(parsed.planned_start_time).toBeNull();
    expect(parsed.planned_end_time).toBeNull();
    expect(parsed.break_time).toBeNull();
  });

  it('validates correct H:mm and HH:mm formats and rejects invalid times', () => {
    expect(
      employeeInputSchema.parse({
        employee_name: 'テスト',
        planned_start_time: '9:00',
        break_time: '0:45',
      }).planned_start_time
    ).toBe('9:00');

    expect(() =>
      employeeInputSchema.parse({
        employee_name: 'テスト',
        planned_start_time: '25:00',
      })
    ).toThrow();

    expect(() =>
      employeeInputSchema.parse({
        employee_name: 'テスト',
        break_time: 'invalid',
      })
    ).toThrow();
  });

  it('supports faxMonochrome in additionalSettingsSchema', () => {
    const parsed = additionalSettingsSchema.parse({
      faxMonochrome: true,
      showDecor: false,
    });

    expect(parsed.faxMonochrome).toBe(true);
    expect(parsed.showDecor).toBe(false);
  });

  it('supports faxMonochrome in designSnapshotSchema', () => {
    const parsed = designSnapshotSchema.parse({
      headerColor: '#FFFFFF',
      tableHeaderColor: '#F2F2F2',
      rowColorOdd: '#FFFFFF',
      rowColorEven: '#FFFFFF',
      fontScale: 100,
      rowHeightMm: 13.0,
      columnWidths: [4, 8, 18, 10, 10, 8, 8, 8, 8, 8, 8],
      additionalSettings: {
        faxMonochrome: true,
      },
    });

    expect(parsed.additionalSettings?.faxMonochrome).toBe(true);
  });

  it('validates createShiftSchema with employees and date', () => {
    const parsed = createShiftSchema.parse({
      shift_date: '2026-10-31',
      employees: [
        {
          employee_name: '田中 太郎',
        },
      ],
    });

    expect(parsed.shift_date).toBe('2026-10-31');
    expect(parsed.employees).toHaveLength(1);
    expect(parsed.employees[0].employee_name).toBe('田中 太郎');
  });
});
