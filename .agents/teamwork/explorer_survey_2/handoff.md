# R3: Strict 24-Hour Time Format Throughout the Application — Investigation & Survey Report

**Explorer**: Survey Explorer 2  
**Date**: 2026-10-31  
**Project Root**: `/Users/mukesh/Documents/Projects/shift-managers`  
**Working Directory**: `/Users/mukesh/Documents/Projects/shift-managers/.agents/teamwork/explorer_survey_2`  

---

## 1. Observation

### 1.1 Occurrence of 12-Hour AM/PM in Source Code
An exhaustive search across the entire project repository (excluding `node_modules` and `package-lock.json`) for patterns matching `AM`, `PM`, `午前`, `午後`, `12時間`, and `24時間` revealed **exactly one location** in code where 12-hour AM/PM notation appears:

- **File**: `lib/defaults.ts`
  - **Line 37**:
    ```typescript
    export const DEFAULT_HEADER_SNAPSHOT: HeaderSnapshot = {
      title: 'ワールドワークス',
      companyName: 'ワールドワークスCMC',
      managerName: '島津 様',
      faxNumber: '049-293-7855',
      transmissionInstructions: '❶派遣会社様 → ❷丸和運輸機関 → ❸派遣会社様',
      verticalInstructions: 'スタッフ様自署サイン→弊社社員サイン→各派遣会社様へFAX（翌日AM9:00までに送付）',
      approvalTitle: '丸和運輸機関',
      approvalPosition: 'センター長',
      columnLabels: [...DEFAULT_COLUMN_LABELS],
      additionalNotes: null,
    };
    ```
  - **Line 69**:
    ```typescript
    export const DEFAULT_COMPANY_SETTINGS: CompanySettingsRow = {
      // ...
      vertical_instructions: DEFAULT_HEADER_SNAPSHOT.verticalInstructions,
      // ...
    };
    ```
  Observation: Line 37 contains `'スタッフ様自署サイン→弊社社員サイン→各派遣会社様へFAX（翌日AM9:00までに送付）'`. It must be changed to `'スタッフ様自署サイン→弊社社員サイン→各派遣会社様へFAX（翌日9:00までに送付）'`.

### 1.2 Occurrences in Persistent SQLite Database (`data/shift.db`)
Running SQL queries against the local `data/shift.db`:
```bash
sqlite3 data/shift.db "SELECT id, vertical_instructions FROM company_settings;"
```
Result:
```
1|スタッフ様自署サイン→弊社社員サイン→各派遣会社様へFAX（翌日AM9:00までに送付）
```

Querying `daily_shifts`:
```bash
sqlite3 data/shift.db "SELECT id, shift_date, header_snapshot LIKE '%AM9:00%' FROM daily_shifts;"
```
Result:
```
126|2026-11-01|1
127|2026-11-02|1
```
Querying `PRAGMA user_version`:
```bash
sqlite3 data/shift.db "PRAGMA user_version;"
```
Result:
```
1
```
Observation: The existing SQLite database on disk currently stores `AM9:00` in `company_settings.vertical_instructions` and in `daily_shifts.header_snapshot`.

### 1.3 Database Migration Architecture (`lib/db/index.ts`)
- In `lib/db/migrations/`, only `001_initial.sql` exists.
- In `lib/db/index.ts` (lines 66–97):
  ```typescript
  function runMigrations(db: Database.Database): void {
    const currentVersionRow = db.prepare('PRAGMA user_version').get() as { user_version: number };
    let currentVersion = currentVersionRow ? currentVersionRow.user_version : 0;
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      applyMigration001(db);
      return;
    }
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const versionMatch = file.match(/^(\d+)_/);
      if (!versionMatch) continue;
      const fileVersion = parseInt(versionMatch[1], 10);
      if (fileVersion > currentVersion) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        const applyTx = db.transaction(() => {
          db.exec(sql);
          db.pragma(`user_version = ${fileVersion}`);
        });
        applyTx();
        currentVersion = fileVersion;
      }
    }
  }
  ```
- In `lib/db/index.ts` (lines 172–220): `seedDefaults(db)` only inserts rows when `company_settings` or `design_settings` is empty (`count === 0`).
- Observation: Existing databases with `user_version = 1` will NOT update `company_settings` or `daily_shifts` unless a migration `002_update_vertical_instructions.sql` is provided. Additionally, in bundled environments where `migrationsDir` does not exist at runtime, `lib/db/index.ts` needs a fallback `applyMigration002(db)`.

### 1.4 Time Utilities (`lib/date.ts` and `lib/date.test.ts`)
`lib/date.ts` provides two formatting helpers:
- `formatTimeHM(timeStr)` (lines 120–129):
  Converts `"09:00"` to `"9:00"`, `"18:00"` to `"18:00"`, `"00:30"` to `"0:30"`.
- `formatTime24H(timeStr)` (lines 134–143):
  Converts `"9:00"` to `"09:00"`, `"09:00"` to `"09:00"`, `"18:00"` to `"18:00"`, `"0:30"` to `"00:30"`.
- `parseTimeToMinutes(timeStr)` (lines 148–156):
  Parses `"H:mm"` or `"HH:mm"` into integer minutes (e.g. `"9:00"` -> 540).
- `timeToExcelFraction(timeStr)` (lines 161–165):
  Converts `"H:mm"` / `"HH:mm"` into Excel fraction of a 24-hour day (`minutes / 1440`).
- Tested thoroughly in `lib/date.test.ts` (lines 89–114). All pass cleanly.

### 1.5 Validation Schemas (`lib/db/schema.ts` and `lib/db/schema.test.ts`)
In `lib/db/schema.ts`:
- Line 3: `const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;`
- Line 15: `const breakTimeRegex = /^([0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;`
Observation:
Both regexes enforce strict 24-hour time notation (`00:00` - `23:59`). They strictly reject 12-hour strings (`9:00 AM`, `09:00 PM`, `午前9:00`).

### 1.6 Time Pickers and Quick Selection Chips (`components/employee/EmployeeForm.tsx`)
In `components/employee/EmployeeForm.tsx`:
- Line 32: `const COMMON_START_TIMES = ['08:30', '09:00', '10:00', '13:00', '22:00'];`
- Line 33: `const COMMON_END_TIMES = ['17:30', '18:00', '19:00', '22:00', '06:00'];`
- Line 34: `const BREAK_TIME_CHIPS = [ja.common.none, '0:30', '1:00', '1:30', '2:00'];`
- Line 52–54:
  ```typescript
  const [plannedStartTime, setPlannedStartTime] = useState(initialData?.planned_start_time || '09:00');
  const [actualStartTime, setActualStartTime] = useState(initialData?.actual_start_time || '');
  const [plannedEndTime, setPlannedEndTime] = useState(initialData?.planned_end_time || '18:00');
  ```
- Lines 277–294, 326–332: Inputs use `<input type="time" step="300" ... />`.
- Lines 307–309: Active chip check: `plannedStartTime === t` where `t` is `'09:00'`.
- Lines 357–359: Active chip check: `plannedEndTime === t` where `t` is `'18:00'`.
- Lines 127–129:
  ```typescript
  planned_start_time: plannedStartTime ? formatTimeHM(plannedStartTime) : null,
  actual_start_time: actualStartTime ? formatTimeHM(actualStartTime) : null,
  planned_end_time: plannedEndTime ? formatTimeHM(plannedEndTime) : null,
  ```

**Important Observation / Bug Vector**:
In HTML5, `<input type="time">` requires a strict `HH:mm` format with a 2-digit hour (`09:00`). If `plannedStartTime` is set to `"9:00"`, WebKit (iOS Safari) and Blink (Chrome) fail to parse the value and render an empty input (`--:--`).
Furthermore, if `initialData?.planned_start_time` is `"9:00"`, the chip comparison `plannedStartTime === '09:00'` evaluates to `false`, causing the `"09:00"` chip not to be highlighted.
Using `formatTime24H` to normalize the input values and the chip comparisons ensures reliable input binding and visual highlight.

### 1.7 Displays and Views
- **Shift Sheet Preview (`components/sheet/ShiftSheetPage.tsx` and `lib/sheet/index.ts`)**:
  - `lib/sheet/index.ts` (lines 281–304): Formats cell text with `formatTimeHM(employee?.planned_start_time)`.
  - Result: Displays `9:00`, `18:00`, `22:00`, `0:30` (clean 24-hour format).
  - Vertical text uses `headerSnapshot.verticalInstructions` directly.
- **Employee List (`components/employee/EmployeeList.tsx`)**:
  - Line 118: Displays `{emp.planned_start_time ? formatTimeHM(emp.planned_start_time) : '--:--'} 〜 {emp.planned_end_time ? formatTimeHM(emp.planned_end_time) : '--:--'}`.
  - Strict 24-hour notation.
- **Shift Creation Wizard (`components/wizard/ShiftCreationWizard.tsx`)**:
  - Line 260: Displays `{emp.planned_start_time || '--:--'} 〜 {emp.planned_end_time || '--:--'}`.
  - Strict 24-hour notation.
- **Excel Exporter (`lib/export/excel.ts`)**:
  - Lines 285–288:
    ```typescript
    if (cell.isTime && cell.timeFraction !== null) {
      xlCell.value = cell.timeFraction;
      xlCell.numFmt = 'h:mm';
    }
    ```
    In ExcelJS and Microsoft Excel, `numFmt = 'h:mm'` formats the value as a 24-hour time (e.g. `9:00`, `18:00`). Excel only produces 12-hour format if `AM/PM` is explicitly part of the format string (e.g. `h:mm AM/PM`).
- **PDF Exporter (`lib/export/pdf.ts`)**:
  - Renders the exact `/print/[date]` page using `ShiftSheetPage`, which reflects `buildSheetModel`.

### 1.8 Test Suite Audit
Running `npm test` executes Vitest across 5 test files (39 tests total):
```
✓ lib/sheet/sheet.test.ts (8 tests)
✓ lib/date.test.ts (11 tests)
✓ lib/db/schema.test.ts (5 tests)
✓ lib/db/repository.test.ts (11 tests)
✓ lib/export/excel.test.ts (4 tests)
Test Files 5 passed (5), Tests 39 passed (39)
```
- No existing tests fail if `lib/defaults.ts` is changed to `翌日9:00までに送付`.
- `lib/export/excel.test.ts:87` only tests `expect(String(vertCell.value)).toContain('↓');`.
- A specific regression test asserting that default vertical instructions contain `翌日9:00までに送付` and no `AM`/`PM` should be added to `lib/sheet/sheet.test.ts` or `lib/db/repository.test.ts`.

---

## 2. Logic Chain

1. **Premise**: Requirement R3 states: "Eliminate any 12-hour AM/PM format everywhere in the app: Update default vertical instructions in `lib/defaults.ts` and migrations: replace `翌日AM9:00までに送付` with `翌日9:00までに送付`. Ensure all time inputs, display previews, and quick selection chips consistently use 24-hour time notation (`HH:mm` / `H:mm` e.g. `09:00`, `18:00`, `22:00`)."
2. **From Observation 1.1**: `lib/defaults.ts:37` is the single source of truth for the default vertical instructions string:
   `verticalInstructions: 'スタッフ様自署サイン→弊社社員サイン→各派遣会社様へFAX（翌日AM9:00までに送付）',`
   Updating this line to `翌日9:00までに送付` directly satisfies the default string requirement and propagates to `DEFAULT_COMPANY_SETTINGS.vertical_instructions` (line 69).
3. **From Observation 1.2 & 1.3**: Existing SQLite databases on disk (such as `./data/shift.db`) already have `AM9:00` seeded in `company_settings` (ID 1) and in `daily_shifts.header_snapshot`. Because `seedDefaults()` does not overwrite existing rows, a new migration file `002_update_vertical_instructions.sql` and corresponding inline fallback in `lib/db/index.ts` is necessary to update existing data to `user_version = 2`.
4. **From Observation 1.4, 1.5, 1.6 & 1.7**: All time pickers, display previews, and quick selection chips across `EmployeeForm`, `EmployeeList`, `ShiftCreationWizard`, `ShiftSheetPage`, Excel, and PDF already utilize 24-hour notation (`HH:mm` and `H:mm`).
5. **From Observation 1.6**: An input-binding subtlety exists where `<input type="time">` requires 2-digit hour format `HH:mm`. If `planned_start_time` is loaded as `"9:00"`, the browser will fail to bind it. Normalizing `plannedStartTime` and `plannedEndTime` using `formatTime24H()` when initializing and matching chips in `EmployeeForm.tsx` ensures 100% reliable 24-hour time input behavior.
6. **From Observation 1.8**: Vitest passes cleanly (39/39 tests). Adding an assertion for `DEFAULT_HEADER_SNAPSHOT.verticalInstructions` will lock in the 24-hour requirement and prevent regression.

---

## 3. Caveats

- **Existing Custom User Settings**: If a user previously manually typed their own custom vertical instructions in `SettingsView` without `AM9:00`, a SQL `replace(vertical_instructions, '翌日AM9:00までに送付', '翌日9:00までに送付')` will safely leave custom text intact while only substituting the exact default phrase.
- **Night Shifts Across Midnight**: Night shifts (e.g. `22:00` -> `06:00`) are already fully supported by the schema and tested in `repository.test.ts:140`. The 24-hour convention handles midnight crossing cleanly without requiring AM/PM designation.
- **No other caveats**: The codebase is compact, highly organized, and has no hidden external localization dependencies.

---

## 4. Conclusion & Actionable Recommendations

### Target Changes Summary Table

| File | Lines | Proposed Change | Purpose |
| :--- | :--- | :--- | :--- |
| `lib/defaults.ts` | 37 | Change `翌日AM9:00までに送付` to `翌日9:00までに送付` | Eliminate AM/PM in default vertical instructions (R3 core requirement) |
| `lib/db/migrations/002_update_vertical_instructions.sql` | New | SQL update for `company_settings` and `daily_shifts` | Migrate existing SQLite databases to remove AM9:00 |
| `lib/db/index.ts` | 74, 99–167 | Add fallback `applyMigration002(db)` | Ensure migrations run in bundled environments where `.sql` files are omitted |
| `components/employee/EmployeeForm.tsx` | 52–54, 99–108, 307, 357 | Wrap `initialData` start/end times in `formatTime24H()` and compare chips using `formatTime24H()` | Ensure `<input type="time">` always receives valid `HH:mm` format and chips highlight properly |
| `lib/db/repository.test.ts` or `lib/sheet/sheet.test.ts` | New test | Assert `DEFAULT_HEADER_SNAPSHOT.verticalInstructions` contains `翌日9:00までに送付` and rejects `AM` or `PM` | Unit test coverage for R3 acceptance criteria |

### Detailed Code Modifications

#### 1. `lib/defaults.ts` (Line 37)
```diff
--- a/lib/defaults.ts
+++ b/lib/defaults.ts
@@ -34,7 +34,7 @@ export const DEFAULT_HEADER_SNAPSHOT: HeaderSnapshot = {
   managerName: '島津 様',
   faxNumber: '049-293-7855',
   transmissionInstructions: '❶派遣会社様 → ❷丸和運輸機関 → ❸派遣会社様',
-  verticalInstructions: 'スタッフ様自署サイン→弊社社員サイン→各派遣会社様へFAX（翌日AM9:00までに送付）',
+  verticalInstructions: 'スタッフ様自署サイン→弊社社員サイン→各派遣会社様へFAX（翌日9:00までに送付）',
   approvalTitle: '丸和運輸機関',
   approvalPosition: 'センター長',
   columnLabels: [...DEFAULT_COLUMN_LABELS],
```

#### 2. `lib/db/migrations/002_update_vertical_instructions.sql` (New File)
```sql
-- Migration 002: Update default vertical instructions to strict 24-hour format
UPDATE company_settings
SET vertical_instructions = replace(vertical_instructions, '翌日AM9:00までに送付', '翌日9:00までに送付')
WHERE vertical_instructions LIKE '%AM9:00%';

UPDATE daily_shifts
SET header_snapshot = replace(header_snapshot, '翌日AM9:00までに送付', '翌日9:00までに送付')
WHERE header_snapshot LIKE '%AM9:00%';
```

#### 3. `lib/db/index.ts`
Add `applyMigration002(db)`:
```typescript
function applyMigration002(db: Database.Database): void {
  const currentVersionRow = db.prepare('PRAGMA user_version').get() as { user_version: number };
  const currentVersion = currentVersionRow ? currentVersionRow.user_version : 0;
  if (currentVersion >= 2) return;

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE company_settings
      SET vertical_instructions = replace(vertical_instructions, '翌日AM9:00までに送付', '翌日9:00までに送付')
      WHERE vertical_instructions LIKE '%AM9:00%';
    `).run();

    db.prepare(`
      UPDATE daily_shifts
      SET header_snapshot = replace(header_snapshot, '翌日AM9:00までに送付', '翌日9:00までに送付')
      WHERE header_snapshot LIKE '%AM9:00%';
    `).run();

    db.pragma('user_version = 2');
  });
  tx();
}
```
And in `runMigrations(db)`:
```typescript
  if (!fs.existsSync(migrationsDir)) {
    applyMigration001(db);
    applyMigration002(db);
    return;
  }
```

#### 4. `components/employee/EmployeeForm.tsx`
Import `formatTime24H` and initialize time inputs:
```diff
--- a/components/employee/EmployeeForm.tsx
+++ b/components/employee/EmployeeForm.tsx
@@ -1,7 +1,7 @@
 import React, { useState, useEffect } from 'react';
 import type { EmployeeInput } from '@/lib/db/schema';
 import { ja } from '@/lib/i18n/ja';
-import { formatTimeHM } from '@/lib/date';
+import { formatTimeHM, formatTime24H } from '@/lib/date';
 import { ArrowUp, ArrowDown, Trash2, Sparkles } from 'lucide-react';
 import { fetchStaffSuggestionsAction, searchStaffSuggestionsAction } from '@/app/actions';
@@ -49,9 +49,9 @@ export function EmployeeForm({
   const [name, setName] = useState(initialData?.employee_name || '');
   const [code, setCode] = useState(initialData?.employee_code || '');
   const [nickname, setNickname] = useState(initialData?.nickname || '');
   const [remarks, setRemarks] = useState(initialData?.remarks || '');
-  const [plannedStartTime, setPlannedStartTime] = useState(initialData?.planned_start_time || '09:00');
-  const [actualStartTime, setActualStartTime] = useState(initialData?.actual_start_time || '');
-  const [plannedEndTime, setPlannedEndTime] = useState(initialData?.planned_end_time || '18:00');
+  const [plannedStartTime, setPlannedStartTime] = useState(formatTime24H(initialData?.planned_start_time) || '09:00');
+  const [actualStartTime, setActualStartTime] = useState(formatTime24H(initialData?.actual_start_time) || '');
+  const [plannedEndTime, setPlannedEndTime] = useState(formatTime24H(initialData?.planned_end_time) || '18:00');
   const [breakTime, setBreakTime] = useState(initialData?.break_time || '1:00');
@@ -100,8 +100,8 @@ export function EmployeeForm({
     setName(s.employee_name);
     if (s.employee_code) setCode(s.employee_code);
     if (s.nickname) setNickname(s.nickname);
-    if (s.planned_start_time) setPlannedStartTime(s.planned_start_time);
-    if (s.planned_end_time) setPlannedEndTime(s.planned_end_time);
+    if (s.planned_start_time) setPlannedStartTime(formatTime24H(s.planned_start_time));
+    if (s.planned_end_time) setPlannedEndTime(formatTime24H(s.planned_end_time));
     if (s.break_time) setBreakTime(s.break_time);
     if (s.locker_number) setLockerNumber(s.locker_number);
     setShowSuggestions(false);
@@ -304,7 +304,7 @@ export function EmployeeForm({
             <button
               key={t}
               type="button"
               onClick={() => setPlannedStartTime(t)}
               className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
-                plannedStartTime === t
+                formatTime24H(plannedStartTime) === t
                   ? 'bg-[#0F2A66] text-white border-[#0F2A66]'
                   : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
               }`}
@@ -354,7 +354,7 @@ export function EmployeeForm({
             <button
               key={t}
               type="button"
               onClick={() => setPlannedEndTime(t)}
               className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
-                plannedEndTime === t
+                formatTime24H(plannedEndTime) === t
                   ? 'bg-[#0F2A66] text-white border-[#0F2A66]'
                   : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
               }`}
```

#### 5. `lib/db/repository.test.ts`
Add unit assertion:
```typescript
  it('enforces strict 24-hour vertical instructions without AM or PM', () => {
    expect(DEFAULT_HEADER_SNAPSHOT.verticalInstructions).toContain('翌日9:00までに送付');
    expect(DEFAULT_HEADER_SNAPSHOT.verticalInstructions).not.toMatch(/AM|PM|午前|午後/);
  });
```

---

## 5. Verification Method

### 5.1 Verification Commands
1. **Search for any remaining AM/PM references in source code**:
   ```bash
   grep -rn "AM[0-9]\|[0-9]AM\|[0-9]\s*AM\|[0-9]\s*PM\|午前\|午後" lib/ components/ app/
   ```
   *Expected outcome*: Zero matches.

2. **Verify SQLite migration on existing database**:
   ```bash
   sqlite3 data/shift.db "SELECT id, vertical_instructions FROM company_settings;"
   ```
   *Expected outcome*:
   `1|スタッフ様自署サイン→弊社社員サイン→各派遣会社様へFAX（翌日9:00までに送付）`

3. **Verify Vitest Unit & Integration Test Suite**:
   ```bash
   npm test
   ```
   *Expected outcome*: All 39+ tests pass with 0 failures.

4. **Verify TypeScript Typecheck & Build**:
   ```bash
   npm run build
   ```
   *Expected outcome*: Next.js build succeeds with 0 type errors.

### 5.2 Invalidation Conditions
This investigation's findings would be invalidated if:
- Any 3rd party component or calendar plugin is introduced that formats times according to the browser's local 12-hour AM/PM locale settings instead of `formatTime24H` / `formatTimeHM`.
- Database initialization is bypassed or uses an unmigrated raw SQLite dump without executing `runMigrations`.
