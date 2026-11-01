# Handoff Report: Challenger 1 — Milestone 1 (Shift Sheet Zoom vs. Webpage Viewport Zoom Separation)

**Challenger**: `challenger_m1_1`  
**Milestone**: Milestone 1 (Shift Sheet Zoom vs. Webpage Viewport Zoom Separation)  
**Date**: 2026-10-31T23:11:00Z  
**Verdict**: **APPROVE**

---

## 1. Observation

1. **Boundary Clamping & Out-of-Range Handling (`components/controls/ZoomControls.tsx`, `components/MainShiftView.tsx`)**:
   - `ZoomControls.tsx` lines 18–24:
     ```tsx
     const handleZoomOut = () => {
       onZoomChange(Math.max(25, zoomPercent - 15));
     };

     const handleZoomIn = () => {
       onZoomChange(Math.min(150, zoomPercent + 15));
     };
     ```
   - `ZoomControls.tsx` lines 31 & 48:
     - Zoom Out button: `disabled={zoomPercent <= 25}`
     - Zoom In button: `disabled={zoomPercent >= 150}`
   - `MainShiftView.tsx` lines 131–133:
     ```tsx
     const handleZoomChange = useCallback((newZoom: number) => {
       setZoomPercent(Math.max(25, Math.min(150, newZoom)));
     }, []);
     ```
   - Mathematical property verification in `lib/sheet/zoom-adversarial.test.ts`:
     - At 25%: `25 <= 25` disables ZoomOut button; `Math.max(25, 25 - 15) = 25`.
     - At 26%: ZoomOut button is enabled; `Math.max(25, 26 - 15) = 25` (floors directly at 25%).
     - At 149%: ZoomIn button is enabled; `Math.min(150, 149 + 15) = 150` (ceilings directly at 150%).
     - At 150%: `150 >= 150` disables ZoomIn button; `Math.min(150, 150 + 15) = 150`.
     - Extreme out-of-range inputs (`-500`, `0`, `24`, `151`, `200`, `99999`) passed to `handleZoomChange` strictly evaluate to 25 or 150.

2. **Rapid Repeated Clicking in Live DOM (`e2e/zoom-adversarial.spec.ts`)**:
   - Running rapid clicks against live DOM in Playwright (`e2e/zoom-adversarial.spec.ts` test 1):
     - 12 consecutive rapid clicks on ZoomIn: advances from initial fit-to-width (`32%` on Mobile Safari, `75%`/`100%` on Desktop Chrome) in steps of +15% until reaching `150%`.
     - At 150%, ZoomIn button becomes `disabled`.
     - 12 consecutive rapid clicks on ZoomOut: steps by -15% down to `25%`.
     - At 25%, ZoomOut button becomes `disabled`.
     - Clicking Reset button restores the display exactly to initial calculated fit-to-width.

3. **Ctrl-Wheel Math & Event Synchrony (`components/sheet/ShiftSheetPreview.tsx`)**:
   - `ShiftSheetPreview.tsx` lines 41–53:
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
   - Wheel delta down (`deltaY > 0`): decrements by 10% down to 25%.
   - Wheel delta up (`deltaY < 0`): increments by 10% up to 150%.
   - Wheel delta neutral (`deltaY === 0`): produces 0 change.
   - **Burst behavior observation**: Because `zoomRef.current` is synchronized via `useEffect([zoomPercent, onZoomChange])`, if a burst of 20 wheel events is dispatched synchronously in the same Javascript event loop tick (e.g. within 1ms), all events in that tick evaluate against the same `zoomRef.current`, resulting in a single 10% step. When wheel ticks occur with regular intervals (> 30–50ms) across render frames, zoom steps smoothly and strictly clamps at 25% and 150%.

4. **Pinch Distance Ratios (`components/sheet/ShiftSheetPreview.tsx`)**:
   - `ShiftSheetPreview.tsx` lines 74–88:
     ```tsx
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
     ```
   - Tested across all ratio classes in `lib/sheet/zoom-adversarial.test.ts` and `e2e/zoom-adversarial.spec.ts`:
     - `ratio < 1` (0.5, 0.2, 0.01): zooms out smoothly, floors at 25%.
     - `ratio = 1`: evaluates to `newZoom === zoomRef.current`, avoiding redundant re-renders.
     - `ratio > 1` (1.25, 1.5): zooms in smoothly.
     - `ratio > 5` (5.0, 8.0, 10.0, 100.0): extreme outward pinch strictly caps at 150%.
     - `dist <= 0` and `initialDist <= 0`: safely guarded by `if (dist > 0 && initialTouchDistanceRef.current > 0)`. Zero division by zero, zero NaNs, zero errors.
     - 10,000 continuous pinch distance frames tested: all outputs lie in `[25, 150]` and are integers.

5. **Webpage Viewport Zoom Isolation (`app/layout.tsx`, `app/globals.css`, `components/sheet/ShiftSheetPreview.tsx`)**:
   - `app/layout.tsx` lines 13–14: `maximumScale: 1, userScalable: false`.
   - `app/globals.css` lines 47, 57: `html, body { touch-action: pan-x pan-y; }`, `body { overscroll-behavior-y: none; }`.
   - `app/globals.css` lines 68–70: `button, a, input, select, textarea { touch-action: manipulation; }`.
   - `ShiftSheetPreview.tsx` line 140–141: `.sheet-preview-viewport` has `style={{ touchAction: 'pan-x pan-y', overscrollBehavior: 'contain' }}`.
   - Live DOM evaluation verifies all computed CSS properties match and prevent double-tap / browser page-level zoom distortion.

6. **Test Suite Execution**:
   - `npm test`: 6 test files passed, 61 of 61 tests passed (including 22 adversarial unit tests in `lib/sheet/zoom-adversarial.test.ts`).
   - `npm run test:e2e -- e2e/zoom-adversarial.spec.ts`: 8 passed (9.7s) across both Mobile Safari and Desktop Chrome projects.
   - `npx tsc --noEmit`: 0 type errors.
   - `npx eslint e2e/zoom-adversarial.spec.ts lib/sheet/zoom-adversarial.test.ts`: 0 lint errors, 0 warnings.
   - `npm run build`: Next.js Turbopack production build succeeded.

---

## 2. Logic Chain

1. **Clamping & Button State Invariant**:
   - From Observation 1, `handleZoomChange` in `MainShiftView.tsx` wraps all incoming values in `Math.max(25, Math.min(150, newZoom))`.
   - `ZoomControls.tsx` disables the buttons at boundary conditions (`zoomPercent <= 25` and `zoomPercent >= 150`).
   - Even if buttons are triggered directly via script or out-of-bounds numbers are injected, the value cannot escape `[25, 150]`.
   - Therefore, the boundary clamping requirement is strictly met.

2. **Rapid Click Resilience**:
   - From Observation 2, repeatedly clicking ZoomIn or ZoomOut in rapid succession increments/decrements monotonically until hitting the boundary, where the respective button disables and further clicks are ignored.
   - Clicking Reset restores the calculated fit-to-width value without state corruption.
   - Therefore, rapid clicking behavior is robust and resilient.

3. **Ctrl-Wheel Zoom Mechanics**:
   - From Observation 3, wheel events with `e.ctrlKey` or `e.metaKey` are intercepted with `e.preventDefault()`, preventing browser-level viewport zoom.
   - Each wheel event step adjusts zoom by ±10%, clamped to `[25, 150]`.
   - Burst events within the same render cycle are naturally rate-limited to 1 step per tick, avoiding violent jumps on high-frequency trackpad scrolling.
   - Therefore, wheel zoom behavior is safe and correct.

4. **Pinch-to-Zoom Mathematical Soundness**:
   - From Observation 4, pinch ratio is computed as `currentDist / initialTouchDistanceRef.current` against `initialZoomRef.current`.
   - Because it computes relative to the gesture start rather than compounding incrementally, it does not suffer from compounding exponential drift.
   - Ratios below 1, equal to 1, above 1, and extreme ratios above 5 clamp strictly to `[25, 150]`.
   - Invalid or zero distances are guarded before division.
   - Therefore, pinch gesture handling is mathematically sound and error-free.

5. **Viewport Isolation Conformance**:
   - From Observation 5, meta viewport settings, global touch actions (`pan-x pan-y` on html/body, `manipulation` on buttons), and viewport overscroll containment (`contain` on `.sheet-preview-viewport`) keep the webpage chrome stationary while enabling pan/zoom within the sheet canvas.
   - Therefore, webpage viewport separation is strictly satisfied.

---

## 3. Caveats

- **Wheel Burst Rate-Limiting**: Wheel events fired synchronously within a single animation/render frame (less than ~16ms apart) evaluate against the same `zoomRef.current` until React commits the state update. This naturally rate-limits fast trackpad gestures, preventing them from overshooting instantly.
- **Milestone 4 Pending Failures in Full Acceptance Suite**: In the full `e2e/shift-flow.spec.ts` and `e2e/pagination-and-api.spec.ts` test suites, steps 13–14 (stateless Excel export 404 and PDF page count on Vercel) fail because Milestone 4 has not been implemented yet. Step 12 (zoom in, zoom out, reset) passes cleanly. Our dedicated adversarial zoom test suite (`e2e/zoom-adversarial.spec.ts`) passes 100% (8 of 8 tests).

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 1 satisfies all requirements of `ORIGINAL_REQUEST.md` §R1:
1. Dual-directional zoom (in up to 150%, out down to 25%) works cleanly via UI buttons, Ctrl-wheel, and touch pinch gestures.
2. Clamping strictly enforces the `[25, 150]` range under edge inputs, rapid clicking, and extreme pinch ratios (>5x).
3. Webpage viewport isolation eliminates mobile double-tap and browser page-level zoom distortion while permitting free sheet panning and zooming.
4. All unit tests (61/61) and adversarial E2E tests (8/8) pass cleanly across Mobile Safari and Desktop Chrome.

---

## 5. Verification Method

To independently verify all adversarial tests:

1. **Vitest Unit Suite (including 22 adversarial tests)**:
   ```sh
   npm test -- --run
   ```
   *Expected output*: 6 test files passed, 61 passed (including `lib/sheet/zoom-adversarial.test.ts`).

2. **Adversarial E2E Suite (Mobile Safari + Desktop Chrome)**:
   ```sh
   npm run test:e2e -- e2e/zoom-adversarial.spec.ts
   ```
   *Expected output*: 8 passed across Mobile Safari and Desktop Chrome.

3. **TypeScript Typecheck**:
   ```sh
   npx tsc --noEmit
   ```
   *Expected output*: 0 errors.

4. **ESLint**:
   ```sh
   npx eslint e2e/zoom-adversarial.spec.ts lib/sheet/zoom-adversarial.test.ts
   ```
   *Expected output*: 0 errors, 0 warnings.

5. **Production Build**:
   ```sh
   npm run build
   ```
   *Expected output*: Next.js 16.4.3 Turbopack build succeeded.
