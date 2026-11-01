import { test, expect } from '@playwright/test';
import ExcelJS from 'exceljs';
import { deleteShiftByDate, restoreDefaultSettings } from '../lib/db/repository';

test.describe('Extra Checks: 12+ Staff Pagination & Exports', () => {
  test.beforeEach(async () => {
    restoreDefaultSettings();
    deleteShiftByDate('2026-11-20');
  });
  test('18 to 21: 12+ employees pagination and export verification', async ({ request, page }) => {
    const testDate = '2026-11-20';

    // 18. Create shift with 12 employees via wizard or direct API/page
    await page.goto(`/?date=${testDate}`);

    const createBtn = page.locator('button:has-text("シフトを作成")').first();
    await createBtn.click();

    await expect(page.locator('text=基本情報')).toBeVisible();
    const nameInput = page.locator('input[placeholder="例: 田中 太郎"]');

    // Add 1st employee
    await nameInput.fill('スタッフ 1');
    await expect(nameInput).toHaveValue('スタッフ 1');
    await page.click('button:has-text("次へ")');
    await expect(page.getByText('スタッフ 1', { exact: true }).first()).toBeVisible();

    // Add 11 more employees (total 12)
    for (let i = 2; i <= 12; i++) {
      await page.click('button:has-text("スタッフを追加")');
      await nameInput.fill(`スタッフ ${i}`);
      await expect(nameInput).toHaveValue(`スタッフ ${i}`);
      await page.click('button:has-text("次へ")');
      await expect(page.getByText(`スタッフ ${i}`, { exact: true }).first()).toBeVisible();
    }

    await page.click('button:has-text("シフトを登録完了")');
    await expect(page.getByText('保存しました').first()).toBeVisible({ timeout: 5000 });

    // Verify 2 pages in preview
    await expect(page.locator('.shift-sheet-page')).toHaveCount(2);
    await expect(page.locator('text=1 / 2')).toBeVisible();
    await expect(page.locator('text=2 / 2')).toBeVisible();

    // 19. Check Excel export has 2 worksheets
    const xlsxRes = await request.get(`/api/shifts/${testDate}/xlsx`);
    expect(xlsxRes.status()).toBe(200);

    const xlsxBuffer = await xlsxRes.body();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(xlsxBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    expect(workbook.worksheets).toHaveLength(2);

    // 20. Check PDF export has 200 status and Japanese Content-Disposition
    const pdfRes = await request.get(`/api/shifts/${testDate}/pdf`);
    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()['content-type']).toBe('application/pdf');

    const contentDisposition = pdfRes.headers()['content-disposition'];
    expect(contentDisposition).toContain('filename*=UTF-8');
    expect(contentDisposition).toContain(encodeURIComponent('勤務シフト表.pdf'));

    // Check PDF size is genuine (> 10KB)
    const pdfBuffer = await pdfRes.body();
    expect(pdfBuffer.length).toBeGreaterThan(10000);

    // Verify PDF has exactly 2 pages
    const pdfText = pdfBuffer.toString('latin1');
    const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);
    expect(pageMatches).not.toBeNull();
    expect(pageMatches?.length).toBe(2);
  });

  test('date navigation does not leak shift data to empty dates', async ({ page }) => {
    // 2026-11-20 has a shift from previous test or can be created
    await page.goto('/?date=2026-11-20');
    // Navigate to an empty date
    await page.goto('/?date=2026-11-21');
    await expect(page.locator('text=シフトがありません')).toBeVisible();
    await expect(page.locator('.shift-sheet-page')).not.toBeVisible();
  });
});
