import { HeaderSnapshot, DesignSnapshot, ShiftEmployee } from '../types';
import { DEFAULT_DESIGN_SNAPSHOT } from '../defaults';
import { formatJapaneseDate, getWeekdayJST, formatTimeHM, timeToExcelFraction } from '../date';

/**
 * Normalizes column widths so they sum to 100.
 */
export function normalizeColumnWidths(widths: number[]): number[] {
  if (widths.length !== 11) {
    throw new Error('Column widths must contain exactly 11 items');
  }
  const sum = widths.reduce((acc, w) => acc + w, 0);
  if (sum <= 0) return [...DEFAULT_DESIGN_SNAPSHOT.columnWidths];
  return widths.map((w) => Math.round((w / sum) * 1000) / 10);
}

export interface SheetColumnModel {
  index: number;
  label: string;
  widthPercent: number;
  widthMm: number;
  fontSizePt: number;
}

export interface SheetCellModel {
  columnIndex: number;
  text: string;
  fontSizePt: number;
  lines: string[];
  isCode: boolean;
  isTime: boolean;
  timeFraction: number | null;
}

export interface SheetRowModel {
  pageRowIndex: number; // 0..rowsPerPage - 1
  rowNumber: number; // continuous across pages: 1, 2, 3...
  isOdd: boolean;
  backgroundColor: string;
  cells: SheetCellModel[];
  employeeId?: number;
}

export interface SheetPageModel {
  pageNumber: number; // 1-based
  totalPages: number;
  pageWidthMm: number; // 297
  pageHeightMm: number; // 210
  banner: {
    widthMm: number;
    heightMm: number;
    title: string;
    color: string;
  };
  info: {
    companyNameFormatted: string; // 会社名　ワールドワークスCMC
    workDateLabel: string; // 作業日
    workDateValue: string; // 10月31日
    weekdayValue: string; // 土曜日
    managerFormatted: string; // 担当者：島津 様
    transmissionLabel: string; // 送付手順
    transmissionValue: string; // ❶派遣会社様 → ❷丸和運輸機関 → ❸派遣会社様
    faxFormatted: string; // FAX：049-293-7855
  };
  table: {
    x: number; // 10.7
    y: number; // 35.2
    width: number; // 279.4
    headerRowHeight: number; // 12.3
    bodyRowHeight: number; // 11.1
    columns: SheetColumnModel[];
    rows: SheetRowModel[];
  };
  verticalText: {
    x: number; // ≈ 7
    topY: number; // ≈ 48
    height: number; // ≈ 141
    text: string;
  };
  approvalBox: {
    x: number; // 265.5 (aligned to right edge: 10.7 + 279.4 - 24.587)
    y: number; // ≈ 172
    width: number; // ≈ 24.6
    height: number; // ≈ 27.7
    title: string;
    position: string;
  };
  pageNumberText: string | null;
  additionalNotes: string | null;
  design: DesignSnapshot;
}

export interface SheetModel {
  shiftDate: string;
  pages: SheetPageModel[];
  totalEmployees: number;
}

/**
 * Calculates deterministic visual width in ems:
 * CJK characters = 1.0em, ASCII/Latin = 0.55em
 */
export function estimateTextWidthEm(str: string): number {
  let em = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    em += code <= 255 ? 0.55 : 1.0;
  }
  return em;
}

/**
 * Splits text into two lines if needed.
 */
function splitToTwoLines(str: string): [string, string] {
  // If text contains a newline, split at it
  const newlineIdx = str.indexOf('\n');
  if (newlineIdx > 0 && newlineIdx < str.length - 1) {
    return [str.slice(0, newlineIdx).trim(), str.slice(newlineIdx + 1).trim()];
  }
  // If text contains a space or newline, split at it
  const spaceIdx = str.indexOf(' ');
  if (spaceIdx > 0 && spaceIdx < str.length - 1) {
    return [str.slice(0, spaceIdx), str.slice(spaceIdx + 1)];
  }
  const fullSpaceIdx = str.indexOf('　');
  if (fullSpaceIdx > 0 && fullSpaceIdx < str.length - 1) {
    return [str.slice(0, fullSpaceIdx), str.slice(fullSpaceIdx + 1)];
  }

  // Otherwise split near the halfway character mark
  const mid = Math.ceil(str.length / 2);
  return [str.slice(0, mid), str.slice(mid)];
}

/**
 * Determines appropriate font size and line split so text never clips.
 * Base size: 13pt. Shrinks down to 65% (8.45pt), then wraps to two lines.
 */
export function calculateCellTextLayout(
  text: string,
  columnWidthMm: number,
  baseFontSizePt: number
): { fontSizePt: number; lines: string[] } {
  if (!text || text.trim() === '') {
    return { fontSizePt: baseFontSizePt, lines: [''] };
  }

  const trimmed = text.trim();
  const usableWidthMm = Math.max(1, columnWidthMm - 1.5); // padding on both sides
  const ptToMm = 0.352778;

  // If text has an explicit newline, wrap into two lines directly
  if (trimmed.includes('\n')) {
    const [line1, line2] = splitToTwoLines(trimmed);
    const em1 = estimateTextWidthEm(line1);
    const em2 = estimateTextWidthEm(line2);
    const maxEm = Math.max(em1, em2);
    const twoLineWidthAtBasePt = maxEm * baseFontSizePt * ptToMm;
    const twoLineScale = usableWidthMm / twoLineWidthAtBasePt;
    const scaledSize = Math.max(baseFontSizePt * 0.65, baseFontSizePt * Math.min(1.0, twoLineScale));
    return {
      fontSizePt: Math.round(scaledSize * 10) / 10,
      lines: [line1, line2],
    };
  }

  // Single line width at baseFontSizePt
  const em = estimateTextWidthEm(trimmed);
  const textWidthAtBasePt = em * baseFontSizePt * ptToMm;

  if (textWidthAtBasePt <= usableWidthMm) {
    return { fontSizePt: baseFontSizePt, lines: [trimmed] };
  }

  // Check if shrinking down to 65% is sufficient for 1 line
  const shrinkScale = usableWidthMm / textWidthAtBasePt;
  if (shrinkScale >= 0.65) {
    const fontSize = Math.round(baseFontSizePt * shrinkScale * 10) / 10;
    return { fontSizePt: fontSize, lines: [trimmed] };
  }

  // Otherwise wrap into 2 lines
  const [line1, line2] = splitToTwoLines(trimmed);
  const em1 = estimateTextWidthEm(line1);
  const em2 = estimateTextWidthEm(line2);
  const maxEm = Math.max(em1, em2);
  const twoLineWidthAtBasePt = maxEm * baseFontSizePt * ptToMm;

  const twoLineScale = usableWidthMm / twoLineWidthAtBasePt;
  const scaledSize = Math.max(baseFontSizePt * 0.65, baseFontSizePt * Math.min(1.0, twoLineScale));

  return {
    fontSizePt: Math.round(scaledSize * 10) / 10,
    lines: [line1, line2],
  };
}

/**
 * Pure function: builds the complete sheet model for preview, print, PDF and Excel.
 * No UI or React code.
 */
export function buildSheetModel(
  shift: { shift_date: string; employees: ShiftEmployee[] },
  headerSnapshot: HeaderSnapshot,
  designSnapshot: DesignSnapshot
): SheetModel {
  const pageWidthMm = 297;
  const pageHeightMm = 210;
  const tableX = designSnapshot.margins?.left ?? 10.7;
  const tableRightMargin = designSnapshot.margins?.right ?? 6.9;
  const tableWidth = pageWidthMm - tableX - tableRightMargin; // ≈ 279.4 mm
  const tableTopY = 35.2;
  const headerRowHeight = 12.3;
  const bodyRowHeight = designSnapshot.rowHeightMm || 11.1;

  // Available height for body rows ≈ 122.5 mm
  const availableHeight = 122.5;
  const rowsPerPage = Math.max(1, Math.floor(availableHeight / bodyRowHeight)); // 11 with defaults

  const totalEmployees = shift.employees.length;
  const totalPages = Math.max(1, Math.ceil(totalEmployees / rowsPerPage));

  const normalizedWidths = normalizeColumnWidths(designSnapshot.columnWidths);

  // Column definitions
  const columns: SheetColumnModel[] = headerSnapshot.columnLabels.map((label, idx) => {
    const widthPercent = normalizedWidths[idx];
    const widthMm = (widthPercent / 100) * tableWidth;

    // Narrow headers: 始業予定時間, 終了予定時間, ロッカー番号 get ~9.5pt, others 12pt
    let fontSizePt = 12;
    if (label === '始業予定時間' || label === '終了予定時間' || label === 'ロッカー番号') {
      fontSizePt = 9.5;
    }
    fontSizePt = fontSizePt * (designSnapshot.fontScale / 100);

    return {
      index: idx,
      label,
      widthPercent,
      widthMm,
      fontSizePt,
    };
  });

  const lastColWidth = columns[columns.length - 1]?.widthMm || 24.6;
  const approvalBoxWidth = lastColWidth;
  const approvalBoxX = tableX + tableWidth - approvalBoxWidth;

  const fontScaleFactor = (designSnapshot.fontScale || 100) / 100;
  const baseCellFontSizePt = 13 * fontScaleFactor;

  const pages: SheetPageModel[] = [];

  for (let p = 0; p < totalPages; p++) {
    const pageNumber = p + 1;
    const startIndex = p * rowsPerPage;

    const rows: SheetRowModel[] = [];

    for (let r = 0; r < rowsPerPage; r++) {
      const pageRowIndex = r;
      const rowNumber = startIndex + r + 1; // continuous NO across pages
      const isOdd = r % 2 === 0; // Row 1 is odd
      const backgroundColor = designSnapshot.additionalSettings?.faxMonochrome
        ? '#FFFFFF'
        : isOdd
        ? designSnapshot.rowColorOdd
        : designSnapshot.rowColorEven;

      const employee: ShiftEmployee | undefined = shift.employees[startIndex + r];

      // Format row values: 11 columns
      const rawValues: Array<{ text: string; isCode: boolean; isTime: boolean; timeFraction: number | null }> = [
        { text: String(rowNumber), isCode: false, isTime: false, timeFraction: null }, // NO
        { text: employee?.employee_code || '', isCode: true, isTime: false, timeFraction: null }, // CODE
        { text: employee?.employee_name || '', isCode: false, isTime: false, timeFraction: null }, // スタッフ氏名
        { text: employee?.nickname || '', isCode: false, isTime: false, timeFraction: null }, // ニックネーム
        { text: employee?.remarks || '', isCode: false, isTime: false, timeFraction: null }, // 備考
        {
          text: formatTimeHM(employee?.planned_start_time),
          isCode: false,
          isTime: true,
          timeFraction: timeToExcelFraction(employee?.planned_start_time),
        }, // 始業予定時間
        {
          text: formatTimeHM(employee?.actual_start_time),
          isCode: false,
          isTime: true,
          timeFraction: timeToExcelFraction(employee?.actual_start_time),
        }, // 始業実時間
        {
          text: formatTimeHM(employee?.planned_end_time),
          isCode: false,
          isTime: true,
          timeFraction: timeToExcelFraction(employee?.planned_end_time),
        }, // 終了予定時間
        {
          text: formatTimeHM(employee?.break_time),
          isCode: false,
          isTime: true,
          timeFraction: timeToExcelFraction(employee?.break_time),
        }, // 休憩時間
        { text: employee?.locker_number || '', isCode: false, isTime: false, timeFraction: null }, // ロッカー番号
        { text: employee?.signature || '', isCode: false, isTime: false, timeFraction: null }, // 本人自署
      ];

      const cells: SheetCellModel[] = rawValues.map((val, colIdx) => {
        const colWidthMm = columns[colIdx].widthMm;
        const layout = calculateCellTextLayout(val.text, colWidthMm, baseCellFontSizePt);

        return {
          columnIndex: colIdx,
          text: val.text,
          fontSizePt: layout.fontSizePt,
          lines: layout.lines,
          isCode: val.isCode,
          isTime: val.isTime,
          timeFraction: val.timeFraction,
        };
      });

      rows.push({
        pageRowIndex,
        rowNumber,
        isOdd,
        backgroundColor,
        cells,
        employeeId: employee?.id,
      });
    }

    pages.push({
      pageNumber,
      totalPages,
      pageWidthMm,
      pageHeightMm,
      banner: {
        widthMm: 131,
        heightMm: 22,
        title: headerSnapshot.title,
        color: designSnapshot.headerColor,
      },
      info: {
        companyNameFormatted: `会社名　${headerSnapshot.companyName}`,
        workDateLabel: '作業日',
        workDateValue: formatJapaneseDate(shift.shift_date),
        weekdayValue: getWeekdayJST(shift.shift_date),
        managerFormatted: `担当者：${headerSnapshot.managerName}`,
        transmissionLabel: '送付手順',
        transmissionValue: headerSnapshot.transmissionInstructions,
        faxFormatted: `FAX：${headerSnapshot.faxNumber}`,
      },
      table: {
        x: tableX,
        y: tableTopY,
        width: tableWidth,
        headerRowHeight,
        bodyRowHeight,
        columns,
        rows,
      },
      verticalText: {
        x: 7,
        topY: 48,
        height: 141,
        text: headerSnapshot.verticalInstructions,
      },
      approvalBox: {
        x: approvalBoxX,
        y: 172,
        width: approvalBoxWidth,
        height: 27.7,
        title: headerSnapshot.approvalTitle,
        position: headerSnapshot.approvalPosition,
      },
      pageNumberText: totalPages > 1 ? `${pageNumber} / ${totalPages}` : null,
      additionalNotes: headerSnapshot.additionalNotes || null,
      design: designSnapshot,
    });
  }

  return {
    shiftDate: shift.shift_date,
    pages,
    totalEmployees,
  };
}
