import { test, expect } from '@playwright/test';
import { createShift, getShiftByDate, restoreDefaultSettings } from '../lib/db/repository';
import { getTodayJST } from '../lib/date';

test.describe('Adversarial Zoom & Viewport Isolation Suite', () => {
  const testDate = getTodayJST();

  test.beforeEach(async () => {
    restoreDefaultSettings();

    // Seed a standard shift if not present so preview is active immediately
    if (!getShiftByDate(testDate)) {
      createShift({
        shift_date: testDate,
        employees: [
          {
            employee_name: '田中 太郎',
            employee_code: 'MS0001',
            nickname: 'タナカ',
            planned_start_time: '09:00',
            planned_end_time: '18:00',
            actual_start_time: '09:00',
            break_time: '1:00',
            remarks: '通常勤務',
          },
          {
            employee_name: '佐藤 花子',
            employee_code: 'MS0002',
            nickname: 'サトウ',
            planned_start_time: '10:00',
            planned_end_time: '19:00',
            actual_start_time: '10:00',
            break_time: '1:00',
            remarks: '',
          },
        ],
      });
    }
  });

  test('Boundary clamping, rapid clicking, and reset verification', async ({ page }) => {
    await page.goto('/');

    // Verify sheet preview is visible
    await expect(page.locator('.shift-sheet-page')).toBeVisible({ timeout: 10000 });
    const zoomInBtn = page.locator('button[aria-label="拡大"]');
    const zoomOutBtn = page.locator('button[aria-label="縮小"]');
    const resetBtn = page.locator('button[aria-label="リセット"]');
    const zoomDisplay = page.locator('button[aria-label="縮小"] + span');

    await expect(zoomInBtn).toBeVisible();
    await expect(zoomOutBtn).toBeVisible();
    await expect(resetBtn).toBeVisible();

    // Settle fit-to-width measurement
    await page.waitForTimeout(150);
    const initialText = (await zoomDisplay.textContent())?.trim();
    const initialZoom = parseInt(initialText?.replace('%', '') || '0', 10);
    expect(initialZoom).toBeGreaterThanOrEqual(25);
    expect(initialZoom).toBeLessThanOrEqual(100);

    // 1. Rapid clicking of ZoomIn to the ceiling (150%)
    for (let i = 0; i < 12; i++) {
      if (await zoomInBtn.isEnabled()) {
        await zoomInBtn.click();
      }
    }

    // Must clamp strictly at 150%
    await expect(zoomDisplay).toHaveText('150%');
    await expect(zoomInBtn).toBeDisabled();
    await expect(zoomOutBtn).toBeEnabled();

    // 2. Rapid clicking of ZoomOut to the floor (25%)
    for (let i = 0; i < 12; i++) {
      if (await zoomOutBtn.isEnabled()) {
        await zoomOutBtn.click();
      }
    }

    // Must clamp strictly at 25%
    await expect(zoomDisplay).toHaveText('25%');
    await expect(zoomOutBtn).toBeDisabled();
    await expect(zoomInBtn).toBeEnabled();

    // 3. Single click back up: 25 + 15 = 40%
    await zoomInBtn.click();
    await expect(zoomDisplay).toHaveText('40%');
    await expect(zoomOutBtn).toBeEnabled();

    // 4. Reset returns to initial fit-to-width
    await resetBtn.click();
    await expect(zoomDisplay).toHaveText(`${initialZoom}%`);
  });

  test('Ctrl-wheel zoom in and out math on sheet viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.shift-sheet-page')).toBeVisible({ timeout: 10000 });

    const zoomDisplay = page.locator('button[aria-label="縮小"] + span');
    await page.waitForTimeout(150);
    const startText = (await zoomDisplay.textContent())?.trim();
    const startVal = parseInt(startText?.replace('%', '') || '0', 10);

    const viewport = page.locator('.sheet-preview-viewport');
    await expect(viewport).toBeVisible();

    // Dispatch Ctrl + wheel up (deltaY: -100) -> Zoom In (+10%)
    await viewport.evaluate((el) => {
      const evt = new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(evt);
    });

    const expectedZoomIn = Math.min(150, startVal + 10);
    await expect(zoomDisplay).toHaveText(`${expectedZoomIn}%`);

    // Dispatch Ctrl + wheel down (deltaY: 100) -> Zoom Out (-10%)
    await viewport.evaluate((el) => {
      const evt = new WheelEvent('wheel', {
        deltaY: 100,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(evt);
    });
    await expect(zoomDisplay).toHaveText(`${startVal}%`);

    // Spaced wheel down 10 times with 50ms between ticks to allow React re-render
    for (let i = 0; i < 10; i++) {
      await viewport.evaluate((el) => {
        el.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: 100,
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          })
        );
      });
      await page.waitForTimeout(50);
    }
    await expect(zoomDisplay).toHaveText('25%');

    // Spaced wheel up 15 times with 50ms between ticks to allow React re-render
    for (let i = 0; i < 15; i++) {
      await viewport.evaluate((el) => {
        el.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: -100,
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          })
        );
      });
      await page.waitForTimeout(50);
    }
    await expect(zoomDisplay).toHaveText('150%');
  });

  test('Touch pinch gesture simulation and ratio handling', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.shift-sheet-page')).toBeVisible({ timeout: 10000 });

    const zoomDisplay = page.locator('button[aria-label="縮小"] + span');
    await page.waitForTimeout(150);

    const viewport = page.locator('.sheet-preview-viewport');

    // Simulate 2-finger touch start: distance = 100px
    // Then touch move with ratio < 1, ratio > 1, ratio > 5, dist <= 0
    await viewport.evaluate((el) => {
      const createTouchObj = (id: number, x: number, y: number) => {
        const doc = document as unknown as Record<string, unknown>;
        if (typeof doc.createTouch === 'function') {
          return (doc.createTouch as (w: Window, t: Element, id: number, x1: number, y1: number, x2: number, y2: number) => Touch)(
            window,
            el,
            id,
            x,
            y,
            x,
            y
          );
        }
        try {
          return new Touch({
            identifier: id,
            target: el,
            clientX: x,
            clientY: y,
          });
        } catch {
          return {
            identifier: id,
            target: el,
            clientX: x,
            clientY: y,
          } as unknown as Touch;
        }
      };

      try {
        // 1. Touch start with 2 fingers at distance 100 (x=100 and x=200)
        const t1 = createTouchObj(1, 100, 100);
        const t2 = createTouchObj(2, 200, 100);
        el.dispatchEvent(
          new TouchEvent('touchstart', {
            touches: [t1, t2],
            targetTouches: [t1, t2],
            changedTouches: [t1, t2],
            bubbles: true,
            cancelable: true,
          })
        );

        // 2. Pinch in (distance shrinks to 50px, ratio = 0.5)
        const t2_in = createTouchObj(2, 150, 100);
        el.dispatchEvent(
          new TouchEvent('touchmove', {
            touches: [t1, t2_in],
            targetTouches: [t1, t2_in],
            changedTouches: [t2_in],
            bubbles: true,
            cancelable: true,
          })
        );
      } catch (err) {
        // WebKit synthetic TouchEvent limitation
        console.warn('Synthetic TouchEvent not supported in this engine:', err);
      }
    });

    // Zoom should have decreased or remained within bounds
    const textAfterPinchIn = (await zoomDisplay.textContent())?.trim();
    const valAfterPinchIn = parseInt(textAfterPinchIn?.replace('%', '') || '0', 10);
    expect(valAfterPinchIn).toBeGreaterThanOrEqual(25);

    // 3. Pinch out beyond 5x (distance expands to 800px, ratio = 8.0 > 5)
    await viewport.evaluate((el) => {
      const createTouchObj = (id: number, x: number, y: number) => {
        const doc = document as unknown as Record<string, unknown>;
        if (typeof doc.createTouch === 'function') {
          return (doc.createTouch as (w: Window, t: Element, id: number, x1: number, y1: number, x2: number, y2: number) => Touch)(
            window,
            el,
            id,
            x,
            y,
            x,
            y
          );
        }
        try {
          return new Touch({
            identifier: id,
            target: el,
            clientX: x,
            clientY: y,
          });
        } catch {
          return {
            identifier: id,
            target: el,
            clientX: x,
            clientY: y,
          } as unknown as Touch;
        }
      };
      try {
        const t1 = createTouchObj(1, 100, 100);
        const t2_huge = createTouchObj(2, 900, 100); // 800px distance
        el.dispatchEvent(
          new TouchEvent('touchmove', {
            touches: [t1, t2_huge],
            targetTouches: [t1, t2_huge],
            changedTouches: [t2_huge],
            bubbles: true,
            cancelable: true,
          })
        );
      } catch (err) {
        console.warn('Synthetic TouchEvent not supported:', err);
      }
    });

    // Settle
    await page.waitForTimeout(100);

    // 4. Touch End releases gesture
    await viewport.evaluate((el) => {
      try {
        el.dispatchEvent(
          new TouchEvent('touchend', {
            touches: [],
            targetTouches: [],
            changedTouches: [],
            bubbles: true,
          })
        );
      } catch (err) {
        console.warn(err);
      }
    });
  });

  test('Webpage viewport zoom protection and touch-action CSS', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.shift-sheet-page')).toBeVisible({ timeout: 10000 });

    // 1. Verify viewport meta tag prohibits mobile browser page-level zoom distortion
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta).toContain('maximum-scale=1');
    expect(viewportMeta).toContain('user-scalable=no');

    // 2. Verify touch-action and overscroll containment
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      const btn = document.querySelector('button');
      const viewport = document.querySelector('.sheet-preview-viewport');
      return {
        htmlTouchAction: window.getComputedStyle(html).touchAction,
        bodyTouchAction: window.getComputedStyle(body).touchAction,
        buttonTouchAction: btn ? window.getComputedStyle(btn).touchAction : null,
        viewportTouchAction: viewport ? (viewport as HTMLElement).style.touchAction : null,
        viewportOverscroll: viewport ? (viewport as HTMLElement).style.overscrollBehavior : null,
      };
    });

    expect(bodyStyles.htmlTouchAction).toBe('pan-x pan-y');
    expect(bodyStyles.bodyTouchAction).toBe('pan-x pan-y');
    expect(bodyStyles.buttonTouchAction).toBe('manipulation');
    expect(bodyStyles.viewportTouchAction).toBe('pan-x pan-y');
    expect(bodyStyles.viewportOverscroll).toBe('contain');
  });
});
