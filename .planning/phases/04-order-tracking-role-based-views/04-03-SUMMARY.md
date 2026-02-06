---
phase: 04-order-tracking-role-based-views
plan: 03
subsystem: ui-dashboards
completed: 2026-02-06
duration: 6min
tags: [role-based-views, dashboards, navigation, auth, UX-02]

requires:
  - 04-01-PLAN.md: tracking tRPC router, lead time utils, tracking UI components
  - 03-02-PLAN.md: alerts and demand routers
  - 01-02-PLAN.md: Auth.js session with role field

provides:
  - 4 role-based dashboard pages with server-side auth checks
  - Updated sidebar navigation (8 sections)
  - CEO/Sales/Purchasing/Warehouse tailored views

affects:
  - None (completes Phase 4 Wave 2 UX work)

tech-stack:
  added: []
  patterns:
    - "Server Components for auth checks, Client Components for data fetching"
    - "Role-based access control (CEO can access all, others restricted)"
    - "Dashboard aggregation using tRPC queries (alerts, tracking, demand)"

decisions:
  - decision: "CEO role has universal access to all role dashboards"
    rationale: "CEO needs oversight of all team functions"
    alternatives: "Create separate admin dashboard, but CEO needs operational view"
    scope: "All role pages check for role === 'ceo' as fallback"
    date: 2026-02-06
  - decision: "Sales dashboard uses retailerBreakdown without availableUnits"
    rationale: "retailerBreakdown query only aggregates forecasted + ordered (no inventory join)"
    alternatives: "Add inventory join to retailerBreakdown, but adds complexity for sales view"
    scope: "Sales view shows forecasted vs ordered gap, not full supply picture"
    date: 2026-02-06
  - decision: "Sidebar order: Overview, Demand, Tracking, Data, Orders, Role Views, Master Data, System"
    rationale: "Tracking inserted after Demand (related to visibility), Role Views after Orders (operational)"
    alternatives: "Role Views at top, but operational dashboards should follow data entry"
    scope: "Navigation hierarchy in app-sidebar.tsx"
    date: 2026-02-06

key-files:
  created:
    - src/app/(dashboard)/roles/ceo/page.tsx: "Server Component with CEO-only auth check"
    - src/app/(dashboard)/roles/ceo/client.tsx: "CEO dashboard client component (alerts, pipeline, demand health, quick links)"
    - src/app/(dashboard)/roles/sales/page.tsx: "Server Component with sales+ceo auth check"
    - src/app/(dashboard)/roles/sales/client.tsx: "Sales dashboard (retailer orders, demand by retailer, forecast summary)"
    - src/app/(dashboard)/roles/purchasing/page.tsx: "Server Component with purchasing+ceo auth check"
    - src/app/(dashboard)/roles/purchasing/client.tsx: "Purchasing dashboard (supply gaps, PO tracking, lead time alerts)"
    - src/app/(dashboard)/roles/warehouse/page.tsx: "Server Component with warehouse+ceo auth check"
    - src/app/(dashboard)/roles/warehouse/client.tsx: "Warehouse dashboard (stock levels, inbound shipments, allocation needed)"
  modified:
    - src/components/dashboard/app-sidebar.tsx: "Added Tracking and Role Views sections (8 sections total)"
---

# Phase 4 Plan 03: Role-Based Dashboard Views Summary

**One-liner:** Four tailored role dashboards (CEO, Sales, Purchasing, Warehouse) with server-side auth and updated sidebar navigation with Tracking and Role Views sections

## What Was Built

### Task 1: Four Role-Based Dashboard Pages

Created 4 role-specific dashboard pages under `/roles/` with server-side auth and client data fetching:

**CEO Dashboard (`/roles/ceo`):**
- Access: CEO role only (redirects others to "/")
- Content: Alerts Overview (shortage/excess), Order Pipeline (PO + retail order status cards), Demand Health (4-month trend), Quick Links
- Queries: alerts.summary, tracking.statusSummary, demand.monthlySummary
- Pattern: Server Component checks `session.user.role === "ceo"`, renders client component for tRPC calls

**Sales Dashboard (`/roles/sales`):**
- Access: Sales + CEO roles
- Content: Retailer Order Status (status breakdown cards), Recent Retail Orders (last 10), Demand by Retailer (current month), Forecast Summary (4-month trend)
- Queries: tracking.retailOrders, demand.retailerBreakdown, demand.monthlySummary
- Note: retailerBreakdown shows forecasted vs ordered gap (no availableUnits field)

**Purchasing Dashboard (`/roles/purchasing`):**
- Access: Purchasing + CEO roles
- Content: Top Supply Gaps (shortage alerts), PO Tracking Status (status cards), Recent Purchase Orders (last 10), Lead Time Alerts (overdue/urgent/normal counts + active POs with order-by dates)
- Queries: alerts.shortages, tracking.supplierOrders, tracking.leadTimeOverview
- Features: LeadTimeBadge urgency indicators, order-by date calculations

**Warehouse Dashboard (`/roles/warehouse`):**
- Access: Warehouse + CEO roles
- Content: Current Stock Levels (on hand, in transit, allocated, available), Inbound Shipments (shipped/in_transit POs), Items Needing Allocation (confirmed/processing retail orders), Stock by Brand
- Queries: tracking.supplierOrders, tracking.retailOrders, demand.crossBrandSummary
- Features: Real-time stock totals aggregation, inbound shipment filtering

### Task 2: Updated Sidebar Navigation

Updated `app-sidebar.tsx` to add 2 new navigation sections:

**Tracking Section (inserted after Demand):**
- Supplier Orders → /tracking/supplier-orders (Truck icon)
- Retail Orders → /tracking/retail-orders (ClipboardList icon)

**Role Views Section (inserted after Orders):**
- CEO Overview → /roles/ceo (BarChart3 icon)
- Sales View → /roles/sales (Users icon)
- Purchasing View → /roles/purchasing (Clipboard icon)
- Warehouse View → /roles/warehouse (Warehouse icon)

**Final section order (8 total):**
1. Overview (Dashboard, Executive Summary)
2. Demand (Summary, By Retailer, By SKU)
3. Tracking (Supplier Orders, Retail Orders) — NEW
4. Data (Import, Forecasts)
5. Orders (Purchase Orders, Retail Orders)
6. Role Views (CEO, Sales, Purchasing, Warehouse) — NEW
7. Master Data (Brands, SKUs, Retailers)
8. System (SellerCloud Sync, Audit Log)

## Architecture Patterns

### Server Component + Client Component Split
```tsx
// Server Component (page.tsx) - handles auth
export default async function RoleDashboardPage() {
  const session = await auth();
  if (!session || !["role", "ceo"].includes(session.user.role)) {
    redirect("/");
  }
  return <RoleDashboardClient />;
}

// Client Component (client.tsx) - handles data fetching
"use client";
export function RoleDashboardClient() {
  const { data } = trpc.query.useQuery({});
  // ... render with data
}
```

Benefits:
- Server-side auth check prevents unauthorized page loads
- Client component enables tRPC hooks and interactive UI
- Redirects happen before React hydration

### Role-Based Access Control
```tsx
// CEO universal access pattern
if (!["sales", "ceo"].includes(session.user.role)) {
  redirect("/");
}
```

Roles hierarchy:
- CEO: Access to all 4 role dashboards
- Sales/Purchasing/Warehouse: Access to own dashboard only

### Dashboard Data Aggregation
All role dashboards use tRPC queries for real-time data:
- CEO: 3 queries (alerts.summary, tracking.statusSummary, demand.monthlySummary)
- Sales: 3 queries (tracking.retailOrders, demand.retailerBreakdown, demand.monthlySummary)
- Purchasing: 3 queries (alerts.shortages, tracking.supplierOrders, tracking.leadTimeOverview)
- Warehouse: 3 queries (tracking.supplierOrders, tracking.retailOrders, demand.crossBrandSummary)

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create 4 role-based dashboard pages | cdd75c4 | roles/ceo/page.tsx, roles/ceo/client.tsx, roles/sales/page.tsx, roles/sales/client.tsx, roles/purchasing/page.tsx, roles/purchasing/client.tsx, roles/warehouse/page.tsx, roles/warehouse/client.tsx |
| 2 | Update sidebar navigation | 54d2f30 | app-sidebar.tsx |

## TypeScript Fixes Applied

During implementation, fixed type safety issues:
1. **LeadTimeBadge prop:** Changed from `daysUntilOrderBy` to `orderByDate` (component expects Date, not number)
2. **retailerBreakdown schema:** Removed `availableUnits` calculation (not returned by query)
3. **Null safety:** Added optional chaining for `totalAmount?.toLocaleString()` and date conditionals

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Phase 4 Wave 2 Status:**
- 04-02 (tracking pages) — ready for execution
- 04-03 (role dashboards + sidebar) — COMPLETE

**Outstanding items:**
- Create `/tracking/supplier-orders` and `/tracking/retail-orders` pages (04-02)
- All backend routers and UI components ready for tracking pages

**Known dependencies:**
- Role dashboards rely on 04-01 tracking components (StatusBadge, LeadTimeBadge, OrderStatusCard)
- Sidebar navigation includes tracking routes (04-02 will create the pages)

## Self-Check: PASSED

All created files exist:
- src/app/(dashboard)/roles/ceo/page.tsx
- src/app/(dashboard)/roles/ceo/client.tsx
- src/app/(dashboard)/roles/sales/page.tsx
- src/app/(dashboard)/roles/sales/client.tsx
- src/app/(dashboard)/roles/purchasing/page.tsx
- src/app/(dashboard)/roles/purchasing/client.tsx
- src/app/(dashboard)/roles/warehouse/page.tsx
- src/app/(dashboard)/roles/warehouse/client.tsx

All commits exist:
- cdd75c4
- 54d2f30

Modified file exists:
- src/components/dashboard/app-sidebar.tsx
