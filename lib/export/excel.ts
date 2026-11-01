import ExcelJS from 'exceljs';
import { SheetModel, SheetPageModel } from '../sheet';

const FONT_FAMILY = 'Yu Gothic';

/**
 * MM to Excel conversions:
 * 1 mm = 72 / 25.4 pt ≈ 2.83465 pt (for row heights)
 * 1 mm ≈ 0.44 Excel column width units (1 col unit ≈ 2.27 mm at standard 11pt font)
 */
export const MM_TO_PT = 72 / 25.4;
export const MM_TO_EXCEL_COL_WIDTH = 0.44;

/**
 * Applies borders and fills to EVERY cell in a rectangular range (rowStart..rowEnd, colStart..colEnd).
 * Essential in ExcelJS because merged cells otherwise lose borders on right/bottom edges.
 */
function styleCellRange(
  sheet: ExcelJS.Worksheet,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  options: {
    fillColor?: string;
    border?: Partial<ExcelJS.Borders>;
    font?: Partial<ExcelJS.Font>;
    alignment?: Partial<ExcelJS.Alignment>;
  }
) {
  for (let r = r1; r <= r2; r++) {
    const row = sheet.getRow(r);
    for (let c = c1; c <= c2; c++) {
      const cell = row.getCell(c);
      if (options.fillColor) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: options.fillColor.replace('#', '') },
        };
      }
      if (options.border) {
        cell.border = { ...cell.border, ...options.border };
      }
      if (options.font) {
        cell.font = { ...cell.font, ...options.font };
      }
      if (options.alignment) {
        cell.alignment = { ...cell.alignment, ...options.alignment };
      }
    }
  }
}

/**
 * Builds an ExcelJS Workbook from a SheetModel.
 * One worksheet per page, named "1", "2", etc.
 */
export async function generateShiftExcelWorkbook(model: SheetModel): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '勤務シフト表システム';
  workbook.lastModifiedBy = '勤務シフト表システム';
  workbook.created = new Date();
  workbook.modified = new Date();

  model.pages.forEach((page) => {
    buildWorksheetForPage(workbook, page);
  });

  return workbook;
}

function buildWorksheetForPage(workbook: ExcelJS.Workbook, page: SheetPageModel): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(String(page.pageNumber), {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      horizontalCentered: true,
      verticalCentered: false,
      margins: {
        left: 0.39, // ≈ 10 mm
        right: 0.39,
        top: 0.39,
        bottom: 0.39,
        header: 0.1,
        footer: 0.1,
      },
    },
    views: [{ showGridLines: true }],
  });

  // Table columns correspond to B..L (col 2..12)
  // Col A (col 1) is reserved for vertical instructions text
  // Setup Column Widths
  sheet.getColumn(1).width = 4.2; // Col A: Vertical text

  page.table.columns.forEach((col, idx) => {
    const colNumber = idx + 2; // B = 2 ... L = 12
    const excelWidth = Math.max(5, col.widthMm * MM_TO_EXCEL_COL_WIDTH);
    sheet.getColumn(colNumber).width = Math.round(excelWidth * 10) / 10;
  });

  // Rows 1..3: Banner and Info Rows
  // Row 1: Banner top, Info top (y ≈ 16 mm -> Row 1 height ≈ 22pt)
  // Row 2: Banner mid, Info mid (y ≈ 22 mm -> Row 2 height ≈ 22pt)
  // Row 3: Banner bottom, Info bottom (y ≈ 29 mm -> Row 3 height ≈ 26pt)
  sheet.getRow(1).height = 20;
  sheet.getRow(2).height = 22;
  sheet.getRow(3).height = 28;

  const isFaxMono = Boolean(page.design.additionalSettings?.faxMonochrome);
  const navyHex = page.design.headerColor.replace('#', '');
  const bannerColorHex = isFaxMono ? 'FFFFFF' : navyHex;

  // --- 1. BANNER: L-shaped navy frame with white center (Rows 1..2, Cols B..E) ---
  // Fill B1..E2 with navy frame
  styleCellRange(sheet, 1, 2, 2, 5, {
    fillColor: bannerColorHex,
    border: isFaxMono
      ? {
          top: { style: 'medium', color: { argb: '000000' } },
          bottom: { style: 'medium', color: { argb: '000000' } },
          left: { style: 'medium', color: { argb: '000000' } },
          right: { style: 'medium', color: { argb: '000000' } },
        }
      : undefined,
  });
  // Inner white box C1..E1 for banner text
  styleCellRange(sheet, 1, 3, 1, 5, {
    fillColor: 'FFFFFF',
  });
  sheet.mergeCells(1, 3, 1, 5);
  const bannerCell = sheet.getCell(1, 3);
  bannerCell.value = page.banner.title;
  bannerCell.font = {
    name: FONT_FAMILY,
    size: 20,
    bold: true,
    color: { argb: '000000' },
  };
  bannerCell.alignment = {
    horizontal: 'center',
    vertical: 'middle',
  };

  // --- 2. INFO ROW ---
  // Row 3 (y ≈ 29mm): 会社名　ワールドワークスCMC (Cols B3..D3) - Clean white background!
  styleCellRange(sheet, 3, 2, 3, 5, {
    fillColor: 'FFFFFF',
  });
  sheet.mergeCells(3, 2, 3, 4);
  const companyCell = sheet.getCell(3, 2);
  companyCell.value = page.info.companyNameFormatted;
  companyCell.font = { name: FONT_FAMILY, size: 14, bold: true, color: { argb: '000000' } };
  companyCell.alignment = { horizontal: 'left', vertical: 'middle' };

  // 作業日 & Date (Cols F1..F3 or G1..G3)
  sheet.mergeCells(1, 6, 1, 7);
  const workDateLblCell = sheet.getCell(1, 6);
  workDateLblCell.value = page.info.workDateLabel;
  workDateLblCell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: '777777' } };
  workDateLblCell.alignment = { horizontal: 'center', vertical: 'bottom' };

  sheet.mergeCells(2, 6, 3, 7);
  const workDateValCell = sheet.getCell(2, 6);
  workDateValCell.value = page.info.workDateValue;
  workDateValCell.font = { name: FONT_FAMILY, size: 14, bold: true };
  workDateValCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 曜日 & 担当者 (Cols H1..I3)
  sheet.mergeCells(1, 8, 2, 9);
  const weekdayCell = sheet.getCell(1, 8);
  weekdayCell.value = page.info.weekdayValue;
  weekdayCell.font = { name: FONT_FAMILY, size: 11, bold: true };
  weekdayCell.alignment = { horizontal: 'left', vertical: 'middle' };

  sheet.mergeCells(3, 8, 3, 9);
  const managerCell = sheet.getCell(3, 8);
  managerCell.value = page.info.managerFormatted;
  managerCell.font = { name: FONT_FAMILY, size: 11, bold: true };
  managerCell.alignment = { horizontal: 'left', vertical: 'middle' };

  // 送付手順 & FAX (Cols J1..L3)
  sheet.mergeCells(1, 10, 1, 12);
  const transLblCell = sheet.getCell(1, 10);
  transLblCell.value = page.info.transmissionLabel;
  transLblCell.font = { name: FONT_FAMILY, size: 10, bold: true };
  transLblCell.alignment = { horizontal: 'left', vertical: 'middle' };

  sheet.mergeCells(2, 10, 2, 12);
  const transValCell = sheet.getCell(2, 10);
  transValCell.value = page.info.transmissionValue;
  transValCell.font = { name: FONT_FAMILY, size: 9, bold: true };
  transValCell.alignment = { horizontal: 'left', vertical: 'middle' };

  sheet.mergeCells(3, 10, 3, 12);
  const faxCell = sheet.getCell(3, 10);
  faxCell.value = page.info.faxFormatted;
  faxCell.font = { name: FONT_FAMILY, size: 12, bold: true };
  faxCell.alignment = { horizontal: 'left', vertical: 'middle' };

  // --- 3. TABLE HEADER ROW (Row 4) ---
  const headerRowNum = 4;
  sheet.getRow(headerRowNum).height = page.table.headerRowHeight * MM_TO_PT;
  const tableHeaderHex = isFaxMono ? 'FFFFFF' : page.design.tableHeaderColor.replace('#', '');
  const headerTextColor = isFaxMono ? '000000' : 'FFFFFF';

  styleCellRange(sheet, headerRowNum, 2, headerRowNum, 12, {
    fillColor: tableHeaderHex,
    border: {
      top: { style: 'medium', color: { argb: '000000' } },
      bottom: { style: 'medium', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: isFaxMono ? '000000' : 'A0B0C0' } },
      right: { style: 'thin', color: { argb: isFaxMono ? '000000' : 'A0B0C0' } },
    },
  });

  page.table.columns.forEach((col, idx) => {
    const colNumber = idx + 2;
    const cell = sheet.getCell(headerRowNum, colNumber);
    cell.value = col.label;
    cell.font = {
      name: FONT_FAMILY,
      size: col.fontSizePt,
      bold: true,
      color: { argb: headerTextColor },
    };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
      shrinkToFit: true,
    };
  });

  // Outer medium border on table header ends
  sheet.getCell(headerRowNum, 2).border = {
    ...sheet.getCell(headerRowNum, 2).border,
    left: { style: 'medium', color: { argb: '000000' } },
  };
  sheet.getCell(headerRowNum, 12).border = {
    ...sheet.getCell(headerRowNum, 12).border,
    right: { style: 'medium', color: { argb: '000000' } },
  };

  // --- 4. TABLE BODY ROWS (Rows 5..5 + rows.length - 1) ---
  const bodyStartRow = 5;
  const bodyRowHeightPt = page.table.bodyRowHeight * MM_TO_PT;

  page.table.rows.forEach((row, rIdx) => {
    const currentRowNum = bodyStartRow + rIdx;
    sheet.getRow(currentRowNum).height = bodyRowHeightPt;
    const rowBgHex = row.backgroundColor.replace('#', '');

    styleCellRange(sheet, currentRowNum, 2, currentRowNum, 12, {
      fillColor: rowBgHex,
      border: {
        top: { style: 'thin', color: { argb: '000000' } },
        bottom: {
          style: rIdx === page.table.rows.length - 1 ? 'medium' : 'thin',
          color: { argb: '000000' },
        },
        left: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      },
    });

    // Outer medium left & right border
    sheet.getCell(currentRowNum, 2).border = {
      ...sheet.getCell(currentRowNum, 2).border,
      left: { style: 'medium', color: { argb: '000000' } },
    };
    sheet.getCell(currentRowNum, 12).border = {
      ...sheet.getCell(currentRowNum, 12).border,
      right: { style: 'medium', color: { argb: '000000' } },
    };

    row.cells.forEach((cell, cIdx) => {
      const colNumber = cIdx + 2;
      const xlCell = sheet.getCell(currentRowNum, colNumber);

      if (cell.isTime && cell.timeFraction !== null) {
        xlCell.value = cell.timeFraction;
        xlCell.numFmt = 'h:mm';
      } else if (cell.isCode) {
        xlCell.value = cell.text && cell.text.trim() ? String(cell.text) : null;
        if (cell.text) xlCell.numFmt = '@';
      } else if (cIdx === 0) {
        // NO.
        xlCell.value = Number(cell.text) || cell.text;
      } else {
        xlCell.value = cell.text && cell.text.trim() ? cell.text : null;
      }

      xlCell.font = {
        name: FONT_FAMILY,
        size: cell.fontSizePt,
        bold: cIdx === 0,
        color: { argb: '111111' },
      };
      xlCell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        shrinkToFit: true,
        wrapText: cell.lines.length > 1,
      };
    });
  });

  const tableBottomRow = bodyStartRow + page.table.rows.length - 1;

  // --- 5. VERTICAL INSTRUCTION TEXT (Col A, rows 5..tableBottomRow + 3) ---
  const vertStartRow = bodyStartRow;
  const vertEndRow = tableBottomRow + 3;
  sheet.mergeCells(vertStartRow, 1, vertEndRow, 1);
  const vertCell = sheet.getCell(vertStartRow, 1);
  // Replace arrows with ↓ for vertical orientation
  const vertTextFixed = page.verticalText.text.replace(/→/g, '↓');
  vertCell.value = vertTextFixed;
  vertCell.font = {
    name: FONT_FAMILY,
    size: 9.5,
    bold: true,
    color: { argb: '000000' },
  };
  vertCell.alignment = {
    vertical: 'middle',
    horizontal: 'center',
    textRotation: 'vertical',
    wrapText: true,
  };

  // --- 6. APPROVAL BOX (Bottom Right, under table) ---
  // Rows: tableBottomRow + 1 .. tableBottomRow + 3, Col L (12)
  const appStartRow = tableBottomRow + 1;
  const appEndRow = tableBottomRow + 3;

  // Header row of approval box (tableBottomRow + 1)
  sheet.getRow(appStartRow).height = 16;
  sheet.getRow(appStartRow + 1).height = 20;
  sheet.getRow(appEndRow).height = 20;

  // Top label cell
  const appLabelCell = sheet.getCell(appStartRow, 12);
  appLabelCell.value = `${page.approvalBox.title}\n${page.approvalBox.position}`;
  appLabelCell.font = { name: FONT_FAMILY, size: 8.5, bold: true };
  appLabelCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  styleCellRange(sheet, appStartRow, 12, appStartRow, 12, {
    border: {
      top: { style: 'medium', color: { argb: '000000' } },
      bottom: { style: 'thin', color: { argb: '000000' } },
      left: { style: 'medium', color: { argb: '000000' } },
      right: { style: 'medium', color: { argb: '000000' } },
    },
  });

  // Empty signature area (appStartRow + 1 .. appEndRow)
  sheet.mergeCells(appStartRow + 1, 12, appEndRow, 12);
  styleCellRange(sheet, appStartRow + 1, 12, appEndRow, 12, {
    border: {
      top: { style: 'thin', color: { argb: '000000' } },
      bottom: { style: 'medium', color: { argb: '000000' } },
      left: { style: 'medium', color: { argb: '000000' } },
      right: { style: 'medium', color: { argb: '000000' } },
    },
  });

  // Additional notes & page indicator at bottom-left
  if (page.additionalNotes) {
    const notesCell = sheet.getCell(tableBottomRow + 1, 2);
    notesCell.value = `※ ${page.additionalNotes}`;
    notesCell.font = { name: FONT_FAMILY, size: 9 };
  }

  if (page.pageNumberText) {
    const pageNumCell = sheet.getCell(tableBottomRow + 2, 2);
    pageNumCell.value = page.pageNumberText;
    pageNumCell.font = { name: FONT_FAMILY, size: 8.5, color: { argb: '666666' } };
  }

  // Set Print Area: A1..L(appEndRow)
  sheet.pageSetup.printArea = `A1:L${appEndRow}`;

  return sheet;
}
