# Petra Supply Hub — Team Operations Guide

How each team member uses the dashboard and what data they're responsible for keeping up to date.

**Login:** https://petrabrands.com (or http://localhost:3000 for local)
**Password for all accounts:** admin123

---

## Table of Contents

1. [How the Dashboard Stays Accurate](#how-the-dashboard-stays-accurate)
2. [Sales Team](#sales-team)
3. [Purchasing / China Ops](#purchasing--china-ops)
4. [Warehouse / Fulfillment](#warehouse--fulfillment)
5. [CEO (Kaaba)](#ceo-kaaba)
6. [Weekly Data Checklist](#weekly-data-checklist)
7. [Excel File Formats](#excel-file-formats)

---

## How the Dashboard Stays Accurate

The dashboard is only as good as the data in it. Here's what feeds it:

```
WHAT NEEDS TO HAPPEN              WHO DOES IT           HOW OFTEN
─────────────────────────────────────────────────────────────────
Upload forecast spreadsheets      Sales                 Monthly (when retailers send updated forecasts)
Enter retail orders (POs from     Sales                 As they come in
  retailers like TJX, Five Below)
Upload retail sales data          Sales                 Monthly (when sell-through reports arrive)
Enter supplier POs (orders to     Purchasing            When a new PO is placed with China
  China factories)
Update PO status (confirmed →     Purchasing            As status changes (WeChat updates from factory)
  in production → shipped)
Update inventory levels           Warehouse             Weekly or when shipments arrive/ship out
Mark retail orders as shipped     Warehouse             When orders ship to retailers
```

If any of these fall behind, the demand calculations and alerts will be wrong.

---

## Sales Team

**Login:** sales@petrabrands.com
**Dashboard:** `/roles/sales` — shows retailer orders, demand by retailer, forecast summary

### What You See

- **Retailer Order Status** — all retail orders grouped by status (received, processing, shipped, delivered)
- **Demand by Retailer** — what each retailer needs this month vs. what's been ordered from China
- **Forecast Summary** — 4-month outlook showing if supply meets demand

### What You Need to Do

#### 1. Upload Forecast Spreadsheets (Monthly)

When you get updated demand forecasts from retailers:

1. Go to **Import** in the sidebar
2. Choose **Forecast Import**
3. Drag and drop the .xlsx file
4. The system auto-detects the format:
   - **RTL format** for Fomin, Luna Naturals, EveryMood, Roofus
   - **HOP format** for House of Party
5. Review the validation results — fix any errors (usually misspelled SKU or retailer names)
6. Confirm the import

**RTL spreadsheet format** (the one you already use):
- One sheet per month, named like "Jan 2026 PO", "Feb 2026 PO"
- Row 1: "Retailer" header, then SKU codes across columns
- Rows 2+: Retailer names in column A, forecasted units in each SKU column

**HOP spreadsheet format:**
- Single sheet
- Column A: product/SKU codes
- Column headers: "Barnes & Noble - Jan 2026", "Five Below - Feb 2026", etc.
- Cell values: forecasted units

**Important:** Re-importing a file overwrites the old forecast for those SKU/retailer/month combinations. This is safe — it just updates with the latest numbers.

#### 2. Enter Retail Orders (As Received)

When a retailer sends you a PO:

1. Go to **Orders → Retail Orders → New**
2. Fill in:
   - **Retailer** — select from dropdown (TJX - TJ Maxx, Five Below, etc.)
   - **Brand** — which brand this order is for
   - **Retailer PO Number** — the PO number from the retailer
   - **Status** — usually "received" when it first comes in
   - **Order Date** and **Ship By Date**
3. Add line items — select SKUs and quantities
4. Save

**Update status** as the order progresses: received → confirmed → processing → shipped → delivered

#### 3. Upload Retail Sales Data (Monthly)

When you get sell-through reports from retailers:

1. Go to **Import** in the sidebar
2. Choose **Retail Sales Import**
3. Upload the .xlsx file with columns:
   - SKU
   - Retailer (or Customer)
   - Month (or Date or Period)
   - Units Sold (or Qty Sold or Quantity)
   - Revenue (optional)
4. Review and confirm

This data feeds the sales performance tracking and helps validate whether forecasts were accurate.

---

## Purchasing / China Ops

**Login:** purchasing@petrabrands.com
**Dashboard:** `/roles/purchasing` — shows supply gaps, PO status, lead time alerts

### What You See

- **Top Supply Gaps** — SKUs where demand exceeds supply (these need POs placed)
- **PO Tracking Status** — all supplier POs grouped by status
- **Lead Time Alerts** — POs that are overdue or need to be ordered within 7 days
- **Active POs by Order-By Date** — sorted by urgency

### What You Need to Do

#### 1. Enter New Supplier POs (When Placed)

When you place an order with a China factory:

1. Go to **Orders → Purchase Orders → New**
2. Fill in:
   - **PO Number** — your internal PO number (e.g., PO-FOM-2026-001)
   - **Brand** — which brand
   - **Supplier** — factory name (e.g., "Shenzhen GreenTech Manufacturing")
   - **Status** — "draft" if not yet sent, "ordered" if confirmed with factory
   - **Order Date**
   - **Expected Arrival** — calculate: order date + lead time (30 days for most brands, 60 for HOP)
   - **Currency** — USD or CNY
   - **Deposit Amount** — typically 30% of total
3. Add line items — select SKUs, quantities, and unit costs
4. Save

#### 2. Update PO Status (As It Progresses)

As you get updates from the factory (usually via WeChat):

1. Go to **Tracking → Supplier Orders**
2. Click on the PO
3. Update the status:

| Stage | When to Update |
|-------|----------------|
| **draft** | PO created but not sent to factory |
| **ordered** | PO sent and acknowledged by factory |
| **confirmed** | Factory confirmed production schedule |
| **in_production** | Factory started manufacturing |
| **shipped** | Factory shipped, you have tracking number |
| **in_transit** | On the water / in air freight |
| **arrived** | Arrived at US warehouse |
| **allocated** | Inventory counted and assigned to orders |

**This is critical.** The dashboard uses PO status to show the pipeline and calculate when inventory will be available. If you don't update status, the CEO sees stale data.

#### 3. Monitor Supply Gaps

Check your dashboard daily for:
- **Red shortage alerts** — SKUs that need ordering NOW
- **Lead time overdue** — POs past their order-by date
- **Lead time urgent** — POs that need to be placed within 7 days

The system calculates order-by dates as: `need-by date - lead time days - 5 days buffer`

---

## Warehouse / Fulfillment

**Login:** warehouse@petrabrands.com
**Dashboard:** `/roles/warehouse` — shows inbound shipments, stock levels, items needing allocation

### What You See

- **Current Stock Levels** — total on hand, in transit, allocated, and available across all brands
- **Inbound Shipments** — POs with status "shipped" or "in_transit" that are heading to you
- **Items Needing Allocation** — retail orders in "confirmed" or "processing" that need picking
- **Stock by Brand** — breakdown of inventory per brand

### What You Need to Do

#### 1. Update Inventory When Shipments Arrive

When a container or shipment arrives at the warehouse:

1. Go to **SKUs** in the sidebar
2. Find the SKUs that arrived
3. Update the inventory numbers:
   - **On Hand** — add the received quantity to current on-hand
   - **In Transit** — reduce to 0 (or remaining in-transit amount)
4. Also update the related PO status to "arrived" (coordinate with Purchasing)

*Note: Once SellerCloud is connected, this will sync automatically. For now, manual updates are needed.*

#### 2. Update Allocation When Picking Orders

When you pick and pack items for a retail order:

1. Go to **Orders → Retail Orders**
2. Find the order
3. Update status to "shipped" when it ships
4. Update inventory:
   - **Allocated** — reduce by the shipped quantity
   - **On Hand** — reduce by the shipped quantity

#### 3. Mark Retail Orders as Shipped

When a shipment goes out to a retailer:

1. Go to **Tracking → Retail Orders** (or your dashboard "Items Needing Allocation")
2. Click the order
3. Change status from "processing" → "shipped"
4. Add tracking info in notes if available

---

## CEO (Kaaba)

**Login:** kaaba@petrabrands.com
**Dashboard:** `/roles/ceo` — shows everything: alerts, order pipeline, demand health

### What You See

- **Shortage Alerts** — how many SKUs are undersupplied (red = problem)
- **Excess Alerts** — how many SKUs are oversupplied (amber = capital tied up)
- **Order Pipeline** — PO and retail order counts by status
- **Demand Health** — 4-month balance view (green = covered, red = short)
- **Quick Links** — jump to demand summary, supplier orders, retail orders, executive summary

### What You Need to Do

- **Review alerts** daily — shortage alerts mean lost sales, excess alerts mean cash tied up
- **Check demand health** weekly — are the next 4 months green or red?
- **Drill down** — click through to demand by SKU or by retailer when something looks off
- **Ensure the team is updating data** — the dashboard is only accurate if Sales uploads forecasts, Purchasing enters POs, and Warehouse updates inventory

### Executive Summary Page

Go to `/executive` for the full-screen health check with all key numbers on one page.

---

## Weekly Data Checklist

Print this or use it as a weekly reminder:

### Monday — Sales
- [ ] Any new retail POs received? → Enter in Orders → Retail Orders → New
- [ ] Any updated forecasts from retailers? → Import via Import → Forecast
- [ ] Update status on any existing retail orders (confirmed? shipped? delivered?)

### Monday — Purchasing
- [ ] Check Supply Gaps on Purchasing dashboard → place POs for anything in red
- [ ] Update status on all active POs (any WeChat updates from factories?)
- [ ] Check Lead Time Alerts → anything overdue or urgent?

### Monday — Warehouse
- [ ] Did any shipments arrive this week? → Update inventory + PO status to "arrived"
- [ ] Did any retail orders ship out? → Update order status to "shipped" + adjust inventory
- [ ] Review "Items Needing Allocation" → any orders stuck in processing?

### Friday — CEO
- [ ] Check CEO dashboard → any red shortage alerts?
- [ ] Check Demand Health → are all 4 months green?
- [ ] Review the executive summary at /executive
- [ ] If data looks stale, follow up with the team

---

## Excel File Formats

### RTL Forecast (Fomin, Luna, EveryMood, Roofus)

```
File: FORECAST_MASTER_2026.xlsx
Sheets: "Jan 2026 PO", "Feb 2026 PO", "Mar 2026 PO", ...

Sheet "Jan 2026 PO":
┌──────────────────┬───────────┬───────────┬───────────┐
│ Retailer         │ FOM-NT-01 │ FOM-NT-02 │ FOM-BT-01 │
├──────────────────┼───────────┼───────────┼───────────┤
│ TJX - TJ Maxx   │ 500       │ 300       │ 200       │
│ Kroger           │ 800       │ 400       │ 150       │
│ CVS Pharmacy     │ 200       │ 100       │ 75        │
└──────────────────┴───────────┴───────────┴───────────┘
```

**Rules:**
- Sheet name MUST follow pattern: "{Month} {Year} PO"
- SKU codes in header MUST match SKUs in the system exactly
- Retailer names MUST match retailer names in the system exactly
- Empty cells are skipped (not treated as zero)

### HOP Forecast (House of Party)

```
File: HOP_FORECAST_2026.xlsx
Sheet: (first sheet, any name)

┌─────────────┬─────────────────────────┬───────────────────────┐
│ Product     │ Barnes & Noble - Jan 26 │ Five Below - Jan 2026 │
├─────────────┼─────────────────────────┼───────────────────────┤
│ HOP-PP-001  │ 300                     │ 150                   │
│ HOP-MD-002  │ 200                     │ 100                   │
└─────────────┴─────────────────────────┴───────────────────────┘
```

**Rules:**
- First column header must contain "Product" or "Item"
- Other column headers should follow: "{Retailer} - {Month} {Year}"
- SKU codes must match system SKUs exactly

### Retail Sales

```
File: SALES_REPORT_JAN_2026.xlsx
Sheet: (first sheet, any name)

┌───────────┬──────────────────┬────────────┬────────────┬──────────┐
│ SKU       │ Retailer         │ Month      │ Units Sold │ Revenue  │
├───────────┼──────────────────┼────────────┼────────────┼──────────┤
│ FOM-NT-01 │ TJX - TJ Maxx   │ 2026-01-01 │ 450        │ 2697.00  │
│ LUN-WP-01 │ Whole Foods      │ 2026-01-15 │ 120        │ 1199.88  │
└───────────┴──────────────────┴────────────┴────────────┴──────────┘
```

**Rules:**
- Column headers are flexible (case-insensitive)
- Date can be any day in the month — it normalizes to first of month
- Revenue column is optional
- Units Sold can be 0

---

## Accounts

| Role | Email | Access |
|------|-------|--------|
| CEO | kaaba@petrabrands.com | Everything — all pages, all dashboards |
| Sales | sales@petrabrands.com | Sales dashboard + demand views + orders + import |
| Purchasing | purchasing@petrabrands.com | Purchasing dashboard + PO tracking + demand views |
| Warehouse | warehouse@petrabrands.com | Warehouse dashboard + inventory + order status |

---

*Questions? Reach Kaaba or check the [Data Flow docs](./DATA-FLOW.md) for technical details.*
