# Requirements: Petra Supply Hub

**Defined:** 2026-02-06
**Core Value:** Every team member can open one dashboard and instantly see demand, orders, inventory, and cash flow across all brands and retailers.

## v1 Requirements

### Demand Planning

- [ ] **DEM-01**: Dashboard shows cross-brand demand summary — forecasted units vs ordered units vs in-stock units per brand per month
- [ ] **DEM-02**: Retailer-level breakdown showing what each retailer needs across all brands (TJX, HomeGoods, Walmart Canada, CVS, 5 Below, Ross, Burlington, Bealls, etc.)
- [ ] **DEM-03**: SKU-level drill-down displaying demand, ordered, available, in-transit, and balance for every SKU
- [ ] **DEM-04**: Shortage alerts auto-flag SKUs where forecasted demand exceeds ordered + available inventory
- [ ] **DEM-05**: Excess alerts auto-flag SKUs where ordered/available significantly exceeds forecasted demand

### Order Tracking

- [ ] **ORD-01**: Supplier PO tracking — internal POs to China showing deposit status, production status, shipping status
- [ ] **ORD-02**: Retail PO tracking — incoming POs from retailers with fulfillment status
- [ ] **ORD-03**: Lead time visibility showing order-by dates and expected arrival dates per SKU (30-day for Fomin/Luna/EveryMood/Roofus, 60-day for HOP)
- [ ] **ORD-04**: PO lifecycle timeline — visual pipeline: ordered → in production → shipped → in transit → arrived at warehouse → allocated

### Dashboard & UX

- [ ] **UX-01**: Brand selector allowing users to view all brands or filter to a single brand
- [ ] **UX-02**: Role-based views — CEO overview, sales view, purchasing view, warehouse view
- [ ] **UX-03**: Executive summary page — one-screen health check with top alerts, key numbers, and action items
- [ ] **UX-04**: Clean, visual design usable by non-technical team members without training
- [ ] **UX-05**: Navigation organized by brand and by function (demand, orders, cash flow)

### Data Integration

- [ ] **DAT-01**: Excel forecast import — parse RTL FORECAST_MASTER format (Fomin, Luna, EveryMood, Roofus) and HOP product-centric format
- [ ] **DAT-02**: SellerCloud API integration — pull POs, inventory levels, shipment tracking, and payment status automatically
- [ ] **DAT-03**: Manual data entry — team can create/update orders and status when API data is incomplete or unavailable
- [ ] **DAT-04**: Retail sales data import — upload retail sales Excel files for SKU performance tracking
- [ ] **DAT-05**: Data validation on import — flag errors, show preview before committing, reject malformed data

### Foundation

- [ ] **FND-01**: Database schema supporting 5 brands, ~160 SKUs, ~12 retailers, POs, inventory, forecasts, payments
- [ ] **FND-02**: User authentication with role assignment (CEO, sales, purchasing, warehouse)
- [ ] **FND-03**: Master data management — brands, SKUs, retailers as canonical reference data
- [ ] **FND-04**: Audit log tracking who changed what data and when

## v2 Requirements

### Cash Flow (Deferred from v1)
- **CFW-01**: Deposit schedule showing all upcoming deposits across brands by date in both RMB and USD
- **CFW-02**: Total capital requirements aggregated across all brands by week and month
- **CFW-03**: Payment tracking showing which retailer invoices have been paid vs outstanding
- **CFW-04**: Cash flow timeline visualizing deposit → pre-shipment → shipment payment milestones per PO

### Mobile & Accessibility
- **MOB-01**: Mobile-responsive design for phones and tablets
- **MOB-02**: Push notifications for critical alerts (shortage, overdue payments)

### Advanced Forecasting
- **FOR-01**: Automated forecast suggestions based on historical averages and seasonal patterns
- **FOR-02**: Forecast accuracy tracking — predicted vs actual over time
- **FOR-03**: Scenario planning — "what if" modeling for demand changes

### Enhanced Reporting
- **RPT-01**: Weekly executive summary email digest
- **RPT-02**: Export any view to Excel/PDF
- **RPT-03**: Performance trends (week-over-week, month-over-month)
- **RPT-04**: Forecast accuracy report per brand/retailer

### Re-Order Automation
- **ROD-01**: Automated reorder point calculations (lead time × avg daily demand + safety stock)
- **ROD-02**: Reorder suggestions with one-click PO generation
- **ROD-03**: ABC analysis classifying SKUs by importance/velocity

### Collaboration
- **COL-01**: Notes and comments on POs and forecasts
- **COL-02**: Team activity feed showing recent changes

## Out of Scope

| Feature | Reason |
|---------|--------|
| Growth Engine / marketing campaigns | Separate system — not supply chain |
| Innovation Engine / product development | Separate system — not supply chain |
| D2C / e-commerce order management | Dashboard is retail/wholesale focused |
| Automated PO placement to China suppliers | v1 shows when to reorder; human decides |
| Full accounting / P&L / balance sheet | Kaaba building separately |
| Multi-warehouse management | Single USA warehouse for now |
| AI/ML demand forecasting | Simple historical patterns sufficient at this scale |
| EDI integration with retailers | Not needed at current volume |
| Barcode scanning / warehouse management | Not running own warehouse operations |
| Custom report builder | Pre-built views sufficient; avoid scope creep |
| Real-time chat / collaboration features | Use existing tools (WeChat, ClickUp) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 1 | Complete |
| FND-02 | Phase 1 | Complete |
| FND-03 | Phase 1 | Complete |
| FND-04 | Phase 1 | Complete |
| UX-04 | Phase 1 | Complete |
| DAT-01 | Phase 2 | Pending |
| DAT-03 | Phase 2 | Pending |
| DAT-04 | Phase 2 | Pending |
| DAT-05 | Phase 2 | Pending |
| DAT-02 | Phase 3 | Pending |
| DEM-01 | Phase 3 | Pending |
| DEM-02 | Phase 3 | Pending |
| DEM-03 | Phase 3 | Pending |
| DEM-04 | Phase 3 | Pending |
| DEM-05 | Phase 3 | Pending |
| UX-01 | Phase 3 | Pending |
| UX-03 | Phase 3 | Pending |
| UX-05 | Phase 3 | Pending |
| ORD-01 | Phase 4 | Pending |
| ORD-02 | Phase 4 | Pending |
| ORD-03 | Phase 4 | Pending |
| ORD-04 | Phase 4 | Pending |
| UX-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✓

**Deferred:**
- CFW-01, CFW-02, CFW-03, CFW-04 moved to v2 (next session)

---
*Requirements defined: 2026-02-06*
*Last updated: 2026-02-06 after roadmap revision*
