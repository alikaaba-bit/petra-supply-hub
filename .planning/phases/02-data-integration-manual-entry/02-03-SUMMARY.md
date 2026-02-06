---
phase: 02-data-integration-manual-entry
plan: 03
subsystem: ui
tags: [react, next.js, trpc, react-hook-form, zod, tanstack-table]

# Dependency graph
requires:
  - phase: 02-01
    provides: Orders tRPC routers (purchaseOrders, retailOrders) and import routers (forecasts)
provides:
  - Purchase order CRUD pages with line item management
  - Retail order CRUD pages with line item management
  - Grouped sidebar navigation (Overview, Data, Orders, Master Data, System)
  - Expanded dashboard with 6 operational stat cards
  - Forecasts list page with filters
affects: [03-stock-tracking-inventory, 04-advanced-analytics]

# Tech tracking
tech-stack:
  added: [react-hook-form (with useFieldArray), date-fns, shadcn form component, shadcn textarea component]
  patterns: [useFieldArray for dynamic line items, auto-calculate totals from line items, grouped sidebar navigation]

key-files:
  created:
    - src/app/(dashboard)/orders/purchase-orders/page.tsx
    - src/app/(dashboard)/orders/purchase-orders/columns.tsx
    - src/app/(dashboard)/orders/purchase-orders/new/page.tsx
    - src/app/(dashboard)/orders/purchase-orders/[id]/page.tsx
    - src/app/(dashboard)/orders/retail-orders/page.tsx
    - src/app/(dashboard)/orders/retail-orders/columns.tsx
    - src/app/(dashboard)/orders/retail-orders/new/page.tsx
    - src/app/(dashboard)/orders/retail-orders/[id]/page.tsx
    - src/app/(dashboard)/forecasts/page.tsx
    - src/components/ui/form.tsx
    - src/components/ui/textarea.tsx
  modified:
    - src/components/dashboard/app-sidebar.tsx
    - src/app/(dashboard)/page.tsx
    - src/app/(dashboard)/import/_components/import-wizard.tsx

key-decisions:
  - "useFieldArray for dynamic line item management with add/remove capabilities"
  - "Auto-calculate order totals from line items in real-time"
  - "Grouped sidebar navigation sections for better organization"
  - "HTML date inputs for date fields (browser native)"

patterns-established:
  - "Order form pattern: main details card + line items card with useFieldArray"
  - "Filter pattern: Multiple dropdowns for multi-dimensional filtering"
  - "Detail page pattern: Header with back button + info card + line items table"

# Metrics
duration: 10min
completed: 2026-02-06
---

# Phase 2 Plan 3: Manual Order Entry UI Summary

**Purchase order and retail order CRUD pages with useFieldArray line item management, grouped sidebar navigation, 6-stat dashboard, and filterable forecasts list**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-06T10:33:30Z
- **Completed:** 2026-02-06T10:43:30Z
- **Tasks:** 3
- **Files modified:** 21

## Accomplishments
- Purchase order pages (list, create with line items, detail) fully functional
- Retail order pages (list, create with line items, detail) fully functional
- Sidebar reorganized into 5 logical sections with Import, Forecasts, and Orders links
- Dashboard expanded to 6 operational stat cards (Brands, SKUs, Retailers, POs, Retail Orders, Forecasts)
- Forecasts list page with brand/retailer filters displaying imported forecast data

## Task Commits

Each task was committed atomically:

1. **Task 1: Build purchase order pages** - `edc0c39` (feat)
   - Also added missing form and textarea UI components (blocking dependency)
   - Fixed TypeScript error in import-wizard (type narrowing issue)
2. **Task 2: Build retail order pages** - `6940c57` (feat)
3. **Task 3: Update sidebar, dashboard, and forecasts** - `339de00` (feat)

## Files Created/Modified

**Purchase Order Pages:**
- `src/app/(dashboard)/orders/purchase-orders/page.tsx` - List page with brand/status filters, DataTable
- `src/app/(dashboard)/orders/purchase-orders/columns.tsx` - Column definitions with status badges, date formatting, actions dropdown
- `src/app/(dashboard)/orders/purchase-orders/new/page.tsx` - Create form with useFieldArray for line items, SKU selection filtered by brand, auto-calculate totals
- `src/app/(dashboard)/orders/purchase-orders/[id]/page.tsx` - Detail view with order info card and line items table

**Retail Order Pages:**
- `src/app/(dashboard)/orders/retail-orders/page.tsx` - List page with retailer/brand/status filters
- `src/app/(dashboard)/orders/retail-orders/columns.tsx` - Column definitions matching PO pattern
- `src/app/(dashboard)/orders/retail-orders/new/page.tsx` - Create form with line items, filtered SKU selection
- `src/app/(dashboard)/orders/retail-orders/[id]/page.tsx` - Detail view with line items table

**Navigation & Dashboard:**
- `src/components/dashboard/app-sidebar.tsx` - Restructured into sections: Overview, Data, Orders, Master Data, System
- `src/app/(dashboard)/page.tsx` - Expanded to 6 stat cards with order and forecast counts
- `src/app/(dashboard)/forecasts/page.tsx` - Filterable DataTable showing SKU, retailer, month, forecasted/ordered units, source

**Dependencies Added:**
- `src/components/ui/form.tsx` - Shadcn form component (missing dependency)
- `src/components/ui/textarea.tsx` - Shadcn textarea component (missing dependency)

**Bug Fix:**
- `src/app/(dashboard)/import/_components/import-wizard.tsx` - Fixed TypeScript error with result type narrowing

## Decisions Made

1. **useFieldArray for line items:** React Hook Form's useFieldArray provides clean API for dynamic add/remove of line items with proper form state management
2. **Auto-calculate totals:** Watch line items with form.watch() to calculate and display totals in real-time as user enters quantities and prices
3. **Grouped sidebar navigation:** Organized into logical sections (Overview, Data, Orders, Master Data, System) for better UX as app grows
4. **HTML date inputs:** Using native browser date inputs (`<input type="date">`) for simplicity and built-in validation
5. **Zod schema without defaults:** Removed `.default()` from Zod schema for status, currency, depositPaid to avoid TypeScript type inference issues with react-hook-form resolver

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing form and textarea UI components**
- **Found during:** Task 1 (Purchase order create form)
- **Issue:** `@/components/ui/form` and `@/components/ui/textarea` not installed, causing module resolution errors
- **Fix:** Ran `npx shadcn@latest add form textarea --yes` to install missing components
- **Files modified:** src/components/ui/form.tsx, src/components/ui/textarea.tsx
- **Verification:** Build passed after installation
- **Committed in:** edc0c39 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed TypeScript error in import-wizard**
- **Found during:** Task 1 build verification
- **Issue:** Type narrowing issue with `result.imported` and `result.updated` - TypeScript couldn't properly narrow union types in conditional
- **Fix:** Added nullish coalescing (`?? 0`) for `imported` field and type assertion for `updated` field since `commitSalesImport` doesn't return `updated`
- **Files modified:** src/app/(dashboard)/import/_components/import-wizard.tsx
- **Verification:** Build passed after fix
- **Committed in:** edc0c39 (Task 1 commit)

**3. [Rule 1 - Bug] Fixed Zod schema default() type inference**
- **Found during:** Task 1 build verification
- **Issue:** Zod `.default()` chains with `.optional()` caused type inference conflict with react-hook-form resolver
- **Fix:** Removed `.optional()` from fields that have `.default()` (status, currency, depositPaid) - defaults make them effectively non-optional
- **Files modified:** src/app/(dashboard)/orders/purchase-orders/new/page.tsx
- **Verification:** Build passed, form still provides default values
- **Committed in:** edc0c39 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for build success and type safety. No scope creep.

## Issues Encountered

None - straightforward implementation following existing patterns from SKUs pages.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Manual order entry complete.** Team can now:
- Create purchase orders with line items when Excel data incomplete
- Create retail orders with line items for tracking customer demand
- View all imported forecasts in filterable list
- Navigate between Import, Forecasts, and Orders sections via organized sidebar
- Monitor operational metrics on dashboard (6 cards)

**Phase 2 Wave 2 (plans 02-02 and 02-03) complete:**
- Excel import wizard UI (02-02) ✓
- Manual order entry forms (02-03) ✓

Ready for Phase 3 (Stock Tracking & Inventory) which will build on purchase orders and retail orders to track inventory movements.

---
*Phase: 02-data-integration-manual-entry*
*Completed: 2026-02-06*

## Self-Check: PASSED

All created files verified to exist.
All commits verified in git history.
