---
phase: 03-sellercloud-integration-demand-visibility
plan: 03
subsystem: demand-ui
tags: [react, tanstack-table, date-fns, shadcn-ui, trpc-client, demand-visibility]
requires: [03-02]
provides: [demand-summary-page, retailer-breakdown-page, sku-drilldown-page, brand-selector-component, alert-components]
affects: [end-users, dashboard-navigation]
tech-stack:
  added: [shadcn-alert]
  patterns: [brand-filtering, month-selection, pagination, alert-visualization, data-table-reuse]
key-files:
  created:
    - src/app/(dashboard)/demand/page.tsx
    - src/app/(dashboard)/demand/by-retailer/page.tsx
    - src/app/(dashboard)/demand/by-sku/page.tsx
    - src/components/demand/brand-selector.tsx
    - src/components/demand/shortage-alerts.tsx
    - src/components/demand/excess-alerts.tsx
    - src/components/demand/demand-summary-card.tsx
    - src/components/ui/alert.tsx
  modified:
    - src/components/dashboard/app-sidebar.tsx
decisions:
  - id: DEC-03-03-001
    decision: Reusable BrandSelector component for all demand views
    rationale: Consistent filtering UX across summary, retailer, and SKU pages
    context: Dropdown allows "All Brands" or single brand selection, shared state pattern
  - id: DEC-03-03-002
    decision: Color-coded visual indicators for balance and alerts
    rationale: Non-technical users need instant visual feedback on shortages vs excesses
    context: Red badges for shortages, amber badges for excess, green for healthy state
  - id: DEC-03-03-003
    decision: SKU drill-down pagination at 50 records per page
    rationale: Balance between data completeness and UI performance
    context: Backend supports 200 per page, but 50 provides faster initial render
  - id: DEC-03-03-004
    decision: Month selector shows current + past 3 months
    rationale: Historical comparison for demand trends without overwhelming UI
    context: date-fns used for month calculations, matches forecast data availability
  - id: DEC-03-03-005
    decision: Summary cards aggregate by brand across all months
    rationale: Executive-level rollup for quick brand health assessment
    context: Client-side reduce of crossBrandSummary data by brandId
metrics:
  duration: 4min
  completed: 2026-02-06
---

# Phase 3 Plan 03: Demand Visibility Dashboard UI

**One-liner:** Three demand dashboard pages (cross-brand summary, retailer breakdown, SKU drill-down) with brand filtering, visual shortage/excess indicators, and reusable alert components

## What Was Built

Created the complete demand visibility UI layer with three pages and five reusable components:

1. **Demand Summary Page** (`src/app/(dashboard)/demand/page.tsx` - 194 lines)
   - Cross-brand demand table showing forecasted vs ordered vs available per brand per month
   - Summary cards aggregating totals by brand (forecasted, ordered, available, balance)
   - Two-column alert panel layout: shortage alerts (red) and excess alerts (amber)
   - BrandSelector for filtering, date-fns for month range (current month + 3 months forward)
   - Empty state message directing users to Import page
   - Skeleton loading states for all data sections

2. **Retailer Breakdown Page** (`src/app/(dashboard)/demand/by-retailer/page.tsx` - 123 lines)
   - Per-retailer demand across all brands for selected month
   - Month selector with current + past 3 months
   - "Gap" column highlighting unmet demand (forecasted > ordered) in red
   - BrandSelector for filtering to single brand or all brands
   - Search by retailer name via DataTable

3. **SKU Drill-Down Page** (`src/app/(dashboard)/demand/by-sku/page.tsx` - 222 lines)
   - Complete balance sheet per SKU: forecasted, ordered, on hand, in transit, allocated, available
   - Shortage column with red badges showing units short
   - Excess column with amber badges showing excess units
   - Pagination controls (50 records per page) with Previous/Next buttons
   - Month selector and BrandSelector for filtering
   - Total count display and page info

4. **Reusable Components:**
   - `BrandSelector` (47 lines): Dropdown with "All Brands" option + brand list from tRPC
   - `DemandSummaryCard` (58 lines): Compact stats card with green/red balance indicator
   - `ShortageAlerts` (82 lines): Red alert panels with shortage badges, shows top 10
   - `ExcessAlerts` (88 lines): Amber alert panels with excess badges and ratio display
   - Alert component added via `npx shadcn@latest add alert`

5. **Sidebar Navigation Update:**
   - Added "Demand" section with 3 links: Summary, By Retailer, By SKU
   - Positioned above "Data" section for prominence

## Key Technical Decisions

**Reusable BrandSelector component (DEC-03-03-001):**
Single source of truth for brand filtering across all demand views. Uses tRPC `brands.list.useQuery()` to fetch brands. "All Brands" represented as `undefined` brandId.

**Color-coded visual indicators (DEC-03-03-002):**
Red badges for shortages (destructive variant), amber badges for excess (custom bg-amber-500), green text for positive balance. Alert components show green "No Shortages/Excess" state when empty.

**SKU drill-down pagination at 50 records (DEC-03-03-003):**
Backend supports 200 per page but UI uses 50 for faster initial render. Pagination controls reset on month/brand filter change. Shows "X to Y of Z" range display.

**Month selector shows current + past 3 months (DEC-03-03-004):**
Historical comparison pattern using date-fns `subMonths()`. Summary page uses forward-looking range (current + 3 months) while detail pages show historical data.

**Summary cards aggregate by brand (DEC-03-03-005):**
Client-side aggregation of crossBrandSummary results grouped by brandId. Shows totals across all months for quick brand health check.

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Brand selector and alert components | 68cd0d3 | src/components/demand/brand-selector.tsx, shortage-alerts.tsx, excess-alerts.tsx, demand-summary-card.tsx, ui/alert.tsx |
| 2 | Demand dashboard pages and sidebar navigation | 1269394 | src/app/(dashboard)/demand/page.tsx, by-retailer/page.tsx, by-sku/page.tsx, src/components/dashboard/app-sidebar.tsx |

## Verification Results

- TypeScript compilation: PASS
- Next.js build: PASS
- All 3 pages exist at /demand, /demand/by-retailer, /demand/by-sku
- Line count verification:
  - demand/page.tsx: 194 lines (exceeds 80 min requirement)
  - by-retailer/page.tsx: 123 lines (exceeds 50 min requirement)
  - by-sku/page.tsx: 222 lines (exceeds 80 min requirement)
  - brand-selector.tsx: 47 lines (exceeds 20 min requirement)
- Key links verified:
  - trpc.demand.crossBrandSummary.useQuery() at demand/page.tsx:83
  - trpc.demand.retailerBreakdown.useQuery() at by-retailer/page.tsx:71
  - trpc.demand.skuDrillDown.useQuery() at by-sku/page.tsx:122
  - trpc.alerts.shortages.useQuery() at demand/page.tsx:89
  - trpc.alerts.excesses.useQuery() at demand/page.tsx:94
- All must_haves artifacts verified

## UI/UX Features

**For Non-Technical Users:**
- Clean visual hierarchy with page headers and descriptions
- Color coding matches intuition: red = problem, amber = warning, green = good
- Search and sort capabilities on all tables via DataTable component
- Empty states with helpful guidance ("Import forecasts via the Import page")
- Loading skeletons prevent jarring layout shifts
- Number formatting with `toLocaleString()` for readability (e.g., "1,234" instead of "1234")

**Navigation Flow:**
1. Users start at /demand summary to see overall brand health
2. Click "By Retailer" to see which retailers need what
3. Click "By SKU" to drill into specific SKU shortages/excesses
4. BrandSelector allows focusing on single brand across all views

**Data Freshness:**
All pages use tRPC queries with React Query caching. Data updates when:
- Forecasts imported via /import page
- Purchase orders created/updated
- SellerCloud inventory synced (once credentials available)

## Integration Notes

**Connects to Phase 3 Plan 02 routers:**
- `api.demand.crossBrandSummary` - Summary page
- `api.demand.retailerBreakdown` - Retailer page
- `api.demand.skuDrillDown` - SKU page
- `api.alerts.shortages` - Summary page alerts
- `api.alerts.excesses` - Summary page alerts

**Month range patterns:**
- Summary page: `startOfMonth(new Date())` to `addMonths(monthStart, 3)` (forward-looking)
- Detail pages: `startOfMonth(new Date())` and `subMonths(currentMonth, i)` for 4 months (current + past 3)

**Pagination pattern:**
SKU drill-down uses offset/limit pagination. Reset logic:
- `setPage(0)` on month change
- `setPage(0)` on brand filter change
- Previous/Next buttons with disabled state when at boundaries

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 3 Plan 04 (if it exists) can proceed. All demand visibility UI components are complete.

**For end-to-end testing:**
1. Ensure database has forecast data (via 02-02 import wizard or seed script)
2. Ensure purchase orders exist (via 02-03 PO entry or seed script)
3. Navigate to /demand to see cross-brand summary
4. Filter by brand and observe table/alerts update
5. Navigate to /demand/by-retailer to see per-retailer breakdown
6. Navigate to /demand/by-sku to see full SKU balance sheet with pagination

**Known limitations:**
- Real-time data depends on forecast imports and PO entries
- SellerCloud inventory sync requires API credentials (Phase 3 Plan 01 infrastructure ready)
- Historical data limited to months with forecast records

## Self-Check: PASSED

**Files created verification:**
- src/app/(dashboard)/demand/page.tsx: EXISTS
- src/app/(dashboard)/demand/by-retailer/page.tsx: EXISTS
- src/app/(dashboard)/demand/by-sku/page.tsx: EXISTS
- src/components/demand/brand-selector.tsx: EXISTS
- src/components/demand/shortage-alerts.tsx: EXISTS
- src/components/demand/excess-alerts.tsx: EXISTS
- src/components/demand/demand-summary-card.tsx: EXISTS
- src/components/ui/alert.tsx: EXISTS

**Files modified verification:**
- src/components/dashboard/app-sidebar.tsx: EXISTS

**Commits verification:**
- 68cd0d3: EXISTS
- 1269394: EXISTS
