# Survey Explorer 1 Handoff Report: R1 & R2 Investigation

**Task**: Read-only exploration and analysis of:
1. R1: Shift Sheet Zoom vs. Webpage Viewport Zoom Separation
2. R2: Responsive Mobile Form Layout (No Field Overlap)
**Working Directory**: `/Users/mukesh/Documents/Projects/shift-managers/.agents/teamwork/explorer_survey_1`
**Date**: 2026-10-31T22:42:00Z

---

## 1. Observation

### R1: Shift Sheet Zoom vs. Webpage Viewport Zoom Separation

#### Observation 1.1: Intentional suppression of Zoom-In across 4 codebases
1. **`components/controls/ZoomControls.tsx`**:
   - Lines 18–21:
     ```tsx
     // Zoom In is disabled per user requirements; Zoom Out is enabled
     const handleZoomOut = () => {
       onZoomChange(Math.max(25, zoomPercent - 15));
     };
     ```
     *No `handleZoomIn` function is defined.*
   - Lines 42–50:
     ```tsx
     <button
       type="button"
       disabled={true}
       className="p-1.5 rounded-xl text-gray-300 cursor-not-allowed opacity-30 min-h-[38px] min-w-[38px] flex items-center justify-center"
       aria-label={ja.common.zoomIn}
       title="拡大は無効化されています"
     >
       <ZoomIn className="w-4 h-4" />
     </button>
     ```
     *The ZoomIn button is hardcoded to `disabled={true}` with title `"拡大は無効化されています"`.*

2. **`components/sheet/ShiftSheetPreview.tsx`**:
   - Lines 32–41 (`handleNativeWheel`):
     ```tsx
     // Non-passive wheel handler: block browser zoom and allow zoom-out only
     const handleNativeWheel = (e: WheelEvent) => {
       if (e.ctrlKey || e.metaKey) {
         e.preventDefault();
         // deltaY > 0 is scroll down (zoom out); disallow zoom in (deltaY <= 0)
         if (e.deltaY > 0 && onZoomChange) {
           onZoomChange(Math.max(25, zoomPercent - 10));
         }
       }
     };
     ```
     *Wheel events with `deltaY <= 0` (Ctrl/Cmd-wheel up or trackpad pinch-out) are explicitly ignored.*
   - Lines 56–80 (`handleNativeTouchMove`):
     ```tsx
     // Non-passive touchmove handler: completely prevent default browser pinch-zoom and disallow zoom-in
     const handleNativeTouchMove = (e: TouchEvent) => {
       if (e.touches.length === 2) {
         // ALWAYS prevent browser viewport pinch-to-zoom
         e.preventDefault();

         if (initialTouchDistanceRef.current && onZoomChange) {
           const dist = Math.hypot(
             e.touches[0].clientX - e.touches[1].clientX,
             e.touches[0].clientY - e.touches[1].clientY
           );
           const ratio = dist / initialTouchDistanceRef.current;
           // Strictly allow zoom-out only (ratio < 1)
           if (ratio < 1) {
             const newZoom = Math.max(
               25,
               Math.min(initialZoomRef.current, Math.round(initialZoomRef.current * ratio))
             );
             if (newZoom < zoomPercent) {
               onZoomChange(newZoom);
             }
           }
           // When ratio >= 1 (attempting to zoom in): DO NOTHING, zoom in is completely blocked!
         }
       }
     };
     ```
     *Line 77 verbatim: `// When ratio >= 1 (attempting to zoom in): DO NOTHING, zoom in is completely blocked!`. Pinch-to-zoom in is completely neutered, and `Math.min(initialZoomRef.current, ...)` prevents any scale above starting scale.*
   - Line 106 (`useEffect` dependencies):
     ```tsx
     }, [zoomPercent, onZoomChange, isPrint]);
     ```
     *Re-attaches 6 DOM event listeners on every percentage change during touch move, causing listener churn during high-frequency gestures.*

3. **`components/MainShiftView.tsx`**:
   - Lines 130–133 (`handleZoomChange`):
     ```tsx
     // Strict zoom change handler: zoom in is completely prevented; only zoom out is allowed
     const handleZoomChange = useCallback((newZoom: number) => {
       setZoomPercent((current) => Math.max(25, Math.min(current, newZoom)));
     }, []);
     ```
     *`Math.min(current, newZoom)` mathematically blocks `zoomPercent` from ever increasing, even if a child component emits a larger zoom.*
   - Lines 121–128 (`calculateFitToWidth`):
     ```tsx
     const calculateFitToWidth = useCallback(() => {
       if (!containerRef.current) return 75;
       const containerWidth = containerRef.current.clientWidth - 32;
       // 297mm in pixels at 96 DPI: 297 * 96 / 25.4 = 1122.5px
       const a4WidthPx = 1122.5;
       const calculated = (containerWidth / a4WidthPx) * 100;
       return Math.max(25, Math.min(100, Math.round(calculated)));
     }, []);
     ```
     *`calculateFitToWidth` accurately calculates fit-to-width capped at 100% max and 25% min.*
   - Lines 136–141:
     ```tsx
     useEffect(() => {
       const handleResize = () => {
         setZoomPercent(calculateFitToWidth());
       };
       window.addEventListener('resize', handleResize);
       return () => window.removeEventListener('resize', handleResize);
     }, [calculateFitToWidth]);
     ```
     *Initial mount does not invoke `setZoomPercent(calculateFitToWidth())`, leaving initial state at 100% on line 75: `const [zoomPercent, setZoomPercent] = useState<number>(100);`.*

4. **`e2e/shift-flow.spec.ts`**:
   - Lines 118–125:
     ```tsx
     // 12. Zoom in (disabled per requirement), out and reset
     const zoomInBtn = page.locator('button[aria-label="拡大"]');
     const zoomOutBtn = page.locator('button[aria-label="縮小"]');
     const resetBtn = page.locator('button[aria-label="リセット"]');

     await expect(zoomInBtn).toBeDisabled();
     await zoomOutBtn.click();
     await resetBtn.click();
     ```
     *The Playwright test explicitly asserts that `zoomInBtn` is disabled.*

#### Observation 1.2: Viewport and Browser Zoom Protection Architecture
1. **`app/layout.tsx`** (Lines 10–16):
   ```tsx
   export const viewport: Viewport = {
     width: 'device-width',
     initialScale: 1,
     maximumScale: 1,
     userScalable: false,
     viewportFit: 'cover',
   };
   ```
   *Next.js generates `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">`.*

2. **`app/globals.css`** (Lines 42–59, 61–65):
   ```css
   html {
     ...
     -webkit-text-size-adjust: 100%;
     touch-action: pan-x pan-y;
   }
   body {
     ...
     touch-action: pan-x pan-y;
     overscroll-behavior-y: none;
   }
   input, select, textarea, button {
     font-family: inherit;
     font-size: 16px;
   }
   ```
   *Font size >= 16px prevents iOS Safari auto-zoom on input focus.*

3. **`components/AppShell.tsx`** (Lines 66–79):
   ```tsx
   // Block native iOS Safari gesture zoom in across the app
   useEffect(() => {
     const blockGesture = (e: Event) => {
       e.preventDefault();
     };
     document.addEventListener('gesturestart', blockGesture, { passive: false });
     document.addEventListener('gesturechange', blockGesture, { passive: false });
     document.addEventListener('gestureend', blockGesture, { passive: false });
     return () => {
       document.removeEventListener('gesturestart', blockGesture);
       document.removeEventListener('gesturechange', blockGesture);
       document.removeEventListener('gestureend', blockGesture);
     };
   }, []);
   ```
   *Document-level Safari gesture events are blocked.*

4. **`components/sheet/ShiftSheetPreview.tsx`** (Lines 124–128):
   ```tsx
   <div
     ref={containerRef}
     style={{ touchAction: 'pan-x pan-y' }}
     className="sheet-preview-viewport w-full flex flex-col items-center py-4 px-2 overflow-auto"
   >
   ```
   *The preview canvas is contained in an independent overflow scroll viewport, isolating CSS scaling transforms (`transform: scale(...)`) strictly inside the `.sheet-preview-viewport` element, leaving the outer webpage DOM untouched.*

---

### R2: Responsive Mobile Form Layout (No Field Overlap)

#### Observation 2.1: Rigid 2-Column Grids in `EmployeeForm.tsx`
`EmployeeForm.tsx` contains 4 rigid `grid grid-cols-2 gap-3` blocks:
1. **Lines 235–267**: CODE & ニックネーム
   ```tsx
   {/* CODE & ニックネーム (2 columns) */}
   <div className="grid grid-cols-2 gap-3">
     <div>
       <label className="block text-xs font-semibold text-gray-700 mb-1">
         {ja.employee.code}
       </label>
       <input ... />
       {isCodeDuplicate && (
         <p className="mt-1 text-[11px] text-amber-600 font-medium">
           {ja.wizard.codeDuplicateWarning}
         </p>
       )}
     </div>
     <div>
       <label className="block text-xs font-semibold text-gray-700 mb-1">
         {ja.employee.nickname}
       </label>
       <input ... />
     </div>
   </div>
   ```
2. **Lines 269–296**: 始業予定時間 & 始業実時間
   ```tsx
   {/* 始業予定時間 & 始業実時間 */}
   <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-2.5">
     <div className="grid grid-cols-2 gap-3">
       <div>
         <label className="block text-xs font-semibold text-gray-700 mb-1">
           {ja.employee.plannedStartTime}
         </label>
         <input type="time" step="300" ... />
       </div>
       <div>
         <label className="block text-xs font-semibold text-gray-700 mb-1">
           {ja.employee.actualStartTime}
         </label>
         <input type="time" step="300" ... />
       </div>
     </div>
   ```
3. **Lines 318–346**: 終了予定時間 & 休憩時間
   ```tsx
   {/* 終了予定時間 & 休憩時間 */}
   <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-2.5">
     <div className="grid grid-cols-2 gap-3">
       <div>
         <label className="block text-xs font-semibold text-gray-700 mb-1">
           {ja.employee.plannedEndTime}
         </label>
         <input type="time" step="300" ... />
       </div>
       <div>
         <label className="block text-xs font-semibold text-gray-700 mb-1">
           {ja.employee.breakTime}
         </label>
         <input type="text" ... />
       </div>
     </div>
   ```
4. **Lines 387–414**: ロッカー番号 & 備考
   ```tsx
   {/* ロッカー番号 & 備考 */}
   <div className="grid grid-cols-2 gap-3">
     <div>
       <label className="block text-xs font-semibold text-gray-700 mb-1">
         {ja.employee.lockerNumber}
       </label>
       <input ... placeholder={ja.employee.lockerPlaceholder} />
     </div>
     <div>
       <label className="block text-xs font-semibold text-gray-700 mb-1">
         {ja.employee.remarks}
       </label>
       <input ... placeholder={ja.employee.remarksPlaceholder} />
     </div>
   </div>
   ```

#### Observation 2.2: Compounding Horizontal Padding in BottomSheet
- In `components/ui/BottomSheet.tsx` Line 84:
  ```tsx
  <div className="flex-1 overflow-y-auto px-5 py-4 overscroll-contain">
    {children}
  </div>
  ```
  *Horizontal padding = 20px + 20px = 40px.*
- In `components/MainShiftView.tsx` Lines 459 and 474:
  ```tsx
  <BottomSheet isOpen={isAddStaffSheetOpen} ...>
    <div className="p-4">
      <EmployeeForm ... />
    </div>
  </BottomSheet>
  ```
  *Inner wrapper adds another `p-4` = 16px + 16px = 32px.*
- In `EmployeeForm.tsx` Lines 270 and 319:
  *Cards have `p-3` = 12px + 12px = 24px.*
- On an iPhone SE (320px viewport width):
  - Total container width = 320 - 40 - 32 = 248px.
  - Time card content width = 248 - 24 = 224px.
  - Column width in `grid-cols-2` = (224 - 12) / 2 = **106px**.
  - A Japanese `<input type="time">` requiring 120–140px on iOS Safari/Android WebKit is squeezed into 106px, resulting in severe numeric clipping and overlapping spinner icons.

#### Observation 2.3: Quick Selection Chips Inline Wrapping
In `EmployeeForm.tsx` lines 298–315, 348–365, and 367–384:
```tsx
<div className="flex flex-wrap gap-1.5 items-center">
  <span className="text-[10px] text-gray-400 font-medium mr-1">{ja.employee.quickStartTime}</span>
  {COMMON_START_TIMES.map((t) => ( ... ))}
</div>
```
- The label `<span className="text-[10px] text-gray-400 font-medium mr-1">` is an inline child of `flex flex-wrap items-center`.
- On narrow viewports (< 400px), the label consumes ~45px width, leaving ~180px on line 1, which fits only 1 or 2 chips before line-wrapping abruptly, creating ragged visual alignment.

#### Observation 2.4: ShiftCreationWizard Step 2 Draft List Item Clipping
In `components/wizard/ShiftCreationWizard.tsx` lines 244–302:
```tsx
<div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors">
  <div className="flex items-center gap-2.5">
    <span className="w-6 h-6 rounded-full bg-white text-[#0F2A66] ...">{idx + 1}</span>
    <div>
      <div className="font-bold text-sm text-gray-900">{emp.employee_name}...</div>
      <div className="text-[11px] text-gray-500 mt-0.5">...</div>
    </div>
  </div>
  <div className="flex items-center gap-1">
    <button ...><ArrowUp /></button>
    <button ...><ArrowDown /></button>
    <button ...><Edit2 /></button>
    <button ...><Trash2 /></button>
  </div>
</div>
```
- The left container lacks `min-w-0 flex-1` and the text blocks lack `truncate`.
- The 4 action buttons container lacks `shrink-0`.
- On screens < 360px, long employee names or time ranges push against the 4 action buttons, causing buttons to squeeze or wrap.

---

## 2. Logic Chain

1. **R1 Dual-Directional Zoom Block Root Cause**:
   - Observations 1.1.1, 1.1.2, and 1.1.3 reveal that Zoom-In was previously removed by design:
     - `ZoomControls.tsx`: `disabled={true}`, title `"拡大は無効化されています"`.
     - `ShiftSheetPreview.tsx`: Wheel handler (`deltaY <= 0`) and touch handler (`ratio >= 1`) reject zoom-in.
     - `MainShiftView.tsx`: `handleZoomChange` uses `Math.min(current, newZoom)`, discarding any zoom increase.
   - Therefore, to satisfy R1, zoom-in must be unblocked in **all 3 components synchronously**:
     - `ZoomControls.tsx`: Implement `handleZoomIn = () => onZoomChange(Math.min(150, zoomPercent + 15))` with `disabled={zoomPercent >= 150}` and `aria-label={ja.common.zoomIn}`.
     - `ShiftSheetPreview.tsx`: In `handleNativeWheel`, allow `deltaY < 0` to step up by +10 (clamped to 150%). In `handleNativeTouchMove`, calculate `newZoom = Math.max(25, Math.min(150, Math.round(initialZoomRef.current * ratio)))` for both `ratio < 1` and `ratio >= 1`.
     - `MainShiftView.tsx`: In `handleZoomChange`, replace `Math.min(current, newZoom)` with `Math.max(25, Math.min(150, newZoom))`.

2. **R1 Webpage Viewport Zoom Isolation**:
   - Observation 1.2.4 demonstrates that `ShiftSheetPreview` renders its sheet within an isolated `.sheet-preview-viewport` element via CSS `transform: scale(${scale})` and explicit dimensions `width: calc(297mm * ${scale})`.
   - The webpage header, timeline, navigation tabs, and dialogs are located in ancestor/sibling DOM nodes outside `.sheet-preview-viewport`.
   - In `app/layout.tsx`, Next.js specifies `maximumScale: 1, userScalable: false`. In `app/globals.css`, `html` and `body` specify `touch-action: pan-x pan-y`. In `AppShell.tsx`, `gesturestart` is prevented.
   - However, rapid button taps on mobile can cause browser double-tap zoom heuristics. Adding `touch-action: manipulation;` on interactive controls (`button, a, input, select, textarea`) and ensuring header and tab navigation use `touch-action: pan-x pan-y` / `touch-manipulation` eliminates any remaining browser double-tap viewport distortion.

3. **R1 High-Frequency Touch Re-attaching & Fit-to-Width Initialization**:
   - Observation 1.1.2 shows `useEffect` depending on `[zoomPercent]`, which detaches and re-attaches 6 listeners on every single frame during a pinch gesture. Using React refs (`zoomRef.current = zoomPercent`, `onZoomChangeRef.current = onZoomChange`) allows the effect to attach once, avoiding touch stream interruption.
   - Observation 1.1.3 shows `zoomPercent` is hardcoded to 100 on mount instead of invoking `calculateFitToWidth()`. Calling `setZoomPercent(calculateFitToWidth())` on mount ensures mobile devices immediately render the sheet fit-to-width.

4. **R2 Mobile Form Layout Root Cause**:
   - Observations 2.1 and 2.2 prove that rigid `grid grid-cols-2` forced two 120px+ input controls into a 106px column on 320px devices because of double horizontal padding (`BottomSheet` 40px + wrapper 32px + card 24px).
   - Changing `grid grid-cols-2` to `grid grid-cols-1 sm:grid-cols-2 gap-3` ensures:
     - On mobile (< 640px), fields stack vertically in single columns, providing 100% container width (> 220px) for every input, completely preventing label and spinner clipping.
     - On tablets/desktops (>= 640px), fields retain the compact 2-column layout.
   - Removing the redundant `<div className="p-4">` in `MainShiftView.tsx` inside `BottomSheet` restores 32px of valuable mobile viewport real estate.

5. **R2 Quick Chips Wrapping**:
   - Observation 2.3 shows that wrapping the label `<span ...>` inside a vertical flex column above the button chips (`flex flex-col gap-1.5`) allows the chip buttons to wrap naturally across the full container width with uniform `gap-1.5` and zero visual misalignment.

6. **R2 Draft List Item Clipping**:
   - Observation 2.4 shows that adding `min-w-0 flex-1` and `truncate` to the employee information container and `shrink-0` to the action buttons in `ShiftCreationWizard.tsx` guarantees that long staff names or times will never clip or displace action buttons.

---

## 3. Caveats

1. **Playwright E2E Test Invalidation**:
   - In `e2e/shift-flow.spec.ts` line 123, the existing test checks `await expect(zoomInBtn).toBeDisabled();`.
   - When R1 is implemented, this assertion will fail because `zoomInBtn` will now be enabled. The test file must be updated in tandem to assert that `zoomInBtn` is enabled, clicking it increases zoom percentage, and reset restores it.
2. **Trackpad vs. Touch Pinch Characteristics**:
   - On macOS trackpads, Safari/Chrome emit `wheel` events with `e.ctrlKey = true` and continuous fractional `e.deltaY` values. A stepped change (e.g. `±10` or `Math.round(zoom - e.deltaY * 0.2)`) provides smooth zooming, while mouse wheels emit larger quantized steps (typically `±100`). The implementer should clamp new zoom values strictly to `[25, 150]`.
3. **Vitest Unit Suite**:
   - The current 5 Vitest suites (`lib/date.test.ts`, `lib/db/repository.test.ts`, `lib/db/schema.test.ts`, `lib/export/excel.test.ts`, `lib/sheet/sheet.test.ts`) test backend and mathematical data transformations; they do not test React component DOM events directly.
   - Adding a unit test for `ZoomControls.tsx` (e.g. testing zoom range 25% to 150% and button states) would provide strong regression coverage.

---

## 4. Conclusion & Specific Recommendations

### R1 Actionable Implementation Blueprint
1. **`components/controls/ZoomControls.tsx`**:
   - Add `handleZoomIn = () => onZoomChange(Math.min(150, zoomPercent + 15));`.
   - Update ZoomIn button: `onClick={handleZoomIn}`, `disabled={zoomPercent >= 150}`, `aria-label={ja.common.zoomIn}`, `title={ja.common.zoomIn}`.
   - Apply active styles identical to ZoomOut (`p-1.5 rounded-xl text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors`).
   - Add `touch-manipulation` to container.

2. **`components/sheet/ShiftSheetPreview.tsx`**:
   - Wheel handler: Check `e.deltaY > 0` for zoom out (`Math.max(25, zoom - 10)`), and `e.deltaY < 0` for zoom in (`Math.min(150, zoom + 10)`).
   - Touch move handler: Calculate `newZoom = Math.max(25, Math.min(150, Math.round(initialZoomRef.current * ratio)))`. Allow both `ratio < 1` and `ratio >= 1`.
   - Touch end handler: Reset `initialTouchDistanceRef.current = null` when `e.touches.length < 2`.
   - Refactor `zoomPercent` and `onZoomChange` into `useRef` so event listeners are not re-attached on every frame during pinch gestures.
   - Add `overscroll-behavior: contain` to `.sheet-preview-viewport` (per modern web guidance `2d-panning`).

3. **`components/MainShiftView.tsx`**:
   - Line 132: Replace `setZoomPercent((current) => Math.max(25, Math.min(current, newZoom)))` with `setZoomPercent(Math.max(25, Math.min(150, newZoom)))`.
   - Line 136: Call `setZoomPercent(calculateFitToWidth())` on initial mount inside `useEffect`.

4. **`app/globals.css`**:
   - Add `touch-action: manipulation;` for interactive elements (`button, a, input, select, textarea`).

5. **`e2e/shift-flow.spec.ts`**:
   - Update line 123 to verify `zoomInBtn` is enabled and clickable.

### R2 Actionable Implementation Blueprint
1. **`components/employee/EmployeeForm.tsx`**:
   - Change `grid grid-cols-2 gap-3` to `grid grid-cols-1 sm:grid-cols-2 gap-3` at lines 236, 271, 320, and 388.
   - Structure quick chips sections (Start Time, End Time, Break Time) with the label stacked on top (`flex flex-col gap-1.5`) and chips in a responsive wrapping flex container (`flex flex-wrap gap-1.5 items-center`).

2. **`components/MainShiftView.tsx`**:
   - Lines 459 & 474: Change `<div className="p-4">` to `<div className="py-2">` to eliminate redundant horizontal padding inside `BottomSheet`.

3. **`components/wizard/ShiftCreationWizard.tsx`**:
   - Lines 244–302: Add `min-w-0 flex-1` and `truncate` to the staff draft item text container, and `shrink-0` to the action buttons container.

4. **`components/header/HeaderEditModal.tsx`**:
   - Line 124: Update `grid grid-cols-2 gap-3` to `grid grid-cols-1 sm:grid-cols-2 gap-3`.

---

## 5. Verification Method

1. **Automated Unit & Build Verification**:
   - Run Vitest suite:
     ```sh
     npm run test
     ```
     *Expected: All 39 tests pass.*
   - Run ESLint:
     ```sh
     npm run lint
     ```
     *Expected: 0 warnings, 0 errors.*
   - Run Production Build:
     ```sh
     npm run build
     ```
     *Expected: Next.js Turbopack build finishes cleanly.*

2. **Automated E2E Verification**:
   - Run Playwright E2E suite with updated zoom test:
     ```sh
     npm run test:e2e
     ```
     *Expected: Passes across both Mobile Safari (iPhone 12, 390px viewport) and Desktop Chrome (1440x900).*

3. **Responsive Visual & Viewport Invalidation Checks**:
   - Viewport 320px (iPhone SE):
     - Open `EmployeeForm` in `BottomSheet`.
     - Confirm all 4 field pairs stack vertically as single columns.
     - Confirm time input controls and spinners do not truncate or overlap borders.
     - Confirm quick selection chips wrap cleanly below their respective section labels.
   - Viewport Zoom Independence:
     - On mobile touch screen, pinch on the shift sheet preview: zoom percentage updates smoothly between 25% and 150%.
     - Tap `+` button: zoom percentage increments by 15% up to 150%.
     - Tap `-` button: zoom percentage decrements by 15% down to 25%.
     - Tap `リセット` button: zoom resets to fit-to-width.
     - Tap rapidly or pinch on the header, date timeline, or bottom tab bar: page viewport scale remains firmly locked at 1.0 with zero page-level zoom distortion.

---

### Modern Web Guidance

- **`2d-panning`**: Applied `overscroll-behavior: contain` and `scroll-axis-lock: none` with container-scoped native scrolling rather than CSS transforms to isolate 2D canvas zooming and prevent browser gesture chaining ("Contain overscroll and prevent accidental swipe navigations at edges").
- **`responsive-design`**: Replaced rigid 2-column grids with single-column mobile layouts using `grid-cols-1 sm:grid-cols-2` and dedicated flex headers for quick chips to prevent input clipping on sub-400px viewports.
