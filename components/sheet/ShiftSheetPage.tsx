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

      {/* Top Banner (131mm x 22mm flush top-left) */}
      <div
        className="absolute top-0 left-0 z-10"
        style={{ width: `${banner.widthMm}mm`, height: `${banner.heightMm}mm` }}
      >
        <svg
          width={`${banner.widthMm}mm`}
          height={`${banner.heightMm}mm`}
          viewBox="0 0 131 22"
          className="absolute inset-0"
        >
          {isFaxMono ? (
            <polygon points="0,0 131,0 117,22 0,22" fill="#FFFFFF" stroke="#000000" strokeWidth="1.2" />
          ) : (
            <>
              {/* Navy outer polygon: (0,0) (131,0) (117,22) (0,22) */}
              <polygon points="0,0 131,0 117,22 0,22" fill={banner.color} />
              {/* White inner parallelogram: (4,0) (123,0) (110,20) (4,20) */}
              <polygon points="4,0 123,0 110,20 4,20" fill="#FFFFFF" />
            </>
          )}
        </svg>

        {/* Title: bold ≈ 33pt black, starting at x = 11, centered vertically (y ≈ 12) */}
        <div
          className="absolute font-bold text-black flex items-center leading-none"
          style={{
            left: '11mm',
            top: '0mm',
            height: '20mm',
            fontSize: `${33 * (design.fontScale / 100)}pt`,
            letterSpacing: '0.04em',
          }}
        >
          {banner.title}
        </div>
      </div>

      {/* Info Row Elements */}
      {/* 会社名　ワールドワークスCMC (x = 10.7, y ≈ 29) */}
      <div
        className="absolute font-bold whitespace-nowrap text-black leading-none"
        style={{
          left: '10.7mm',
          top: '28.5mm',
          fontSize: `${18 * (design.fontScale / 100)}pt`,
        }}
      >
        {info.companyNameFormatted}
      </div>

      {/* 作業日 label & date (Centered at x ≈ 134mm) */}
      <div
        className="absolute flex flex-col items-center justify-center text-center"
        style={{
          left: '122mm',
          width: '26mm',
          top: '19.5mm',
        }}
      >
        <span
          className="font-bold text-[#777777] leading-tight"
          style={{ fontSize: `${14 * (design.fontScale / 100)}pt` }}
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

      {/* Weekday & Manager (x = 160mm) */}
      <div
        className="absolute flex flex-col"
        style={{
          left: '160mm',
          top: '19.8mm',
        }}
      >
        <span
          className="font-bold text-black leading-tight"
          style={{ fontSize: `${14 * (design.fontScale / 100)}pt` }}
        >
          {info.weekdayValue}
        </span>
        <span
          className="font-bold text-black leading-tight mt-[2.5mm]"
          style={{ fontSize: `${13 * (design.fontScale / 100)}pt` }}
        >
          {info.managerFormatted}
        </span>
      </div>

      {/* Transmission Instructions & FAX (x = 201mm -> 290.1mm) */}
      <div
        className="absolute flex flex-col text-right"
        style={{
          left: '195mm',
          width: '95.1mm',
          top: '14.5mm',
        }}
      >
        <div
          className="font-bold text-black leading-tight"
          style={{ fontSize: `${14 * (design.fontScale / 100)}pt` }}
        >
          {info.transmissionLabel}
        </div>
        <div
          className="font-bold text-black leading-tight mt-[1.2mm]"
          style={{ fontSize: `${11 * (design.fontScale / 100)}pt`, letterSpacing: '-0.02em' }}
        >
          {info.transmissionValue}
        </div>
        <div
          className="font-bold text-black leading-tight mt-[1.5mm]"
          style={{ fontSize: `${15 * (design.fontScale / 100)}pt`, letterSpacing: '0.02em' }}
        >
          {info.faxFormatted}
        </div>
      </div>

      {/* Vertical Instruction Text in Left Strip (x ≈ 7mm, top y ≈ 48mm down to ≈ 189mm) */}
      <div
        className="absolute z-10 select-none flex items-center justify-center font-bold text-black"
        style={{
          left: '4.5mm',
          width: '5.5mm',
          top: `${verticalText.topY}mm`,
          height: `${verticalText.height}mm`,
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          fontSize: `${10 * (design.fontScale / 100)}pt`,
          letterSpacing: '0.08em',
          lineHeight: 1.1,
        }}
      >
        {verticalText.text}
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
