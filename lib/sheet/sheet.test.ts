import { describe, it, expect } from 'vitest';
import {
  buildSheetModel,
  estimateTextWidthEm,
  calculateCellTextLayout,
} from './index';
import { DEFAULT_HEADER_SNAPSHOT, DEFAULT_DESIGN_SNAPSHOT } from '../defaults';
import { ShiftEmployee } from '../types';

function createMockEmployee(id: number, name: string): ShiftEmployee {
  return {
    id,
    shift_id: 1,
    display_order: id,
    employee_code: `MS00${id}`,
    employee_name: name,
    nickname: `ニック${id}`,
    remarks: null,
    planned_start_time: '09:00',
    actual_start_time: null,
    planned_end_time: '18:00',
    break_time: '1:00',
    locker_number: `${id}`,
    signature: null,
    created_at: '2026-10-31T00:00:00Z',
    updated_at: '2026-10-31T00:00:00Z',
  };
}

describe('Sheet Model Generator (buildSheetModel)', () => {
  it('handles 0 employees: generates 1 page with 10 blank alternating rows', () => {
    const model = buildSheetModel(
      { shift_date: '2026-10-31', employees: [] },
      DEFAULT_HEADER_SNAPSHOT,
      DEFAULT_DESIGN_SNAPSHOT
    );

    expect(model.pages).toHaveLength(1);
    expect(model.pages[0].pageNumber).toBe(1);
    expect(model.pages[0].totalPages).toBe(1);
    expect(model.pages[0].pageNumberText).toBeNull(); // Single page doesn't show "1 / 1"
    expect(model.pages[0].table.rows).toHaveLength(10);

    // Row 1: odd, Row 2: even
    expect(model.pages[0].table.rows[0].isOdd).toBe(true);
    expect(model.pages[0].table.rows[0].backgroundColor).toBe(DEFAULT_DESIGN_SNAPSHOT.rowColorOdd);
    expect(model.pages[0].table.rows[1].isOdd).toBe(false);
    expect(model.pages[0].table.rows[1].backgroundColor).toBe(DEFAULT_DESIGN_SNAPSHOT.rowColorEven);

    // NO continues from 1 to 10
    expect(model.pages[0].table.rows[0].cells[0].text).toBe('1');
    expect(model.pages[0].table.rows[9].cells[0].text).toBe('10');
    // Name is empty
    expect(model.pages[0].table.rows[0].cells[2].text).toBe('');
  });

  it('handles 4 employees: 1 page with 4 filled rows and 6 blank rows', () => {
    const emps = [
      createMockEmployee(1, 'スタッフ1'),
      createMockEmployee(2, 'スタッフ2'),
      createMockEmployee(3, 'スタッフ3'),
      createMockEmployee(4, 'スタッフ4'),
    ];

    const model = buildSheetModel(
      { shift_date: '2026-10-31', employees: emps },
      DEFAULT_HEADER_SNAPSHOT,
      DEFAULT_DESIGN_SNAPSHOT
    );

    expect(model.pages).toHaveLength(1);
    expect(model.pages[0].table.rows).toHaveLength(10);
    expect(model.pages[0].table.rows[0].cells[2].text).toBe('スタッフ1');
    expect(model.pages[0].table.rows[3].cells[2].text).toBe('スタッフ4');
    expect(model.pages[0].table.rows[4].cells[2].text).toBe(''); // blank row
  });

  it('handles exactly 10 employees: 1 page with 10 filled rows', () => {
    const emps = Array.from({ length: 10 }, (_, i) => createMockEmployee(i + 1, `スタッフ${i + 1}`));

    const model = buildSheetModel(
      { shift_date: '2026-10-31', employees: emps },
      DEFAULT_HEADER_SNAPSHOT,
      DEFAULT_DESIGN_SNAPSHOT
    );

    expect(model.pages).toHaveLength(1);
    expect(model.pages[0].totalPages).toBe(1);
    expect(model.pages[0].table.rows[9].cells[2].text).toBe('スタッフ10');
    expect(model.pages[0].pageNumberText).toBeNull();
  });

  it('handles 11 employees: 2 pages (page 1 has 10, page 2 has 1 + 9 blanks)', () => {
    const emps = Array.from({ length: 11 }, (_, i) => createMockEmployee(i + 1, `スタッフ${i + 1}`));

    const model = buildSheetModel(
      { shift_date: '2026-10-31', employees: emps },
      DEFAULT_HEADER_SNAPSHOT,
      DEFAULT_DESIGN_SNAPSHOT
    );

    expect(model.pages).toHaveLength(2);
    expect(model.pages[0].totalPages).toBe(2);
    expect(model.pages[0].pageNumberText).toBe('1 / 2');
    expect(model.pages[1].pageNumberText).toBe('2 / 2');

    // Continuous NO across pages
    expect(model.pages[0].table.rows[9].cells[0].text).toBe('10');
    expect(model.pages[1].table.rows[0].cells[0].text).toBe('11');
    expect(model.pages[1].table.rows[0].cells[2].text).toBe('スタッフ11');
    expect(model.pages[1].table.rows[1].cells[0].text).toBe('12');
    expect(model.pages[1].table.rows[1].cells[2].text).toBe(''); // blank
    expect(model.pages[1].table.rows).toHaveLength(10);
  });

  it('handles 21 employees: 3 pages (page 1: 10, page 2: 10, page 3: 1 + 9 blanks)', () => {
    const emps = Array.from({ length: 21 }, (_, i) => createMockEmployee(i + 1, `スタッフ${i + 1}`));

    const model = buildSheetModel(
      { shift_date: '2026-10-31', employees: emps },
      DEFAULT_HEADER_SNAPSHOT,
      DEFAULT_DESIGN_SNAPSHOT
    );

    expect(model.pages).toHaveLength(3);
    expect(model.pages[0].pageNumberText).toBe('1 / 3');
    expect(model.pages[1].pageNumberText).toBe('2 / 3');
    expect(model.pages[2].pageNumberText).toBe('3 / 3');
    expect(model.pages[2].table.rows[0].cells[0].text).toBe('21');
    expect(model.pages[2].table.rows[0].cells[2].text).toBe('スタッフ21');
    expect(model.pages[2].table.rows[1].cells[0].text).toBe('22');
  });

  it('generates date and weekday from shift_date', () => {
    const model = buildSheetModel(
      { shift_date: '2026-10-31', employees: [] },
      DEFAULT_HEADER_SNAPSHOT,
      DEFAULT_DESIGN_SNAPSHOT
    );

    expect(model.pages[0].info.workDateValue).toBe('10月31日');
    expect(model.pages[0].info.weekdayValue).toBe('土曜日');
    expect(model.pages[0].info.companyNameFormatted).toBe('会社名　ワールドワークスCMC');
  });

  it('calculates text shrinkage and two-line wrapping for long names', () => {
    // Column width for スタッフ氏名 is ~50.3mm
    const normalLayout = calculateCellTextLayout('田中 太郎', 50.3, 13);
    expect(normalLayout.fontSizePt).toBe(13);
    expect(normalLayout.lines).toEqual(['田中 太郎']);

    // Medium long text: shrinks font size
    const longLayout = calculateCellTextLayout('非常に長い名前のスタッフ様です', 50.3, 13);
    expect(longLayout.fontSizePt).toBeLessThan(13);
    expect(longLayout.fontSizePt).toBeGreaterThanOrEqual(13 * 0.65);

    // Very long text: wraps to 2 lines
    const superLongLayout = calculateCellTextLayout('非常に長くて通常サイズでは収まりきらないスタッフ氏名太郎', 30.0, 13);
    expect(superLongLayout.lines).toHaveLength(2);
    expect(estimateTextWidthEm('ABC')).toBeCloseTo(1.65, 2);
    expect(estimateTextWidthEm('漢字')).toBe(2.0);

    // Explicit newline splitting
    const newlineLayout = calculateCellTextLayout('上段テキスト\n下段テキスト', 50.3, 13);
    expect(newlineLayout.lines).toEqual(['上段テキスト', '下段テキスト']);
  });

  it('handles faxMonochrome mode: applies pure white row backgrounds', () => {
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

    // In FAX monochrome mode, even and odd rows have #FFFFFF backgrounds
    expect(model.pages[0].table.rows[0].backgroundColor).toBe('#FFFFFF');
    expect(model.pages[0].table.rows[1].backgroundColor).toBe('#FFFFFF');
  });
});
