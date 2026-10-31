import { test, expect } from '@playwright/test';
import { deleteShiftByDate, restoreDefaultSettings } from '../lib/db/repository';
import { getTodayJST, addDays } from '../lib/date';

test.describe('Japanese Shift Sheet App - Complete Acceptance Flow', () => {
  test.beforeEach(async () => {
    const today = getTodayJST();
    const yesterday = addDays(today, -1);
    const tomorrow = addDays(today, 1);
    deleteShiftByDate(today);
    deleteShiftByDate(yesterday);
    deleteShiftByDate(tomorrow);
    deleteShiftByDate('2026-11-20');
    restoreDefaultSettings();
  });

  test('1 to 17: Full User Journey and Acceptance Criteria', async ({ page, request, isMobile }) => {
    // 1. Open the app
    await page.goto('/');

    // 2. Today is selected automatically and centered
    await expect(page.locator('h1')).toContainText('勤務シフト表');
    const todayPill = page.locator('button', { hasText: '今日' }).first();
    await expect(todayPill).toBeVisible();

    // 3. Tap the central + button
    const plusButton = page.locator('button[aria-label="シフトを作成"], button[aria-label="スタッフを追加"]').first();
    await expect(plusButton).toBeVisible();
    await plusButton.click();

    // 4. Enter an employee in Step 1
    await expect(page.locator('text=基本情報')).toBeVisible();
    const nameInput = page.locator('input[placeholder="例: 田中 太郎"]');
    await nameInput.fill('田中 太郎');
    await expect(nameInput).toHaveValue('田中 太郎');
    await page.fill('input[placeholder="例: MS0054"]', 'MS0001');
    await page.fill('input[placeholder="例: タナカ"]', 'タナカ');

    // Click '次へ' to add employee and advance to Step 2
    await page.click('button:has-text("次へ")');

    // 5. Add several more employees in Step 2
    await expect(page.locator('text=追加情報・ヘッダー設定')).toBeVisible();
    await expect(page.locator('text=田中 太郎')).toBeVisible();

    // Add 2nd employee
    await page.click('button:has-text("スタッフを追加")');
    await nameInput.fill('佐藤 花子');
    await expect(nameInput).toHaveValue('佐藤 花子');
    await page.fill('input[placeholder="例: MS0054"]', 'MS0002');
    await page.click('button:has-text("次へ")');
    await expect(page.locator('text=佐藤 花子')).toBeVisible();

    // Add 3rd employee (Night shift: 22:00 -> 06:00)
    await page.click('button:has-text("スタッフを追加")');
    await nameInput.fill('鈴木 一郎');
    await expect(nameInput).toHaveValue('鈴木 一郎');
    await page.fill('input[placeholder="例: MS0054"]', 'MS0003');
    // Night shift times
    await page.locator('input[type="time"]').first().fill('22:00');
    await page.locator('input[type="time"]').nth(2).fill('06:00');
    await page.click('button:has-text("次へ")');
    await expect(page.locator('text=鈴木 一郎')).toBeVisible();

    // 6. Finish the wizard
    await page.click('button:has-text("シフトを登録完了")');

    // 7. The Japanese shift sheet appears automatically
    await expect(page.getByText('保存しました').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.shift-sheet-page')).toBeVisible();
    await expect(page.getByText('ワールドワークス', { exact: true })).toBeVisible();
    await expect(page.locator('text=田中 太郎')).toBeVisible();
    await expect(page.locator('text=佐藤 花子')).toBeVisible();
    await expect(page.locator('text=鈴木 一郎')).toBeVisible();

    // 8. Edit an employee
    // Switch to list view or click employee row
    await page.click('button[aria-label="リスト"]');
    await expect(page.locator('text=田中 太郎')).toBeVisible();
    const editBtn = page.locator('button[aria-label="編集"]').first();
    await editBtn.click();

    // Update nickname
    await page.fill('input[placeholder="例: タナカ"]', 'タナカ更新');
    await page.click('button:has-text("保存")');
    await expect(page.getByText('保存しました').first()).toBeVisible();
    await expect(page.locator('text=（タナカ更新）')).toBeVisible();

    // 9. Add another employee from list view
    await page.click('button:has-text("スタッフを追加")');
    await nameInput.fill('高橋 次郎');
    await expect(nameInput).toHaveValue('高橋 次郎');
    await page.click('button:has-text("保存")');
    await expect(page.getByText('保存しました').first()).toBeVisible();
    await expect(page.locator('text=高橋 次郎')).toBeVisible();

    // Switch back to sheet view
    await page.click('button:has-text("シート")');
    await expect(page.locator('text=高橋 次郎')).toBeVisible();

    // 10. Change company information in 設定
    await page.locator('button:has-text("設定")').filter({ visible: true }).first().click();
    await expect(page.locator('text=今後の新規シフトに適用される標準設定')).toBeVisible();

    // Update document title
    const docTitleInput = page.locator('label', { hasText: '文書タイトル' }).locator('..').locator('input');
    await docTitleInput.fill('ワールドワークス改');

    // 11. Save settings (select '今後のシフトのみ' when asked)
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=表示中の日付のシフトにも反映しますか？')).toBeVisible();
    await page.click('button:has-text("今後のシフトのみ")');

    // Return to shift view: current shift still has original title!
    await page.locator('button:has-text("シフト")').filter({ visible: true }).first().click();
    await expect(page.getByText('ワールドワークス', { exact: true })).toBeVisible();

    // 12. Zoom in (disabled per requirement), out and reset
    const zoomInBtn = page.locator('button[aria-label="拡大"]');
    const zoomOutBtn = page.locator('button[aria-label="縮小"]');
    const resetBtn = page.locator('button[aria-label="リセット"]');

    await expect(zoomInBtn).toBeDisabled();
    await zoomOutBtn.click();
    await resetBtn.click();

    // 13. Export genuine Excel file (.xlsx)
    const exportBtn = page.locator('button[aria-label="出力"]');
    await exportBtn.click();
    const excelLink = page.locator('a:has-text("Excel出力")');
    await expect(excelLink).toBeVisible();
    const excelHref = await excelLink.getAttribute('href');
    expect(excelHref).toContain('/xlsx');

    const xlsxRes = await request.get(excelHref!);
    expect(xlsxRes.status()).toBe(200);
    expect(xlsxRes.headers()['content-type']).toContain('spreadsheetml');
    expect(xlsxRes.headers()['content-disposition']).toContain(encodeURIComponent('勤務シフト表.xlsx'));

    // 14. Export genuine PDF (.pdf)
    const pdfLink = page.locator('a:has-text("PDF出力")');
    await expect(pdfLink).toBeVisible();
    const pdfHref = await pdfLink.getAttribute('href');
    expect(pdfHref).toContain('/pdf');

    const pdfRes = await request.get(pdfHref!);
    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()['content-type']).toBe('application/pdf');
    expect(pdfRes.headers()['content-disposition']).toContain(encodeURIComponent('勤務シフト表.pdf'));

    // If on desktop, also test the browser download trigger
    if (!isMobile) {
      const [excelDownload] = await Promise.all([
        page.waitForEvent('download'),
        excelLink.click(),
      ]);
      expect(excelDownload.suggestedFilename()).toContain('.xlsx');
      await exportBtn.click();
      const [pdfDownload] = await Promise.all([
        page.waitForEvent('download'),
        pdfLink.click(),
      ]);
      expect(pdfDownload.suggestedFilename()).toContain('.pdf');
    }

    // 15. Go to yesterday and see its own shift (or empty state)
    await page.click('button:has-text("前日")');
    await expect(page.locator('text=シフトがありません')).toBeVisible();

    // 16. Go to tomorrow and create a different shift
    await page.click('button:has-text("翌日")'); // back to today
    await page.click('button:has-text("翌日")'); // to tomorrow
    await expect(page.locator('text=シフトがありません')).toBeVisible();

    // Copy from previous day (copies today's shift!)
    await page.click('button:has-text("前日のシフトをコピー")');
    await expect(page.locator('text=前日のシフトをコピーしました')).toBeVisible();
    await expect(page.locator('.shift-sheet-page')).toBeVisible();
    await expect(page.locator('text=田中 太郎')).toBeVisible();

    // 17. Reload: all data is still there
    await page.reload();
    await expect(page.locator('.shift-sheet-page')).toBeVisible();
    await expect(page.locator('text=田中 太郎')).toBeVisible();
  });
});
