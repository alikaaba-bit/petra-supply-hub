---
phase: 04-order-tracking-role-based-views
plan: 01
subsystem: api
tags: [trpc, tracking, date-fns, ui-components, shadcn]

# Dependency graph
requires:
  - phase: 01-foundation-master-data
    provides: Database schema with purchaseOrders, retailOrders, brands, retailers, tRPC foundation
  - phase: 02-data-integration-manual-entry
    provides: Order entry forms and data models
provides:
  - Tracking tRPC router with 6 procedures for supplier and retail order queries
  - Lead time calculation utilities (calculateOrderByDate, calculateExpectedArrival)
  - 4 shared tracking UI components (StatusBadge, LeadTimeBadge, POTimeline, OrderStatusCard)
affects: [04-02, 04-03, order-tracking-pages, role-dashboards]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lead time calculations with 5-day buffer for order-by dates"
    - "Status badge mapping for 12 order statuses (PO + retail)"
    - "Timeline visualization with 6-step PO lifecycle"

key-files:
  created:
    - src/server/api/routers/tracking.ts
    - src/lib/lead-time.ts
    - src/components/tracking/status-badge.tsx
    - src/components/tracking/lead-time-badge.tsx
    - src/components/tracking/po-timeline.tsx
    - src/components/tracking/order-status-card.tsx
  modified:
    - src/server/api/root.ts

key-decisions:
  - "5-day buffer added to lead time calculations for order-by dates"
  - "StatusBadge uses 3 semantic colors: secondary (draft), default (in-progress), green (complete), destructive (cancelled)"
  - "LeadTimeBadge shows urgency: red (overdue), amber (<=7 days), gray (>7 days)"
  - "POTimeline renders 6 fixed steps: ordered → confirmed → in_production → shipped → in_transit → arrived"

patterns-established:
  - "Lead time calculations: calculateOrderByDate uses subDays(needByDate, leadTimeDays + 5)"
  - "Tracking router uses brand joins to include leadTimeDays in all supplier order queries"
  - "Status summary uses PostgreSQL aggregation (GROUP BY status) for performance"

# Metrics
duration: 3min
completed: 2026-02-06
---

# Phase 04 Plan 01: Tracking Infrastructure Summary

**Tracking tRPC router with 6 procedures (supplier/retail orders, lead time overview, status summary) and 4 reusable UI components for order tracking pages**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-06T14:32:59Z
- **Completed:** 2026-02-06T14:36:14Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Tracking tRPC router registered with 6 procedures for order queries and status aggregation
- Lead time utility functions calculate order-by and expected arrival dates with 5-day buffer
- 4 shared UI components ready for consumption by tracking pages and role dashboards
- All components use semantic colors and shadcn/ui patterns for visual consistency

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tracking tRPC router and lead time utilities** - `8921486` (feat)
2. **Task 2: Create shared tracking UI components** - `e5f6a6a` (feat)

## Files Created/Modified
- `src/server/api/routers/tracking.ts` - Tracking router with supplierOrders, supplierOrderDetail, retailOrders, retailOrderDetail, leadTimeOverview, statusSummary procedures
- `src/server/api/root.ts` - Registered tracking router
- `src/lib/lead-time.ts` - Lead time calculation utilities (calculateOrderByDate, calculateExpectedArrival)
- `src/components/tracking/status-badge.tsx` - Status badge component mapping 12 order statuses to semantic colors
- `src/components/tracking/lead-time-badge.tsx` - Lead time urgency badge with date-based color coding
- `src/components/tracking/po-timeline.tsx` - 6-step PO lifecycle timeline visualization
- `src/components/tracking/order-status-card.tsx` - Order status summary card showing counts per status

## Decisions Made

1. **5-day buffer for order-by calculations**: calculateOrderByDate subtracts (leadTimeDays + 5) from need-by date to provide ordering buffer
2. **StatusBadge semantic color scheme**: Secondary for draft, default for in-progress, green for complete states, destructive for cancelled
3. **LeadTimeBadge urgency thresholds**: Overdue (past date) = red, urgent (<=7 days) = amber, normal (>7 days) = gray
4. **POTimeline fixed 6-step lifecycle**: ordered → confirmed → in_production → shipped → in_transit → arrived
5. **Status summary uses PostgreSQL aggregation**: COUNT + GROUP BY for performance instead of client-side reduce

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 04-02 (tracking pages) and Plan 04-03 (role dashboards).

All tracking infrastructure complete:
- Tracking router exposes all necessary queries with brand/retailer joins
- Lead time calculations handle order-by date logic
- UI components ready for immediate consumption
- TypeScript compilation passing

---
*Phase: 04-order-tracking-role-based-views*
*Completed: 2026-02-06*

## Self-Check: PASSED

All created files verified to exist:
- src/server/api/routers/tracking.ts
- src/lib/lead-time.ts
- src/components/tracking/status-badge.tsx
- src/components/tracking/lead-time-badge.tsx
- src/components/tracking/po-timeline.tsx
- src/components/tracking/order-status-card.tsx

All commit hashes verified:
- 8921486 (Task 1)
- e5f6a6a (Task 2)
