'use client';

import React from 'react';
import { SheetPageModel } from '@/lib/sheet';

interface ShiftSheetPageProps {
  page: SheetPageModel;
  onRowClick?: (employeeId?: number, rowNumber?: number) => void;
  isPrint?: boolean;
}

export function ShiftSheetPage({ page, onRowClick, isPrint = false }: ShiftSheetPageProps) {
  const {
    banner,
    info,
    table,
    verticalText,
    approvalBox,
    pageNumberText,
    additionalNotes,
    design,
  } = page;

  const isFaxMono = Boolean(design.additionalSettings?.faxMonochrome);

  return (
    <div
      className={`shift-sheet-page relative bg-white text-[#111111] select-none ${
        isPrint ? '' : 'shadow-xl rounded-sm'
      }`}
      style={{
        width: '297mm',
        height: '210mm',
        maxWidth: '297mm',
        maxHeight: '210mm',
        minWidth: '297mm',
        minHeight: '210mm',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: "'Noto Sans JP', sans-serif",
        pageBreakAfter: page.pageNumber < page.totalPages ? 'always' : 'auto',
      }}
    >
      {/* Decorative background shapes if enabled */}
      {!isFaxMono && design.additionalSettings?.showDecor && (
        <svg
          className="absolute inset-0 pointer-events-none z-0"
          width="297mm"
          height="210mm"
          viewBox="0 0 297 210"
        >
          {/* Subtle pale-blue diagonal decor in bottom-left */}
          <polygon
            points="0,175 0,210 65,210 30,175"
            fill="#EAF1FA"
            opacity="0.75"
          />
          {/* Subtle pale-blue diagonal decor in right area */}
          <polygon
            points="280,35 297,35 297,120 260,80"
            fill="#EAF1FA"
            opacity="0.6"
          />
        </svg>
      )}

      {/* Top Banner Left Bar (x = 4.5mm, y = 4.5mm, width = 4mm, height = 20mm) */}
      <div
        className="absolute z-10"
        style={{
          left: '4.5mm',
          top: '4.5mm',
          width: '4mm',
          height: '20mm',
          backgroundColor: isFaxMono ? '#000000' : banner.color,
        }}
      />

      {/* Top Banner Title: "ワールドワークス" (x = 10.5mm, y = 4.5mm, height = 20mm) */}
      <div
        className="absolute z-10 font-bold text-black flex items-center leading-none"
        style={{
          left: '10.5mm',
          top: '4.5mm',
          height: '20mm',
          fontSize: `${32 * (design.fontScale / 100)}pt`,
          letterSpacing: '0.04em',
        }}
      >
        {banner.title}
      </div>

      {/* Top Banner Diagonal Slash Stripe */}
      <svg
        className="absolute pointer-events-none z-10"
        style={{
          left: '92mm',
          top: '4.5mm',
          width: '36mm',
          height: '20mm',
        }}
        viewBox="0 0 36 20"
      >
        <polygon
          points="16,0 34,0 18,20 0,20"
          fill={isFaxMono ? '#000000' : banner.color}
        />
      </svg>

      {/* Info Row Elements */}
      {/* 会社名　ワールドワークスCMC (x = 10.5mm, y = 28.0mm) */}
      <div
        className="absolute font-bold whitespace-nowrap text-black leading-none z-10"
        style={{
          left: '10.5mm',
          top: '28.0mm',
          fontSize: `${17 * (design.fontScale / 100)}pt`,
        }}
      >
        {info.companyNameFormatted}
      </div>

      {/* 作業日 label & date (Centered at x ≈ 138mm) */}
      <div
        className="absolute flex flex-col items-center justify-center text-center z-10"
        style={{
          left: '125mm',
          width: '28mm',
          top: '17.5mm',
        }}
      >
        <span
          className="font-bold text-[#555555] leading-tight"
          style={{ fontSize: `${12.5 * (design.fontScale / 100)}pt` }}
        >
          {info.workDateLabel}
        </span>
        <span
          className="font-bold text-black leading-tight mt-[1mm]"
          style={{ fontSize: `${18 * (design.fontScale / 100)}pt` }}
        >
          {info.workDateValue}
        </span>
      </div>

      {/* Weekday & Manager (x = 156mm) */}
      <div
        className="absolute flex flex-col z-10"
        style={{
          left: '156mm',
          top: '17.5mm',
        }}
      >
        <span
          className="font-bold text-black leading-tight"
          style={{ fontSize: `${13.5 * (design.fontScale / 100)}pt` }}
        >
          {info.weekdayValue}
        </span>
        <span
          className="font-bold text-black leading-tight mt-[2.5mm]"
          style={{ fontSize: `${12.5 * (design.fontScale / 100)}pt` }}
        >
          {info.managerFormatted}
        </span>
      </div>

      {/* Transmission Instructions & FAX (x = 196mm, width = 85mm, left-aligned) */}
      <div
        className="absolute flex flex-col text-left z-10"
        style={{
          left: '196mm',
          width: '85mm',
          top: '13.0mm',
        }}
      >
        <div
          className="font-bold text-black leading-tight"
          style={{ fontSize: `${13.5 * (design.fontScale / 100)}pt` }}
        >
          {info.transmissionLabel}
        </div>
        <div
          className="font-bold text-black leading-tight mt-[1.5mm]"
          style={{ fontSize: `${10.5 * (design.fontScale / 100)}pt`, letterSpacing: '-0.01em' }}
        >
          {info.transmissionValue}
        </div>
        <div
          className="font-bold text-black leading-tight mt-[1.5mm]"
          style={{ fontSize: `${14.5 * (design.fontScale / 100)}pt`, letterSpacing: '0.02em' }}
        >
          {info.faxFormatted}
        </div>
      </div>

      {/* Vertical Instruction Text in Left Strip (x = 3.5mm..9.5mm, top y = 35.0mm) */}
      <div
        className="absolute z-10 select-none flex flex-col items-center justify-between"
        style={{
          left: '3.5mm',
          width: '6.0mm',
          top: `${table.y}mm`,
          height: `${table.headerRowHeight + table.bodyRowHeight * table.rows.length}mm`,
        }}
      >
        <div
          className="font-bold text-black leading-tight"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            fontSize: `${9 * (design.fontScale / 100)}pt`,
            letterSpacing: '0.06em',
          }}
        >
          {verticalText.text}
        </div>
        <div
          className="flex flex-col items-center justify-around flex-1 mt-[2mm] text-black font-bold"
          style={{ fontSize: '11pt', letterSpacing: '0.2em' }}
        >
          <span>•</span>
          <span>•</span>
          <span>•</span>
          <span>•</span>
          <span>•</span>
        </div>
      </div>

      {/* Table (x = 10.7mm, width = 279.4mm, top y = 35.2mm) */}
      <div
        className="absolute z-10"
        style={{
          left: `${table.x}mm`,
          top: `${table.y}mm`,
          width: `${table.width}mm`,
          border: isFaxMono ? '1.5pt solid #000000' : '1.2pt solid #000000',
          boxSizing: 'border-box',
        }}
      >
        {/* Table Header Row */}
        <div
          className="flex flex-row items-stretch"
          style={{
            height: `${table.headerRowHeight}mm`,
            backgroundColor: isFaxMono ? '#FFFFFF' : design.tableHeaderColor,
            borderBottom: isFaxMono ? '1.5pt solid #000000' : '1.2pt solid #000000',
          }}
        >
          {table.columns.map((col, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-center text-center font-bold px-[0.5mm] ${
                isFaxMono ? 'text-black' : 'text-white'
              }`}
              style={{
                width: `${col.widthMm}mm`,
                minWidth: `${col.widthMm}mm`,
                maxWidth: `${col.widthMm}mm`,
                fontSize: `${col.fontSizePt}pt`,
                borderRight:
                  idx < table.columns.length - 1
                    ? isFaxMono
                      ? '0.8pt solid #000000'
                      : '0.5pt solid rgba(255, 255, 255, 0.45)'
                    : 'none',
                lineHeight: 1.15,
                wordBreak: 'break-all',
              }}
            >
              {col.label}
            </div>
          ))}
        </div>

        {/* Table Body Rows */}
        {table.rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            onClick={() => onRowClick?.(row.employeeId, row.rowNumber)}
            className={`flex flex-row items-stretch ${
              onRowClick ? 'cursor-pointer hover:brightness-95 transition-all' : ''
            }`}
            style={{
              height: `${table.bodyRowHeight}mm`,
              backgroundColor: row.backgroundColor,
              borderBottom:
                rowIdx < table.rows.length - 1
                  ? isFaxMono
                    ? '0.8pt solid #000000'
                    : '0.5pt solid #000000'
                  : 'none',
            }}
          >
            {row.cells.map((cell, colIdx) => {
              const col = table.columns[colIdx];
              return (
                <div
                  key={colIdx}
                  className="flex flex-col items-center justify-center text-center px-[0.6mm] leading-tight text-[#111111]"
                  style={{
                    width: `${col.widthMm}mm`,
                    minWidth: `${col.widthMm}mm`,
                    maxWidth: `${col.widthMm}mm`,
                    borderRight:
                      colIdx < table.columns.length - 1
                        ? isFaxMono
                          ? '0.8pt solid #000000'
                          : '0.5pt solid #000000'
                        : 'none',
                    fontSize: `${cell.fontSizePt}pt`,
                    fontWeight: colIdx === 0 ? 'bold' : 'normal',
                    overflow: 'hidden',
                  }}
                >
                  {cell.lines.map((line, lineIdx) => (
                    <span key={lineIdx} className="truncate max-w-full">
                      {line}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Under-Table Left: Additional Notes & Page Number */}
      <div
        className="absolute flex flex-col justify-start z-10"
        style={{
          left: `${table.x}mm`,
          top: `${table.y + table.headerRowHeight + table.bodyRowHeight * table.rows.length + 1.5}mm`,
          maxWidth: '180mm',
        }}
      >
        {additionalNotes && (
          <div
            className="text-[#333333] font-medium"
            style={{ fontSize: `${9 * (design.fontScale / 100)}pt` }}
          >
            ※ {additionalNotes}
          </div>
        )}
        {pageNumberText && (
          <div
            className="text-[#666666] font-medium mt-[1mm]"
            style={{ fontSize: `${8.5 * (design.fontScale / 100)}pt` }}
          >
            {pageNumberText}
          </div>
        )}
      </div>

      {/* Approval Box: aligned to last column & table right edge (top y ≈ 172, height ≈ 27.7mm) */}
      <div
        className="absolute z-10 flex flex-col"
        style={{
          left: `${approvalBox.x}mm`,
          top: `${approvalBox.y}mm`,
          width: `${approvalBox.width}mm`,
          height: `${approvalBox.height}mm`,
          border: '1.2pt solid #000000',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Label area (≈ 8.5mm high) */}
        <div
          className="flex flex-col items-center justify-center text-center font-bold text-black border-b border-black"
          style={{
            height: '8.5mm',
            fontSize: `${8.5 * (design.fontScale / 100)}pt`,
            lineHeight: 1.15,
            padding: '0.5mm 0',
          }}
        >
          <span>{approvalBox.title}</span>
          <span>{approvalBox.position}</span>
        </div>
        {/* Empty signature area below */}
        <div className="flex-1" />
      </div>
    </div>
  );
}
