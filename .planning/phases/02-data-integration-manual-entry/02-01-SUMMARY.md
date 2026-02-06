---
phase: 02-data-integration-manual-entry
plan: 01
subsystem: backend-infrastructure
tags: [excel-import, validation, parsers, server-actions, trpc, exceljs]

requires:
  - 01-01: Database schema with forecasts and order tables
  - 01-02: Auth.js for session management in Server Actions

provides:
  - Excel parsing infrastructure for 3 formats (RTL, HOP, RETAIL_SALES)
  - Validation layer checking SKUs/retailers against master data
  - Batch upsert service with conflict handling
  - Server Actions for file upload with security re-validation
  - tRPC routers for forecast/sales queries and order management

affects:
  - 02-02: Import wizard will consume Server Actions and validation results
  - 02-03: Manual entry forms will use orders tRPC router
  - 03-xx: Dashboard will query forecasts and sales via import router

tech-stack:
  added:
    - exceljs@4.x: Excel parsing with workbook/worksheet API
    - react-hook-form@7.x: Form state management (Wave 2 prep)
    - react-dropzone@14.x: File upload UI component (Wave 2 prep)
  patterns:
    - Server Action file validation: size, MIME type, PK zip signature
    - Security re-validation pattern: commit actions verify IDs against DB
    - Date serialization: Server Actions return ISO strings (JSON limitation)
    - Batch upsert: onConflictDoUpdate on unique constraints (skuId, retailerId, month)
    - Transaction-based multi-table inserts: PO/retail order + line items

key-files:
  created:
    - src/server/services/parsers/format-detector.ts: Routes RTL/HOP/RETAIL_SALES
    - src/server/services/parsers/rtl-forecast.ts: Monthly PO sheet parser
    - src/server/services/parsers/hop-forecast.ts: Product-centric parser
    - src/server/services/parsers/retail-sales.ts: Flexible column mapper
    - src/server/services/validators/forecast-validator.ts: SKU/retailer existence checks
    - src/server/services/validators/sales-validator.ts: Sales row validation
    - src/server/services/import-service.ts: Batch upsert with conflict handling
    - src/server/actions/import-forecast.ts: Forecast file upload Server Action
    - src/server/actions/import-sales.ts: Sales file upload Server Action
    - src/server/api/routers/import.ts: Forecast and sales query endpoints
    - src/server/api/routers/orders.ts: PO and retail order CRUD with line items
    - src/components/ui/scroll-area.tsx: shadcn component (Wave 2 prep)
    - src/components/ui/progress.tsx: shadcn component (Wave 2 prep)
    - src/components/ui/select.tsx: shadcn component (Wave 2 prep)
  modified:
    - package.json: +exceljs, +react-hook-form, +@hookform/resolvers, +react-dropzone
    - next.config.ts: Server Actions bodySizeLimit: 10mb
    - src/server/db/schema.ts: +retailSales table with unique constraint
    - src/server/api/root.ts: +import router, +orders router

decisions:
  - Excel-first approach: Start with manual file uploads before SellerCloud API (API credentials pending)
  - 3 format support: RTL FORECAST_MASTER, HOP product-centric, retail sales (flexible column mapping)
  - Security re-validation: Commit actions re-check IDs to prevent client tampering
  - Date serialization: Server Actions convert Date to ISO string for JSON wire transfer
  - Batch processing: 100 rows per batch to avoid oversized database queries
  - HOP parser flexibility: Unknown exact format, parser adapts to "Retailer - Month" or simple retailer columns

metrics:
  duration: 10min
  completed: 2026-02-06
---

# Phase 2 Plan 1: Backend Infrastructure Summary

**One-liner:** Complete Excel parsing, validation, and import infrastructure with ExcelJS parsers (RTL/HOP/sales), Zod validators, batch upsert service, secure Server Actions, and tRPC routers for queries and order management.

## Objective Achieved

Built the complete server-side backend for Phase 2 data integration. All Excel import logic, validation, database upserts, and query endpoints are now in place. Wave 2 plans (import wizard UI and manual entry forms) can consume this infrastructure immediately.

## What Was Built

### Excel Parsing Layer
- **Format detector** routes RTL_FORECAST, HOP_FORECAST, or RETAIL_SALES based on sheet names and headers
- **RTL parser** extracts forecasts from monthly PO sheets (e.g., "Jan 2026 PO", "Feb 2026 PO") with retailer rows and SKU columns
- **HOP parser** handles product-centric format with flexible "Retailer - Month" column detection (adaptable to unknown layouts)
- **Retail sales parser** maps flexible column headers (SKU, Retailer, Month, Units Sold, Revenue) to structured data

### Validation Layer
- **Forecast validator** checks SKU/retailer existence (case-insensitive), validates date ranges (±2 years), positive units, and detects batch duplicates
- **Sales validator** applies same pattern for retail sales with unitsSold >= 0 and optional revenue
- Returns structured ValidationResult with valid rows, errors, warnings, and summary counts

### Import Service
- **Batch upsert** processes 100 rows at a time with `onConflictDoUpdate` on (skuId, retailerId, month) unique constraint
- On conflict: updates forecastedUnits/unitsSold, source='excel_import', updatedAt
- Returns import/update counts

### Server Actions
- **parseAndValidateForecast**: Validates file (size, MIME, signature), parses Excel, detects format, routes to parser, validates rows, returns preview (first 100) with serialized dates
- **commitForecastImport**: Auth check, security re-validation (verify all IDs exist in DB), deserializes dates, calls import service
- **parseAndValidateSales**: Same pattern for retail sales
- **commitSalesImport**: Same security pattern for sales

### tRPC Routers
- **import router**: forecasts.list (with filters: brandId, retailerId, month range), forecasts.byBrand (aggregated by month), retailSales.list, count queries
- **orders router**: purchaseOrders and retailOrders full CRUD with getById including line items and payments, create with transaction-based line item inserts, update, delete

### Database Schema
- **retailSales table** added with (skuId, retailerId, month) unique constraint, unitsSold, revenue, source, notes, audit fields, indexes

## Task Commits

| Task | Name | Commit | Key Deliverables |
|------|------|--------|------------------|
| 1 | Install dependencies and configure Next.js | 7af8569 | exceljs, react-hook-form, react-dropzone, shadcn components, 10MB body limit |
| 2 | Create Excel parsers and format detector | 62525b9 | 4 parser files: format detection, RTL, HOP, retail sales |
| 3 | Create validators, import service, and Server Actions | e79137a | 2 validators, import service, 2 Server Actions with security re-validation |
| 4 | Create tRPC routers and update schema | 2fb6259 | import router, orders router, retailSales table, relations |

## Verification Results

All verification criteria met:
- ✅ `npm run build` passes with zero TypeScript errors
- ✅ All 15 new files created under src/server/services/, src/server/actions/, src/server/api/routers/
- ✅ onConflictDoUpdate confirmed in import-service.ts
- ✅ Security re-validation confirmed in both commit actions (grep validSkus)
- ✅ Import and orders routers registered in root.ts
- ✅ retailSales table added to schema with unique constraint

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Phase 2 Plans 02 and 03 are ready to execute:**
- Import wizard (Plan 02) can call parseAndValidateForecast and commitForecastImport
- Manual entry forms (Plan 03) can use orders.purchaseOrders.create and orders.retailOrders.create

**Blockers:**
- Database must have retailSales table applied: `npm run db:push` required before sales import will work
- Real HOP Excel files not yet available - HOP parser may need adjustment when format is known

**Open questions:**
- Exact HOP format unknown - parser currently flexible for "Retailer - Month" or simple retailer columns
- SellerCloud API credentials pending - Excel import serves as interim solution

## Notes

- **HOP parser flexibility:** Since exact HOP format is undocumented, parser handles both "Retailer - Month Year" patterns and simple retailer name columns. Will adapt when real files are available.
- **Security pattern:** All commit actions re-validate IDs against database to prevent client tampering (validated data could be modified in browser before submission).
- **Date serialization:** Server Actions must serialize Date objects to ISO strings for JSON wire transfer. Commit actions deserialize back to Date before database insertion.
- **shadcn components:** Installed scroll-area, progress, select in Wave 1 so both Wave 2 plans can use them immediately.

## Self-Check: PASSED

All created files verified:
- src/server/services/parsers/format-detector.ts ✓
- src/server/services/parsers/rtl-forecast.ts ✓
- src/server/services/parsers/hop-forecast.ts ✓
- src/server/services/parsers/retail-sales.ts ✓
- src/server/services/validators/forecast-validator.ts ✓
- src/server/services/validators/sales-validator.ts ✓
- src/server/services/import-service.ts ✓
- src/server/actions/import-forecast.ts ✓
- src/server/actions/import-sales.ts ✓
- src/server/api/routers/import.ts ✓
- src/server/api/routers/orders.ts ✓
- src/components/ui/scroll-area.tsx ✓
- src/components/ui/progress.tsx ✓
- src/components/ui/select.tsx ✓

All commits exist:
- 7af8569 ✓
- 62525b9 ✓
- e79137a ✓
- 2fb6259 ✓
