# Requirements: Petra Supply Hub v1.1

## Milestone: v1.1 — Analytics & Visualization Layer

Transform the admin panel into an operational command center with charts, time-series analytics, inventory health, and actionable alerts. All data already exists in the schema — this milestone is purely presentation and analytics layer.

## Requirements

### Charts & Visualizations (VIZ)

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| VIZ-01 | Revenue trend line chart (last 6-12 months, all brands stacked) using Recharts | P0 | Pending |
| VIZ-02 | Brand performance bar chart comparing revenue across brands | P0 | Pending |
| VIZ-03 | Retailer revenue mix chart (horizontal bar or treemap) with brand breakdown | P1 | Pending |
| VIZ-04 | Dashboard top strip with key KPIs: Revenue MTD, Units Shipped MTD, Open Alerts, Active POs | P0 | Pending |

### Time-Series Analytics (TSA)

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| TSA-01 | Period-over-period comparison: MTD vs last month with percentage change indicators | P0 | Pending |
| TSA-02 | Quarter-over-quarter and YOY comparison views | P1 | Pending |
| TSA-03 | Trend arrows and delta indicators on all key metrics | P0 | Pending |

### Forecast vs. Actual (FVA)

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FVA-01 | Forecast vs actual units comparison view per SKU per month | P0 | Pending |
| FVA-02 | Variance highlighting: over-forecast (excess risk) and under-forecast (stockout risk) | P0 | Pending |
| FVA-03 | Forecast accuracy percentage metric on dashboard | P1 | Pending |

### Inventory Health (INV)

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| INV-01 | Days of supply calculation per SKU: current stock / daily velocity | P0 | Pending |
| INV-02 | Color-coded inventory status: green (30-90 days), yellow (15-30), red (<15), black (>120 overstock) | P0 | Pending |
| INV-03 | Reorder date calculation based on lead time per brand (30 or 60 days) | P0 | Pending |
| INV-04 | Stockout risk timeline showing projected stockout dates | P1 | Pending |

### Actionable Alerts (ALT)

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| ALT-01 | Reorder alerts with specific dates: "Reorder SKU-X by [date] or stockout at [retailer]" | P0 | Pending |
| ALT-02 | Late PO alerts: "PO #X is Y days late — follow up with supplier" | P1 | Pending |
| ALT-03 | Forecast variance alerts when actual vs forecast diverges >20% | P1 | Pending |
| ALT-04 | Action center section grouping critical/warning/info alerts | P0 | Pending |

### Sales Velocity (VEL)

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| VEL-01 | Top 10 SKUs leaderboard by revenue with velocity indicators | P0 | Pending |
| VEL-02 | Biggest movers: acceleration/deceleration vs prior period | P1 | Pending |
| VEL-03 | Brand health signals: growing / healthy / watch / problem per brand | P1 | Pending |

## Traceability

| Req ID | Gap Ref | Phase | Status |
|--------|---------|-------|--------|
| VIZ-01 | Gap 2, 5 | Phase 5 | Pending |
| VIZ-02 | Gap 2, 3 | Phase 5 | Pending |
| VIZ-03 | Gap 4 | Phase 5 | Pending |
| VIZ-04 | Gap 1 | Phase 5 | Pending |
| TSA-01 | Gap 5 | Phase 6 | Pending |
| TSA-02 | Gap 5 | Phase 6 | Pending |
| TSA-03 | Gap 5 | Phase 6 | Pending |
| FVA-01 | Gap 9 | Phase 7 | Pending |
| FVA-02 | Gap 9 | Phase 7 | Pending |
| FVA-03 | Gap 9 | Phase 7 | Pending |
| INV-01 | Gap 6 | Phase 8 | Pending |
| INV-02 | Gap 6 | Phase 8 | Pending |
| INV-03 | Gap 6 | Phase 8 | Pending |
| INV-04 | Gap 6 | Phase 8 | Pending |
| ALT-01 | Gap 12 | Phase 9 | Pending |
| ALT-02 | Gap 12 | Phase 9 | Pending |
| ALT-03 | Gap 12 | Phase 9 | Pending |
| ALT-04 | Gap 12 | Phase 9 | Pending |
| VEL-01 | Gap 8 | Phase 6 | Pending |
| VEL-02 | Gap 8 | Phase 6 | Pending |
| VEL-03 | Gap 3 | Phase 6 | Pending |

## Out of Scope (v1.1)

- Amazon data integration (Gap 10) — requires LingXing API, separate milestone
- Google Sheets data sync (Gap 11) — requires Google Sheets API setup, separate milestone
- Mobile-first KPI view (Gap 14) — deferred to v1.2
- Role-specific view redesign (Gap 13) — existing role views are functional
- Cash flow views (CFW-01 through CFW-04) — deferred from v1.0
- SellerCloud live sync — credentials still pending
- PO pipeline Kanban visualization (Gap 7) — nice-to-have, deferred

---
*Created: 2026-02-08 for v1.1 milestone*
