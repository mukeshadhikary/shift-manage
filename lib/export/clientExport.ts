import { ShiftWithEmployees } from '../types';
import { buildSheetModel } from '../sheet';
import { generateShiftExcelWorkbook } from './excel';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Triggers a download of a Blob file in the browser to the default download location.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates an Excel (.xlsx) workbook directly on the client side using ExcelJS
 * and triggers an immediate download to the default location.
 */
export async function exportShiftToExcel(shift: ShiftWithEmployees): Promise<void> {
  const model = buildSheetModel(shift, shift.header_snapshot, shift.design_snapshot);
  const workbook = await generateShiftExcelWorkbook(model);
  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const filename = `${shift.shift_date}_勤務シフト表.xlsx`;
  triggerBlobDownload(blob, filename);
}

/**
 * Generates a PDF file directly on the client side using jsPDF & html2canvas
 * and triggers an immediate download to the default download location.
 */
export async function exportShiftToPdf(shift: ShiftWithEmployees): Promise<void> {
  if (typeof window === 'undefined') return;

  // Find all .shift-sheet-page elements rendered in the DOM
  const existingPages = Array.from(document.querySelectorAll<HTMLElement>('.shift-sheet-page'));

  if (existingPages.length === 0) {
    throw new Error('シフト表が見つかりません');
  }

  // Create jsPDF instance in A4 landscape mode (297mm x 210mm)
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Dedicated offscreen container to render unscaled 297mm x 210mm pages without zoom artifacts
  const offscreen = document.createElement('div');
  offscreen.style.position = 'fixed';
  offscreen.style.left = '-9999px';
  offscreen.style.top = '0';
  offscreen.style.width = '297mm';
  offscreen.style.zIndex = '-9999';
  document.body.appendChild(offscreen);

  try {
    for (let i = 0; i < existingPages.length; i++) {
      const originalPage = existingPages[i];
      const clone = originalPage.cloneNode(true) as HTMLElement;
      clone.style.transform = 'none';
      clone.style.margin = '0';
      clone.style.display = 'block';
      clone.style.visibility = 'visible';
      clone.style.boxShadow = 'none';
      offscreen.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2.5, // 240 DPI sharp Japanese typography
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        windowHeight: 850,
      });

      offscreen.removeChild(clone);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) {
        pdf.addPage('a4', 'landscape');
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
    }

    const filename = `${shift.shift_date}_勤務シフト表.pdf`;
    pdf.save(filename);
  } finally {
    if (document.body.contains(offscreen)) {
      document.body.removeChild(offscreen);
    }
  }
}
