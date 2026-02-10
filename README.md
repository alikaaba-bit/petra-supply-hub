# Petra Supply Hub

Unified supply chain dashboard for Petra Brands (5 brands, ~160 SKUs, ~16 retailers). Tracks inventory, sales, orders, forecasts, and supply validation across the wholesale channel.

## Tech Stack

- **Framework**: Next.js 16 + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Auth.js v5 (credentials provider, JWT sessions)
- **API**: tRPC v11 + React Query
- **UI**: shadcn/ui + Tailwind CSS 4 + Recharts
- **Deployment**: Railway (app + Postgres)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL running locally

### Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL

# Push schema to database
npm run db:push

# Seed with demo data
npm run db:seed

# Start dev server
npm run dev
```

Login: `admin@petra.com` / `admin123`

## Architecture

```
src/
  app/                          # Next.js App Router pages
    (dashboard)/                # Authenticated dashboard pages
      sync/                     # Data sync management page
      sales-push/               # Sales push list page
      executive/                # Executive summary
      ...
    api/
      auth/                     # Auth.js handlers
      trpc/                     # tRPC endpoint
      cron/
        drivehq-sync/           # Hourly FTP sync endpoint
  server/
    api/
      routers/                  # tRPC routers (brands, skus, sellercloud, etc.)
      root.ts                   # Root router
      trpc.ts                   # tRPC context + procedures
    db/
      schema.ts                 # Drizzle schema (all tables)
      index.ts                  # DB connection pool
      seed.ts                   # Demo data seeder
      import-sellercloud.ts     # One-time CSV import script
    services/
      drivehq/                  # DriveHQ FTP sync pipeline
        ftp-client.ts           # FTP connect/download with retry
        brand-filter.ts         # Petra 5-brand whitelist
        sync-coordinator.ts     # Orchestrates all 3 syncs
        processors/
          inventory.ts          # Inventory XLSX -> skus + inventory
          profit-loss.ts        # P&L XLSX -> retail_sales + cogs_master
          orders.ts             # Orders XLSX -> retail_orders
      sellercloud-client.ts     # SellerCloud REST API client
      import-service.ts         # Batch upsert utilities
      parsers/                  # Excel format parsers
      validators/               # Data validation
    lib/
      velocity.ts               # Velocity scoring + discount tiers
    auth.ts                     # Auth.js configuration
    auth.config.ts              # Edge-compatible auth config
  middleware.ts                 # Auth middleware (bypasses /api/cron)
```

## Data Pipeline

### DriveHQ Automated Sync (Hourly)

SellerCloud exports fresh data hourly to DriveHQ FTP (`ftp.drivehq.com`) under `/sellercloud/`. A GitHub Actions cron job triggers our sync endpoint every hour, pulling the latest files and upserting into PostgreSQL.

```
[SellerCloud] --hourly--> [DriveHQ FTP] --cron--> [/api/cron/drivehq-sync] ---> [PostgreSQL]
```

#### Three Data Sources

| File | FTP Path | Rows | Feeds |
|------|----------|------|-------|
| **Inventory by Warehouse** | `/sellercloud/Inventory/Inventory by Warehouse Detail/` | ~2,454 | `skus`, `inventory` |
| **Profit & Loss** | `/sellercloud/Profit and Loss/Product Profit Details/` | ~5,833 | `retail_sales`, `cogs_master`, `retailers` |
| **Orders by Date** | `/sellercloud/Order Detail/Order by Date/` | ~2,039 | `retail_orders` |

#### Sync Strategies

| Table | Strategy |
|-------|----------|
| `inventory` | Transactional replace (DELETE WHERE source='drivehq-inventory', INSERT all) |
| `retail_sales` | Upsert on (skuId, retailerId, month) unique constraint |
| `cogs_master` | Insert per-SKU unit cost per effective date |
| `skus` | Upsert (create new Petra SKUs, update existing) |
| `retailers` | Auto-create from "Wholesale Customer" names |
| `retail_orders` | Upsert via `sellercloud_id_map` tracking by Order # |

#### Brand Filtering

Only 5 of 17 companies in SellerCloud belong to Petra. All processors filter strictly:

- **Fomin**
- **EveryMood**
- **Luna Naturals**
- **House of Party**
- **Roofus**

Non-Petra rows are silently skipped.

#### Error Handling

- FTP: 3 retries with exponential backoff (2s, 4s, 8s)
- Each entity syncs independently (if P&L fails, inventory/orders still run)
- Every run logged to `sellercloud_sync_log` with status, counts, errors, filename
- Duplicate file detection: skips re-processing if same filename already completed

#### Manual Trigger

Via the dashboard Sync page or directly:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://petra-supply-hub-production.up.railway.app/api/cron/drivehq-sync
```

### SellerCloud API Sync (Manual)

Legacy sync via SellerCloud REST API for purchase orders and inventory. Triggered manually from the Sync page. Requires `SELLERCLOUD_BASE_URL`, `SELLERCLOUD_USERNAME`, `SELLERCLOUD_PASSWORD` env vars.

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Auth.js session encryption key |

### DriveHQ Sync

| Variable | Description |
|----------|-------------|
| `DRIVEHQ_FTP_HOST` | FTP server (`ftp.drivehq.com`) |
| `DRIVEHQ_FTP_USER` | FTP username |
| `DRIVEHQ_FTP_PASS` | FTP password |
| `CRON_SECRET` | Bearer token for `/api/cron` endpoint auth |

### SellerCloud API (Optional)

| Variable | Description |
|----------|-------------|
| `SELLERCLOUD_BASE_URL` | SellerCloud API base URL |
| `SELLERCLOUD_USERNAME` | API username |
| `SELLERCLOUD_PASSWORD` | API password |

### GitHub Actions Secrets

| Secret | Description |
|--------|-------------|
| `CRON_SECRET` | Same as Railway env var |
| `SYNC_ENDPOINT_URL` | Full URL to the sync endpoint |

## Database Schema

### Key Tables

- **brands** - 5 Petra brands
- **skus** - Product master data (~160 SKUs). `unitCost` = COGS, `unitPrice` = wholesale
- **retailers** - Wholesale customers (~16). Auto-created during sync
- **inventory** - Current stock levels per SKU (1:1 with skus)
- **retail_sales** - Monthly sales by SKU + retailer. Unique on (skuId, retailerId, month)
- **retail_orders** - Wholesale orders with status tracking
- **cogs_master** - Historical cost of goods per SKU
- **forecasts** - Monthly demand forecasts per SKU + retailer
- **sellercloud_sync_log** - Sync run history (status, counts, errors, filename, source)
- **sellercloud_id_map** - Maps external IDs to local IDs for deduplication
- **revenue_targets** - Monthly revenue targets per brand

### Schema Management

```bash
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate migration files
npm run db:studio    # Open Drizzle Studio
```

## Deployment

Deployed on Railway with automatic deploys from `main` branch.

- **App**: https://petra-supply-hub-production.up.railway.app
- **GitHub**: https://github.com/alikaaba-bit/petra-supply-hub

## Key Features

- **Executive Dashboard** - KPI strip with revenue, units, inventory value, confidence scoring
- **Supply Validation** - 4-layer analysis (velocity, pipeline reliability, demand capping, concentration risk)
- **Sales Push List** - Aging inventory with auto discount tiers, CSV export, email digest
- **Data Sync** - Automated hourly sync from DriveHQ + manual SellerCloud API sync
- **Forecasting** - Import forecasts from Excel (RTL and HOP formats)
- **Order Tracking** - Supplier POs and retail order lifecycle management
