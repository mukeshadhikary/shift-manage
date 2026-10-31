# 勤務シフト表 (Japanese Daily Shift Sheet App)

A specialized Japanese business daily shift management application built for precision, reliability, and Excel-fidelity. Features mobile-first iOS ergonomics, genuine Excel (.xlsx) and vector PDF exports matching Japanese logistics shift sheet specifications.

---

## Features

- **Accurate Japanese Shift Sheet**: Pixel-perfect A4 landscape (297×210mm) shift sheet matching traditional Japanese corporate and logistics standards.
- **Mobile-First iOS Experience**: Native iOS feel with bottom tab navigation (`シフト` / `履歴` / `設定`), spring-like bottom sheets, haptic-friendly tap targets (≥44px), and zoom controls (25–300%).
- **Pure Sheet Model Architecture**: `buildSheetModel` pure function serves as the single source of truth for HTML preview, Playwright Chromium PDF generation, and ExcelJS workbook exports.
- **Reliable Data Storage**: SQLite (via `better-sqlite3`) with WAL journal mode, foreign key enforcement, automatic numbered migrations, and snapshot isolation (settings changes never mutate existing shift snapshots without explicit confirmation).
- **Genuine Exports**:
  - **Excel**: True `.xlsx` with real Excel fractional time formats (`h:mm`), text formats for codes, vertical merged cells (`textRotation: 'vertical'`), alternating row fills, and standard `Yu Gothic` typography.
  - **PDF**: Pixel-accurate vector PDF generated via Playwright Chromium from dedicated `/print/[date]` route with bundled Noto Sans JP fonts.
- **Offline & Zero External Runtime Dependencies**: Bundled local Noto Sans JP font subsets in `/public/fonts` loaded via `@font-face`. Japanese holiday calculation handled offline via `@holiday-jp/holiday_jp`.
- **Data Protection & Backup**:
  - Optional HTTP Basic auth protection via `APP_PASSWORD`.
  - One-click SQLite database backup download in `設定`.

---

## Requirements

- **Node.js**: LTS version (v20 or v22)
- **npm**: v9+
- **Playwright Chromium**: Required for PDF rendering (`npx playwright install chromium`)

---

## Quick Start (Local)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Install Playwright Chromium**:
   ```bash
   npx playwright install chromium
   ```

3. **Build the application**:
   ```bash
   npm run build
   ```

4. **Start the production server**:
   ```bash
   npm start
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Development & Testing Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts development server on port 3000 |
| `npm run build` | Builds the production Next.js application |
| `npm start` | Runs the production server on port 3000 |
| `npm run lint` | Runs ESLint |
| `npm test` | Runs unit & integration tests with Vitest |
| `npm run test:e2e` | Runs Playwright end-to-end acceptance tests |

---

## Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `DATABASE_PATH` | `./data/shift.db` | Path to the SQLite database file |
| `APP_PASSWORD` | *(None / Disabled)* | Optional password to require HTTP Basic Auth for entire app |
| `PORT` | `3000` | Port for the HTTP server |

---

## Docker Deployment (Self-Hosted / VPS)

The app is container-ready with a persistent volume for the SQLite database and pre-installed Chromium dependencies.

1. **Build the image**:
   ```bash
   docker build -t shift-managers .
   ```

2. **Run with a persistent volume**:
   ```bash
   docker run -d \
     -p 3000:3000 \
     -v $(pwd)/data:/app/data \
     -e APP_PASSWORD="your-secure-password" \
     --name shift-app \
     shift-managers
   ```

### Database Backup & Restore
- **Backup**: Simply copy the SQLite file `./data/shift.db` or click "データベースをダウンロード" under `設定` in the app.
- **Restore**: Stop the container/app, replace `./data/shift.db`, and restart.

---

## Deployment Notes (Vercel vs. Self-Hosted)

### Self-Hosted (Primary Target)
This application is designed primarily for **self-hosted Node.js** (personal computer, dedicated VPS, Docker, Railway, or Fly.io with a persistent volume).

### Important Notice Regarding Vercel
- **Database Persistence**: Vercel Serverless Functions have an ephemeral filesystem. Any changes written to a local `./data/shift.db` file will be **lost** between function invocations. To deploy on Vercel, replace `better-sqlite3` with a hosted libSQL database service (such as [Turso](https://turso.tech/)).
- **PDF Generation**: Playwright Chromium binary sizes exceed Vercel standard serverless function bundle limits. For Vercel deployments, PDF generation must use an external browserless service or `@sparticuz/chromium`.

---

## Assumptions

1. **Timezone**: The application operates strictly in `Asia/Tokyo` (JST). Date calculations, "today" detection, and calendar timelines use `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' })` and `Date.UTC` to prevent UTC server offset discrepancies.
2. **Shift Uniqueness**: Each date string (`YYYY-MM-DD`) has at most one shift. Modifying or deleting a date has zero effect on any other date.
3. **Template Defaults**: Default settings are loaded exclusively from `lib/defaults.ts` on first database initialization and during "初期設定に戻す". No hardcoded mock employees are seeded.
4. **Night Shifts**: Shifts spanning past midnight (end time earlier than start time, e.g. 22:00 to 06:00) are fully valid and supported.

---

## Limitations

1. **Browser PDF on Vercel**: Headless Chromium requires a standard Linux container with OS libraries (`libnss3`, etc.) or dedicated VPS/Docker host.
2. **Slanted Header in Excel**: Microsoft Excel (.xlsx specification) does not support drawing non-rectangular clipped vector polygons inside cells. In the generated `.xlsx`, the top banner is rendered as a clean navy frame with cell fills, while the HTML preview and PDF preserve the exact slanted polygon.
