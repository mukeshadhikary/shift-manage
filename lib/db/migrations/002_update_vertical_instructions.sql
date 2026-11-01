-- Migration 002: Update vertical instructions to strict 24-hour time format (remove AM/PM)

UPDATE company_settings
SET vertical_instructions = 'スタッフ様自署サイン→弊社社員サイン→各派遣会社様へFAX（翌日9:00までに送付）'
WHERE vertical_instructions LIKE '%AM9:00%';
