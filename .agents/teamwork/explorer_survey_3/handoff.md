# Handoff Report: Survey Explorer 3 — Export Downloads (R4) and Infrastructure

## 1. Observation

### 1.1 Excel Export Implementation and Persistence Failure
- **Route Handler**: `app/api/shifts/[date]/xlsx/route.ts`
  - Lines 1-2: `export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';`
  - Lines 13-29:
    ```typescript
    export async function GET(request: Request, context: RouteContext) {
      const { date } = await context.params;
      ...
      const shift = getShiftByDate(date);
      if (!shift) {
        return NextResponse.json(
          { error: `指定された日付 (${date}) のシフト表が見つかりません。` },
          { status: 404 }
        );
      }
    ```
  - Lines 32-47: Generates in-memory workbook using `buildSheetModel(shift, shift.header_snapshot, shift.design_snapshot)` and `generateShiftExcelWorkbook(model)`, serializes via `await workbook.xlsx.writeBuffer()`, and streams with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `Content-Disposition: attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`.
  - **No POST handler exists** in `app/api/shifts/[date]/xlsx/route.ts`.
- **Database Persistence**: `lib/db/index.ts`
  - Lines 21-25:
    ```typescript
    // On Vercel or read-only serverless environments, default to /tmp/shift.db
    if (process.env.VERCEL && !dbPath && !process.env.DATABASE_PATH) {
      targetPath = '/tmp/shift.db';
    }
    ```
  - In serverless lambdas on Vercel, the filesystem `/tmp` is ephemeral and per-container. Container A running a mutation does not share `/tmp/shift.db` with Container B handling a subsequent GET request.
- **Client Export Menu**: `components/export/ExportMenu.tsx`
  - Lines 8-10:
    ```typescript
    interface ExportMenuProps {
      shiftDate: string;
    }
    ```
    `ExportMenu` only receives `shiftDate: string`. It does not receive the `shift` object or `SheetModel`.
  - Lines 131-139:
    ```typescript
    <a
      href={`/api/shifts/${shiftDate}/xlsx`}
      download
      onClick={() => setIsOpen(false)}
      className="..."
    >
      <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
      <span>{ja.export.excel}</span>
    </a>
    ```
    This invokes a pure GET request without passing any client state.
- **Client Main View**: `components/MainShiftView.tsx`
  - Lines 67-72: State `shift: ShiftWithEmployees | null` is held directly in React state.
  - Lines 249-251: `const sheetModel = shift ? buildSheetModel(shift, shift.header_snapshot, shift.design_snapshot) : null;`
  - Line 347: `<ExportMenu shiftDate={currentDate} />` — renders `ExportMenu` only when `shift` is non-null, but discards `shift` and passes only `currentDate`.

### 1.2 PDF Export Implementation and Vercel Chromium Failure
- **PDF Generation**: `lib/export/pdf.ts`
  - Lines 1-13:
    ```typescript
    import { chromium, Browser } from 'playwright';
    ...
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    });
    ```
  - Lines 18-41:
    ```typescript
    export async function generateShiftPdf(
      shiftDate: string,
      serverOrigin: string = 'http://127.0.0.1:3000'
    ): Promise<Buffer> {
      ...
      const printUrl = `${serverOrigin}/print/${shiftDate}`;
      await page.goto(printUrl, { waitUntil: 'networkidle', timeout: 30000 });
    ```
- **Dependencies**: `package.json`
  - Lines 13-23: Production dependencies contain `@holiday-jp/holiday_jp`, `better-sqlite3`, `exceljs`, `lucide-react`, `next`, `react`, `react-dom`, `react-hook-form`, `zod`.
  - Lines 24-37: `@playwright/test` is only in `devDependencies`. The `playwright` package and its Chromium binaries are NOT bundled in production.
  - Vercel serverless functions have a 50MB zipped / 250MB uncompressed limit. Playwright's headless Chromium (~300MB) cannot run on standard Vercel serverless lambdas.
- **PDF Route Handler**: `app/api/shifts/[date]/pdf/route.ts`
  - Lines 22-28: Also calls `getShiftByDate(date)` and returns 404 if not found in local SQLite.
  - Lines 36-53: Calls `generateShiftPdf(date, serverOrigin)`. When Chromium launch fails, it catches the error and returns `{ error: message }, { status: 500 }`.
- **Client PDF Trigger & Unnecessary Prefetch**: `components/export/ExportMenu.tsx`
  - Lines 36-49:
    ```typescript
    // Pre-fetch PDF when menu opens so Web Share API can use the file directly inside tap handler
    useEffect(() => {
      if (isOpen && !pdfBlobRef.current) {
        fetch(`/api/shifts/${shiftDate}/pdf`)
    ```
    This sends an automated fetch request to `/api/shifts/${shiftDate}/pdf` every time the user opens the dropdown menu, immediately triggering the serverless failure on Vercel.
  - Lines 141-149:
    `<a href={`/api/shifts/${shiftDate}/pdf`} download ...>` downloads the 500 JSON error as a `.pdf` file.
  - Lines 65-75:
    ```typescript
    const handlePrint = () => {
      setIsOpen(false);
      const printWindow = window.open(`/print/${shiftDate}`, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        });
      }
    };
    ```
- **Print Route Handler**: `app/print/[date]/page.tsx`
  - Lines 21-24:
    ```typescript
    const shift = getShiftByDate(date);
    if (!shift) {
      notFound();
    }
    ```
    If SQLite on that lambda instance is cold/empty, `/print/[date]` responds with `notFound()` (404), rendering a 404 page in the new window instead of the printable shift sheet.
- **Print Styling**: `app/globals.css` and `components/sheet/ShiftSheetPage.tsx`
  - `app/globals.css` lines 68-78:
    ```css
    @media print {
      @page {
        size: A4 landscape;
        margin: 0;
      }
      body {
        background: transparent;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    ```
  - `components/sheet/ShiftSheetPage.tsx` lines 32-42: exact 297mm x 210mm A4 dimensions with page breaks configured.

### 1.3 Infrastructure: Tests, Types, Lint, and Build
- **Vitest Test Suite**: Ran `npm run test` (`vitest run`):
  - 5 test files executed:
    - `lib/sheet/sheet.test.ts` (8 tests passed)
    - `lib/date.test.ts` (11 tests passed)
    - `lib/db/schema.test.ts` (5 tests passed)
    - `lib/db/repository.test.ts` (11 tests passed)
    - `lib/export/excel.test.ts` (4 tests passed)
  - Total: 39 tests passed, 0 failed (Duration: ~479ms).
- **TypeScript Typecheck**: Ran `npx tsc --noEmit`:
  - Result: 0 errors, exit code 0.
  - Note: `package.json` currently lacks a `"typecheck": "tsc --noEmit"` script.
- **ESLint**: Ran `npm run lint` (`eslint`):
  - Result: 0 errors, 0 warnings, exit code 0.
- **Next.js Production Build**: Ran `npm run build` (`next build` with Next.js 16.4.3 & Turbopack):
  - Result: Built in ~580ms.
  - Routes compiled:
    - `ƒ /`
    - `○ /_not-found`
    - `ƒ /api/backup`
    - `ƒ /api/shifts/[date]/pdf`
    - `ƒ /api/shifts/[date]/xlsx`
    - `ƒ /print/[date]`

---

## 2. Logic Chain

1. **Why Excel downloads fail with 404 on Vercel**:
   - Vercel Serverless Functions execute on isolated, stateless containers.
   - When a user creates or edits a shift, SQLite writes to `/tmp/shift.db` in Container A.
   - When the user clicks `<a href="/api/shifts/${shiftDate}/xlsx" download>`, this GET request is routed to Container B.
   - Container B initializes a fresh `/tmp/shift.db` containing no shift for `shiftDate`.
   - `app/api/shifts/[date]/xlsx/route.ts` line 23 executes `getShiftByDate(date)`. Because Container B has no row for `date`, `shift` is null.
   - Line 25-28 immediately returns HTTP 404 JSON `{ error: "指定された日付 (${date}) のシフト表が見つかりません。" }`.
   - **Root Cause**: The client already has the complete `shift` object in React memory in `MainShiftView`, but `ExportMenu` only issues a param-only GET request that depends on server-side SQLite persistence.

2. **Why PDF downloads fail on Vercel**:
   - `lib/export/pdf.ts` attempts `chromium.launch(...)` using Playwright.
   - On Vercel, the Chromium browser binary is not present (exceeds lambda bundle limit, and Playwright is only in `devDependencies`).
   - Launching Chromium throws an uncaught exception (`Executable doesn't exist`), resulting in HTTP 500.
   - Clicking `<a href="/api/shifts/${shiftDate}/pdf" download>` downloads a `.pdf` file containing the JSON error body `{ error: "..." }`.
   - In addition, line 37 in `ExportMenu.tsx` prefetches this endpoint every time the menu is opened, triggering unnecessary failed lambda executions.
   - Furthermore, `handlePrint` opens `/print/${shiftDate}`. When that request hits a lambda without `/tmp/shift.db` populated, it returns HTTP 404 `notFound()`.

3. **Why in-memory POST + client-side styled print preview is the optimal solution**:
   - For Excel:
     - `exceljs` and `buildSheetModel` work entirely in memory without writing to disk.
     - By adding a `POST` method to `app/api/shifts/[date]/xlsx/route.ts` that accepts `{ shift: ShiftWithEmployees }`, the client can pass its current shift snapshot directly.
     - The lambda constructs the workbook and streams the response with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `Content-Disposition`.
     - Zero disk dependency means 100% reliability across any number of stateless lambdas.
     - Keeping `GET` preserves compatibility with automated tests and direct API calls.
   - For PDF / Print:
     - Headless Chromium on serverless lambdas is inherently fragile and resource-heavy.
     - The app already has `@media print` rules configured in `app/globals.css` and pixel-perfect A4 landscape layouts in `ShiftSheetPage.tsx`.
     - Storing the shift snapshot in `localStorage` (`shift_snapshot_${date}`) before opening `/print/${date}` enables `/print/[date]` to render seamlessly even if the server lambda returns 404 for `getShiftByDate(date)`.
     - On modern desktop and mobile browsers (iOS Safari, Android Chrome, Windows/macOS Chrome/Edge/Firefox), the print dialog offers built-in "Save as PDF" (PDFとして保存) with vector-grade fidelity, satisfying Acceptance Criteria item 57 ("PDF export or printable view opens and prints properly without failing due to missing server Chromium binaries").
     - In `app/api/shifts/[date]/pdf/route.ts`, when running in a serverless environment (e.g. `process.env.VERCEL`), redirecting to `/print/${date}` or returning 503 prevents corrupted file downloads.

---

## 3. Caveats

1. **Local vs. Vercel SQLite differences**:
   - In local development (`npm run dev`), the SQLite file `./data/shift.db` persists across requests on the same machine, so GET endpoints succeed locally. This masked the bug until deployed to stateless Vercel lambdas.
2. **Native PDF file download vs. Browser Print Sheet**:
   - Generating a binary `.pdf` file purely on the server without Chromium would require a server-side vector PDF generator like `@react-pdf/renderer` or `pdfkit`. However, the acceptance criteria explicitly states: *"PDF export or printable view opens and prints properly without failing due to missing server Chromium binaries."* Client-side styled printable view via `/print/[date]` with `localStorage` snapshot fallback completely satisfies this requirement with zero bundle bloat and 100% layout fidelity.
3. **E2E Playwright tests**:
   - `e2e/pagination-and-api.spec.ts` lines 46-70 verify `GET /api/shifts/${testDate}/xlsx` and `GET /api/shifts/${testDate}/pdf` on local host. The GET handler must be retained so local e2e tests continue to pass.

---

## 4. Conclusion & Actionable Architectural Plan

### Concrete Implementation Steps for Implementer Agent:

#### Step 1: Excel Export Route (`app/api/shifts/[date]/xlsx/route.ts`)
1. Add `export async function POST(request: Request, context: RouteContext)`:
   - Extract `date` from `context.params`.
   - Parse body: `const body = await request.json().catch(() => ({}));`
   - Retrieve shift from `body.shift || getShiftByDate(date)`.
   - If no shift found, return 404 JSON.
   - Construct model: `const model = buildSheetModel(shift, shift.header_snapshot, shift.design_snapshot);`
   - Generate workbook: `const workbook = await generateShiftExcelWorkbook(model);`
   - Write buffer: `const buffer = await workbook.xlsx.writeBuffer();`
   - Return `Response` with `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and UTF-8 encoded `Content-Disposition`.
2. Keep existing `GET` handler intact for local tests and direct downloads.

#### Step 2: Main Shift View & Export Menu (`components/export/ExportMenu.tsx`, `components/MainShiftView.tsx`)
1. In `components/MainShiftView.tsx`:
   - Pass `shift={shift}` to `<ExportMenu shiftDate={currentDate} shift={shift} />`.
2. In `components/export/ExportMenu.tsx`:
   - Update `ExportMenuProps` to `{ shiftDate: string; shift?: ShiftWithEmployees | null; }`.
   - Remove the `useEffect` prefetch to `/api/shifts/${shiftDate}/pdf` (lines 35-49).
   - Implement `handleDownloadExcel`:
     - If `shift` exists, send `POST /api/shifts/${shiftDate}/xlsx` with `{ shift }`.
     - Otherwise, send `GET /api/shifts/${shiftDate}/xlsx`.
     - On successful response (blob), trigger download via `URL.createObjectURL(blob)` with filename `${shiftDate}_勤務シフト表.xlsx`.
     - Display toast on success/error.
   - Implement `handleDownloadPdf` / `handlePrint`:
     - Save current shift snapshot: `if (shift) localStorage.setItem(`shift_snapshot_${shiftDate}`, JSON.stringify(shift));`
     - Open `/print/${shiftDate}?autoprint=1` in a new tab.
     - Display toast: `"印刷プレビューを開きました。「PDFとして保存」または印刷を選択してください。"`

#### Step 3: Print Page Stateless Fallback (`app/print/[date]/page.tsx` & Client Component)
1. Create a client wrapper component (e.g. `PrintViewClient.tsx`):
   - Accepts `serverShift: ShiftWithEmployees | null`, `date: string`.
   - In state: initialize with `serverShift`. If `null`, check `localStorage.getItem(`shift_snapshot_${date}`)`.
   - If shift found: render `<ShiftSheetPreview model={buildSheetModel(shift, ...)} zoomPercent={100} isPrint={true} />`.
   - If `?autoprint=1` in query params, call `window.print()` after layout settlement.
   - If no shift found anywhere: display a clear message prompting the user to return to the shift table.
2. In `app/print/[date]/page.tsx`:
   - Query `getShiftByDate(date)`. Pass result to `PrintViewClient` instead of unconditionally throwing `notFound()`.

#### Step 4: PDF Route Fallback (`app/api/shifts/[date]/pdf/route.ts`)
1. In `app/api/shifts/[date]/pdf/route.ts`:
   - If running on Vercel (`process.env.VERCEL`) or Chromium fails:
     Redirect to `/print/${date}` or return informative status instead of crashing with unhandled 500.

#### Step 5: Infrastructure Updates
1. Add `"typecheck": "tsc --noEmit"` to `package.json` scripts.
2. Ensure all tests (`npm run test`), lint (`npm run lint`), typecheck (`npx tsc --noEmit`), and build (`npm run build`) pass.

---

## 5. Verification Method

To independently verify all findings and test subsequent fixes:

1. **Vitest Unit & Integration Tests**:
   ```bash
   npm run test
   ```
   *Expected*: All 39 existing tests pass.

2. **TypeScript Compilation Check**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected*: Zero errors, exit code 0.

3. **ESLint Static Code Quality**:
   ```bash
   npm run lint
   ```
   *Expected*: Zero errors, zero warnings.

4. **Next.js Turbopack Production Build**:
   ```bash
   npm run build
   ```
   *Expected*: Compiles successfully, routes `ƒ /api/shifts/[date]/xlsx`, `ƒ /api/shifts/[date]/pdf`, and `ƒ /print/[date]` are generated.

5. **In-Memory Excel POST Route Test**:
   - Send mock shift JSON via POST to `/api/shifts/2026-10-31/xlsx`:
   - Verify response header `Content-Type` is `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
   - Verify the returned buffer can be loaded by `exceljs` and contains valid worksheets.

6. **Invalidation Conditions**:
   - If Vercel functions provide bundled Chromium by default without size limit violations (currently false; lambda limit is 250MB, Playwright Chromium is >300MB).
   - If SQLite persistence on Vercel is backed by Turso/LibSQL or a persistent remote DB (currently false; uses local `better-sqlite3` on `/tmp/shift.db`).
