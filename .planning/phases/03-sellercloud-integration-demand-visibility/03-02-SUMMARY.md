---
phase: 03-sellercloud-integration-demand-visibility
plan: 02
subsystem: demand-backend
tags: [trpc, postgresql, aggregation, alerts, drizzle]
requires: [03-01]
provides: [demand-aggregation-api, alert-calculation-api]
affects: [03-03, 03-04]
tech-stack:
  added: []
  patterns: [postgresql-aggregation, drizzle-sql-templates, alert-calculations]
key-files:
  created:
    - src/server/api/routers/demand.ts
    - src/server/api/routers/alerts.ts
  modified:
    - src/server/api/root.ts
decisions:
  - id: DEC-03-02-001
    decision: PostgreSQL-level aggregation
    rationale: Use SQL aggregation (Drizzle sql template) instead of client-side reduce for performance with large datasets
    context: All demand queries aggregate at database level, return computed sums
  - id: DEC-03-02-002
    decision: String-to-number conversion for PostgreSQL sums
    rationale: PostgreSQL SUM returns string values via node-postgres; explicit Number() conversion required
    context: All sql<string> results are converted with Number() and ?? 0 fallback
  - id: DEC-03-02-003
    decision: Standardized inventory formulas
    rationale: Available = OnHand + InTransit - Allocated; Shortage = Forecasted - Ordered - Available; Excess uses 2.0 threshold ratio
    context: Formulas match research from Phase 3 planning, exported as helper functions for consistency
metrics:
  duration: 3min
  completed: 2026-02-06
---

# Phase 3 Plan 02: Demand Aggregation & Alert Calculation Backend

**One-liner:** Backend demand aggregation routers with PostgreSQL-level calculations for cross-brand summaries, retailer breakdowns, SKU drill-downs, and shortage/excess alerts

## What Was Built

Created the server-side demand visibility and alert calculation infrastructure:

1. **Demand Router** (`src/server/api/routers/demand.ts`)
   - `crossBrandSummary`: Aggregates forecasted vs ordered vs available per brand per month
   - `retailerBreakdown`: Shows demand per retailer across all brands for a given month
   - `skuDrillDown`: Provides SKU-level balances with pagination (200 per page)
   - `monthlySummary`: Aggregates totals for current month + next 3 months for executive dashboard

2. **Alerts Router** (`src/server/api/routers/alerts.ts`)
   - `shortages`: Identifies SKUs where forecasted demand exceeds ordered + available
   - `excesses`: Flags SKUs where supply/forecast ratio exceeds threshold (default 2.0)
   - `summary`: Provides aggregate alert counts, top 3 shortages/excesses, total units
   - Exported `calculateShortage()` and `calculateExcess()` helper functions

3. **Router Registration** (`src/server/api/root.ts`)
   - Registered all Phase 3 routers: `sellercloud`, `demand`, `alerts`
   - Total routers in appRouter: 9 (6 from Phase 1-2, 3 new from Phase 3)

## Key Technical Decisions

**PostgreSQL-level aggregation (DEC-03-02-001):**
All demand queries use Drizzle's `sql` template for database-level aggregation. This avoids fetching raw rows and reducing client-side, which would be slow for large datasets. Example:
```typescript
sql<string>`CAST(COALESCE(SUM(${forecasts.forecastedUnits}), 0) AS TEXT)`
```

**String-to-number conversion (DEC-03-02-002):**
PostgreSQL's SUM function returns string values via node-postgres driver. All aggregation results explicitly converted with `Number(row.field ?? 0)` to ensure type safety and handle nulls.

**Standardized inventory formulas (DEC-03-02-003):**
- **Available** = OnHand + InTransit - Allocated
- **Shortage** = Forecasted - Ordered - Available (capped at 0 with Math.max)
- **Excess** = Supply - (Forecasted × threshold) when ratio > threshold
- **Balance** = Ordered + Available - Forecasted

These formulas match the research from Phase 3 planning and are exported as helper functions for consistency across the application.

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Demand aggregation tRPC router | 4ab4edb | src/server/api/routers/demand.ts |
| 2 | Alerts router and Phase 3 router registration | 0682290 | src/server/api/routers/alerts.ts, src/server/api/root.ts |

## Verification Results

- TypeScript compilation: PASS
- Build (`npm run build`): PASS
- demand.ts: 314 lines (exceeds 100 min_lines requirement)
- alerts.ts: 377 lines (exceeds 60 min_lines requirement)
- All 4 demand procedures present: crossBrandSummary, retailerBreakdown, skuDrillDown, monthlySummary
- All 3 alert procedures present: shortages, excesses, summary
- All Phase 3 routers registered in appRouter: sellercloud, demand, alerts
- SQL-level aggregation verified: 18 sql<string> template uses in demand.ts

## API Surface

**Demand Router (`api.demand.*`):**
```typescript
// Cross-brand summary
api.demand.crossBrandSummary.useQuery({
  monthStart: date,
  monthEnd: date,
  brandId?: number
})
// Returns: { brandId, brandName, month, forecastedUnits, orderedUnits,
//            onHandUnits, inTransitUnits, allocatedUnits, availableUnits, balance }[]

// Retailer breakdown
api.demand.retailerBreakdown.useQuery({ month: date, brandId?: number })
// Returns: { retailerId, retailerName, brandId, brandName, forecastedUnits, orderedUnits }[]

// SKU drill-down
api.demand.skuDrillDown.useQuery({
  month: date,
  brandId?: number,
  retailerId?: number,
  limit: 200,
  offset: 0
})
// Returns: { items: [...], totalCount: number }

// Monthly summary
api.demand.monthlySummary.useQuery({ brandId?: number })
// Returns: { month, forecastedUnits, orderedUnits, availableUnits }[] (4 months)
```

**Alerts Router (`api.alerts.*`):**
```typescript
// Shortages
api.alerts.shortages.useQuery({
  brandId?: number,
  month?: date,
  minShortage: 0,
  limit: 50
})
// Returns: { skuId, sku, skuName, brandName, forecastedUnits, orderedUnits,
//            onHandUnits, inTransitUnits, allocatedUnits, availableUnits, shortage }[]

// Excesses
api.alerts.excesses.useQuery({
  brandId?: number,
  month?: date,
  threshold: 2.0,
  limit: 50
})
// Returns: { skuId, sku, skuName, brandName, forecastedUnits, orderedUnits,
//            supply, excess, ratio }[]

// Summary
api.alerts.summary.useQuery({ brandId?: number })
// Returns: { totalShortageSkus, totalExcessSkus, topShortages, topExcesses,
//            totalShortageUnits, totalExcessUnits }
```

## Deviations from Plan

None - plan executed exactly as written.

## Integration Notes

**For Plan 03 (SellerCloud Admin UI):**
- Use `api.sellercloud.syncStatus.useQuery()` to show sync history
- Use `api.sellercloud.syncPurchaseOrders.useMutation()` for manual PO sync
- Use `api.sellercloud.syncInventory.useMutation()` for manual inventory sync

**For Plan 04 (Demand Visibility Dashboards):**
- DEM-01: Use `crossBrandSummary` + `monthlySummary` + `alerts.summary`
- DEM-02: Use `retailerBreakdown`
- DEM-03: Use `skuDrillDown` with pagination
- DEM-04: Use `alerts.shortages`
- DEM-05: Use `alerts.excesses`

## Next Phase Readiness

Phase 3 Plan 03 (SellerCloud admin UI) can proceed immediately.
Phase 3 Plan 04 (Demand visibility dashboards) can proceed immediately.

All backend infrastructure for demand visibility is complete. UI components in Plans 03-04 now have typed tRPC procedures to consume.

## Self-Check: PASSED

**Files created verification:**
- src/server/api/routers/demand.ts: EXISTS
- src/server/api/routers/alerts.ts: EXISTS

**Files modified verification:**
- src/server/api/root.ts: EXISTS

**Commits verification:**
- 4ab4edb: EXISTS
- 0682290: EXISTS
