import { test, expect } from '@playwright/test';
import { deleteShiftByDate, restoreDefaultSettings } from '../lib/db/repository';
import { getTodayJST } from '../lib/date';

test.describe('Milestone 2: Responsive Mobile Form Layout (No Field Overlap)', () => {
  test.beforeEach(async () => {
    const today = getTodayJST();
    deleteShiftByDate(today);
    deleteShiftByDate('2026-11-20');
    restoreDefaultSettings();
  });

  test('EmployeeForm stacks all 4 input pairs vertically on narrow 320px viewport without overlap', async ({ page }) => {
    // Set viewport to iPhone SE (320px width)
    await page.setViewportSize({ width: 320, height: 667 });
    await page.goto('/');

    // Tap + to open wizard step 1 (renders EmployeeForm)
    const plusButton = page.locator('button[aria-label="シフトを作成"], button[aria-label="スタッフを追加"]').first();
    await plusButton.click();

    await expect(page.locator('text=基本情報')).toBeVisible();

    // 1. CODE & Nickname: must be stacked vertically (grid-cols-1 on mobile)
    const codeInput = page.locator('input[placeholder="例: MS0054"]');
    const nicknameInput = page.locator('input[placeholder="例: タナカ"]');
    await expect(codeInput).toBeVisible();
    await expect(nicknameInput).toBeVisible();

    const codeBox = await codeInput.boundingBox();
    const nicknameBox = await nicknameInput.boundingBox();
    expect(codeBox).not.toBeNull();
    expect(nicknameBox).not.toBeNull();
    if (codeBox && nicknameBox) {
      expect(nicknameBox.y).toBeGreaterThanOrEqual(codeBox.y + codeBox.height - 2);
      expect(codeBox.x + codeBox.width).toBeLessThanOrEqual(320);
      expect(nicknameBox.x + nicknameBox.width).toBeLessThanOrEqual(320);
    }

    // 2. Planned Start & Actual Start: must be stacked vertically
    const plannedStartInput = page.locator('input[type="time"]').nth(0);
    const actualStartInput = page.locator('input[type="time"]').nth(1);
    const plannedStartBox = await plannedStartInput.boundingBox();
    const actualStartBox = await actualStartInput.boundingBox();
    expect(plannedStartBox).not.toBeNull();
    expect(actualStartBox).not.toBeNull();
    if (plannedStartBox && actualStartBox) {
      expect(actualStartBox.y).toBeGreaterThanOrEqual(plannedStartBox.y + plannedStartBox.height - 2);
      expect(plannedStartBox.x + plannedStartBox.width).toBeLessThanOrEqual(320);
      expect(actualStartBox.x + actualStartBox.width).toBeLessThanOrEqual(320);
    }

    // 3. Planned End & Break Time: must be stacked vertically
    const plannedEndInput = page.locator('input[type="time"]').nth(2);
    const breakTimeInput = page.locator('input[placeholder="1:00"]');
    const plannedEndBox = await plannedEndInput.boundingBox();
    const breakTimeBox = await breakTimeInput.boundingBox();
    expect(plannedEndBox).not.toBeNull();
    expect(breakTimeBox).not.toBeNull();
    if (plannedEndBox && breakTimeBox) {
      expect(breakTimeBox.y).toBeGreaterThanOrEqual(plannedEndBox.y + plannedEndBox.height - 2);
      expect(plannedEndBox.x + plannedEndBox.width).toBeLessThanOrEqual(320);
      expect(breakTimeBox.x + breakTimeBox.width).toBeLessThanOrEqual(320);
    }

    // 4. Locker Number & Remarks: must be stacked vertically
    const lockerInput = page.locator('input[placeholder*="なし"]');
    const remarksInput = page.locator('input[placeholder*="指導担当"]');
    const lockerBox = await lockerInput.boundingBox();
    const remarksBox = await remarksInput.boundingBox();
    expect(lockerBox).not.toBeNull();
    expect(remarksBox).not.toBeNull();
    if (lockerBox && remarksBox) {
      expect(remarksBox.y).toBeGreaterThanOrEqual(lockerBox.y + lockerBox.height - 2);
      expect(lockerBox.x + lockerBox.width).toBeLessThanOrEqual(320);
      expect(remarksBox.x + remarksBox.width).toBeLessThanOrEqual(320);
    }

    // 5. Quick chips wrapping: labels are stacked and chips wrap cleanly within 320px
    const startChips = page.locator('button:has-text("08:30"), button:has-text("10:00"), button:has-text("22:00")');
    const chipCount = await startChips.count();
    expect(chipCount).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < chipCount; i++) {
      const box = await startChips.nth(i).boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x + box.width).toBeLessThanOrEqual(320);
      }
    }

    // Tapping a chip updates planned start time
    await page.click('button:has-text("10:00")');
    await expect(plannedStartInput).toHaveValue('10:00');
  });

  test('ShiftCreationWizard Step 2 staff list items gracefully truncate long names without displacing action buttons', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 667 });
    await page.goto('/');

    // Tap + to open wizard
    const plusButton = page.locator('button[aria-label="シフトを作成"], button[aria-label="スタッフを追加"]').first();
    await plusButton.click();

    // Enter very long employee name
    const longName = '極めて長い名前のテスト従業員太郎次郎三郎四郎五郎六郎七郎八郎';
    await page.fill('input[placeholder="例: 田中 太郎"]', longName);
    await page.fill('input[placeholder="例: MS0054"]', 'MS9999');
    await page.click('button:has-text("次へ")');

    // On Step 2: draft list item should display action buttons inside viewport
    await expect(page.locator('text=追加情報・ヘッダー設定')).toBeVisible();

    const deleteBtn = page.locator('button[aria-label="削除"]').first();
    const editBtn = page.locator('button[aria-label="編集"]').first();
    await expect(deleteBtn).toBeVisible();
    await expect(editBtn).toBeVisible();

    const deleteBox = await deleteBtn.boundingBox();
    const editBox = await editBtn.boundingBox();
    expect(deleteBox).not.toBeNull();
    expect(editBox).not.toBeNull();
    if (deleteBox && editBox) {
      expect(deleteBox.x + deleteBox.width).toBeLessThanOrEqual(320);
      expect(editBox.x + editBox.width).toBeLessThanOrEqual(320);
      expect(deleteBox.width).toBeGreaterThanOrEqual(20);
    }
  });

  test('EmployeeForm renders 2-column grid side-by-side on tablet/desktop viewports (>= 640px)', async ({ page }) => {
    // Set viewport to iPad / desktop (768px width)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    const plusButton = page.locator('button[aria-label="シフトを作成"], button[aria-label="スタッフを追加"]').first();
    await plusButton.click();

    const codeInput = page.locator('input[placeholder="例: MS0054"]');
    const nicknameInput = page.locator('input[placeholder="例: タナカ"]');
    await expect(codeInput).toBeVisible();
    await expect(nicknameInput).toBeVisible();

    const codeBox = await codeInput.boundingBox();
    const nicknameBox = await nicknameInput.boundingBox();
    expect(codeBox).not.toBeNull();
    expect(nicknameBox).not.toBeNull();

    if (codeBox && nicknameBox) {
      // On tablet/desktop (>= 640px sm:grid-cols-2), fields are arranged horizontally side-by-side
      expect(Math.abs(codeBox.y - nicknameBox.y)).toBeLessThan(15);
      expect(nicknameBox.x).toBeGreaterThan(codeBox.x + codeBox.width / 2);
    }
  });

  test('HeaderEditModal approval fields stack on mobile and render side-by-side on tablet', async ({ page }) => {
    // Create a shift first
    await page.setViewportSize({ width: 320, height: 667 });
    await page.goto('/');

    const plusButton = page.locator('button[aria-label="シフトを作成"], button[aria-label="スタッフを追加"]').first();
    await plusButton.click();
    await page.fill('input[placeholder="例: 田中 太郎"]', 'ヘッダーテスト');
    await page.click('button:has-text("次へ")');
    await page.click('button:has-text("シフトを登録完了")');
    await expect(page.getByText('保存しました').first()).toBeVisible({ timeout: 5000 });

    // Open More menu and click edit header
    await page.click('button[aria-label="操作"]');
    await page.click('button:has-text("ヘッダーを編集")');

    // On 320px, approval title and position stack vertically
    const approvalTitleInput = page.locator('label', { hasText: '承認欄 組織' }).locator('..').locator('input');
    const approvalPosInput = page.locator('label', { hasText: '承認欄 役職' }).locator('..').locator('input');
    await expect(approvalTitleInput).toBeVisible();
    await expect(approvalPosInput).toBeVisible();

    const titleBoxMobile = await approvalTitleInput.boundingBox();
    const posBoxMobile = await approvalPosInput.boundingBox();
    expect(titleBoxMobile).not.toBeNull();
    expect(posBoxMobile).not.toBeNull();
    if (titleBoxMobile && posBoxMobile) {
      expect(posBoxMobile.y).toBeGreaterThanOrEqual(titleBoxMobile.y + titleBoxMobile.height - 2);
    }

    // Switch to tablet width 768px
    await page.setViewportSize({ width: 768, height: 1024 });
    const titleBoxTablet = await approvalTitleInput.boundingBox();
    const posBoxTablet = await approvalPosInput.boundingBox();
    expect(titleBoxTablet).not.toBeNull();
    expect(posBoxTablet).not.toBeNull();
    if (titleBoxTablet && posBoxTablet) {
      expect(Math.abs(titleBoxTablet.y - posBoxTablet.y)).toBeLessThan(15);
      expect(posBoxTablet.x).toBeGreaterThan(titleBoxTablet.x + titleBoxTablet.width / 2);
    }
  });
});
