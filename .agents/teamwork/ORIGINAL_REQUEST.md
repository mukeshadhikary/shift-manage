# Original User Request

## Initial Request — 2026-10-31T22:32:20Z

Fix mobile UX issues, restore shift sheet dual-directional zoom (in/out) while preventing webpage viewport distortion, eliminate AM/PM references in favor of strict 24-hour formatting, and resolve Vercel deployment download/export failures for the Japanese Daily Shift Sheet application.

Working directory: /Users/mukesh/Documents/Projects/shift-managers
Integrity mode: development

## Requirements

### R1. Shift Sheet Zoom vs. Webpage Viewport Zoom Separation
- Enable both zoom-in and zoom-out (zoom-unzoom both need) on the shift sheet preview itself:
  - Re-enable the `+` zoom-in button in `ZoomControls.tsx` (range 25% to 150%).
  - Allow touch pinch-to-zoom (both in and out) and Ctrl/Cmd-wheel zooming directly on the sheet preview.
  - Reset button resets to fit-to-width.
- Keep the webpage itself from unwanted viewport zoom-in distortion on mobile:
  - Prevent accidental mobile browser page-level zoom on buttons, header, and tabs (`touch-action: pan-x pan-y`, meta viewport `maximum-scale=1.0, user-scalable=no`), while allowing the shift sheet canvas to be zoomed and panned freely.

### R2. Responsive Mobile Form Layout (No Field Overlap)
- In `EmployeeForm.tsx` and `ShiftCreationWizard.tsx`, fix field overlapping on narrow mobile devices (< 400px width, e.g. iPhone SE / iPhone 12 / 13 mini):
  - Change rigid 2-column grids (`grid grid-cols-2`) to responsive single-column layouts on mobile (`grid-cols-1 sm:grid-cols-2`), especially for:
    - CODE & ニックネーム (Nickname)
    - 始業予定時間 & 始業実時間 (Planned Start & Actual Start)
    - 終了予定時間 & 休憩時間 (Planned End & Break Time)
    - ロッカー番号 & 備考 (Locker & Remarks)
  - Ensure labels, inputs, and quick-selection chips wrap cleanly with adequate margins and zero visual clipping.

### R3. Strict 24-Hour Time Format Throughout the Application
- Eliminate any 12-hour AM/PM format everywhere in the app:
  - Update default vertical instructions in `lib/defaults.ts` and migrations: replace `翌日AM9:00までに送付` with `翌日9:00までに送付`.
  - Ensure all time inputs, display previews, and quick selection chips consistently use 24-hour time notation (`HH:mm` / `H:mm` e.g. `09:00`, `18:00`, `22:00`).

### R4. Fix Export Downloads on Vercel Deployment
- Fix the issue where downloading shift exports (Excel `.xlsx` / PDF `.pdf`) on Vercel results in a blank page or 404 "file does not exist":
  - Serverless functions are stateless: ensure client-side state / shift snapshots can be passed or exported reliably without depending on local disk persistence across separate lambda instances.
  - For PDF generation on Vercel (where headless Chromium is not bundled), provide a robust fallback (e.g. client-side window.print / styled printable preview or pre-rendered vector PDF) so users on Vercel never receive a blank error page.
  - For Excel (`.xlsx`), ensure the model generates directly from available shift data in memory and streams download headers cleanly.

## Acceptance Criteria

### Shift Sheet Zoom & Webpage Viewport
- [ ] Shift sheet preview can be zoomed out (down to 25%) AND zoomed in (up to 150%) using `+` and `-` buttons.
- [ ] Pinch gesture directly on the sheet preview smoothly zooms the sheet in and out.
- [ ] Webpage chrome (navigation bars, buttons, tab bar) does not distort or zoom-in the browser viewport.

### Mobile Form Layout
- [ ] On viewports from 320px to 400px width, all fields in `EmployeeForm` stack without overlapping labels or clipped inputs.
- [ ] Quick time chips and break chips wrap cleanly without breaking container boundaries.

### 24-Hour Time Formatting
- [ ] Default vertical instructions show `翌日9:00までに送付` (no "AM" or "PM").
- [ ] All shift time displays and input helpers format in 24-hour time.

### Vercel Export Downloads
- [ ] Excel export downloads successfully without 404 / file missing errors.
- [ ] PDF export or printable view opens and prints properly without failing due to missing server Chromium binaries.
- [ ] All Vitest tests (39+), TypeScript typecheck, ESLint, and Next.js build pass cleanly.
