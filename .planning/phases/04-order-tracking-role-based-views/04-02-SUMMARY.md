---
phase: 04-order-tracking-role-based-views
plan: 02
subsystem: ui
tags: [tracking, purchase-orders, retail-orders, timeline, lead-time, react, tanstack-table, shadcn-ui]

# Dependency graph
requires:
  - phase: 04-01
    provides: tracking tRPC router, 4 shared tracking UI components, lead time utilities
provides:
  - Supplier PO tracking list and detail pages with timeline visualization
  - Retail order tracking list and detail pages with fulfillment status
  - Lead time visibility on supplier PO list (order-by dates with urgency badges)
  - Brand, status, and retailer filtering on both tracking pages
  - Line items and payments tables on detail pages
affects: [04-03-role-dashboards, future-order-management-enhancements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Timeline visualization for PO lifecycle using POTimeline component"
    - "LeadTimeBadge for urgency display with 3-tier color coding"
    - "Ship-by date urgency highlighting in table cells (amber text for <=7 days)"
    - "OrderStatusCard at top of list pages for status summary"

key-files:
  created:
    - src/app/(dashboard)/tracking/supplier-orders/page.tsx
    - src/app/(dashboard)/tracking/supplier-orders/[id]/page.tsx
    - src/app/(dashboard)/tracking/supplier-orders/columns.tsx
    - src/app/(dashboard)/tracking/retail-orders/page.tsx
    - src/app/(dashboard)/tracking/retail-orders/[id]/page.tsx
    - src/app/(dashboard)/tracking/retail-orders/columns.tsx
  modified: []

key-decisions:
  - "Supplier PO detail page shows POTimeline as primary lifecycle visualization"
  - "Lead time badges use calculateOrderByDate from lib/lead-time.ts (leadTimeDays + 5-day buffer)"
  - "Deposit status shown as icon (green check / red X) instead of badge"
  - "Ship-by dates highlighted with amber text when <=7 days away"

patterns-established:
  - "Tracking pages use OrderStatusCard at top for status summary"
  - "List pages support filtering by brand, status, and (for retail) retailer"
  - "Detail pages show header cards with key info, followed by line items and payments tables"
  - "Back to list link at top of detail pages for navigation"

# Metrics
duration: 4min
completed: 2026-02-06
---

# Phase 4 Plan 2: Order Tracking Pages Summary

**Supplier PO tracking and retail order tracking pages with timeline visualization, lead time urgency badges, and multi-filter support**

## Performance

- **Duration:** 4 min 15s
- **Started:** 2026-02-06T14:40:29Z
- **Completed:** 2026-02-06T14:44:44Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Supplier PO tracking list with deposit status, timeline status badges, and lead time urgency display
- Supplier PO detail page with full POTimeline visualization showing 6-step lifecycle progression
- Retail order tracking list with ship-by urgency highlighting for approaching deadlines
- Retail order detail page with fulfillment status and line items breakdown
- All pages support filtering by brand and status; retail pages add retailer filter
- Line items and payments tables on both detail page types

## Task Commits

Each task was committed atomically:

1. **Task 1: Supplier PO tracking list and detail pages** - `be7ac69` (feat)
2. **Task 2: Retail order tracking list and detail pages** - `160c888` (feat)

## Files Created/Modified
- `src/app/(dashboard)/tracking/supplier-orders/page.tsx` - Supplier PO list with status summary, filters, and DataTable
- `src/app/(dashboard)/tracking/supplier-orders/columns.tsx` - Column definitions with LeadTimeBadge and deposit status icons
- `src/app/(dashboard)/tracking/supplier-orders/[id]/page.tsx` - Detail page with POTimeline, line items, and payments
- `src/app/(dashboard)/tracking/retail-orders/page.tsx` - Retail order list with status summary and triple filters
- `src/app/(dashboard)/tracking/retail-orders/columns.tsx` - Column definitions with ship-by date urgency highlighting
- `src/app/(dashboard)/tracking/retail-orders/[id]/page.tsx` - Detail page with fulfillment info and line items

## Decisions Made

**1. Deposit status as icon instead of badge**
- Rationale: More compact, visual at-a-glance indication (green check = paid, red X = unpaid)
- Implementation: Check and X icons from lucide-react with semantic colors

**2. Lead time badge on supplier PO list**
- Rationale: Purchasing team needs immediate visibility into order-by urgency
- Implementation: calculateOrderByDate inline in columns.tsx, passed to LeadTimeBadge

**3. Ship-by urgency as text color (not badge)**
- Rationale: Less visual noise than badges; amber text sufficient for highlighting
- Implementation: Conditional className in columns.tsx cell renderer

**4. POTimeline as primary lifecycle view**
- Rationale: Visual storytelling of PO progression from ordered to arrived
- Implementation: POTimeline component on supplier detail page below header cards

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed payment field names in detail pages**
- **Found during:** Task 1 (Supplier order detail page)
- **Issue:** Used `paymentType` and `paymentDate` but schema has `type` and `paidDate`
- **Fix:** Changed field references to match schema (type, paidDate, dueDate)
- **Files modified:** src/app/(dashboard)/tracking/supplier-orders/[id]/page.tsx
- **Verification:** TypeScript compilation passed
- **Committed in:** be7ac69 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed RetailOrder type definition**
- **Found during:** Task 2 (Retail orders page)
- **Issue:** retailerPoNumber typed as `string` but schema returns `string | null`
- **Fix:** Changed type to `string | null` in columns.tsx
- **Files modified:** src/app/(dashboard)/tracking/retail-orders/columns.tsx
- **Verification:** TypeScript compilation passed
- **Committed in:** 160c888 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for type correctness. No scope changes.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Supplier PO tracking pages complete and operational
- Retail order tracking pages complete and operational
- Ready for Phase 4 Plan 3: Role-based dashboards using tracking components
- Navigation sidebar needs update to add /tracking/supplier-orders and /tracking/retail-orders links

## Self-Check: PASSED

All key files verified:
- src/app/(dashboard)/tracking/supplier-orders/page.tsx
- src/app/(dashboard)/tracking/supplier-orders/[id]/page.tsx
- src/app/(dashboard)/tracking/supplier-orders/columns.tsx
- src/app/(dashboard)/tracking/retail-orders/page.tsx
- src/app/(dashboard)/tracking/retail-orders/[id]/page.tsx
- src/app/(dashboard)/tracking/retail-orders/columns.tsx

All commits verified:
- be7ac69 (Task 1)
- 160c888 (Task 2)

---
*Phase: 04-order-tracking-role-based-views*
*Completed: 2026-02-06*
