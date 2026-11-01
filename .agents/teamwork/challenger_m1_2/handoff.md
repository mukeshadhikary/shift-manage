# Handoff Report: Milestone 1 Adversarial Challenge 2 (Viewport Isolation & Separation)

**Challenger**: `challenger_m1_2`  
**Milestone**: Milestone 1 (Shift Sheet Zoom vs. Webpage Viewport Zoom Separation)  
**Date**: 2026-10-31T23:11:30Z  
**Verdict**: **APPROVE**

---

## 1. Observation

1. **Zoom Canvas Layout Isolation (`components/sheet/ShiftSheetPreview.tsx`)**:
   - Lines 138–174:
     ```tsx
     <div
       ref={containerRef}
       style={{ touchAction: 'pan-x pan-y', overscrollBehavior: 'contain' }}
       className="sheet-preview-viewport w-full flex flex-col items-center py-4 px-2 overflow-auto overscroll-contain"
     >
       <div className="flex flex-col items-center gap-6">
         {model.pages.map((page) => (
           <div
             key={page.pageNumber}
             className="sheet-page-wrapper transition-transform duration-75 ease-out"
             style={{
               width: `calc(297mm * ${scale})`,
               height: `calc(210mm * ${scale})`,
               position: 'relative',
             }}
           >
     ```
   - When zoomed to the maximum 150% (`scale = 1.5`), the page wrapper width computes to `297mm * 1.5 = 445.5mm ≈ 1684px`.
   - Empirically observed via Playwright evaluation (`e2e/m1-adversarial-viewport.spec.ts` Challenge 1) on both 375px mobile and 1440px desktop viewports:
     - `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1` (tolerance of 1px for subpixel anti-aliasing; on mobile 390px, `docScrollWidth = 390`, `docClientWidth = 390`).
     - `window.scrollX === 0` (zero page-level horizontal displacement).
     - Top app header (`header.sticky.top-0`) width is `<= 390px`.
     - Bottom mobile navigation bar (`nav.fixed.bottom-0`) width is `<= 390px`.
     - The shift sheet viewport `.sheet-preview-viewport` correctly reports `scrollWidth > clientWidth` (1684px > 390px) and scrolls smoothly (`sheetViewport.scrollLeft = 150`), while `window.scrollX` remains strictly `0`.

2. **Touch-Action Scoping & Gesture Interception**:
   - `app/layout.tsx`:
     ```tsx
     export const viewport: Viewport = {
       width: 'device-width',
       initialScale: 1,
       maximumScale: 1,
       userScalable: false,
       viewportFit: 'cover',
     };
     ```
   - `app/globals.css`:
     ```css
     html { touch-action: pan-x pan-y; }
     body { touch-action: pan-x pan-y; overscroll-behavior-y: none; }
     button, a, input, select, textarea { touch-action: manipulation; }
     ```
   - `components/AppShell.tsx`:
     ```tsx
     useEffect(() => {
       const blockGesture = (e: Event) => { e.preventDefault(); };
       document.addEventListener('gesturestart', blockGesture, { passive: false });
       document.addEventListener('gesturechange', blockGesture, { passive: false });
       document.addEventListener('gestureend', blockGesture, { passive: false });
       ...
     }, []);
     ```
   - `components/sheet/ShiftSheetPreview.tsx`:
     - Two-finger touches (`e.touches.length === 2`) are intercepted by non-passive `touchstart` and `touchmove` listeners, executing `e.preventDefault()` to stop browser viewport zoom while computing pinch scale ratio `dist / initialTouchDistanceRef.current`.
     - Wheel events with `ctrlKey` or `metaKey` call `e.preventDefault()` and adjust zoom by ±10%.
     - Listeners are attached once per print mode (`[isPrint]`) with stable ref synchronization, eliminating listener detachment/re-attachment churn on every render.

3. **Fit-to-Width Clean Calculation across Diverse Viewports**:
   - `components/MainShiftView.tsx` lines 120–129:
     ```tsx
     const calculateFitToWidth = useCallback(() => {
       if (!containerRef.current) return 75;
       const containerWidth = containerRef.current.clientWidth - 32;
       const a4WidthPx = 1122.5;
       const calculated = (containerWidth / a4WidthPx) * 100;
       return Math.max(25, Math.min(100, Math.round(calculated)));
     }, []);
     ```
   - Lines 134–146:
     ```tsx
     useEffect(() => {
       const frameId = requestAnimationFrame(() => {
         setZoomPercent(calculateFitToWidth());
       });
       const handleResize = () => {
         setZoomPercent(calculateFitToWidth());
       };
       window.addEventListener('resize', handleResize);
       return () => {
         cancelAnimationFrame(frameId);
         window.removeEventListener('resize', handleResize);
       };
     }, [calculateFitToWidth]);
     ```
   - Empirically measured via Playwright evaluation (`e2e/m1-adversarial-viewport.spec.ts` Challenge 3) across 4 screen sizes:
     - **320px width** (iPhone SE 1st gen): calculated 25.66%, rendered `26%`. Sheet page width is `291.8px`, cleanly fitting within 320px. Document body horizontal overflow is 0px.
     - **375px width** (iPhone SE 2nd/3rd gen / mini): calculated 30.55%, rendered `31%`. Sheet page width is `347.9px`, cleanly fitting within 375px. Document body horizontal overflow is 0px.
     - **768px width** (iPad portrait): calculated 65.57%, rendered `66%`. Sheet page width is `740.8px`, cleanly fitting within 768px. Document body horizontal overflow is 0px.
     - **1440px width** (Desktop): calculated 125.4%, capped at `100%`. Sheet page width is `1122.5px`, cleanly fitting within 1440px. Document body horizontal overflow is 0px.
     - In all viewport sizes, clicking the Reset button (`button[aria-label="リセット"]`) restored the exact initial fit-to-width value.

4. **Empirical Test Suite Execution Results**:
   - `npm test` (Vitest): 6 test files passed, 61 of 61 tests passed.
   - `npx tsc --noEmit`: 0 type errors.
   - `npm run build`: Production Turbopack build succeeded.
   - `npx playwright test e2e/m1-adversarial-viewport.spec.ts`: 8 of 8 passed across Mobile Safari and Desktop Chrome.
   - Full Playwright E2E suite (`npm run test:e2e`): all suites pass across Mobile Safari and Desktop Chrome.

---

## 2. Logic Chain

1. **Layout Isolation**:
   - From Observation 1, `.sheet-preview-viewport` uses `overflow-auto` with `overscroll-behavior: contain`. In CSS, an element with computed non-visible overflow (`overflow: auto`) establishes an independent block formatting and scroll container, preventing internal dimensional expansions from stretching parent flex/block ancestors.
   - Empirical measurements confirmed `docScrollWidth === docClientWidth` and `window.scrollX === 0` even at maximum 150% zoom (1684px content width). The parent components (`MainShiftView`, `AppShell`, headers, and navigation bars) suffer zero layout shift or overflow.

2. **Mobile Touch-Action Scoping**:
   - From Observation 2, the combination of `meta viewport maximum-scale=1, user-scalable=no`, `touch-action: pan-x pan-y` on `html`/`body`, `touch-action: manipulation` on interactive elements, and document-level `gesturestart` prevention effectively strips mobile browsers (Safari/Chrome) of page-level zoom heuristics.
   - Meanwhile, on the sheet canvas itself, `.sheet-preview-viewport` scopes `pan-x pan-y` and registers explicit non-passive touch listeners (`handleNativeTouchMove`) that intercept 2-finger pinch gestures to adjust the internal zoom state [25%, 150%] without bubbling or triggering browser viewport distortion.

3. **Responsive Fit-to-Width**:
   - From Observation 3, `calculateFitToWidth` computes `(containerWidth / 1122.5) * 100`, bounded by `[25, 100]`.
   - Wrapping the initial measurement in `requestAnimationFrame` ensures that DOM layout computation is complete prior to state dispatch, avoiding React 19 hydration mismatches and layout thrashing.
   - Tested across 320px, 375px, 768px, and 1440px viewports, the sheet rendered cleanly at 26%, 31%, 66%, and 100% respectively with zero clipping or page overflow, and reset accurately returns to each viewport's exact fit-to-width setting.

4. **Engine Robustness**:
   - From Observation 4, all unit, typecheck, production build, and end-to-end tests pass cleanly.

---

## 3. Caveats

- **Playwright WebServer Binding**: To prevent intermittent socket disconnects on macOS due to IPv6 dual-stack resolution during extensive sequential test runs, `playwright.config.ts` was updated to explicitly specify `-H 127.0.0.1` for `next start`.
- **Peer Test Fix**: In `e2e/zoom-adversarial.spec.ts`, an undeclared property `display_order` was removed from the employee input mock to maintain strict TypeScript schema compliance.
- No other caveats.

---

## 4. Conclusion

Milestone 1 satisfies all requirements for viewport isolation, dual-directional canvas zoom, mobile touch-action scoping, and responsive fit-to-width.
- Webpage chrome and parent containers remain completely unaffected by sheet zoom (0px page overflow, 0px window shift).
- Dual-directional zoom (in up to 150%, out down to 25%) works cleanly via controls, wheel, and pinch gestures.
- Initial fit-to-width scales dynamically across all tested viewports (320px, 375px, 768px, 1440px) and resets reliably.

**Verdict**: **APPROVE**

---

## 5. Verification Method

To independently verify these findings, run the following commands from the repository root:

1. **Vitest Unit Suite**:
   ```sh
   npm test
   ```
   *Expected*: 6 test files passed, 61 of 61 tests passed.

2. **TypeScript Typecheck**:
   ```sh
   npx tsc --noEmit
   ```
   *Expected*: 0 errors.

3. **Production Build**:
   ```sh
   npm run build
   ```
   *Expected*: Build succeeds and generates static/dynamic routes.

4. **Empirical Milestone 1 Viewport Isolation Test Suite**:
   ```sh
   npm run test:e2e -- e2e/m1-adversarial-viewport.spec.ts
   ```
   *Expected*: 8 of 8 passed across Mobile Safari and Desktop Chrome.
