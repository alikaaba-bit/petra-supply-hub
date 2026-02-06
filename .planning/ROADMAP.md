# Roadmap: Petra Supply Hub

## Overview

This roadmap transforms Petra Brands from scattered Excel spreadsheets to a unified supply chain dashboard across 5 brands, 160 SKUs, and 12 retailers. The journey moves from establishing technical foundation and master data structures, through enabling data integration and demand visibility, to delivering complete order tracking with role-based views. Each phase builds on the previous, delivering incremental value while maintaining Excel compatibility during transition.

**Note:** Cash flow visibility features (CFW-01 through CFW-04) have been deferred to next session/v2. Current roadmap focuses on 4 phases covering demand visibility and order tracking.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Master Data** - Database schema, authentication, and core data structures
- [ ] **Phase 2: Data Integration & Manual Entry** - Excel import, manual entry fallback, and data validation
- [ ] **Phase 3: SellerCloud Integration & Demand Visibility** - API integration, demand vs supply calculations, and executive dashboard
- [ ] **Phase 4: Order Tracking & Role-Based Views** - PO lifecycle tracking, supplier and retail order management, role-specific dashboards

## Phase Details

### Phase 1: Foundation & Master Data
**Goal**: Establish technical foundation with database schema, authentication system, and canonical master data for all brands, SKUs, and retailers

**Depends on**: Nothing (first phase)

**Requirements**: FND-01, FND-02, FND-03, FND-04, UX-04

**Success Criteria** (what must be TRUE):
  1. Database schema exists supporting 5 brands, 160 SKUs, 12 retailers, with tables for forecasts, POs, inventory, and payments
  2. Users can log in with assigned roles (CEO, sales, purchasing, warehouse) and access the dashboard
  3. Master data tables contain canonical reference data for all brands, SKUs, and retailers loaded from Google Sheets source
  4. Audit log captures who changed what data and when, visible to authorized users
  5. Dashboard UI displays clean, visual design that non-technical team members can navigate without training

**Plans**: TBD

Plans:
- [ ] 01-01: TBD during plan-phase
- [ ] 01-02: TBD during plan-phase
- [ ] 01-03: TBD during plan-phase

### Phase 2: Data Integration & Manual Entry
**Goal**: Enable team to input forecast and sales data through Excel uploads and manual entry, with validation to prevent bad data

**Depends on**: Phase 1

**Requirements**: DAT-01, DAT-03, DAT-04, DAT-05

**Success Criteria** (what must be TRUE):
  1. Team can upload Excel files in RTL FORECAST_MASTER format (Fomin, Luna, EveryMood, Roofus) and HOP product-centric format, seeing parsed data before committing
  2. Team can manually create and update orders when Excel data is incomplete or SellerCloud data is unavailable
  3. Team can upload retail sales Excel files for SKU performance tracking across retailers
  4. Data validation flags errors during import (missing SKUs, invalid dates, duplicate entries), shows preview, and rejects malformed data
  5. Imported data appears immediately in dashboard views after validation passes

**Plans**: TBD

Plans:
- [ ] 02-01: TBD during plan-phase
- [ ] 02-02: TBD during plan-phase
- [ ] 02-03: TBD during plan-phase

### Phase 3: SellerCloud Integration & Demand Visibility
**Goal**: Automatically pull POs and inventory from SellerCloud, display demand vs supply gaps across all brands, and provide executive summary dashboard

**Depends on**: Phase 2

**Requirements**: DAT-02, DEM-01, DEM-02, DEM-03, DEM-04, DEM-05, UX-01, UX-03, UX-05

**Success Criteria** (what must be TRUE):
  1. Dashboard automatically pulls POs, inventory levels, shipment tracking, and payment status from SellerCloud via API without manual intervention
  2. Cross-brand demand summary shows forecasted units vs ordered units vs in-stock units per brand per month
  3. Retailer-level breakdown displays what each retailer needs across all brands (TJX, HomeGoods, Walmart Canada, CVS, 5 Below, Ross, Burlington, Bealls, etc.)
  4. SKU-level drill-down shows demand, ordered, available, in-transit, and balance for every SKU
  5. Shortage alerts automatically flag SKUs where forecasted demand exceeds ordered + available inventory
  6. Excess alerts automatically flag SKUs where ordered/available significantly exceeds forecasted demand (like Fomin's 226K vs 50K pattern)
  7. Brand selector allows users to view all brands or filter to a single brand
  8. Executive summary page provides one-screen health check with top alerts, key numbers, and action items
  9. Navigation organizes views by brand and by function (demand, orders, cash flow)

**Plans**: TBD

Plans:
- [ ] 03-01: TBD during plan-phase
- [ ] 03-02: TBD during plan-phase
- [ ] 03-03: TBD during plan-phase
- [ ] 03-04: TBD during plan-phase

### Phase 4: Order Tracking & Role-Based Views
**Goal**: Track complete PO lifecycle from China suppliers and retail customers, with role-specific dashboard views for each team member type

**Depends on**: Phase 3

**Requirements**: ORD-01, ORD-02, ORD-03, ORD-04, UX-02

**Success Criteria** (what must be TRUE):
  1. Supplier PO tracking displays internal POs to China with deposit status, production status, and shipping status
  2. Retail PO tracking shows incoming POs from retailers with fulfillment status
  3. Lead time visibility displays order-by dates and expected arrival dates per SKU (30-day for Fomin/Luna/EveryMood/Roofus, 60-day for HOP)
  4. PO lifecycle timeline visualizes the pipeline: ordered → in production → shipped → in transit → arrived at warehouse → allocated
  5. Role-based views show appropriate information for each user type (CEO: overview and alerts; Sales: retailer status and forecasts; Purchasing: supply gaps and PO tracking; Warehouse: inbound shipments and stock levels)

**Plans**: TBD

Plans:
- [ ] 04-01: TBD during plan-phase
- [ ] 04-02: TBD during plan-phase
- [ ] 04-03: TBD during plan-phase

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Master Data | 0/TBD | Not started | - |
| 2. Data Integration & Manual Entry | 0/TBD | Not started | - |
| 3. SellerCloud Integration & Demand Visibility | 0/TBD | Not started | - |
| 4. Order Tracking & Role-Based Views | 0/TBD | Not started | - |
