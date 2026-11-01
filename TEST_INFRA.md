# E2E Test Infra: shift-managers

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Dual-Directional Sheet Zoom (25%-150%) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 2 | Touch & Wheel Zoom Separation | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 3 | Fit-to-Width Zoom Reset | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 4 | Webpage Viewport Zoom Isolation | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 5 | Single-Column Mobile Form Stacking (<400px) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 6 | Mobile BottomSheet Padding & Chips | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 7 | Strict 24h Default Vertical Instructions | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 8 | Strict 24h Time Inputs & Database Storage | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 9 | In-Memory Excel Export (XLSX POST) | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 10 | Print Preview & Vector PDF Fallback | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |

## Test Architecture
- Unit/Integration: `vitest run` (39+ existing unit tests covering models, dates, schemas, db, excel)
- E2E: `@playwright/test` (`npm run test:e2e`) testing viewports (iPhone 12 / 390px, desktop 1440px)
- Static verification: `npx tsc --noEmit` and `npm run lint`

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Mobile staff entry on 320px screen: add employee with CODE, 24h time chips, verify no clipping | F5, F6, F7, F8 | High |
| 2 | Zooming in and out on mobile preview (25% -> 150%) with reset to fit-to-width | F1, F2, F3, F4 | Medium |
| 3 | Exporting Excel workbook from shift with 10+ employees via in-memory POST | F9 | Medium |
| 4 | Generating print preview and vector PDF print dialog without Chromium binary dependency | F10 | Medium |
| 5 | Complete shift creation lifecycle with strict 24h instructions and migration | F7, F8, F9, F10 | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature
- Tier 2: ≥5 per feature (where boundaries exist)
- Tier 3: pairwise coverage of major feature interactions
- Tier 4: ≥5 realistic application scenarios
