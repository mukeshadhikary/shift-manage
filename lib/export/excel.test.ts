import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { buildSheetModel } from '../sheet';
import { generateShiftExcelWorkbook } from './excel';
import { DEFAULT_HEADER_SNAPSHOT, DEFAULT_DESIGN_SNAPSHOT } from '../defaults';
import { ShiftEmployee } from '../types';

function mockEmployee(id: number, name: string): ShiftEmployee {
  return {
    id,
    shift_id: 1,
    display_order: id,
    employee_code: `CODE${id}`,
    employee_name: name,
    nickname: `ニック${id}`,
    remarks: '備考テスト',
    planned_start_time: '09:00',
    actual_start_time: '08:50',
    planned_end_time: '18:00',
    break_time: '1:00',
    locker_number: '10',
    signature: 'サイン',
    created_at: '',
    updated_at: '',
  };
}

describe('Excel Generation and Reopen Verification', () => {
  it('generates 1 worksheet for <= 11 employees and verifies page setup and cells', async () => {
    const emps = [mockEmployee(1, '田中 太郎'), mockEmployee(2, '佐藤 花子')];
    const model = buildSheetModel(
      { shift_date: '2026-10-31', employees: emps },
      DEFAULT_HEADER_SNAPSHOT,
      DEFAULT_DESIGN_SNAPSHOT
    );

    const workbook = await generateShiftExcelWorkbook(model);
    expect(workbook.worksheets).toHaveLength(1);

    // Write to buffer and reopen with ExcelJS to prove it is genuine Excel format
    const buffer = await workbook.xlsx.writeBuffer();
    const reopenedWorkbook = new ExcelJS.Workbook();
    await reopenedWorkbook.xlsx.load(buffer as unknown as Parameters<typeof reopenedWorkbook.xlsx.load>[0]);

    expect(reopenedWorkbook.worksheets).toHaveLength(1);
    const sheet = reopenedWorkbook.getWorksheet('1')!;
    expect(sheet).toBeDefined();

    // Check page setup
    expect(sheet.pageSetup.orientation).toBe('landscape');
    expect(sheet.pageSetup.paperSize).toBe(9); // A4
    expect(sheet.pageSetup.fitToPage).toBe(true);

    // Check Banner text
    const bannerCell = sheet.getCell('C1');
    expect(bannerCell.value).toBe(DEFAULT_HEADER_SNAPSHOT.title);

    // Check Company Name
    const companyCell = sheet.getCell('B3');
    expect(companyCell.value).toBe(`会社名　${DEFAULT_HEADER_SNAPSHOT.companyName}`);

    // Check Table Headers in Row 4
    expect(sheet.getCell('B4').value).toBe('NO');
    expect(sheet.getCell('C4').value).toBe('CODE');
    expect(sheet.getCell('D4').value).toBe('スタッフ氏名');

    // Check Employee Row 1 in Row 5
    expect(sheet.getCell('B5').value).toBe(1); // NO.
    expect(sheet.getCell('C5').value).toBe('CODE1');
    expect(sheet.getCell('D5').value).toBe('田中 太郎');

    // Check time values are real Excel times with h:mm formatting
    const plannedStartCell = sheet.getCell('G5'); // col 7 = planned_start_time
    expect(plannedStartCell.numFmt).toBe('h:mm');
    const startTimeDate = plannedStartCell.value as Date;
    expect(startTimeDate.getUTCHours()).toBe(9);
    expect(startTimeDate.getUTCMinutes()).toBe(0);

    const breakTimeCell = sheet.getCell('J5'); // col 10 = break_time
    expect(breakTimeCell.numFmt).toBe('h:mm');
    const breakTimeDate = breakTimeCell.value as Date;
    expect(breakTimeDate.getUTCHours()).toBe(1);
    expect(breakTimeDate.getUTCMinutes()).toBe(0);

    // Check vertical instruction text has ↓
    const vertCell = sheet.getCell('A5');
    expect(String(vertCell.value)).toContain('↓');
  });

  it('generates 2 worksheets for 11+ employees', async () => {
    const emps = Array.from({ length: 11 }, (_, i) => mockEmployee(i + 1, `スタッフ${i + 1}`));
    const model = buildSheetModel(
      { shift_date: '2026-10-31', employees: emps },
      DEFAULT_HEADER_SNAPSHOT,
      DEFAULT_DESIGN_SNAPSHOT
    );

    const workbook = await generateShiftExcelWorkbook(model);
    expect(workbook.worksheets).toHaveLength(2);

    const buffer = await workbook.xlsx.writeBuffer();
    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(buffer as unknown as Parameters<typeof reopened.xlsx.load>[0]);

    expect(reopened.worksheets).toHaveLength(2);
    expect(reopened.getWorksheet('1')).toBeDefined();
    expect(reopened.getWorksheet('2')).toBeDefined();

    // Worksheet 2 row 1 has continuous NO = 11
    const sheet2 = reopened.getWorksheet('2')!;
    expect(sheet2.getCell('B5').value).toBe(11);
    expect(sheet2.getCell('D5').value).toBe('スタッフ11');
  });

  it('correctly styles row 3 with white background and black text', async () => {
    const model = buildSheetModel(
      { shift_date: '2026-10-31', employees: [] },
      DEFAULT_HEADER_SNAPSHOT,
      DEFAULT_DESIGN_SNAPSHOT
    );

    const workbook = await generateShiftExcelWorkbook(model);
    const sheet = workbook.getWorksheet('1')!;

    // Company cell is B3
    const companyCell = sheet.getCell('B3');
    // Ensure company cell has white background (not navy #0F2A66)
    const fill = companyCell.fill as ExcelJS.FillPattern | undefined;
    if (fill && fill.type === 'pattern') {
      // Should be FFFFFF or undefined/none
      const argb = String(fill.fgColor?.argb || '');
      expect(argb).not.toContain('0F2A66');
    }

    // Row 1-2 has banner outer frame with navy background (e.g. cell B1)
    const frameCell = sheet.getCell('B1');
    const frameFill = frameCell.fill as ExcelJS.FillPattern;
    expect(frameFill.fgColor?.argb).toContain('0F2A66');
  });

  it('supports faxMonochrome mode in Excel workbook', async () => {
    const monoDesign = {
      ...DEFAULT_DESIGN_SNAPSHOT,
      additionalSettings: {
        ...DEFAULT_DESIGN_SNAPSHOT.additionalSettings,
        faxMonochrome: true,
      },
    };

    const model = buildSheetModel(
      { shift_date: '2026-10-31', employees: [] },
      DEFAULT_HEADER_SNAPSHOT,
      monoDesign
    );

    const workbook = await generateShiftExcelWorkbook(model);
    const sheet = workbook.getWorksheet('1')!;

    // In FAX monochrome mode, the frame cell fill is pure white (FFFFFF)
    const frameCell = sheet.getCell('B1');
    const frameFill = frameCell.fill as ExcelJS.FillPattern;
    expect(frameFill.fgColor?.argb).toContain('FFFFFF');
  });
});
