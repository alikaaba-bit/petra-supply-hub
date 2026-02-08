# Roadmap: Petra Supply Hub

## Milestones

- **v1.0 MVP** — Phases 1-4 (shipped 2026-02-07) — [archive](milestones/v1.0-ROADMAP.md)
- **v1.1 Analytics & Visualization** — Phases 5-9 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) — SHIPPED 2026-02-07</summary>

- [x] Phase 1: Foundation & Master Data (3/3 plans) — completed 2026-02-06
- [x] Phase 2: Data Integration & Manual Entry (3/3 plans) — completed 2026-02-06
- [x] Phase 3: SellerCloud Integration & Demand Visibility (4/4 plans) — completed 2026-02-06
- [x] Phase 4: Order Tracking & Role-Based Views (3/3 plans) — completed 2026-02-06

</details>

### v1.1 Analytics & Visualization (In Progress)

**Milestone Goal:** Transform the admin panel into an operational command center with interactive charts, time-series comparisons, inventory health tracking, and actionable alerts — all built on data already in the schema.

- [x] **Phase 5: Dashboard Charts & KPI Strip** - Interactive Recharts visualizations and real-time KPI indicators — completed 2026-02-08
- [ ] **Phase 6: Time-Series Analytics & Sales Velocity** - Period-over-period comparisons, trend indicators, and top movers
- [ ] **Phase 7: Forecast vs. Actual Analysis** - SKU-level forecast accuracy tracking with variance alerts
- [ ] **Phase 8: Inventory Health Intelligence** - Days of supply, reorder dates, and stockout projections
- [ ] **Phase 9: Actionable Alerts & Action Center** - Consolidated alert system with severity grouping and follow-up guidance

## Phase Details

### Phase 5: Dashboard Charts & KPI Strip
**Goal**: Team members see interactive revenue charts and a KPI strip the moment they open the dashboard, giving instant visual context on business performance across all brands
**Depends on**: Phase 4 (v1.0 dashboard pages and data layer exist)
**Requirements**: VIZ-01, VIZ-02, VIZ-03, VIZ-04
**Success Criteria** (what must be TRUE):
  1. User sees a top strip on the executive dashboard showing Revenue MTD, Units Shipped MTD, Open Alerts count, and Active POs count — all updating from real data
  2. User can view a revenue trend line chart showing the last 6-12 months with brands stacked, and hover to see per-brand values
  3. User can view a brand performance bar chart comparing revenue across all five brands
  4. User can view a retailer revenue mix chart with brand breakdown showing which retailers drive the most revenue
**Plans**: 2 plans
Plans:
- [x] 05-01-PLAN.md — Install shadcn/ui charts + create dashboardRouter with 4 data endpoints
- [x] 05-02-PLAN.md — Build chart/KPI components and integrate into executive dashboard

### Phase 6: Time-Series Analytics & Sales Velocity
**Goal**: Team members can compare performance across time periods and instantly identify which SKUs are accelerating or declining, enabling proactive inventory and sales decisions
**Depends on**: Phase 5 (charting infrastructure and KPI components exist)
**Requirements**: TSA-01, TSA-02, TSA-03, VEL-01, VEL-02, VEL-03
**Success Criteria** (what must be TRUE):
  1. User can see MTD vs last month comparison with percentage change indicators on key metrics
  2. User can switch between QoQ and YOY comparison views to see longer-term trends
  3. User sees trend arrows (up/down/flat) and delta indicators on all key metrics throughout the dashboard
  4. User can view a Top 10 SKUs leaderboard ranked by revenue with velocity indicators
  5. User can see which SKUs are accelerating or decelerating compared to the prior period, and each brand shows a health signal (growing/healthy/watch/problem)
**Plans**: TBD

### Phase 7: Forecast vs. Actual Analysis
**Goal**: Purchasing and sales teams can see exactly how forecasts compare to actual sales at the SKU level, identifying where they are over- or under-forecasting to adjust future orders
**Depends on**: Phase 5 (charting components available for variance visualization)
**Requirements**: FVA-01, FVA-02, FVA-03
**Success Criteria** (what must be TRUE):
  1. User can view a forecast vs actual units comparison for any SKU for any month, seeing both values side by side
  2. User can immediately see which SKUs are over-forecast (excess inventory risk, highlighted in one color) and which are under-forecast (stockout risk, highlighted in another)
  3. User can see a forecast accuracy percentage metric on the dashboard reflecting overall prediction quality
**Plans**: TBD

### Phase 8: Inventory Health Intelligence
**Goal**: Warehouse and purchasing teams can see at a glance which SKUs are healthy, which need reordering, and when stockouts will occur — without manual spreadsheet calculations
**Depends on**: Phase 7 (forecast data informs inventory projections)
**Requirements**: INV-01, INV-02, INV-03, INV-04
**Success Criteria** (what must be TRUE):
  1. User can see days of supply for every SKU calculated as current stock divided by daily sales velocity
  2. User sees color-coded inventory bands: green (30-90 days), yellow (15-30 days), red (under 15 days), black (over 120 days overstock) — at a glance across all SKUs
  3. User can see a calculated reorder date per SKU that accounts for brand-specific lead times (30 days for most brands, 60 days for HOP)
  4. User can view a stockout risk timeline showing projected stockout dates for at-risk SKUs
**Plans**: TBD

### Phase 9: Actionable Alerts & Action Center
**Goal**: Every team member sees a prioritized list of actions they need to take — reorder by this date, follow up on this late PO, investigate this forecast miss — instead of hunting through data themselves
**Depends on**: Phase 8 (inventory health data drives reorder alerts), Phase 7 (forecast variance drives variance alerts)
**Requirements**: ALT-01, ALT-02, ALT-03, ALT-04
**Success Criteria** (what must be TRUE):
  1. User sees reorder alerts with specific dates and context: "Reorder [SKU] by [date] or stockout at [retailer] by [date]"
  2. User sees late PO alerts identifying which POs are overdue and by how many days, with follow-up guidance
  3. User sees forecast variance alerts when actual vs forecast diverges more than 20% for any SKU
  4. User can open an Action Center section that groups all alerts by severity (critical/warning/info) with the most urgent items at the top
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Master Data | v1.0 | 3/3 | Complete | 2026-02-06 |
| 2. Data Integration & Manual Entry | v1.0 | 3/3 | Complete | 2026-02-06 |
| 3. SellerCloud Integration & Demand Visibility | v1.0 | 4/4 | Complete | 2026-02-06 |
| 4. Order Tracking & Role-Based Views | v1.0 | 3/3 | Complete | 2026-02-06 |
| 5. Dashboard Charts & KPI Strip | v1.1 | 2/2 | Complete | 2026-02-08 |
| 6. Time-Series Analytics & Sales Velocity | v1.1 | 0/0 | Not started | - |
| 7. Forecast vs. Actual Analysis | v1.1 | 0/0 | Not started | - |
| 8. Inventory Health Intelligence | v1.1 | 0/0 | Not started | - |
| 9. Actionable Alerts & Action Center | v1.1 | 0/0 | Not started | - |
