# Petra Supply Hub

## What This Is

A centralized supply chain dashboard for Petra Brands that gives all teams — leadership, sales, purchasing, and warehouse — a single real-time view of demand forecasts, order status, inventory levels, and shipment tracking across all five brands (Fomin, Luna Naturals, EveryMood, Roofus, House of Party). Built with Next.js 16, TypeScript, Drizzle ORM, PostgreSQL, Auth.js v5, and tRPC v11. Replaces the current fragmented system of brand-specific Excel spreadsheets, WeChat conversations, ClickUp tasks, and SellerCloud lookups.

## Core Value

Every team member can open one dashboard and instantly see: what's the demand, what's been ordered, what's in stock, what's arriving, and what cash is needed — across all brands and retailers.

## Current State (v1.1 in planning — 2026-02-08)

**Tech stack:** Next.js 16 + TypeScript + Drizzle ORM + PostgreSQL + Auth.js v5 + tRPC v11 + shadcn/ui + Tailwind CSS 4

**Codebase:** 120 source files, 16,568 LOC TypeScript, 10 tRPC routers, 28 pages, 8-section sidebar

**What's working:**
- 16-table PostgreSQL schema with audit triggers on 9 tables
- Auth with 4 roles (CEO, Sales, Purchasing, Warehouse) and JWT sessions
- Excel import (RTL/HOP/retail sales) with validation wizard
- Manual PO and retail order entry with line items
- SellerCloud API client (awaiting credentials for live testing)
- Demand visibility: cross-brand summary, by-retailer, by-SKU with shortage/excess alerts
- Executive summary dashboard
- PO lifecycle tracking with timeline visualization
- 4 role-based dashboards with server-side auth
- Seed data: 4 users, 5 brands, 158 SKUs, 16 retailers

**What's not yet working:**
- SellerCloud live sync (credentials pending)
- Cash flow views (deferred to v2)
- Automated sync scheduling (manual only)
- Mobile-responsive layout
- Vendor-to-brand mapping for multi-brand SellerCloud sync

## Requirements

### Validated

- ✓ Cross-brand demand summary (DEM-01) — v1.0
- ✓ Retailer-level breakdown (DEM-02) — v1.0
- ✓ SKU-level drill-down (DEM-03) — v1.0
- ✓ Shortage alerts (DEM-04) — v1.0
- ✓ Excess alerts (DEM-05) — v1.0
- ✓ Supplier PO tracking with deposit/production/shipping status (ORD-01) — v1.0
- ✓ Retail PO tracking with fulfillment status (ORD-02) — v1.0
- ✓ Lead time visibility with order-by dates (ORD-03) — v1.0
- ✓ PO lifecycle timeline visualization (ORD-04) — v1.0
- ✓ Brand selector (UX-01) — v1.0
- ✓ Role-based views: CEO, Sales, Purchasing, Warehouse (UX-02) — v1.0
- ✓ Executive summary page (UX-03) — v1.0
- ✓ Clean visual design for non-technical users (UX-04) — v1.0
- ✓ Navigation organized by function (UX-05) — v1.0
- ✓ Excel forecast import: RTL + HOP formats (DAT-01) — v1.0
- ✓ SellerCloud API integration layer (DAT-02) — v1.0
- ✓ Manual data entry for orders (DAT-03) — v1.0
- ✓ Retail sales data import (DAT-04) — v1.0
- ✓ Data validation on import (DAT-05) — v1.0
- ✓ Database schema: 16 tables (FND-01) — v1.0
- ✓ User authentication with roles (FND-02) — v1.0
- ✓ Master data management (FND-03) — v1.0
- ✓ Audit log (FND-04) — v1.0

### Active (v1.1 — Analytics & Visualization)

**Charts & Visualizations**
- [ ] Revenue trend line chart with brand stacking (VIZ-01)
- [ ] Brand performance comparison bar chart (VIZ-02)
- [ ] Retailer revenue mix chart with brand breakdown (VIZ-03)
- [ ] Dashboard top strip with key KPIs (VIZ-04)

**Time-Series Analytics**
- [ ] Period-over-period: MTD vs last month with % change (TSA-01)
- [ ] QoQ and YOY comparison views (TSA-02)
- [ ] Trend arrows and delta indicators (TSA-03)

**Forecast vs. Actual**
- [ ] Forecast vs actual units comparison per SKU/month (FVA-01)
- [ ] Variance highlighting: over/under-forecast risk (FVA-02)
- [ ] Forecast accuracy percentage metric (FVA-03)

**Inventory Health**
- [ ] Days of supply per SKU (INV-01)
- [ ] Color-coded inventory status bands (INV-02)
- [ ] Reorder date calculation based on lead time (INV-03)
- [ ] Stockout risk timeline (INV-04)

**Actionable Alerts**
- [ ] Reorder alerts with specific dates and SKU/retailer context (ALT-01)
- [ ] Late PO alerts with follow-up guidance (ALT-02)
- [ ] Forecast variance alerts >20% (ALT-03)
- [ ] Action center section grouping alerts by severity (ALT-04)

**Sales Velocity**
- [ ] Top 10 SKUs leaderboard by revenue (VEL-01)
- [ ] Biggest movers vs prior period (VEL-02)
- [ ] Brand health signals per brand (VEL-03)

### Deferred

**Cash Flow View (deferred from v1)**
- [ ] Deposit schedule: all upcoming deposits across brands by date (RMB and USD)
- [ ] Payment timeline: deposit → pre-shipment → shipment payment milestones per PO
- [ ] Total capital requirements: aggregated cash needed across all brands by week/month
- [ ] Payments received tracking: which retailer invoices have been paid

**Operational Readiness**
- [ ] SellerCloud live sync with real credentials
- [ ] Automated sync scheduling (cron-based)
- [ ] Vendor-to-brand mapping table for multi-brand PO sync
- [ ] Mobile-responsive layout for on-the-go access

### Out of Scope

- Growth Engine / marketing campaign tracking — separate system
- Innovation Engine / product development pipeline — separate system
- D2C / e-commerce order management — this is retail/wholesale focused
- Automated reorder placement — dashboard shows when to reorder, human decides
- Financial reporting (P&L, balance sheet) — Kaaba building separately
- Multi-warehouse management — single USA warehouse for now
- AI/ML demand forecasting — simple historical patterns sufficient at this scale
- EDI integration with retailers — not needed at current volume

## Context

**Company:** Petra Brands — consumer products holding company with 5 brands sold through major US retailers and off-price channels.

**Brands and their profiles:**
- **Fomin** — Clean towels. Highest volume. 12 SKUs. TJX, Kroger, KeHE. 30-day lead time.
- **Luna Naturals** — Mosquito repellent. Seasonal. 16 SKUs. TJX, Target Online, Whole Foods. 30-day lead time.
- **EveryMood** — Hand sanitizer mists, body oils. New brand. 34 SKUs. TJX, 5 Below, Ollies. 30-day lead time.
- **Roofus** — Pet products. Growing brand. 21 SKUs. TJX, 5 Below, Burlington. 30-day lead time.
- **House of Party (HOP)** — Craft kits. Different supply chain. ~75 SKUs. Barnes & Noble, Blick Art. 60-day lead time.

**Team:** CEO (Kaaba), Sales, Purchasing/China ops, Warehouse/fulfillment

**Data sources:** Excel forecasts, SellerCloud ERP (pending), retail sales exports, Google Sheets master data

## Constraints

- **SellerCloud API**: Credentials pending. Integration layer built, needs live testing.
- **Excel formats**: RTL FORECAST_MASTER parser working. HOP parser tentative (needs real files).
- **Brand independence**: Each brand has different SKU counts, retailers, lead times. Dashboard handles this.
- **Non-technical users**: UI must be intuitive without training.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web app over Google Sheets | Need role-based views, SellerCloud integration, and clean UX | ✓ Good — shipped with 4 roles, 28 pages |
| Start with Excel import, add API later | SellerCloud API access not yet available | ✓ Good — team can start using immediately |
| Cash flow deferred to v2 | Focus on demand and order tracking first | ✓ Good — kept scope manageable |
| Drizzle ORM over Prisma | Lighter serverless footprint | ✓ Good — clean schema, fast migrations |
| JWT strategy for Auth.js | Required for Credentials provider | ✓ Good — simple, no session table needed |
| PostgreSQL-level aggregation | SQL templates instead of client-side reduce | ✓ Good — performant demand calculations |
| Manual sync only in v1.0 | Avoid complexity of cron scheduling | — Pending — needs automated sync in v2 |

| Recharts for visualizations | Lightweight, composable, React-native charting | — Pending — v1.1 |

---
*Last updated: 2026-02-08 — v1.1 milestone started*
