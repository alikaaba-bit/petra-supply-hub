# Petra Supply Hub — Data Flow & Integration Guide

How data gets into and moves through the system.

---

## Table of Contents

1. [Data Sources Overview](#data-sources-overview)
2. [Excel Import — Forecast Files](#excel-import--forecast-files)
3. [Excel Import — Retail Sales Files](#excel-import--retail-sales-files)
4. [SellerCloud API Sync](#sellercloud-api-sync)
5. [Manual Data Entry](#manual-data-entry)
6. [How the Demand Tab Calculates Numbers](#how-the-demand-tab-calculates-numbers)
7. [Database Tables & Relationships](#database-tables--relationships)
8. [Import Wizard UI Flow](#import-wizard-ui-flow)

---

## Data Sources Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    DATA INPUTS                               │
├──────────────┬──────────────┬────────────┬───────────────────┤
│ Excel Import │ SellerCloud  │ Manual     │ Seed Script       │
│ (.xlsx)      │ API          │ Forms      │ (dev only)        │
├──────────────┼──────────────┼────────────┼───────────────────┤
│ RTL Forecast │ Purchase     │ New PO     │ npm run db:seed   │
│ HOP Forecast │   Orders     │ New Retail │ tsx seed-demo-    │
│ Retail Sales │ Inventory    │   Order    │   data.ts         │
└──────┬───────┴──────┬───────┴─────┬──────┴───────────────────┘
       │              │             │
       ▼              ▼             ▼
┌──────────────────────────────────────────────────────────────┐
│                    DATABASE TABLES                            │
├──────────┬──────────┬──────────┬──────────┬──────────────────┤
│forecasts │inventory │purchase  │retail    │payments          │
│          │          │_orders + │_orders + │                  │
│retail    │          │po_line   │retail    │                  │
│_sales    │          │_items    │_order    │                  │
│          │          │          │_line     │                  │
│          │          │          │_items    │                  │
└──────┬───┴──────┬───┴──────────┴──────┬───┴──────────────────┘
       │          │                     │
       ▼          ▼                     ▼
┌──────────────────────────────────────────────────────────────┐
│                    DASHBOARD VIEWS                            │
├──────────────┬──────────────┬────────────┬───────────────────┤
│ Demand       │ Inventory    │ Orders     │ Executive         │
│ Summary      │ Levels       │ Tracking   │ Summary           │
│ By Retailer  │              │ PO Timeline│ Alerts            │
│ By SKU       │              │            │                   │
└──────────────┴──────────────┴────────────┴───────────────────┘
```

---

## Excel Import — Forecast Files

The app supports two Excel forecast formats used by Petra Brands. Both go through the same import wizard at `/import`.

### RTL Format (Fomin, Luna Naturals, EveryMood, Roofus)

This is the standard "FORECAST_MASTER" spreadsheet used for the four RTL brands.

**File structure:**
- Multiple sheets, one per month
- Sheet name format: `{Month} {Year} PO` (e.g., "Jan 2026 PO", "Feb 2026 PO")

**Sheet layout:**

| | A | B | C | D | ... |
|---|---|---|---|---|---|
| **1** | Retailer | FOM-NT-01 | FOM-NT-02 | FOM-BT-01 | ... |
| **2** | TJX - TJ Maxx | 500 | 300 | 200 | ... |
| **3** | Kroger | 800 | 400 | 150 | ... |
| **4** | CVS Pharmacy | 200 | 100 | 75 | ... |

- **Row 1:** Header row — Column A = "Retailer", Columns B+ = SKU codes
- **Row 2+:** Data rows — Column A = retailer name, Columns B+ = forecasted units
- **Sheet name** determines the month (parsed from "Jan 2026 PO" → January 2026)
- Empty cells or non-numeric values are skipped

**What gets created:** One `forecasts` row per SKU × Retailer × Month combination.

### HOP Format (House of Party)

House of Party uses a different spreadsheet layout because their supply chain is product-centric.

**File structure:**
- Single sheet (first sheet only)
- First column header contains "Product" or "Item"

**Sheet layout:**

| | A | B | C | D | ... |
|---|---|---|---|---|---|
| **1** | Product | Barnes & Noble - Jan 2026 | Five Below - Jan 2026 | Barnes & Noble - Feb 2026 | ... |
| **2** | HOP-PP-001 | 300 | 150 | 400 | ... |
| **3** | HOP-MD-002 | 200 | 100 | 250 | ... |

- **Column A:** SKU / product identifier
- **Column headers B+:** `{Retailer Name} - {Month} {Year}` pattern
- **Cell values:** Forecasted units per SKU per retailer per month
- If header doesn't match the pattern, retailer name = full header, month = current month

**What gets created:** Same `forecasts` rows as RTL — the output is identical.

### Validation Rules (Both Formats)

Before any data is committed, the system checks:

| Check | Fail = Error | Fail = Warning |
|-------|-------------|----------------|
| SKU exists in database | Yes — row rejected | |
| Retailer exists in database | Yes — row rejected | |
| Month within 2 years of today | Yes — row rejected | |
| Forecasted units > 0 | Yes — row rejected | |
| Duplicate SKU+Retailer+Month in file | | Yes — last value wins |

SKU and retailer matching is **case-insensitive**.

### Upsert Behavior

If a forecast row already exists for the same SKU + Retailer + Month:
- **Updates** `forecastedUnits`, `source`, `updatedAt`
- Does NOT create a duplicate
- This means re-importing a corrected file overwrites the old data

---

## Excel Import — Retail Sales Files

For importing actual sell-through data from retailers.

**File structure:**
- Single sheet
- Flexible column headers (case-insensitive matching)

**Required columns:**

| Data | Accepted Headers |
|------|-----------------|
| SKU code | "SKU" |
| Retailer | "Retailer" or "Customer" |
| Month | "Month", "Date", or "Period" |
| Units sold | "Units Sold", "Qty Sold", or "Quantity" |

**Optional columns:**

| Data | Accepted Headers |
|------|-----------------|
| Revenue | "Revenue", "Sales", or "Amount" |

**Example:**

| SKU | Retailer | Month | Units Sold | Revenue |
|-----|----------|-------|-----------|---------|
| FOM-NT-01 | TJX - TJ Maxx | 2026-01-15 | 450 | 2,697.00 |
| LUN-WP-01 | Whole Foods | 2026-01-01 | 120 | 1,199.88 |

- Dates are normalized to first day of month (Jan 15 → Jan 1)
- Units sold can be 0 (unlike forecasts which require > 0)
- Revenue is optional

**What gets created:** One `retail_sales` row per SKU × Retailer × Month.

**Upsert:** Same as forecasts — existing rows updated, not duplicated.

---

## SellerCloud API Sync

Pulls live data from the SellerCloud ERP system. **Currently awaiting API credentials for live testing** — the integration layer is built and working but needs real credentials.

### Setup

Three environment variables required in `.env.local`:

```
SELLERCLOUD_BASE_URL=https://your-company.sellercloud.com
SELLERCLOUD_USERNAME=api-user@company.com
SELLERCLOUD_PASSWORD=your-api-password
```

### What It Syncs

**1. Purchase Orders** (`/integrations/sellercloud` page → "Sync POs" button)

Pulls supplier POs from SellerCloud and maps them to local records:

| SellerCloud Field | Local Field |
|-------------------|-------------|
| PONumber (or "SC-{ID}") | poNumber |
| VendorID | supplier |
| Status (mapped) | status |
| OrderDate | orderDate |
| ExpectedArrivalDate | expectedArrival |
| ActualArrivalDate | actualArrival |
| TotalAmount | totalAmount |

Status mapping:

| SellerCloud | Local |
|-------------|-------|
| Saved | draft |
| Ordered | ordered |
| Received | received |
| Pending | pending |
| Cancelled | cancelled |
| Completed | completed |

**Deduplication:** Uses `sellercloud_id_map` table to track which SellerCloud records map to which local records. Stores raw JSON for change detection — only updates if data actually changed.

**Known limitation:** Currently assigns all synced POs to `brandId=1`. A vendor-to-brand mapping table is needed for multi-brand sync (listed as v2 item).

**2. Inventory** (`/integrations/sellercloud` page → "Sync Inventory" button)

Pulls current stock levels per SKU:

| SellerCloud Field | Local Field |
|-------------------|-------------|
| QuantityOnHand | quantityOnHand |
| QuantityOnOrder | quantityInTransit |
| QuantityReserved | quantityAllocated |

### Retry & Error Handling

- 3 retries with exponential backoff (1s → 2s → 4s)
- Auto re-authenticates on 401 errors
- Handles rate limiting (429), server errors (500/503)
- Auth tokens valid for 60 minutes, auto-refresh at 55 minutes
- All syncs logged in `sellercloud_sync_log` table

---

## Manual Data Entry

### Purchase Order Form (`/orders/purchase-orders/new`)

Create a supplier PO (order to China):

| Field | Required | Notes |
|-------|----------|-------|
| PO Number | Yes | Must be unique |
| Brand | Yes | Dropdown of all brands |
| Supplier | No | Free text (factory name) |
| Status | Yes | draft, ordered, confirmed, in_transit, arrived, cancelled |
| Order Date | No | Date picker |
| Expected Arrival | No | Date picker |
| Currency | No | USD (default), EUR, GBP, CNY |
| Deposit Amount | No | Number |
| Notes | No | Free text |
| **Line Items** | **Min 1** | |
| → SKU | Yes | Filtered by selected brand |
| → Quantity | Yes | Positive integer |
| → Unit Cost | No | Auto-calculates line total |

### Retail Order Form (`/orders/retail-orders/new`)

Create an incoming PO from a retailer:

| Field | Required | Notes |
|-------|----------|-------|
| Retailer | Yes | Dropdown of all retailers |
| Brand | Yes | Dropdown of all brands |
| Retailer PO Number | No | The retailer's reference number |
| Status | Yes | received, confirmed, in_production, shipped, delivered, cancelled |
| Order Date | No | Date picker |
| Ship By Date | No | Date picker |
| Notes | No | Free text |
| **Line Items** | **Min 1** | |
| → SKU | Yes | Filtered by selected brand |
| → Quantity | Yes | Positive integer |
| → Unit Price | No | Auto-calculates line total |

---

## How the Demand Tab Calculates Numbers

The demand dashboard combines forecast data with inventory data to show supply/demand balance.

### Core Formulas

```
Available = On Hand + In Transit - Allocated

Balance = Ordered + Available - Forecasted

Shortage = max(0, Forecasted - Ordered - Available)
           (triggers when demand > supply)

Excess = Supply - (Forecasted × 2.0)  when Supply/Forecast ratio > 2.0
         (triggers when supply is more than 2x demand)
```

Where:
- **Forecasted** = `SUM(forecasts.forecasted_units)` — what retailers say they need
- **Ordered** = `SUM(forecasts.ordered_units)` — what you've ordered from suppliers
- **On Hand** = `inventory.quantity_on_hand` — in the warehouse right now
- **In Transit** = `inventory.quantity_in_transit` — shipped, not yet arrived
- **Allocated** = `inventory.quantity_allocated` — reserved for existing orders

### Three Views

**1. Cross-Brand Summary** (`/demand`)
- Groups by: Brand × Month
- Shows: Forecasted, Ordered, On Hand, In Transit, Available, Balance
- Time range: Current month + next 3 months
- Filter: Brand selector (all brands or single brand)

**2. By Retailer** (`/demand/by-retailer`)
- Groups by: Retailer × Brand
- Shows: Forecasted, Ordered per retailer
- Answers: "How much does TJX need from Fomin this month?"

**3. By SKU** (`/demand/by-sku`)
- Groups by: Individual SKU
- Shows: All fields + Shortage + Excess calculations
- Paginated (200 per page)
- Filter: Brand, Retailer

### Alert Logic

**Shortage Alert (DEM-04):** SKUs where `Forecasted > Ordered + Available`. Sorted by biggest gap first. Means you need to order more.

**Excess Alert (DEM-05):** SKUs where supply/forecast ratio exceeds 2.0x. Sorted by biggest excess first. Means capital is tied up in overstock.

---

## Database Tables & Relationships

```
users ──────────┐
                │
brands ─────────┼──→ skus ──────→ forecasts ←── retailers
                │      │              │
                │      ├──→ inventory  │
                │      │              │
                │      ├──→ po_line_items ──→ purchase_orders
                │      │                          │
                │      └──→ retail_order_line_items │
                │               │                  │
                │               ▼                  │
                └──→ retail_orders                  │
                          │                        │
                          └──→ payments ←───────────┘
```

### Key Constraints

| Table | Unique Constraint | Purpose |
|-------|-------------------|---------|
| forecasts | (sku_id, retailer_id, month) | One forecast per SKU per retailer per month |
| retail_sales | (sku_id, retailer_id, month) | One sales record per SKU per retailer per month |
| inventory | (sku_id) | One inventory record per SKU |
| purchase_orders | (po_number) | No duplicate PO numbers |
| sellercloud_id_map | (entity_type, sellercloud_id) | Deduplication for API sync |

### Audit Trail

9 tables have PostgreSQL triggers that log changes to `audit_log`:
- brands, skus, retailers, forecasts, inventory, purchase_orders, retail_orders, payments, retail_sales
- Records: table_name, record_id, action (INSERT/UPDATE/DELETE), changed_data, previous_data, timestamp

---

## Import Wizard UI Flow

```
Step 1          Step 2           Step 3            Step 4
┌─────────┐    ┌─────────┐     ┌──────────┐     ┌──────────┐
│ Choose   │───▶│ Upload  │────▶│ Review   │────▶│ Confirm  │
│ Type     │    │ .xlsx   │     │ Errors & │     │ & Import │
│          │    │ (≤10MB) │     │ Preview  │     │          │
│ Forecast │    │         │     │          │     │ X rows   │
│ or Sales │    │ Drag &  │     │ Valid: Y │     │ imported │
│          │    │ Drop    │     │ Errors: Z│     │          │
└─────────┘    └─────────┘     └──────────┘     └──────────┘
```

1. **Choose type** — Forecast Import or Retail Sales Import
2. **Upload file** — drag-drop or browse, .xlsx only, max 10MB
3. **Review results** — system auto-detects format (RTL/HOP/Sales), validates every row, shows errors (blocking) and warnings (non-blocking), preview of first 100 valid rows
4. **Confirm import** — commits to database with upsert logic, shows final count

---

*Last updated: 2026-02-08*
