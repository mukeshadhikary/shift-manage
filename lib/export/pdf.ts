import { chromium, Browser } from 'playwright';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    });
  }
  return browserInstance;
}

/**
 * Generates an A4 landscape PDF from the /print/[date] route using Playwright Chromium.
 */
export async function generateShiftPdf(
  shiftDate: string,
  serverOrigin: string = 'http://127.0.0.1:3000'
): Promise<Buffer> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1123, height: 794 }, // A4 landscape at 96 DPI
    deviceScaleFactor: 2, // HiDPI rendering
  });

  // Handle optional HTTP Basic auth if APP_PASSWORD is set
  const appPassword = process.env.APP_PASSWORD;
  if (appPassword) {
    await context.setHTTPCredentials({
      username: 'admin',
      password: appPassword,
    });
  }

  const page = await context.newPage();

  try {
    const printUrl = `${serverOrigin}/print/${shiftDate}`;
    await page.goto(printUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for all web fonts (Noto Sans JP) to be fully loaded
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    // Small delay to ensure any CSS animations or layout settling completes
    await page.waitForTimeout(300);

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
    await context.close();
  }
}

/**
 * Clean up browser instance on shutdown if needed.
 */
export async function closePdfBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
