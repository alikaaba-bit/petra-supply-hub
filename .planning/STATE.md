# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** Every team member can open one dashboard and instantly see: what's the demand, what's been ordered, what's in stock, what's arriving, and what cash is needed — across all brands and retailers.

**Current focus:** v1.1 Analytics & Visualization — Phase 5: Dashboard Charts & KPI Strip

## Current Position

Phase: 5 of 9 (Dashboard Charts & KPI Strip)
Plan: 1 of ? — Plan 05-01 complete
Status: In progress
Last activity: 2026-02-08 — Completed 05-01-PLAN.md (chart foundation)

Progress: [█░░░░░░░░░] ~5% (v1.1 - 1 plan complete)

## Milestone History

- **v1.0 MVP** — 4 phases, 13 plans, ~1.4 hours — shipped 2026-02-07

## Performance Metrics

**v1.0 Velocity:**
- Total plans completed: 13
- Average duration: 6.2 min
- Total execution time: ~1.4 hours
- Codebase: 120 files, 16,568 LOC TypeScript

## Accumulated Context

### Key Technical Facts

- **11 tRPC routers:** brands, skus, retailers, audit, import, orders, sellercloud, demand, alerts, tracking, dashboard
- **28 dashboard pages** with 8-section sidebar navigation
- **4 roles:** CEO (universal access), Sales, Purchasing, Warehouse
- **Auth pattern:** Server Component checks session.user.role, Client Component fetches data
- **Demand formulas:** Available = OnHand + InTransit - Allocated; Shortage = Forecasted - Ordered - Available
- **Lead time:** calculateOrderByDate subtracts (leadTimeDays + 5) from need-by date
- **PostgreSQL aggregation:** Drizzle sql templates for SUM/GROUP BY (SQL SUM returns strings)
- **Wide-format transformation:** Map-based pivoting for Recharts stacked charts (brands as columns)
- **Chart library:** shadcn/ui chart components with Recharts (v2.15.4)
- **Edge Runtime fix:** auth.config.ts (edge-safe) + auth.ts (db-backed) split pattern
- **Login fix:** Use signIn from next-auth/react, not raw fetch (CSRF handling)

### v1.1 Roadmap (5 phases, 21 requirements)

- Phase 5: Dashboard Charts & KPI Strip (VIZ-01..04) — Recharts setup, revenue charts, KPI strip
- Phase 6: Time-Series Analytics & Sales Velocity (TSA-01..03, VEL-01..03) — period comparisons, top movers
- Phase 7: Forecast vs. Actual Analysis (FVA-01..03) — variance tracking, accuracy metric
- Phase 8: Inventory Health Intelligence (INV-01..04) — days of supply, reorder dates, stockout timeline
- Phase 9: Actionable Alerts & Action Center (ALT-01..04) — alert system, severity grouping

### Open Items (deferred)

- SellerCloud API credentials needed for live testing
- Cash flow features (CFW-01 through CFW-04)
- Automated sync scheduling
- Mobile-responsive layout

## Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 05-01 | Use wide format for Recharts stacked charts | Recharts expects brands as columns, not rows. Map-based pivoting transforms long format SQL. |
| 05-01 | Inline alert calculation in kpiSummary | Avoid circular dependencies with alerts router. Simpler implementation. |
| 05-01 | Hard-code brand names in revenueTrend | Ensure consistent chart data (fill missing brands with 0). Brands: Fomin, Luna Naturals, EveryMood, Roofus, House of Party. |

## Session Continuity

Last session: 2026-02-08 (Phase 5 Plan 1 execution)
Stopped at: Completed 05-01-PLAN.md (chart foundation)
Resume file: None
Resume with: Next plan in Phase 5 (chart UI components)
