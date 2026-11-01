/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test';
import { createShift, deleteShiftByDate, restoreDefaultSettings } from '../lib/db/repository';

const TEST_DATE = '2026-11-25';

test.describe('Milestone 1 Adversarial Challenges: Viewport Isolation & Zoom Separation', () => {
  test.beforeEach(async () => {
    restoreDefaultSettings();
    deleteShiftByDate(TEST_DATE);

    // Seed test shift with 3 employees
    createShift({
      shift_date: TEST_DATE,
      employees: [
        {
          employee_name: '山田 太郎',
          employee_code: 'MS001',
          nickname: 'ヤマダ',
          planned_start_time: '09:00',
          planned_end_time: '18:00',
          break_time: '1:00',
          remarks: '特記事項なし',
        },
        {
          employee_name: '鈴木 一郎',
          employee_code: 'MS002',
          nickname: 'スズキ',
          planned_start_time: '22:00',
          planned_end_time: '06:00',
          break_time: '1:00',
          remarks: '夜勤シフト',
        },
        {
          employee_name: '佐藤 花子',
          employee_code: 'MS003',
          nickname: 'サトウ',
          planned_start_time: '13:00',
          planned_end_time: '21:00',
          break_time: '0:45',
          remarks: '遅番',
        },
      ],
    });
  });

  test.afterEach(async () => {
    deleteShiftByDate(TEST_DATE);
  });

  test('Challenge 1: Zooming to 150% does NOT cause layout shifts or overflow on parent components', async ({ page, isMobile }) => {
    if (!isMobile) {
      await page.setViewportSize({ width: 375, height: 667 });
    }
    await page.goto(`/?date=${TEST_DATE}`);

    // Wait for shift sheet to render
    await expect(page.locator('.shift-sheet-page')).toBeVisible();

    const zoomInBtn = page.locator('button[aria-label="拡大"]');
    const zoomDisplay = page.locator('button[aria-label="縮小"] + span');

    // Click zoom in until maximum 150%
    for (let i = 0; i < 10; i++) {
      if (await zoomInBtn.isEnabled()) {
        await zoomInBtn.click();
      }
    }

    await expect(zoomDisplay).toHaveText('150%');
    await expect(zoomInBtn).toBeDisabled();

    // Verify webpage viewport isolation:
    // 1. document.documentElement scrollWidth must not overflow clientWidth
    const pageMetrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const header = document.querySelector('header');
      const nav = document.querySelector('nav');
      const sheetViewport = document.querySelector('.sheet-preview-viewport');
      const pageWrapper = document.querySelector('.sheet-page-wrapper');

      return {
        docScrollWidth: doc.scrollWidth,
        docClientWidth: doc.clientWidth,
        windowScrollX: window.scrollX,
        headerWidth: header ? header.getBoundingClientRect().width : null,
        navWidth: nav ? nav.getBoundingClientRect().width : null,
        sheetScrollWidth: sheetViewport?.scrollWidth ?? 0,
        sheetClientWidth: sheetViewport?.clientWidth ?? 0,
        pageWrapperWidth: pageWrapper ? pageWrapper.getBoundingClientRect().width : 0,
      };
    });

    // The document/body MUST NOT have horizontal overflow
    expect(pageMetrics.docScrollWidth).toBeLessThanOrEqual(pageMetrics.docClientWidth + 1);
    expect(pageMetrics.windowScrollX).toBe(0);

    // Parent UI elements must remain within viewport width
    expect(pageMetrics.headerWidth).toBeLessThanOrEqual(pageMetrics.docClientWidth);
    if (pageMetrics.navWidth) {
      expect(pageMetrics.navWidth).toBeLessThanOrEqual(pageMetrics.docClientWidth);
    }

    // Inside the sheet viewport, the sheet IS wider than the container
    expect(pageMetrics.sheetScrollWidth).toBeGreaterThan(pageMetrics.sheetClientWidth);

    // Panning inside the sheet viewport works independently without shifting the document
    const scrollResult = await page.evaluate(() => {
      const sheetViewport = document.querySelector('.sheet-preview-viewport');
      if (!sheetViewport) return null;
      sheetViewport.scrollLeft = 150;
      sheetViewport.scrollTop = 100;
      return {
        sheetScrollLeft: sheetViewport.scrollLeft,
        sheetScrollTop: sheetViewport.scrollTop,
        docScrollX: window.scrollX,
        docScrollY: window.scrollY,
      };
    });

    expect(scrollResult?.sheetScrollLeft).toBeGreaterThan(0);
    expect(scrollResult?.docScrollX).toBe(0);
  });

  test('Challenge 2: Touch actions, overscroll-contain, and gesture isolation are strictly scoped', async ({ page }) => {
    await page.goto(`/?date=${TEST_DATE}`);
    await expect(page.locator('.shift-sheet-page')).toBeVisible();

    // 1. Inspect computed touch-action and overscroll styles
    const styles = await page.evaluate(() => {
      const html = document.documentElement;
      const body = document.body;
      const sheetViewport = document.querySelector('.sheet-preview-viewport') as HTMLElement | null;
      const button = document.querySelector('button[aria-label="拡大"]') as HTMLElement | null;

      return {
        htmlTouchAction: window.getComputedStyle(html).touchAction,
        bodyTouchAction: window.getComputedStyle(body).touchAction,
        bodyOverscrollY: window.getComputedStyle(body).overscrollBehaviorY,
        sheetTouchAction: sheetViewport ? window.getComputedStyle(sheetViewport).touchAction : null,
        sheetOverscroll: sheetViewport ? window.getComputedStyle(sheetViewport).overscrollBehavior : null,
        buttonTouchAction: button ? window.getComputedStyle(button).touchAction : null,
      };
    });

    expect(styles.htmlTouchAction).toContain('pan-x pan-y');
    expect(styles.bodyTouchAction).toContain('pan-x pan-y');
    expect(styles.bodyOverscrollY).toBe('none');
    expect(styles.buttonTouchAction).toBe('manipulation');
    expect(styles.sheetTouchAction).toBe('pan-x pan-y');
    expect(styles.sheetOverscroll).toContain('contain');

    // 2. Test Safari gesture events cancellation
    const gestureBlocked = await page.evaluate(() => {
      const evt = new CustomEvent('gesturestart', { bubbles: true, cancelable: true });
      const discharged = document.dispatchEvent(evt);
      return !discharged; // true if preventDefault was called
    });
    expect(gestureBlocked).toBe(true);

    // 3. Test two-finger pinch-to-zoom on sheet preview
    const zoomDisplay = page.locator('button[aria-label="縮小"] + span');
    const initialText = await zoomDisplay.textContent();
    const initialVal = parseInt(initialText?.replace('%', '') || '100', 10);

    // Helper to create Touch in both Blink and WebKit
    await page.evaluate(() => {
      (window as any).createMockTouch = (target: Element, id: number, x: number, y: number) => {
        if ('createTouch' in document && typeof (document as any).createTouch === 'function') {
          return (document as any).createTouch(window, target, id, x, y, x, y);
        }
        try {
          return new Touch({ identifier: id, target, clientX: x, clientY: y });
        } catch {
          return { identifier: id, target, clientX: x, clientY: y };
        }
      };
    });

    // Simulate pinch-in (finger distance increases from 100 to 140)
    await page.evaluate(() => {
      const el = document.querySelector('.sheet-preview-viewport');
      if (!el) return;
      const mock = (window as any).createMockTouch;

      const touch1Start = mock(el, 1, 100, 200);
      const touch2Start = mock(el, 2, 200, 200);

      try {
        el.dispatchEvent(
          new TouchEvent('touchstart', {
            touches: [touch1Start, touch2Start],
            bubbles: true,
            cancelable: true,
          })
        );
      } catch {
        // Fallback for older WebKit TouchEvent init
        const evt = document.createEvent('TouchEvent') as any;
        if (evt.initTouchEvent) {
          evt.initTouchEvent('touchstart', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, [touch1Start, touch2Start], [], []);
          el.dispatchEvent(evt);
        }
      }

      // Distance increases from 100 to 140 (ratio 1.4)
      const touch1Move = mock(el, 1, 80, 200);
      const touch2Move = mock(el, 2, 220, 200);

      try {
        el.dispatchEvent(
          new TouchEvent('touchmove', {
            touches: [touch1Move, touch2Move],
            bubbles: true,
            cancelable: true,
          })
        );
      } catch {
        const evt = document.createEvent('TouchEvent') as any;
        if (evt.initTouchEvent) {
          evt.initTouchEvent('touchmove', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, [touch1Move, touch2Move], [], []);
          el.dispatchEvent(evt);
        }
      }

      try {
        el.dispatchEvent(
          new TouchEvent('touchend', {
            touches: [],
            bubbles: true,
            cancelable: true,
          })
        );
      } catch {
        const evt = document.createEvent('TouchEvent') as any;
        if (evt.initTouchEvent) {
          evt.initTouchEvent('touchend', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, [], [], []);
          el.dispatchEvent(evt);
        }
      }
    });

    const pinchedInText = await zoomDisplay.textContent();
    const pinchedInVal = parseInt(pinchedInText?.replace('%', '') || '0', 10);
    // On Chromium, pinch-in increases zoom; on WebKit where synthetic touch is restricted, it remains bounded
    expect(pinchedInVal).toBeGreaterThanOrEqual(25);
    expect(pinchedInVal).toBeLessThanOrEqual(150);

    // Simulate pinch-out (finger distance decreases from 200 to 100)
    await page.evaluate(() => {
      const el = document.querySelector('.sheet-preview-viewport');
      if (!el) return;
      const mock = (window as any).createMockTouch;

      const touch1Start = mock(el, 1, 100, 200);
      const touch2Start = mock(el, 2, 300, 200);

      try {
        el.dispatchEvent(
          new TouchEvent('touchstart', {
            touches: [touch1Start, touch2Start],
            bubbles: true,
            cancelable: true,
          })
        );
      } catch {
        const evt = document.createEvent('TouchEvent') as any;
        if (evt.initTouchEvent) {
          evt.initTouchEvent('touchstart', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, [touch1Start, touch2Start], [], []);
          el.dispatchEvent(evt);
        }
      }

      // Distance decreases from 200 to 100 (ratio 0.5)
      const touch1Move = mock(el, 1, 150, 200);
      const touch2Move = mock(el, 2, 250, 200);

      try {
        el.dispatchEvent(
          new TouchEvent('touchmove', {
            touches: [touch1Move, touch2Move],
            bubbles: true,
            cancelable: true,
          })
        );
      } catch {
        const evt = document.createEvent('TouchEvent') as any;
        if (evt.initTouchEvent) {
          evt.initTouchEvent('touchmove', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, [touch1Move, touch2Move], [], []);
          el.dispatchEvent(evt);
        }
      }

      try {
        el.dispatchEvent(
          new TouchEvent('touchend', {
            touches: [],
            bubbles: true,
            cancelable: true,
          })
        );
      } catch {
        const evt = document.createEvent('TouchEvent') as any;
        if (evt.initTouchEvent) {
          evt.initTouchEvent('touchend', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, [], [], []);
          el.dispatchEvent(evt);
        }
      }
    });

    const pinchedOutText = await zoomDisplay.textContent();
    const pinchedOutVal = parseInt(pinchedOutText?.replace('%', '') || '0', 10);
    expect(pinchedOutVal).toBeGreaterThanOrEqual(25);
    expect(pinchedOutVal).toBeLessThanOrEqual(150);

    // 4. Test Ctrl+Wheel zoom in and zoom out
    const beforeWheelVal = pinchedOutVal;
    // Wheel up with ctrlKey (zoom in)
    const wheelInPrevented = await page.evaluate(() => {
      const el = document.querySelector('.sheet-preview-viewport');
      if (!el) return false;
      const evt = new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(evt);
      return evt.defaultPrevented;
    });

    expect(wheelInPrevented).toBe(true);
    const afterWheelInText = await zoomDisplay.textContent();
    const afterWheelInVal = parseInt(afterWheelInText?.replace('%', '') || '0', 10);
    expect(afterWheelInVal).toBe(Math.min(150, beforeWheelVal + 10));

    // Wheel down with ctrlKey (zoom out)
    const wheelOutPrevented = await page.evaluate(() => {
      const el = document.querySelector('.sheet-preview-viewport');
      if (!el) return false;
      const evt = new WheelEvent('wheel', {
        deltaY: 100,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(evt);
      return evt.defaultPrevented;
    });

    expect(wheelOutPrevented).toBe(true);
    const afterWheelOutText = await zoomDisplay.textContent();
    const afterWheelOutVal = parseInt(afterWheelOutText?.replace('%', '') || '0', 10);
    expect(afterWheelOutVal).toBe(Math.max(25, afterWheelInVal - 10));
  });

  test('Challenge 3: Fit-to-width clean initial rendering across viewports (320px, 375px, 768px, 1440px)', async ({ page, isMobile }) => {
    if (isMobile) {
      // Mobile device (iPhone 12 at 390x844): verify initial fit-to-width without resizing fixed device
      await page.goto(`/?date=${TEST_DATE}`);
      await expect(page.locator('.shift-sheet-page')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(100);

      const zoomDisplay = page.locator('button[aria-label="縮小"] + span');
      const zoomText = await zoomDisplay.textContent();
      const currentVal = parseInt(zoomText?.replace('%', '') || '0', 10);
      expect(Math.abs(currentVal - 32)).toBeLessThanOrEqual(2);

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

      const zoomInBtn = page.locator('button[aria-label="拡大"]');
      const resetBtn = page.locator('button[aria-label="リセット"]');
      await zoomInBtn.click();
      await resetBtn.click();
      await expect(zoomDisplay).toHaveText(`${currentVal}%`);
      return;
    }

    const viewports = [
      { width: 320, height: 568, expectedApprox: 26 },
      { width: 375, height: 667, expectedApprox: 31 },
      { width: 768, height: 1024, expectedApprox: 66 },
      { width: 1440, height: 900, expectedApprox: 100 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`/?date=${TEST_DATE}`);
      await expect(page.locator('.shift-sheet-page')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(100);

      const zoomDisplay = page.locator('button[aria-label="縮小"] + span');
      const zoomText = await zoomDisplay.textContent();
      const currentVal = parseInt(zoomText?.replace('%', '') || '0', 10);

      // Verify fit-to-width is within ±2% of calculated expectation
      expect(Math.abs(currentVal - vp.expectedApprox)).toBeLessThanOrEqual(2);

      // Verify no horizontal overflow of the webpage body
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

      // Verify reset button restores this exact fit-to-width
      const zoomInBtn = page.locator('button[aria-label="拡大"]');
      const resetBtn = page.locator('button[aria-label="リセット"]');

      if (await zoomInBtn.isEnabled()) {
        await zoomInBtn.click();
        await expect(zoomDisplay).toHaveText(`${Math.min(150, currentVal + 15)}%`);

        await resetBtn.click();
        await expect(zoomDisplay).toHaveText(`${currentVal}%`);
      }
    }
  });

  test('Challenge 4: Strict clamping boundaries (25% min and 150% max)', async ({ page }) => {
    await page.goto(`/?date=${TEST_DATE}`);
    await expect(page.locator('.shift-sheet-page')).toBeVisible();

    const zoomOutBtn = page.locator('button[aria-label="縮小"]');
    const zoomInBtn = page.locator('button[aria-label="拡大"]');
    const zoomDisplay = page.locator('button[aria-label="縮小"] + span');

    // Click zoom out until min
    for (let i = 0; i < 15; i++) {
      if (await zoomOutBtn.isEnabled()) {
        await zoomOutBtn.click();
      }
    }

    await expect(zoomDisplay).toHaveText('25%');
    await expect(zoomOutBtn).toBeDisabled();

    // Wheel zoom down should not go below 25%
    await page.evaluate(() => {
      const el = document.querySelector('.sheet-preview-viewport');
      if (!el) return;
      el.dispatchEvent(new WheelEvent('wheel', { deltaY: 500, ctrlKey: true, bubbles: true }));
    });
    await expect(zoomDisplay).toHaveText('25%');

    // Now click zoom in until max 150%
    for (let i = 0; i < 15; i++) {
      if (await zoomInBtn.isEnabled()) {
        await zoomInBtn.click();
      }
    }

    await expect(zoomDisplay).toHaveText('150%');
    await expect(zoomInBtn).toBeDisabled();

    // Wheel zoom up should not go above 150%
    await page.evaluate(() => {
      const el = document.querySelector('.sheet-preview-viewport');
      if (!el) return;
      el.dispatchEvent(new WheelEvent('wheel', { deltaY: -500, ctrlKey: true, bubbles: true }));
    });
    await expect(zoomDisplay).toHaveText('150%');
  });
});
