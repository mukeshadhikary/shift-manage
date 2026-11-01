# Independent Review & Adversarial Audit Report: Milestone 1

**Reviewer**: `reviewer_m1_2` (Reviewer 2 / Adversarial Critic)  
**Milestone**: Milestone 1: Shift Sheet Zoom vs. Webpage Viewport Zoom Separation  
**Date**: 2026-10-31T23:12:00Z  
**Verdict**: **APPROVE**  

---

## 1. Observation

Direct code inspections of Worker 1's implementation:

1. **`components/controls/ZoomControls.tsx`**:
   - Lines 18–24:
     ```tsx
     const handleZoomOut = () => {
       onZoomChange(Math.max(25, zoomPercent - 15));
     };

     const handleZoomIn = () => {
       onZoomChange(Math.min(150, zoomPercent + 15));
     };
     ```
   - Lines 27–54:
     ```tsx
     <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-1.5 rounded-2xl border border-gray-200/80 shadow-xs select-none touch-manipulation">
       <button
         type="button"
         onClick={handleZoomOut}
         disabled={zoomPercent <= 25}
         className="p-1.5 rounded-xl text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors"
         aria-label={ja.common.zoomOut}
         title={ja.common.zoomOut}
       >
         <ZoomOut className="w-4 h-4" />
       </button>
       ...
       <button
         type="button"
         onClick={handleZoomIn}
         disabled={zoomPercent >= 150}
         className="p-1.5 rounded-xl text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors"
         aria-label={ja.common.zoomIn}
         title={ja.common.zoomIn}
       >
         <ZoomIn className="w-4 h-4" />
       </button>
     ```
   - Observed that Zoom-In button is fully operational with active styling, accessibility labels, and strict boundary clamping (`zoomPercent >= 150`). Touch-manipulation is applied to eliminate mobile tap delays and unwanted browser heuristics.

2. **`components/sheet/ShiftSheetPreview.tsx`**:
   - Lines 22–33:
     ```tsx
     const scale = zoomPercent / 100;
     const initialTouchDistanceRef = useRef<number | null>(null);
     const initialZoomRef = useRef<number>(zoomPercent);
     const containerRef = useRef<HTMLDivElement>(null);

     const zoomRef = useRef<number>(zoomPercent);
     const onZoomChangeRef = useRef(onZoomChange);

     useEffect(() => {
       zoomRef.current = zoomPercent;
       onZoomChangeRef.current = onZoomChange;
     }, [zoomPercent, onZoomChange]);
     ```
   - Lines 40–53 (Wheel zoom):
     ```tsx
     const handleNativeWheel = (e: WheelEvent) => {
       if (e.ctrlKey || e.metaKey) {
         e.preventDefault();
         if (!onZoomChangeRef.current) return;
         if (e.deltaY > 0) {
           onZoomChangeRef.current(Math.max(25, zoomRef.current - 10));
         } else if (e.deltaY < 0) {
           onZoomChangeRef.current(Math.min(150, zoomRef.current + 10));
         }
       }
     };
     ```
   - Lines 67–89 (Pinch gesture):
     ```tsx
     const handleNativeTouchMove = (e: TouchEvent) => {
       if (e.touches.length === 2) {
         e.preventDefault();
         if (initialTouchDistanceRef.current && onZoomChangeRef.current) {
           const dist = Math.hypot(
             e.touches[0].clientX - e.touches[1].clientX,
             e.touches[0].clientY - e.touches[1].clientY
           );
           if (dist > 0 && initialTouchDistanceRef.current > 0) {
             const ratio = dist / initialTouchDistanceRef.current;
             const newZoom = Math.max(
               25,
               Math.min(150, Math.round(initialZoomRef.current * ratio))
             );
             if (newZoom !== zoomRef.current) {
               onZoomChangeRef.current(newZoom);
             }
           }
         }
       }
     };
     ```
   - Lines 103–120: Native event listeners attached with `{ passive: false }` for non-passive prevention of browser viewport zoom, including Safari proprietary `gesturestart` and `gesturechange` listeners. All 7 listeners are cleanly unregistered on unmount.
   - Ref stability: Synchronization of `zoomRef` and `onZoomChangeRef` in a lightweight effect ensures event listener registration depends only on `[isPrint]`, preventing listener churn during gestures.
   - Lines 138–142: Container styled with `touchAction: 'pan-x pan-y', overscrollBehavior: 'contain'` and class `overscroll-contain`.

3. **`components/MainShiftView.tsx`**:
   - Lines 120–133:
     ```tsx
     const calculateFitToWidth = useCallback(() => {
       if (!containerRef.current) return 75;
       const containerWidth = containerRef.current.clientWidth - 32;
       const a4WidthPx = 1122.5;
       const calculated = (containerWidth / a4WidthPx) * 100;
       return Math.max(25, Math.min(100, Math.round(calculated)));
     }, []);

     const handleZoomChange = useCallback((newZoom: number) => {
       setZoomPercent(Math.max(25, Math.min(150, newZoom)));
     }, []);
     ```
   - Lines 135–149: Initial mount measurement wrapped in `requestAnimationFrame` with cleanup on unmount; window resize handler updates `setZoomPercent(calculateFitToWidth())`.
   - Lines 350 & 402: `onZoomChange={handleZoomChange}` wired to both `ZoomControls` and `ShiftSheetPreview`.

4. **`app/globals.css` & `app/layout.tsx`**:
   - `app/globals.css` lines 47, 57–58, 68–70:
     ```css
     html { touch-action: pan-x pan-y; }
     body { touch-action: pan-x pan-y; overscroll-behavior-y: none; }
     button, a, input, select, textarea { touch-action: manipulation; }
     ```
   - `app/layout.tsx` lines 10–16:
     ```tsx
     export const viewport: Viewport = {
       width: 'device-width',
       initialScale: 1,
       maximumScale: 1,
       userScalable: false,
       viewportFit: 'cover',
     };
     ```

5. **`components/AppShell.tsx`**:
   - Lines 66–79: Global Safari gesture suppression:
     ```tsx
     useEffect(() => {
       const blockGesture = (e: Event) => e.preventDefault();
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

6. **Integrity Audit**:
   - Zero hardcoded test return values.
   - Zero facade or mock implementations in production source code.
   - Genuine mathematical calculations (`Math.hypot`, ratio multiplication, boundary clamping).
   - Real native event binding with non-passive options.

7. **Verification Commands**:
   - `npm test`: 6 test files passed, 61/61 tests passed (39 baseline + 22 adversarial unit tests).
   - `npx tsc --noEmit`: Exited with code 0 (0 errors).
   - `npm run lint`: Exited with code 0 (0 errors, 0 warnings).
   - `npm run build`: Exited with code 0 (Next.js 16.4.3 Turbopack build succeeded).
   - Playwright M1 test suites (`e2e/m1-adversarial-viewport.spec.ts`, `e2e/zoom-adversarial.spec.ts`): 16 of 16 tests passed across Mobile Safari and Desktop Chrome.

---

## 2. Logic Chain

1. **Zoom-In Re-Enablement in `ZoomControls.tsx`**:
   - In accordance with R1, Zoom-In button is fully functional with `handleZoomIn = () => onZoomChange(Math.min(150, zoomPercent + 15))`.
   - Disabled states correctly enforce boundaries: disabled at `<= 25%` for Zoom-Out and `>= 150%` for Zoom-In.
   - Button dimensions (`min-h-[38px] min-w-[38px]`) and accessibility labels (`ja.common.zoomIn`, `ja.common.zoomOut`, `ja.common.zoomReset`) ensure full WCAG/mobile usability.

2. **Canvas Dual-Directional Gestures & Event Isolation in `ShiftSheetPreview.tsx`**:
   - `handleNativeWheel` suppresses default browser page zoom via `e.preventDefault()` and steps zoom by ±10% clamped to `[25, 150]`.
   - `handleNativeTouchMove` handles 2-finger touches smoothly by computing `dist / initialTouchDistanceRef.current`. Both `ratio < 1` (zoom out) and `ratio >= 1` (zoom in) are supported.
   - Ref stability pattern (`zoomRef`, `onZoomChangeRef`) ensures listeners remain registered across re-renders, preventing gesture stuttering.
   - Container isolation via `touch-action: pan-x pan-y`, `overscroll-behavior: contain`, and class `overscroll-contain` keeps pan and scroll events strictly within the sheet viewport.

3. **Clamping & Mount Timing in `MainShiftView.tsx`**:
   - `handleZoomChange` strictly clamps zoom state to `[25, 150]`.
   - `calculateFitToWidth` accurately fits the A4 sheet width (`1122.5px`) into container width minus padding (`32px`), capped at `100%` on large viewports.
   - `requestAnimationFrame` on initial mount avoids React 19 layout thrashing while guaranteeing proper measurement after DOM layout.

4. **Webpage Viewport Zoom Prevention**:
   - Mobile double-tap zoom is prevented via `touch-action: manipulation` on all interactive controls (`button, a, input, select, textarea`).
   - Browser viewport scale is locked via `maximumScale: 1, userScalable: false` in `app/layout.tsx`.
   - Safari pinch-to-zoom is intercepted on document level in `AppShell.tsx` and container level in `ShiftSheetPreview.tsx`.

5. **Adversarial Stress Test Results**:
   - *Boundary tests*: 24%, 25%, 26%, 149%, 150%, 151%, extreme values (`-500`, `99999`) all clamp cleanly.
   - *Rapid click bursts*: 12+ repeated rapid clicks floor at 25% and ceiling at 150% without state corruption.
   - *Wheel iterations*: 5,000 random wheel delta iterations remain strictly within [25, 150].
   - *Pinch ratio extremes*: Tested `ratio < 1`, `ratio = 1`, `ratio > 1`, `ratio > 5`, and zero/negative distance guards; no `NaN` or divide-by-zero errors.
   - *Layout shifts*: Zooming to 150% does not trigger horizontal scrollbars or layout shifts on the top header or navigation tabs.

---

## 3. Caveats

1. **Proxy Variable Handling in Local Test Environments**:
   - When running Playwright or local curl requests against `127.0.0.1:3088`, local macOS proxy environment variables (`http_proxy`, `https_proxy`) must be cleared or bypassed via `NO_PROXY=localhost,127.0.0.1,::1` to prevent Chromium and Node from routing internal loopback traffic to external proxies.
2. **Concurrent E2E Test Execution**:
   - The test suite uses a shared SQLite database (`./data/shift.db`). Running multiple Playwright test processes concurrently causes database write collisions and port contention on port 3088. E2E tests should be run with `workers: 1` or sequentially.
3. **Out-of-Scope Milestone 4 PDF Endpoint**:
   - `GET /api/shifts/[date]/pdf` currently launches headless Chromium on the server. In environments where Chromium loopback connects through an external proxy, this endpoint will be addressed in Milestone 4 (stateless vector print preview fallback). This does not impact Milestone 1 zoom and viewport isolation.

---

## 4. Conclusion

**Verdict: APPROVE**

Worker 1's implementation of Milestone 1 (`ZoomControls.tsx`, `ShiftSheetPreview.tsx`, `MainShiftView.tsx`, `app/globals.css`, `app/layout.tsx`, `components/AppShell.tsx`, and `e2e/shift-flow.spec.ts`) completely fulfills all Milestone 1 requirements and acceptance criteria:
- Dual-directional zoom (+ and -) functions smoothly within [25%, 150%].
- Touch pinch-to-zoom and Ctrl-wheel zoom operate directly on the shift sheet canvas.
- Reset button accurately restores fit-to-width.
- Webpage chrome is strictly protected against browser viewport zoom distortion.
- 0 integrity violations, 0 regressions, all build and verification suites pass cleanly.

---

## 5. Verification Method

To independently reproduce verification:

1. **Unit & Adversarial Tests**:
   ```sh
   npm test
   ```
   *Expected*: 6 test files, 61 passed tests.

2. **TypeScript Compilation**:
   ```sh
   npx tsc --noEmit
   ```
   *Expected*: 0 type errors.

3. **ESLint**:
   ```sh
   npm run lint
   ```
   *Expected*: 0 errors, 0 warnings.

4. **Production Build**:
   ```sh
   npm run build
   ```
   *Expected*: Next.js 16.4.3 Turbopack build succeeds.

5. **Playwright M1 Adversarial & Viewport Suite**:
   ```sh
   HTTP_PROXY="" HTTPS_PROXY="" http_proxy="" https_proxy="" NO_PROXY=localhost,127.0.0.1,::1 no_proxy=localhost,127.0.0.1,::1 npx playwright test e2e/m1-adversarial-viewport.spec.ts e2e/zoom-adversarial.spec.ts
   ```
   *Expected*: 16 passed tests across Mobile Safari and Desktop Chrome.
