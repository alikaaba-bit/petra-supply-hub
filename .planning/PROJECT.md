# Petra Supply Hub

## What This Is

A centralized supply chain dashboard for Petrograms (Petra Brands) that gives all teams — leadership, sales, purchasing, and warehouse — a single real-time view of demand forecasts, order status, inventory levels, shipment tracking, and cash flow across all five brands (Fomin, Luna Naturals, EveryMood, Roofus, House of Party). Replaces the current fragmented system of brand-specific Excel spreadsheets, WeChat conversations, ClickUp tasks, and SellerCloud lookups.

## Core Value

Every team member can open one dashboard and instantly see: what's the demand, what's been ordered, what's in stock, what's arriving, and what cash is needed — across all brands and retailers.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Demand vs Supply View**
- [ ] Cross-brand demand summary: forecasted units vs ordered units vs in-stock units per brand per month
- [ ] Retailer-level breakdown: what each retailer needs across all brands (TJX, HomeGoods, Walmart Canada, CVS, 5 Below, Ross, Burlington, Bealls, etc.)
- [ ] SKU-level drill-down: demand, ordered, available, in-transit, balance for every SKU
- [ ] Shortage alerts: flag SKUs where forecasted demand exceeds ordered + available inventory
- [ ] Excess alerts: flag SKUs where inventory significantly exceeds demand (Fomin's 226K ordered vs 50K forecasted pattern)

**Order Tracking View**
- [ ] PO lifecycle status: ordered → in production → shipped → in transit → arrived at USA warehouse → allocated
- [ ] Supplier PO tracking: internal POs to China with deposit status, production status, shipping status
- [ ] Retail PO tracking: incoming POs from retailers with fulfillment status
- [ ] Lead time visibility: order-by dates and expected arrival dates per SKU (30-day lead for Fomin/Everymood/Luna/Roofus, 60-day for HOP)

**Cash Flow View**
- [ ] Deposit schedule: all upcoming deposits across brands by date (RMB and USD)
- [ ] Payment timeline: deposit → pre-shipment → shipment payment milestones per PO
- [ ] Total capital requirements: aggregated cash needed across all brands by week/month
- [ ] Payments received tracking: which retailer invoices have been paid

**Multi-Brand Dashboard**
- [ ] Brand selector: view all brands or filter to one brand
- [ ] Role-based views: CEO overview, sales view, purchasing view, warehouse view
- [ ] Clean, visual design that non-technical team members can use without training
- [ ] Mobile-responsive for checking on the go

**Data Integration**
- [ ] Import existing forecast Excel files (RTL FORECAST_MASTER format for Fomin, Luna, EveryMood, Roofus; product-centric format for HOP)
- [ ] SellerCloud API integration: pull POs, inventory levels, shipment tracking, payment status (API access via VPS, credentials pending)
- [ ] Manual data entry fallback: team can update orders and status when API data is incomplete
- [ ] Retail sales data import: Excel upload for sales performance by SKU

### Out of Scope

- Growth Engine / marketing campaign tracking — separate system
- Innovation Engine / product development pipeline — separate system
- D2C / e-commerce order management — this is retail/wholesale focused
- Automated reorder placement — dashboard shows when to reorder, human makes the decision
- Financial reporting (P&L, balance sheet) — Kaaba is building this separately
- Multi-warehouse management — single USA warehouse for now

## Context

**Company:** Petrograms / Petra Brands — consumer products holding company with 5 brands sold through major US retailers and off-price channels.

**Brands and their profiles:**
- **Fomin** — Clean towels (natural, body, exfoliating, gym, hair, cotton pads). Highest volume. 12 SKUs. Primary retailers: TJX channels, Kroger, KeHE. 30-day lead time from China.
- **Luna Naturals** — Mosquito repellent products (wipes, roll-ons, bracelets, sprays, balms, candles, sticks). Seasonal (peaks in summer). 16 SKUs. Retailers: TJX, Target Online, Whole Foods, Ross, Burlington, Bealls. 30-day lead time.
- **EveryMood** — Hand sanitizer mists, body oils, bath & hair mists. New brand (shipping since Nov 2025). 34 SKUs. Retailers: TJX, 5 Below, Ollies, Ross, Burlington, Bealls. 30-day lead time.
- **Roofus** — Pet products (bath, wipes, shampoo, paw cleaner, dental kits, poop bags). Growing brand. 21 SKUs. Retailers: TJX, 5 Below, Burlington, Ross, Bealls, TikTok Shop. 30-day lead time.
- **House of Party (HOP)** — Craft kits (PixelPop, Muddies, Threadies). Different supply chain (product-centric, not retailer-forecast-centric). ~75 SKUs. Retailers: Barnes & Noble, Blick Art, World Market, Hot Topic, TJX, Bealls. 60-day lead time. Multiple suppliers (Butterfly, Homecrest, KKV).

**Current data sources:**
- 6 Excel forecast files (RTL FORECAST_MASTER template for 4 brands, product-centric format for HOP)
- SellerCloud ERP (POs, inventory, shipping, payments) — API access via VPS, pending setup
- Retail sales Excel exports
- Google Sheets master product data (SKUs, retailers): https://docs.google.com/spreadsheets/d/1QId6d-cJW7UKxXtTvR7eG9xhUaydJA1RXcSUuki0KbI/
- ClickUp for PO request workflow

**EOS Engine alignment:**
This dashboard serves as the operational cockpit for three engines:
- **Fulfillment Engine**: PO received → stock check → allocation → fulfillment → delivery
- **Re-Order Engine**: Forecast vs received → excess/short detection → reorder decisions
- **Shipping & Logistics Engine**: China → payment → in transit → USA warehouse → allocated

**Current pain points:**
- No single source of truth — data scattered across Excel, SellerCloud, WeChat, ClickUp
- Demand plans built on intuition and sales conversations, not systematically tracked against actuals
- Visibility gap between what's ordered, what's in production, what's arriving, what's allocated
- Cash flow commitments across brands hard to aggregate (each brand has separate deposit schedules in separate files)
- Inventory accuracy in SellerCloud uncertain (needs validation with Ramiz)

**Team using this:**
- CEO/Founder (Kaaba) — big picture across all brands
- Sales team — what's available to sell, retailer order status
- Purchasing/China ops — what to order, production status, deposit schedules
- Warehouse/fulfillment — what's arriving, what needs to ship, stock levels

## Constraints

- **Timeline**: ASAP — team is making decisions blind, costing money. Need v1 before Q2 planning.
- **Tech stack**: Web application (browser-based). Team is non-technical, UI must be intuitive.
- **Data accuracy**: SellerCloud inventory data needs validation. Dashboard should flag when data may be stale.
- **SellerCloud API**: Access via VPS, credentials coming. Design for API integration but start with Excel import so v1 ships fast.
- **Existing formats**: Must parse the RTL FORECAST_MASTER Excel format (used by Fomin, Luna, EveryMood, Roofus) and HOP's product-centric format.
- **Brand independence**: Each brand has different SKU counts, retailers, lead times, and supplier structures. Dashboard must handle this heterogeneity.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web app over Google Sheets | Need role-based views, SellerCloud integration, and clean UX that sheets can't provide | — Pending |
| Start with Excel import, add API later | SellerCloud API access not yet available; team needs visibility now | — Pending |
| All three views in v1 (demand, orders, cash flow) | Team is blind on all fronts; partial visibility doesn't solve the problem | — Pending |

---
*Last updated: 2026-02-06 after initialization*
