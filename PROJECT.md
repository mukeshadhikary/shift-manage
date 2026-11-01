# Project: shift-managers

## Architecture
- **Framework**: Next.js 16.4.3 (App Router with Turbopack) + React 19.
- **Styling**: Tailwind CSS with custom print media queries and mobile viewport zoom isolation rules.
- **Data Layer**: SQLite (`better-sqlite3`) with schema migrations (`lib/db/migrations/`, `lib/db/index.ts`).
- **Export Engines**: ExcelJS (`lib/export/excel.ts`) in-memory streaming and styled printable sheet view (`app/print/[date]/page.tsx`, `components/sheet/ShiftSheetPage.tsx`) for client/serverless vector PDF printing.
- **State Flow**: `MainShiftView.tsx` holds shift state (`ShiftWithEmployees`) and derives `SheetModel` (`lib/sheet/index.ts`) for real-time preview and export payloads.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Dual-Directional Sheet Zoom | Re-enable `+` zoom-in button in ZoomControls (25% to 150%) | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Touch & Wheel Sheet Zoom | Enable pinch-to-zoom (in/out) and Ctrl/Cmd-wheel directly on shift sheet preview canvas | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Fit-to-Width Zoom Reset | Reset button restores sheet zoom to calculated fit-to-width | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Webpage Viewport Isolation | Prevent browser viewport zoom on buttons, header, tabs (`touch-action: pan-x pan-y`, meta viewport `maximum-scale=1.0, user-scalable=no`) | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Single-Column Mobile Form Layout | Responsively stack CODE & Nickname, Planned/Actual Start, Planned End/Break, Locker/Remarks on < 400px viewports (`grid-cols-1 sm:grid-cols-2`) in `EmployeeForm.tsx` | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Form Padding Optimization | Eliminate redundant horizontal padding inside BottomSheet for mobile devices | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Quick Selection Chips Wrapping | Format quick time and break chips to wrap cleanly with structured headers and zero clipping | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Wizard Step 2 Item Layout | Ensure draft staff list items have `min-w-0 flex-1 truncate` and action buttons have `shrink-0` in `ShiftCreationWizard.tsx` | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Strict 24h Default Instructions | Update `lib/defaults.ts` replacing `翌日AM9:00までに送付` with `翌日9:00までに送付` | M3 | ORIGINAL_REQUEST §R3 |
| 10 | SQLite Migration 002 | Create `002_update_vertical_instructions.sql` and `applyMigration002` in `lib/db/index.ts` to migrate existing databases | M3 | ORIGINAL_REQUEST §R3 |
| 11 | Strict 24h Time Inputs & Chips | Ensure `<input type="time">` bindings and chip comparisons consistently use `formatTime24H()` (`HH:mm`) | M3 | ORIGINAL_REQUEST §R3 |
| 12 | In-Memory Excel POST Route | Add `POST /api/shifts/[date]/xlsx` accepting shift JSON snapshot and streaming Excel workbook without server disk dependency | M4 | ORIGINAL_REQUEST §R4 |
| 13 | Stateless Print & PDF Preview Fallback | Provide client snapshot fallback via `localStorage` on `/print/[date]` with `?autoprint=1` and handle PDF route fallback for Vercel lambdas | M4 | ORIGINAL_REQUEST §R4 |
| 14 | Export Menu State Wiring | Update `ExportMenu.tsx` to receive `shift` prop from `MainShiftView.tsx` and trigger direct in-memory downloads and print preview | M4 | ORIGINAL_REQUEST §R4 |
| 15 | Infrastructure Script Addition | Add `"typecheck": "tsc --noEmit"` to `package.json` | M4 | ORIGINAL_REQUEST §R4 |
| 16 | Comprehensive E2E Verification & Hardening | Verify all 39+ Vitest tests, Playwright tests, typecheck, lint, and Next.js build pass cleanly | M5 | ORIGINAL_REQUEST Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Shift Sheet Zoom & Webpage Viewport Separation | `ZoomControls.tsx`, `ShiftSheetPreview.tsx`, `MainShiftView.tsx` (zoom handler), `app/globals.css` | none | DONE |
| 2 | M2: Responsive Mobile Form Layout | `EmployeeForm.tsx`, `ShiftCreationWizard.tsx`, `HeaderEditModal.tsx`, `MainShiftView.tsx` (modal padding) | none | IN_PROGRESS |
| 3 | M3: Strict 24-Hour Time Format | `lib/defaults.ts`, `lib/db/migrations/002_update_vertical_instructions.sql`, `lib/db/index.ts`, `EmployeeForm.tsx` (time binding), unit tests | none | PLANNED |
| 4 | M4: Fix Export Downloads on Vercel | `app/api/shifts/[date]/xlsx/route.ts`, `ExportMenu.tsx`, `MainShiftView.tsx` (pass shift prop), `app/print/[date]/page.tsx`, `app/api/shifts/[date]/pdf/route.ts`, `package.json` | none | PLANNED |
| 5 | M5: E2E Verification & Adversarial Hardening | Verification of full test suite (unit + e2e), typecheck, lint, production build, adversarial corner cases | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### MainShiftView ↔ ExportMenu
- `ExportMenuProps`: `{ shiftDate: string; shift?: ShiftWithEmployees | null; }`
- `handleDownloadExcel`: Sends `POST /api/shifts/[date]/xlsx` with `{ shift }` when `shift` is present, falls back to `GET`.
- `handleDownloadPdf`: Saves shift snapshot to `localStorage.setItem('shift_snapshot_' + shiftDate, JSON.stringify(shift))` and opens `/print/[date]?autoprint=1`.

### MainShiftView ↔ ZoomControls & ShiftSheetPreview
- `zoomPercent`: `number` in range `[25, 150]`.
- `onZoomChange`: `(newZoom: number) => void`. Clamped to `[25, 150]`.
- `calculateFitToWidth`: `() => number`. Fit calculation on container resize and initial mount.

### Database Migrations ↔ lib/db/index.ts
- `user_version` advances from 1 to 2 via `002_update_vertical_instructions.sql` and `applyMigration002(db)`.

## Code Layout
- `components/controls/ZoomControls.tsx`: Sheet zoom buttons (+, -, reset)
- `components/sheet/ShiftSheetPreview.tsx`: Sheet canvas scaling & touch/wheel gesture handlers
- `components/employee/EmployeeForm.tsx`: Employee input form & quick time chips
- `components/wizard/ShiftCreationWizard.tsx`: Shift creation wizard step 2 staff list
- `components/header/HeaderEditModal.tsx`: Header edit modal responsive grid
- `components/export/ExportMenu.tsx`: Export menu with in-memory Excel POST and print/PDF trigger
- `components/MainShiftView.tsx`: Main view coordinating state, sheets, modals, and export props
- `lib/defaults.ts`: Default company and shift header configuration (strict 24h)
- `lib/db/migrations/002_update_vertical_instructions.sql`: Migration script for 24h instructions
- `lib/db/index.ts`: Database connection and migration execution
- `app/api/shifts/[date]/xlsx/route.ts`: In-memory Excel export endpoint (GET & POST)
- `app/api/shifts/[date]/pdf/route.ts`: PDF export fallback endpoint
- `app/print/[date]/page.tsx`: Printable sheet preview page with client localStorage snapshot fallback
- `app/globals.css`: Touch action isolation and print media styling
