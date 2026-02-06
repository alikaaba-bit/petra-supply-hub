# Architecture Research: Supply Chain Dashboard

## Executive Summary

For Petra Brands' internal supply chain dashboard, the optimal architecture follows a layered approach: **ETL pipeline → Normalized database → REST API → Role-based frontend**. This structure supports Excel imports, SellerCloud integration, and multi-role access patterns typical of internal supply chain tools.

---

## Component Architecture

### 1. Data Ingestion Layer

**Excel Parser Service**
- Handles 6 different forecast file formats (one per brand)
- Implements schema validation and normalization
- Runs scheduled imports or manual uploads
- Key pattern: Use metadata-driven configuration to store transformation logic per brand

**SellerCloud API Client**
- Polls REST endpoints for POs, inventory, shipping, payments
- OAuth authentication with dedicated API user (best practice per SellerCloud docs)
- Event-driven updates vs batch polling for critical data
- Rate limiting and retry logic with exponential backoff

**Best Practice**: Create separate API users for each integration type (Excel vs SellerCloud) for better audit trails and security isolation.

### 2. Data Processing Layer

**ETL Pipeline**
- **Extract**: Excel parsers + SellerCloud API client
- **Transform**: Normalize brand-specific formats → unified schema, calculate demand vs supply gaps, aggregate metrics by retailer/brand/SKU
- **Load**: Write to normalized PostgreSQL database

**Modern Pattern** (2026): Microservices architecture where each stage (extract, transform, load) can be deployed and scaled independently. For this scale (~160 SKUs × 12 retailers × 5 brands = ~10K data points), a monolithic ETL service is sufficient initially.

**Avoid**: Excel Power Query for production ETL. It lacks proper version control, concurrent user support, error handling, and scheduling capabilities needed for enterprise workflows.

### 3. Data Storage Layer

**Primary Database**: PostgreSQL (recommended for structured supply chain data)

**Schema Design** (see Data Model section):
- Core entities: Brand, SKU, Retailer, Forecast, PurchaseOrder, Inventory, Shipment, Payment
- Separate staging tables for raw Excel/API data
- Audit tables for tracking data lineage

**Caching Strategy**:
- Query result cache (24-hour TTL for dashboards)
- Application-level caching for frequently accessed aggregations
- Pre-computed materialized views for demand vs supply gaps

### 4. API Layer

**REST API Service**
- Express/Node.js or FastAPI/Python (both common for internal tools)
- Endpoints organized by domain: `/forecasts`, `/purchase-orders`, `/inventory`, `/cash-flow`
- Role-based access control middleware
- Swagger/OpenAPI documentation

**Authentication**: JWT tokens with role claims (CEO, sales, purchasing, warehouse)

### 5. Frontend Layer

**Dashboard UI**
- React/Next.js with TypeScript (modern standard)
- Component library: Tailwind + shadcn/ui or Material-UI
- Charts: Recharts or Chart.js for demand vs supply visualizations
- Real-time updates: WebSockets or polling for critical metrics

**Role-Based Views**:
- CEO: Executive summary, cash flow, high-level gaps
- Sales: Retailer performance, forecast accuracy
- Purchasing: PO tracking, supply gaps, vendor status
- Warehouse: Inbound shipments, inventory levels

---

## Data Flow

### Excel Import Flow
```
1. User uploads Excel file (or scheduled import runs)
   ↓
2. Excel Parser validates format, extracts data
   ↓
3. Transform to unified schema (staging table)
   ↓
4. Validate against business rules (SKU exists, dates valid, etc.)
   ↓
5. Load to Forecast table (production)
   ↓
6. Trigger recalculation of demand vs supply gaps
   ↓
7. Update dashboard cache
   ↓
8. Notify users (optional: "New forecast data available")
```

### SellerCloud Integration Flow
```
1. Scheduled job runs (e.g., every 15 minutes for POs, hourly for inventory)
   ↓
2. API client authenticates via OAuth
   ↓
3. Fetch incremental updates (using last_modified filters)
   ↓
4. Transform SellerCloud format → internal schema
   ↓
5. Reconcile with existing data (upsert logic)
   ↓
6. Write to PurchaseOrder, Inventory, Shipment, Payment tables
   ↓
7. Invalidate relevant caches
   ↓
8. Push updates to connected dashboard clients (WebSocket)
```

### Dashboard Query Flow
```
1. User requests dashboard view (e.g., "Demand vs Supply for Brand X")
   ↓
2. API checks role permissions
   ↓
3. Check query result cache (24-hour TTL)
   ↓
4. If cache miss: Query database with filters
   ↓
5. Aggregate and calculate metrics (gaps, trends)
   ↓
6. Store result in cache
   ↓
7. Return JSON to frontend
   ↓
8. Frontend renders charts and tables
```

---

## Data Model

### Core Entities

**Brand**
- `id` (PK)
- `name` (e.g., "Petra Brand A")
- `excel_template_version` (for parser routing)
- `created_at`, `updated_at`

**SKU**
- `id` (PK)
- `brand_id` (FK → Brand)
- `sku_code` (unique)
- `product_name`
- `upc`
- `case_pack`
- `created_at`, `updated_at`

**Retailer**
- `id` (PK)
- `name` (e.g., "Walmart", "Target")
- `code` (short identifier)
- `created_at`, `updated_at`

**Forecast** (from Excel files)
- `id` (PK)
- `brand_id` (FK → Brand)
- `sku_id` (FK → SKU)
- `retailer_id` (FK → Retailer)
- `forecast_date` (week or month)
- `quantity_units`
- `quantity_cases`
- `revenue_forecast`
- `source_file` (audit trail)
- `imported_at`
- `created_at`, `updated_at`

**PurchaseOrder** (from SellerCloud)
- `id` (PK)
- `sellercloud_po_id` (external ID)
- `brand_id` (FK → Brand)
- `retailer_id` (FK → Retailer)
- `po_number`
- `po_date`
- `expected_ship_date`
- `status` (enum: pending, in_production, shipped, delivered, cancelled)
- `total_amount`
- `created_at`, `updated_at`, `synced_at`

**POLineItem**
- `id` (PK)
- `purchase_order_id` (FK → PurchaseOrder)
- `sku_id` (FK → SKU)
- `quantity_ordered`
- `quantity_shipped`
- `unit_price`
- `created_at`, `updated_at`

**Inventory** (from SellerCloud)
- `id` (PK)
- `sku_id` (FK → SKU)
- `brand_id` (FK → Brand)
- `warehouse_location`
- `available_units`
- `committed_units`
- `in_transit_units`
- `as_of_date` (snapshot timestamp)
- `synced_at`

**Shipment** (from SellerCloud)
- `id` (PK)
- `sellercloud_shipment_id`
- `purchase_order_id` (FK → PurchaseOrder)
- `tracking_number`
- `carrier`
- `ship_date`
- `expected_delivery_date`
- `actual_delivery_date`
- `status` (enum: pending, in_transit, delivered, exception)
- `created_at`, `updated_at`, `synced_at`

**Payment** (from SellerCloud)
- `id` (PK)
- `sellercloud_payment_id`
- `purchase_order_id` (FK → PurchaseOrder)
- `payment_date`
- `amount`
- `payment_method`
- `status` (enum: pending, completed, failed)
- `created_at`, `updated_at`, `synced_at`

### Calculated Views/Tables

**DemandSupplyGap** (materialized view, refreshed on data updates)
- `brand_id`, `retailer_id`, `sku_id`
- `period` (week/month)
- `forecasted_demand`
- `available_supply` (inventory + incoming POs)
- `gap` (demand - supply)
- `gap_percentage`
- `risk_level` (enum: critical, warning, healthy)

**CashFlowProjection** (aggregated from POs and Payments)
- `brand_id`
- `period`
- `expected_revenue`
- `expected_costs`
- `net_cash_flow`

### Relationships
- Brand → SKUs (1:N)
- SKU → Forecasts (1:N)
- SKU → POLineItems (1:N)
- SKU → Inventory (1:N)
- Retailer → Forecasts (1:N)
- Retailer → PurchaseOrders (1:N)
- PurchaseOrder → POLineItems (1:N)
- PurchaseOrder → Shipments (1:N)
- PurchaseOrder → Payments (1:N)

---

## Suggested Build Order

### Phase 1: Foundation (Week 1-2)
1. **Database setup**: Create schema, seed brands/retailers/SKUs
2. **Excel parser prototype**: Build parser for 1 brand's format
3. **Basic API**: CRUD endpoints for SKUs, forecasts
4. **Simple frontend**: Display raw forecast data in table

**Validation**: Can upload Excel file → see data in UI

### Phase 2: SellerCloud Integration (Week 2-3)
1. **SellerCloud API client**: Authenticate, fetch POs
2. **Data reconciliation**: Match SellerCloud SKUs to internal SKUs
3. **Sync job**: Schedule periodic polling (start with manual trigger)
4. **API endpoints**: `/purchase-orders`, `/inventory`

**Validation**: SellerCloud PO data visible in dashboard

### Phase 3: Core Analytics (Week 3-4)
1. **Demand vs Supply calculation**: Build gap analysis logic
2. **Materialized views**: Pre-compute gaps for performance
3. **Dashboard components**: Charts for gaps, PO tracking
4. **Extend Excel parser**: Support all 6 brand formats

**Validation**: CEO can see demand vs supply gaps across brands

### Phase 4: Role-Based Access (Week 4-5)
1. **Authentication**: JWT-based auth with role claims
2. **RBAC middleware**: Enforce permissions at API level
3. **Role-specific views**: Customize dashboard per user type
4. **Audit logging**: Track who views/modifies what

**Validation**: Each role sees appropriate data

### Phase 5: Production Readiness (Week 5-6)
1. **Caching**: Implement query result cache, materialized views
2. **Error handling**: Graceful failures for Excel/API issues
3. **Monitoring**: Logs, metrics, alerts for ETL jobs
4. **Documentation**: User guide, API docs, runbook

**Validation**: System runs reliably for 1 week without manual intervention

---

## Integration Patterns

### Excel Import Patterns

**Pattern 1: Metadata-Driven Parsing**
```javascript
const brandParsers = {
  'brand_a': {
    sheetName: 'Forecast',
    headerRow: 2,
    columnMapping: {
      'SKU': 'sku_code',
      'Retailer': 'retailer_name',
      'Week Starting': 'forecast_date',
      'Units': 'quantity_units'
    }
  },
  'brand_b': { /* different mapping */ }
};

function parseExcel(file, brandId) {
  const config = brandParsers[brandId];
  const workbook = XLSX.read(file);
  const sheet = workbook.Sheets[config.sheetName];
  // Extract rows starting from config.headerRow
  // Map columns using config.columnMapping
  // Return normalized records
}
```

**Pattern 2: Validation Pipeline**
```javascript
const validators = [
  validateRequiredFields,
  validateDateFormats,
  validateSkuExists,
  validateRetailerExists,
  validateQuantitiesPositive
];

function processExcelUpload(file, brandId) {
  const rawData = parseExcel(file, brandId);
  const errors = [];

  for (const validator of validators) {
    const validationErrors = validator(rawData);
    errors.push(...validationErrors);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Load to staging table
  await db.stagingForecasts.insertMany(rawData);

  // Trigger async job to load to production
  await queue.add('load-forecasts', { stagingBatch: rawData.id });

  return { success: true };
}
```

### SellerCloud API Patterns

**Pattern 1: Incremental Sync with Last Modified**
```javascript
async function syncPurchaseOrders() {
  const lastSync = await getLastSyncTime('purchase_orders');

  const response = await sellerCloudClient.get('/purchase-orders', {
    params: {
      modified_since: lastSync.toISOString(),
      limit: 100
    }
  });

  for (const po of response.data) {
    await upsertPurchaseOrder(po); // Insert or update
  }

  await updateLastSyncTime('purchase_orders', new Date());
}
```

**Pattern 2: Retry with Exponential Backoff**
```javascript
async function sellerCloudRequest(endpoint, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(endpoint, options);
      return response.data;
    } catch (error) {
      if (i === retries - 1) throw error;

      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      console.log(`Retry ${i+1}/${retries} after ${delay}ms`);
      await sleep(delay);
    }
  }
}
```

**Pattern 3: OAuth Token Management**
```javascript
class SellerCloudClient {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.token = null;
    this.tokenExpiry = null;
  }

  async ensureValidToken() {
    if (this.token && this.tokenExpiry > Date.now()) {
      return this.token;
    }

    // Refresh token
    const response = await axios.post('/oauth/token', {
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret
    });

    this.token = response.data.access_token;
    this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

    return this.token;
  }

  async get(endpoint, options = {}) {
    const token = await this.ensureValidToken();
    return axios.get(endpoint, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });
  }
}
```

### Data Reconciliation Patterns

**Pattern: SKU Matching with Fallback**
```javascript
async function reconcileSKU(sellerCloudSKU) {
  // Try exact match on SellerCloud ID
  let sku = await db.skus.findOne({ sellercloud_id: sellerCloudSKU.id });
  if (sku) return sku;

  // Try match on UPC
  sku = await db.skus.findOne({ upc: sellerCloudSKU.upc });
  if (sku) {
    // Update with SellerCloud ID for future matches
    await db.skus.update(sku.id, { sellercloud_id: sellerCloudSKU.id });
    return sku;
  }

  // Try fuzzy match on product name
  sku = await fuzzyMatchSKU(sellerCloudSKU.product_name);
  if (sku && sku.confidence > 0.9) {
    // Flag for manual review if confidence < 1.0
    if (sku.confidence < 1.0) {
      await createManualReviewTask(sellerCloudSKU, sku);
    }
    return sku;
  }

  // Create unmatched SKU record for manual review
  await createUnmatchedSKU(sellerCloudSKU);
  return null;
}
```

---

## Caching & Performance

### For ~160 SKUs × 12 Retailers × 5 Brands

**Data Scale Estimates**:
- SKUs: ~160 records
- Forecasts: ~160 SKUs × 12 retailers × 52 weeks = ~100K records/year
- PurchaseOrders: ~500-1000/year (depends on order frequency)
- Inventory snapshots: ~160 SKUs × 365 days = ~60K records/year

**Performance Targets**:
- Dashboard initial load: < 2 seconds
- Real-time updates: < 500ms
- Excel import: < 30 seconds for typical file
- SellerCloud sync: < 5 minutes for full sync

### Caching Strategy

**1. Query Result Cache (24-hour TTL)**
```javascript
// Cache dashboard queries by user role + filters
const cacheKey = `dashboard:${role}:${brandId}:${date}`;
const cached = await cache.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const result = await db.query(/* complex aggregation */);
await cache.set(cacheKey, JSON.stringify(result), 'EX', 86400); // 24 hours

return result;
```

**2. Materialized Views (Pre-computed Gaps)**
```sql
CREATE MATERIALIZED VIEW demand_supply_gaps AS
SELECT
  f.brand_id,
  f.retailer_id,
  f.sku_id,
  DATE_TRUNC('week', f.forecast_date) AS period,
  SUM(f.quantity_units) AS forecasted_demand,
  COALESCE(SUM(i.available_units), 0) + COALESCE(SUM(pol.quantity_ordered), 0) AS available_supply,
  SUM(f.quantity_units) - (COALESCE(SUM(i.available_units), 0) + COALESCE(SUM(pol.quantity_ordered), 0)) AS gap
FROM forecasts f
LEFT JOIN inventory i ON f.sku_id = i.sku_id
LEFT JOIN po_line_items pol ON f.sku_id = pol.sku_id
GROUP BY f.brand_id, f.retailer_id, f.sku_id, period;

-- Refresh after data updates
REFRESH MATERIALIZED VIEW demand_supply_gaps;
```

**3. Application-Level Caching**
- Cache SKU/Brand/Retailer lookups (rarely change)
- Cache user role mappings (session duration)
- Cache SellerCloud API responses (5-15 minutes depending on data type)

**4. Database Indexing**
```sql
-- Core queries: filter by brand, retailer, date range
CREATE INDEX idx_forecasts_brand_date ON forecasts(brand_id, forecast_date);
CREATE INDEX idx_forecasts_retailer_date ON forecasts(retailer_id, forecast_date);
CREATE INDEX idx_po_status ON purchase_orders(status, expected_ship_date);
CREATE INDEX idx_inventory_sku ON inventory(sku_id, as_of_date);
```

### Performance Optimization Techniques

**1. Pagination for Large Result Sets**
```javascript
// Limit dashboard queries to relevant time window
const defaultDateRange = { start: subtractMonths(today, 3), end: addMonths(today, 3) };

// Paginate list views
const PAGE_SIZE = 50;
const purchaseOrders = await db.purchaseOrders
  .where('brand_id', brandId)
  .where('po_date', '>=', dateRange.start)
  .orderBy('po_date', 'desc')
  .limit(PAGE_SIZE)
  .offset(page * PAGE_SIZE);
```

**2. Lazy Loading Dashboard Widgets**
```javascript
// Load critical widgets first, defer non-critical ones
const dashboard = {
  summary: await loadSummaryMetrics(), // Load immediately
  demandVsSupply: loadDemandSupplyChart(), // Async
  recentPOs: loadRecentPOs(), // Async
  cashFlow: loadCashFlowProjection() // Async
};

// Frontend renders summary first, shows loading states for others
```

**3. WebSocket for Real-Time Updates**
```javascript
// Push updates instead of polling
io.on('connection', (socket) => {
  socket.on('subscribe', ({ brandId, role }) => {
    socket.join(`brand:${brandId}:${role}`);
  });
});

// When SellerCloud sync completes, notify connected clients
await syncPurchaseOrders();
io.to(`brand:${brandId}:purchasing`).emit('po_update', { count: newPOs.length });
```

**4. Background Job Queue**
```javascript
// Process heavy tasks asynchronously
queue.process('refresh-gaps', async (job) => {
  await db.raw('REFRESH MATERIALIZED VIEW demand_supply_gaps');
  await invalidateCache('dashboard:*'); // Clear all dashboard caches
});

// Trigger after Excel import or SellerCloud sync
await queue.add('refresh-gaps', {}, { delay: 5000 }); // Debounce 5s
```

---

## Role-Based Access Control (RBAC)

### Role Definitions

**CEO**
- View: All brands, executive summary, cash flow, high-level gaps
- Edit: None (read-only)

**Sales**
- View: All brands, retailer performance, forecast accuracy, order status
- Edit: Forecast uploads (can import Excel files)

**Purchasing**
- View: All brands, supply gaps, PO tracking, vendor status, inventory levels
- Edit: PO status updates, vendor notes

**Warehouse**
- View: Inbound shipments, inventory levels, shipment tracking
- Edit: Shipment status updates, inventory adjustments

### Implementation Pattern

**Middleware (Express example)**
```javascript
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user.role; // From JWT

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

// Apply to routes
app.get('/api/cash-flow', requireRole('ceo', 'sales'), getCashFlow);
app.post('/api/forecasts/upload', requireRole('sales', 'purchasing'), uploadForecast);
```

**Row-Level Security (if needed)**
```javascript
function addRoleFilter(query, user) {
  switch (user.role) {
    case 'warehouse':
      // Warehouse only sees shipments assigned to their location
      return query.where('warehouse_location', user.warehouse);
    case 'ceo':
    case 'sales':
    case 'purchasing':
      // Full access to all brands
      return query;
    default:
      throw new Error('Unknown role');
  }
}
```

---

## Technology Stack Recommendations

### Backend
- **Runtime**: Node.js 20+ or Python 3.11+
- **Framework**: Express (Node) or FastAPI (Python)
- **Database**: PostgreSQL 15+ (mature, great for relational supply chain data)
- **Caching**: Redis (query cache, session store)
- **Queue**: BullMQ (background jobs) or Celery (Python)
- **Excel Parsing**: SheetJS (Node) or openpyxl (Python)

### Frontend
- **Framework**: Next.js 14+ (React with TypeScript)
- **UI Components**: shadcn/ui (modern, customizable) or Material-UI
- **Charts**: Recharts (React-friendly) or Chart.js
- **State Management**: Zustand or TanStack Query (React Query)
- **Real-time**: Socket.io or native WebSockets

### DevOps
- **Hosting**: Vercel (frontend) + Railway/Render (backend + DB) for quick MVP
- **Monitoring**: Sentry (errors), PostHog (analytics)
- **Logging**: Structured logs to stdout, aggregated in hosting platform
- **CI/CD**: GitHub Actions (simple, free for private repos)

### For "Ship ASAP" Priority
- Start with monolithic backend (split later if needed)
- Use hosted PostgreSQL (Railway, Supabase) vs self-managed
- Defer complex features: Use HTTP polling before WebSockets, manual Excel upload before scheduled imports
- Use Retool or similar if even faster MVP needed (drag-and-drop UI builder)

---

## Architecture Diagram (Text)

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│  Next.js Dashboard (React + TypeScript)                     │
│  - CEO View   - Sales View   - Purchasing   - Warehouse     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS + JWT
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                        API LAYER                             │
│  Express/FastAPI REST API                                   │
│  - RBAC Middleware                                          │
│  - Endpoints: /forecasts, /pos, /inventory, /cash-flow     │
└──────────────┬──────────────────────────────────────────────┘
               │
     ┌─────────┴─────────┐
     ↓                   ↓
┌────────────┐    ┌────────────────┐
│   Redis    │    │  PostgreSQL    │
│   Cache    │    │  - Brands      │
│            │    │  - SKUs        │
│            │    │  - Forecasts   │
│            │    │  - POs         │
│            │    │  - Inventory   │
└────────────┘    └───────┬────────┘
                          ↑
                          │
┌─────────────────────────┴────────────────────────────┐
│                  ETL / SYNC LAYER                     │
│  ┌─────────────────┐         ┌──────────────────┐   │
│  │ Excel Parser    │         │ SellerCloud Sync │   │
│  │ - 6 formats     │         │ - OAuth client   │   │
│  │ - Validation    │         │ - Incremental    │   │
│  │ - Staging       │         │ - Retry logic    │   │
│  └─────────────────┘         └──────────────────┘   │
└──────────────────────────────────────────────────────┘
               ↑                          ↑
               │                          │
        Excel Upload              SellerCloud API
        (Manual/Scheduled)        (Polling every 15m)
```

---

## Key Architectural Decisions

### 1. Monolith vs Microservices
**Decision**: Start with modular monolith
**Rationale**:
- Faster to build and deploy
- Easier to debug and maintain with small team
- Can split services later if specific components need independent scaling
- For this data scale (~10K records/year), monolith handles load easily

### 2. Database Choice
**Decision**: PostgreSQL over NoSQL
**Rationale**:
- Supply chain data is highly relational (SKUs → Forecasts → POs)
- Need ACID transactions for financial data (payments, cash flow)
- Mature ecosystem, great tooling, powerful query capabilities
- Materialized views for performance optimization

### 3. Real-Time Updates
**Decision**: Start with HTTP polling, add WebSockets if needed
**Rationale**:
- HTTP polling simpler to implement and debug
- For internal tool with 4 user types, polling every 30-60s is acceptable
- Can upgrade to WebSockets later for better UX (Phase 5+)

### 4. Excel vs Direct Integration
**Decision**: Keep Excel imports as primary forecast input
**Rationale**:
- Brands already have Excel workflows (don't force change)
- Faster to parse Excel than build 6 different forecast UIs
- Can add direct input forms later as enhancement

### 5. SellerCloud Polling Frequency
**Decision**: 15 minutes for POs, 1 hour for inventory
**Rationale**:
- Balance freshness vs API rate limits
- POs are more time-sensitive (purchasing team needs updates)
- Inventory changes slower (daily accuracy is sufficient)
- Can adjust based on actual usage patterns

---

## Risk Mitigation

### Risk 1: Excel Format Changes
**Mitigation**: Version Excel parsers by brand, store template version in Brand table, alert when new format detected (parsing fails), manual review queue for ambiguous data

### Risk 2: SellerCloud API Changes
**Mitigation**: Version API client, monitor SellerCloud changelog, unit tests for API response parsing, graceful degradation if endpoints unavailable

### Risk 3: SKU Reconciliation Failures
**Mitigation**: Manual review queue for unmatched SKUs, fuzzy matching with confidence scores, admin UI to manually link SKUs, audit log of all matches

### Risk 4: Performance Degradation
**Mitigation**: Materialized views for expensive queries, aggressive caching (24-hour TTL for dashboards), pagination for list views, database indexing on common filters

### Risk 5: Data Quality Issues
**Mitigation**: Validation pipeline for Excel imports, business rule checks (e.g., forecast date in valid range), staging tables to preview before production load, rollback capability for bad imports

---

## References & Sources

### Supply Chain Dashboard Architecture
- [The Top 7 Supply Chain Mapping Software Tools for 2026 - Z2Data](https://www.z2data.com/insights/the-top-7-supply-chain-mapping-software-tools-2026)
- [Supply Chain Management Dashboard - Retool](https://retool.com/templates/supply-chain-management-dashboard)
- [7 Key Supply Chain Dashboard Examples | GoodData](https://www.gooddata.com/blog/supply-chain-dashboard-examples/)
- [Supply Chain Control Tower Software | o9solutions](https://o9solutions.com/solutions/supply-chain-control-tower/)

### ETL & Data Pipeline Best Practices
- [10 Excel ETL Tools That You Can Follow in 2026 | Airbyte](https://airbyte.com/top-etl-tools-for-sources/excel-file)
- [ETL Frameworks in 2026 for Future-Proof Data Pipelines | Integrate.io](https://www.integrate.io/blog/etl-frameworks-in-2025-designing-robust-future-proof-data-pipelines/)
- [12 ETL Best Practices: Your Ultimate Guide (2026)](https://blog.skyvia.com/etl-architecture-best-practices/)
- [Data Pipeline Design Patterns - Techment](https://www.techment.com/blogs/data-pipeline-design-patterns/)

### SellerCloud API Integration
- [Sellercloud API Docs - Official Documentation](https://developer.sellercloud.com/)
- [REST Services Overview (+ Intro to Swagger) - Sellercloud API Docs](https://developer.sellercloud.com/dev-article/rest-services-overview/)
- [Sellercloud API & Webservices Overview - Sellercloud Help](https://help.sellercloud.com/omnichannel-ecommerce/seller-cloud-api-webservices-overview/)
- [Web Service API | Sellercloud Features](https://sellercloud.com/features/web-service-api/)

### Demand Forecasting & Data Models
- [4 Best Demand Planning Dashboards (With Good and Bad Examples) - Flieber](https://www.flieber.com/blog/demand-planning-dashboards)
- [Forecast Demand Reliably for More Informed Decisions | Dataiku](https://www.dataiku.com/solutions/catalog/demand-forecast/)
- [Demand forecasting algorithms - Dynamics 365 | Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/supply-chain/demand-planning/forecast-algorithm-types)
- [7 Key Supply Chain Dashboard Examples | GoodData](https://www.gooddata.com/blog/supply-chain-dashboard-examples/)

### Multi-Tenant & Role-Based Access
- [RBAC vs. LBAC: Which Scales for Multi-Tenant Dashboards? - DEV Community](https://dev.to/giam/rbac-vs-lbac-which-scales-for-multi-tenant-dashboards-589l)
- [Building Role-Based Access Control for a Multi-Tenant SaaS Startup | Medium](https://medium.com/@my_journey_to_be_an_architect/building-role-based-access-control-for-a-multi-tenant-saas-startup-26b89d603fdb)
- [Multi-Tenant Architecture: What You Need To Know | GoodData](https://www.gooddata.com/blog/multi-tenant-architecture/)
- [What is multi-tenant architecture? A complete guide for 2026 - Future Processing](https://www.future-processing.com/blog/multi-tenant-architecture/)

### Caching & Performance Optimization
- [Dataset optimization and caching | Databricks](https://docs.databricks.com/aws/en/dashboards/caching)
- [Dashboard Performance Optimization: Speed Up Your Analytics | Sigma](https://www.sigmacomputing.com/blog/dashboard-performance-optimization)
- [Inventory Management Dashboards: A Game Changer - Knack](https://www.knack.com/blog/inventory-management-dashboards/)
- [Dataset optimization and caching - Azure Databricks | Microsoft Learn](https://learn.microsoft.com/en-us/azure/databricks/dashboards/caching)

---

## Next Steps

After reading this architecture research, the recommended next steps are:

1. **Review with stakeholders**: Validate component architecture and data model against actual needs
2. **Finalize tech stack**: Choose specific frameworks (Node vs Python, chart library, etc.)
3. **Create detailed plan**: Break Phase 1-5 into specific tasks with time estimates
4. **Set up project**: Initialize repo, database, basic API scaffold
5. **Start with Phase 1**: Build foundation (database + Excel parser for 1 brand + simple UI)

This architecture balances speed-to-market with maintainability, following 2026 best practices for internal supply chain tools while avoiding over-engineering for the current scale.
