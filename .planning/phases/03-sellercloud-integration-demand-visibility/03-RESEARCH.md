# Phase 3: SellerCloud Integration & Demand Visibility - Research

**Researched:** 2026-02-06
**Domain:** ERP API Integration, Dashboard Visualization, Demand Planning
**Confidence:** MEDIUM

## Summary

This phase integrates SellerCloud's REST API to automatically pull purchase orders, inventory levels, shipment tracking, and payment status, while building demand visibility dashboards that show forecasted vs ordered vs in-stock units across brands and retailers. The research reveals that SellerCloud uses JWT Bearer authentication with 60-minute token expiry, supports paginated REST endpoints for POs and inventory, and requires careful handling of rate limits and data sync to prevent duplicates.

The standard stack leverages existing Next.js + tRPC architecture with scheduled background jobs for data sync, PostgreSQL aggregations for demand calculations, and shadcn/ui + Recharts for visualization. Key patterns include idempotent upserts to prevent duplicate records, exponential backoff for API retries, materialized views for dashboard performance, and TanStack Table grouping for drill-down views.

**Primary recommendation:** Start with manual data refresh endpoints (tRPC procedures) before implementing automated cron jobs. Use database-level unique constraints on SellerCloud IDs to prevent duplicate imports. Build aggregation queries in PostgreSQL with proper indexes rather than client-side calculations. Implement shortage/excess alerts as calculated fields based on formulas (forecasted - ordered - available).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SellerCloud REST API | current | ERP data source (POs, inventory, shipments) | Company's existing ERP system |
| node-fetch / fetch API | native | HTTP client for API calls | Built into Node.js 18+, no dependencies needed |
| tRPC | v11 | Type-safe backend procedures for sync/queries | Already in project stack |
| Drizzle ORM | v1 | Database queries and aggregations | Already in project stack |
| shadcn/ui Charts | latest | Dashboard visualizations | Built on Recharts, matches existing UI |
| TanStack React Table | v8.21 | Grouped/drill-down tables | Already in project stack |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | v4.1 | Date manipulation for month grouping | Already installed, use for forecast date ranges |
| node-cron | ~3.0 | Schedule background sync jobs | Only if automated sync is implemented |
| pg | v8.18 | Direct PostgreSQL for materialized views | Already installed, use for complex aggregations |
| Recharts | latest | Chart library (via shadcn/ui) | Bar/line charts for demand trends |
| Badge + Alert (shadcn) | latest | Shortage/excess alerts UI | Highlight critical inventory gaps |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SellerCloud REST API | Manual Excel imports | No automation, but available immediately while API access pending |
| node-cron | Vercel Cron (vercel.json) | Simpler config, but Vercel-specific (less portable) |
| Materialized views | Drizzle aggregations | Simpler code, but slower for large datasets |
| Custom retry logic | axios-retry library | Less code, but adds dependency |

**Installation:**
```bash
# Only if background jobs needed (wait until API credentials available)
npm install node-cron @types/node-cron

# Charts already available via shadcn/ui
npx shadcn@latest add chart

# Alert and Badge components
npx shadcn@latest add alert badge
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── server/
│   ├── api/routers/
│   │   ├── sellercloud.ts       # API integration procedures
│   │   ├── demand.ts             # Demand analysis queries
│   │   └── alerts.ts             # Shortage/excess alert logic
│   ├── services/
│   │   ├── sellercloud-client.ts # API wrapper with retry logic
│   │   └── sync-scheduler.ts     # Background sync jobs (future)
│   └── db/
│       ├── schema.ts             # Add sync metadata tables
│       └── queries/              # Complex aggregation queries
│           └── demand-summary.ts
├── app/(dashboard)/
│   ├── demand/
│   │   ├── page.tsx              # Executive summary dashboard
│   │   ├── by-brand/page.tsx     # Brand-level breakdown
│   │   ├── by-retailer/page.tsx  # Retailer-level breakdown
│   │   └── by-sku/page.tsx       # SKU-level drill-down
│   └── sync/
│       └── page.tsx              # Manual sync controls (temporary)
└── components/
    ├── demand/
    │   ├── demand-summary-card.tsx
    │   ├── shortage-alerts.tsx
    │   ├── excess-alerts.tsx
    │   └── inventory-balance-table.tsx
    └── charts/
        ├── demand-trend-chart.tsx
        └── brand-comparison-chart.tsx
```

### Pattern 1: SellerCloud API Client with Retry Logic
**What:** Centralized API client that handles authentication, rate limiting, and retries
**When to use:** All SellerCloud API calls
**Example:**
```typescript
// Source: https://developer.sellercloud.com/dev-article/authentication/
// Source: https://apistatuscheck.com/blog/how-to-handle-api-rate-limits

class SellerCloudClient {
  private baseUrl: string;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  async authenticate() {
    const response = await fetch(`${this.baseUrl}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Username: process.env.SELLERCLOUD_USERNAME,
        Password: process.env.SELLERCLOUD_PASSWORD,
      }),
    });

    const data = await response.json();
    this.token = data.access_token;
    // Token valid for 60 minutes per docs
    this.tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
  }

  async fetchWithRetry(url: string, options = {}, maxRetries = 3) {
    // Ensure token is valid
    if (!this.token || Date.now() >= this.tokenExpiry!.getTime()) {
      await this.authenticate();
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (response.status === 429) {
          // Rate limited - exponential backoff with jitter
          const backoff = Math.min(1000 * Math.pow(2, attempt), 8000);
          const jitter = Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, backoff + jitter));
          continue;
        }

        if (response.status === 401) {
          // Token expired - re-authenticate once
          if (attempt === 0) {
            await this.authenticate();
            continue;
          }
        }

        if (!response.ok && [500, 503].includes(response.status)) {
          // Server error - retry with backoff
          if (attempt < maxRetries) {
            const backoff = Math.min(1000 * Math.pow(2, attempt), 8000);
            await new Promise(resolve => setTimeout(resolve, backoff));
            continue;
          }
        }

        return response;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        // Network error - retry
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  async getPurchaseOrders(params = {}) {
    // Source: https://developer.sellercloud.com/dev-article/get-all-purchase-orders/
    const queryString = new URLSearchParams({
      pageNumber: '1',
      pageSize: '100',
      ...params,
    }).toString();

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/purchaseorders?${queryString}`
    );
    return response.json();
  }
}
```

### Pattern 2: Idempotent Upsert for Sync
**What:** Use SellerCloud IDs as unique keys to prevent duplicate imports
**When to use:** All data sync operations from SellerCloud
**Example:**
```typescript
// Source: Database schema best practice
// Source: https://www.jalasoft.com/blog/erp-integration-challenges-solutions

// Add to schema.ts
export const sellercloudPurchaseOrders = pgTable(
  "sellercloud_purchase_orders",
  {
    id: serial("id").primaryKey(),
    sellercloudId: integer("sellercloud_id").notNull().unique(), // CRITICAL: prevents duplicates
    localPurchaseOrderId: integer("local_purchase_order_id").references(() => purchaseOrders.id),
    rawData: text("raw_data"), // Store full API response for debugging
    syncedAt: timestamp("synced_at").notNull().defaultNow(),
  },
  (table) => ({
    sellercloudIdIdx: index("sc_po_sellercloud_id_idx").on(table.sellercloudId),
  })
);

// Upsert logic in sync procedure
async function syncPurchaseOrder(scPO: SellerCloudPO) {
  // Check if already synced
  const existing = await db
    .select()
    .from(sellercloudPurchaseOrders)
    .where(eq(sellercloudPurchaseOrders.sellercloudId, scPO.ID));

  if (existing.length > 0) {
    // Update existing record if data changed
    const hasChanges = JSON.stringify(existing[0].rawData) !== JSON.stringify(scPO);
    if (hasChanges) {
      await db.update(sellercloudPurchaseOrders)
        .set({ rawData: JSON.stringify(scPO), syncedAt: new Date() })
        .where(eq(sellercloudPurchaseOrders.sellercloudId, scPO.ID));
    }
    return existing[0].localPurchaseOrderId;
  }

  // Create new local PO and link
  const [localPO] = await db.insert(purchaseOrders).values({
    poNumber: scPO.PONumber,
    brandId: mapBrandId(scPO.VendorID),
    // ... map other fields
  }).returning();

  await db.insert(sellercloudPurchaseOrders).values({
    sellercloudId: scPO.ID,
    localPurchaseOrderId: localPO.id,
    rawData: JSON.stringify(scPO),
  });

  return localPO.id;
}
```

### Pattern 3: Demand Aggregation with Drizzle
**What:** SQL aggregations for cross-brand demand summary
**When to use:** Dashboard queries that sum forecasts/orders/inventory across brands
**Example:**
```typescript
// Source: Existing codebase pattern from import.ts
// Already established in Phase 2

async function getCrossBrandDemandSummary(monthStart: Date, monthEnd: Date) {
  return await db
    .select({
      brandId: brands.id,
      brandName: brands.name,
      month: forecasts.month,
      totalForecastedUnits: sql<number>`sum(${forecasts.forecastedUnits})`,
      totalOrderedUnits: sql<number>`sum(${forecasts.orderedUnits})`,
      totalOnHandUnits: sql<number>`sum(COALESCE(${inventory.quantityOnHand}, 0))`,
      totalInTransitUnits: sql<number>`sum(COALESCE(${inventory.quantityInTransit}, 0))`,
    })
    .from(forecasts)
    .innerJoin(skus, eq(forecasts.skuId, skus.id))
    .innerJoin(brands, eq(skus.brandId, brands.id))
    .leftJoin(inventory, eq(skus.id, inventory.skuId))
    .where(and(
      gte(forecasts.month, monthStart),
      lte(forecasts.month, monthEnd)
    ))
    .groupBy(brands.id, brands.name, forecasts.month)
    .orderBy(forecasts.month, brands.name);
}
```

### Pattern 4: TanStack Table Grouping for Drill-Down
**What:** Multi-level grouping (Brand → Retailer → SKU) with aggregated totals
**When to use:** Tables that need drill-down from summary to detail
**Example:**
```typescript
// Source: https://tanstack.com/table/v8/docs/guide/grouping
// Source: https://newbeelearn.com/blog/grouping-aggregation-filtering-sorting-tanstack-table/

const columns = [
  {
    id: 'brandName',
    accessorKey: 'brandName',
    header: 'Brand',
    enableGrouping: true,
  },
  {
    id: 'retailerName',
    accessorKey: 'retailerName',
    header: 'Retailer',
    enableGrouping: true,
  },
  {
    id: 'forecastedUnits',
    accessorKey: 'forecastedUnits',
    header: 'Forecasted',
    aggregationFn: 'sum', // Auto-sum when grouped
    cell: ({ row, getValue }) => {
      return row.getIsGrouped() ? (
        <strong>{getValue()}</strong> // Bold totals
      ) : (
        getValue()
      );
    },
  },
  {
    id: 'shortage',
    accessorFn: row => Math.max(0, row.forecastedUnits - row.orderedUnits - row.onHandUnits),
    header: 'Shortage',
    aggregationFn: 'sum',
    cell: ({ getValue }) => {
      const shortage = getValue();
      return shortage > 0 ? (
        <Badge variant="destructive">{shortage}</Badge>
      ) : null;
    },
  },
];

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getGroupedRowModel: getGroupedRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  state: {
    grouping: ['brandName'], // Initial grouping by brand
  },
});
```

### Pattern 5: Alert Calculation Logic
**What:** Calculate shortage/excess alerts based on inventory formulas
**When to use:** Displaying alerts on dashboard and drill-down views
**Example:**
```typescript
// Source: https://www.shopify.com/blog/available-to-promise
// Source: https://www.inventory-planner.com/ultimate-guide-to-inventory-forecasting/

interface InventoryBalance {
  skuId: number;
  sku: string;
  forecastedUnits: number;
  orderedUnits: number; // From POs
  onHandUnits: number;
  inTransitUnits: number;
  allocatedUnits: number; // Reserved for existing retail orders
}

function calculateShortage(balance: InventoryBalance): number {
  // Available = On Hand + In Transit - Allocated
  const available = balance.onHandUnits + balance.inTransitUnits - balance.allocatedUnits;

  // Shortage = Forecasted - Ordered - Available
  const shortage = balance.forecastedUnits - balance.orderedUnits - available;

  return Math.max(0, shortage); // Only positive shortages
}

function calculateExcess(balance: InventoryBalance, threshold = 2.0): number {
  // Excess when (Ordered + Available) / Forecasted > threshold
  const available = balance.onHandUnits + balance.inTransitUnits - balance.allocatedUnits;
  const supply = balance.orderedUnits + available;

  if (balance.forecastedUnits === 0) {
    // No demand forecasted but have supply
    return supply > 0 ? supply : 0;
  }

  const ratio = supply / balance.forecastedUnits;

  // Excess if ratio > threshold (e.g., 2x forecasted demand)
  return ratio > threshold ? (supply - balance.forecastedUnits * threshold) : 0;
}

// tRPC procedure example
export const alertsRouter = router({
  shortages: protectedProcedure
    .input(z.object({
      brandId: z.number().optional(),
      minShortage: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      // Fetch balances with joins
      const balances = await getInventoryBalances(ctx.db, input.brandId);

      return balances
        .map(balance => ({
          ...balance,
          shortage: calculateShortage(balance),
        }))
        .filter(item => item.shortage > input.minShortage)
        .sort((a, b) => b.shortage - a.shortage); // Highest shortage first
    }),
});
```

### Anti-Patterns to Avoid
- **Don't fetch all POs on every request:** Use pagination and incremental sync (fetch only updated records since last sync)
- **Don't calculate aggregations in React:** Push aggregations to PostgreSQL for performance
- **Don't ignore SellerCloud status enums:** Map PO statuses (Saved, Ordered, Received, etc.) to local status values
- **Don't sync during user requests:** Background sync to avoid slow API response times
- **Don't store dates as strings:** SellerCloud returns "mm/dd/yyyy hh:mm" format - parse to Date objects immediately

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API retry logic | Custom retry loops | Exponential backoff with jitter pattern | Prevents thundering herd, respects rate limits, handles transient failures |
| Date range grouping | Manual month bucketing | date-fns `startOfMonth()`, `endOfMonth()`, `eachMonthOfInterval()` | Handles timezone/DST edge cases correctly |
| Chart visualizations | Custom SVG/Canvas | shadcn/ui Charts (Recharts) | Responsive, accessible, matches existing UI |
| Dashboard aggregations | Client-side array reduce | PostgreSQL SUM/GROUP BY | 10-100x faster for large datasets |
| Background jobs | setInterval loops | node-cron or Vercel Cron | Proper scheduling, avoids overlap, handles failures |
| Token refresh | Manual timer checks | Client class with tokenExpiry check | Prevents race conditions, auto-refreshes before expiry |

**Key insight:** ERP integrations have subtle failure modes (duplicate records, partial syncs, stale tokens). Use established patterns that handle these edge cases rather than building from scratch.

## Common Pitfalls

### Pitfall 1: Duplicate Record Creation
**What goes wrong:** Syncing the same SellerCloud PO multiple times creates duplicate records in local database
**Why it happens:** No unique constraint on SellerCloud ID, or sync logic doesn't check for existing records
**How to avoid:**
- Add `sellercloud_id` column with UNIQUE constraint to sync tracking tables
- Use upsert pattern: SELECT first, then INSERT or UPDATE based on existence
- Store raw API response in `rawData` field to detect changes
**Warning signs:** Growing record counts on repeated syncs, duplicate PO numbers in database

### Pitfall 2: Token Expiry Mid-Sync
**What goes wrong:** Batch sync starts with valid token, but token expires during processing (60-minute limit), causing 401 errors
**Why it happens:** Large batch operations take longer than token validity period
**How to avoid:**
- Check token expiry BEFORE each API call (not just at start)
- Re-authenticate proactively when < 5 minutes remaining
- Handle 401 responses by refreshing token and retrying request once
**Warning signs:** Sync fails partway through with "401 Not Valid Token" errors

### Pitfall 3: Rate Limiting Without Backoff
**What goes wrong:** Rapid API calls trigger 429 rate limit errors, causing sync to fail
**Why it happens:** Making parallel requests or tight loops without respecting API rate limits
**How to avoid:**
- Implement exponential backoff with jitter (1s → 2s → 4s → 8s)
- Respect `Retry-After` header if provided
- Process records sequentially or with controlled concurrency (e.g., 5 at a time)
- Monitor rate limit headers on all responses
**Warning signs:** 429 status codes in logs, sync takes much longer than expected

### Pitfall 4: Incorrect Demand Calculations
**What goes wrong:** Shortage alerts show incorrect values because inventory states aren't calculated correctly
**Why it happens:** Forgetting to subtract allocated units, not including in-transit units, or using wrong formulas
**How to avoid:**
- Use standardized formulas: `Available = OnHand + InTransit - Allocated`
- Test calculations with known edge cases (zero forecast, zero inventory, all allocated)
- Display formula components in UI for debugging (show OnHand, InTransit, Allocated separately)
- Cross-check with SellerCloud's own inventory reports during testing
**Warning signs:** Alerts for SKUs that shouldn't have shortages, stakeholders questioning accuracy

### Pitfall 5: Date Format Confusion
**What goes wrong:** Date filters return wrong records or fail entirely
**Why it happens:** SellerCloud uses "mm/dd/yyyy hh:mm" format, PostgreSQL uses ISO 8601, JavaScript Date has timezone quirks
**How to avoid:**
- Parse SellerCloud dates immediately on receipt: `new Date(scDate)`
- Store all dates in PostgreSQL as `date` or `timestamp` types (not strings)
- Use date-fns for all date math (month grouping, ranges, comparisons)
- Always work in UTC until displaying to user
**Warning signs:** Forecast month filters showing wrong records, off-by-one-day errors

### Pitfall 6: Missing Indexes on Aggregation Queries
**What goes wrong:** Dashboard queries take 5-10+ seconds to load
**Why it happens:** GROUP BY and JOIN queries without proper indexes scan full tables
**How to avoid:**
- Add composite indexes on common filter patterns: `(brand_id, month)`, `(sku_id, month)`
- Index foreign keys used in JOINs (already done in existing schema)
- Use EXPLAIN ANALYZE to verify query plans
- Consider materialized views for expensive monthly aggregations
**Warning signs:** Dashboard feels slow, database CPU spikes on page load

### Pitfall 7: Syncing Data User Doesn't Care About
**What goes wrong:** Import thousands of old POs or cancelled orders that clutter the database
**Why it happens:** Fetching all historical data without filtering
**How to avoid:**
- Filter by date ranges (e.g., only last 12 months of POs)
- Filter by status (e.g., exclude Cancelled, only sync Ordered/Received/Pending)
- Use incremental sync after initial import (filter by `createDateFrom` to get only new/updated records)
- Let users configure sync scope via settings
**Warning signs:** Slow sync times, database growing rapidly, users complaining about irrelevant data

## Code Examples

Verified patterns from official sources:

### SellerCloud Authentication Flow
```typescript
// Source: https://developer.sellercloud.com/dev-article/authentication/
async function authenticateSellerCloud(
  baseUrl: string,
  username: string,
  password: string
): Promise<{ token: string; expiresAt: Date }> {
  const response = await fetch(`${baseUrl}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Username: username,
      Password: password,
    }),
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status}`);
  }

  const data = await response.json();

  // Token valid for 60 minutes (3600 seconds)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  return {
    token: data.access_token,
    expiresAt,
  };
}
```

### Fetch Purchase Orders with Pagination
```typescript
// Source: https://developer.sellercloud.com/dev-article/get-all-purchase-orders/
interface FetchPOsParams {
  pageNumber?: number;
  pageSize?: number;
  pOStatuses?: ('Saved' | 'Ordered' | 'Received' | 'Pending' | 'Cancelled' | 'Completed')[];
  createDateFrom?: Date;
  createDateTo?: Date;
}

async function fetchPurchaseOrders(
  client: SellerCloudClient,
  params: FetchPOsParams = {}
): Promise<{ items: any[]; totalResults: number }> {
  const queryParams = new URLSearchParams({
    pageNumber: String(params.pageNumber ?? 1),
    pageSize: String(params.pageSize ?? 100),
  });

  if (params.pOStatuses?.length) {
    params.pOStatuses.forEach(status => {
      queryParams.append('pOStatuses', status);
    });
  }

  if (params.createDateFrom) {
    // Format: mm/dd/yyyy hh:mm
    const formatted = format(params.createDateFrom, 'MM/dd/yyyy HH:mm');
    queryParams.append('createDateFrom', formatted);
  }

  if (params.createDateTo) {
    const formatted = format(params.createDateTo, 'MM/dd/yyyy HH:mm');
    queryParams.append('createDateTo', formatted);
  }

  const response = await client.fetchWithRetry(
    `${client.baseUrl}/api/purchaseorders?${queryParams}`
  );

  const data = await response.json();

  return {
    items: data.Items ?? [],
    totalResults: data.TotalResults ?? 0,
  };
}
```

### Demand Summary tRPC Procedure
```typescript
// Based on existing codebase patterns
export const demandRouter = router({
  crossBrandSummary: protectedProcedure
    .input(z.object({
      monthStart: z.date(),
      monthEnd: z.date(),
      brandId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [
        gte(forecasts.month, input.monthStart),
        lte(forecasts.month, input.monthEnd),
      ];

      if (input.brandId) {
        conditions.push(eq(skus.brandId, input.brandId));
      }

      return await ctx.db
        .select({
          brandId: brands.id,
          brandName: brands.name,
          month: forecasts.month,
          forecastedUnits: sql<number>`sum(${forecasts.forecastedUnits})`,
          orderedUnits: sql<number>`sum(${forecasts.orderedUnits})`,
          onHandUnits: sql<number>`sum(COALESCE(${inventory.quantityOnHand}, 0))`,
          inTransitUnits: sql<number>`sum(COALESCE(${inventory.quantityInTransit}, 0))`,
        })
        .from(forecasts)
        .innerJoin(skus, eq(forecasts.skuId, skus.id))
        .innerJoin(brands, eq(skus.brandId, brands.id))
        .leftJoin(inventory, eq(skus.id, inventory.skuId))
        .where(and(...conditions))
        .groupBy(brands.id, brands.name, forecasts.month)
        .orderBy(forecasts.month, brands.name);
    }),

  retailerBreakdown: protectedProcedure
    .input(z.object({
      brandId: z.number().optional(),
      month: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(forecasts.month, input.month)];

      if (input.brandId) {
        conditions.push(eq(skus.brandId, input.brandId));
      }

      return await ctx.db
        .select({
          retailerId: retailers.id,
          retailerName: retailers.name,
          brandId: brands.id,
          brandName: brands.name,
          forecastedUnits: sql<number>`sum(${forecasts.forecastedUnits})`,
          orderedUnits: sql<number>`sum(${forecasts.orderedUnits})`,
        })
        .from(forecasts)
        .innerJoin(skus, eq(forecasts.skuId, skus.id))
        .innerJoin(brands, eq(skus.brandId, brands.id))
        .innerJoin(retailers, eq(forecasts.retailerId, retailers.id))
        .where(and(...conditions))
        .groupBy(retailers.id, retailers.name, brands.id, brands.name)
        .orderBy(retailers.name, brands.name);
    }),
});
```

### Shortage Alert Component
```tsx
// Source: https://ui.shadcn.com/docs/components/badge
// Source: https://ui.shadcn.com/docs/components/radix/alert
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface ShortageAlert {
  sku: string;
  skuName: string;
  brandName: string;
  shortage: number;
  forecastedUnits: number;
  availableUnits: number;
}

export function ShortageAlerts({ alerts }: { alerts: ShortageAlert[] }) {
  if (alerts.length === 0) {
    return (
      <Alert>
        <AlertTitle>No Shortages</AlertTitle>
        <AlertDescription>
          All SKUs have sufficient inventory to meet forecasted demand.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.slice(0, 10).map(alert => (
        <Alert key={alert.sku} variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            {alert.sku} - {alert.skuName}
            <Badge variant="destructive">{alert.shortage} units short</Badge>
          </AlertTitle>
          <AlertDescription>
            {alert.brandName} | Forecasted: {alert.forecastedUnits} | Available: {alert.availableUnits}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Poll API every N minutes | Webhook-based sync | N/A for SellerCloud | SellerCloud supports webhooks for inventory/order events (future enhancement) |
| Custom chart libraries | shadcn/ui Charts (Recharts) | 2024 | Matches existing UI, TypeScript-safe config, copy-paste components |
| Client-side aggregations | PostgreSQL materialized views | Ongoing 2025-2026 | 10-100x performance for large datasets |
| Fixed window rate limiting | Sliding window with exponential backoff | 2025+ | Smoother rate limiting, prevents thundering herd |
| Manual data refresh | Automated cron sync | Depends on API access | Real-time visibility without manual intervention |

**Deprecated/outdated:**
- SellerCloud SOAP API: Replaced by REST API (use REST endpoints only)
- GET /api/Inventory/{id}: Does not support special characters, use POST /api/Inventory/Details instead
- String-based date columns: Use PostgreSQL date/timestamp types for proper indexing and comparison

## Open Questions

Things that couldn't be fully resolved:

1. **SellerCloud API Rate Limits**
   - What we know: API uses rate limiting (429 responses documented)
   - What's unclear: Exact rate limit thresholds (requests per minute/hour)
   - Recommendation: Start conservatively (1 request/second), monitor 429 responses, adjust based on actual limits. Contact SellerCloud support for official limits.

2. **Inventory Webhook Events**
   - What we know: SellerCloud supports webhooks for inventory updates and new orders
   - What's unclear: How to register webhook URLs, payload format, reliability
   - Recommendation: Start with polling (fetch updates every 15-30 minutes), investigate webhooks for Phase 4 real-time updates.

3. **SellerCloud Field Mapping**
   - What we know: PO API returns VendorID, but local schema uses brandId
   - What's unclear: How to map SellerCloud VendorID to local Brand records
   - Recommendation: Create mapping table `sellercloud_vendor_brand_map` with manual configuration UI. Alternatively, store vendor name and fuzzy match to brand name.

4. **Payment Status Tracking**
   - What we know: PO endpoint has `paymentStatus` field (requires vendor invoice workflow disabled)
   - What's unclear: Whether company has vendor invoice workflow enabled, alternative fields if enabled
   - Recommendation: Check with team on SellerCloud configuration. If workflow enabled, use `vendorInvoiced` field instead.

5. **Shipment Tracking API**
   - What we know: PO endpoint includes TrackingNumber and CourierService fields
   - What's unclear: Whether tracking info is comprehensive enough, or if separate shipment endpoint needed
   - Recommendation: Start with PO tracking fields. If insufficient, explore Order Services endpoints for detailed shipment tracking.

6. **Materialized View Refresh Strategy**
   - What we know: Materialized views improve query performance for aggregations
   - What's unclear: Optimal refresh frequency (on-demand, scheduled, or after sync)
   - Recommendation: Start without materialized views. Add them only if dashboard queries exceed 2-3 seconds. Refresh after each sync operation.

## Sources

### Primary (HIGH confidence)
- [SellerCloud API Authentication](https://developer.sellercloud.com/dev-article/authentication/) - Token generation, expiry, headers
- [SellerCloud REST Services Overview](https://developer.sellercloud.com/dev-article/rest-services-overview/) - Base URLs, pagination, date formats
- [Get All Purchase Orders](https://developer.sellercloud.com/dev-article/get-all-purchase-orders/) - PO endpoint, filters, response structure
- [Get Inventory Info for Single Product](https://developer.sellercloud.com/dev-article/get-inventory-info-for-single-product/) - Inventory endpoint details
- [shadcn/ui Badge Component](https://ui.shadcn.com/docs/components/badge) - Alert badge patterns
- [shadcn/ui Alert Component](https://ui.shadcn.com/docs/components/radix/alert) - Alert UI patterns
- Existing codebase schema.ts and import.ts - Established patterns for aggregations

### Secondary (MEDIUM confidence)
- [TanStack Table Grouping Guide](https://tanstack.com/table/v8/docs/guide/grouping) - Verified pattern for grouped tables
- [Node.js API Rate Limiting Best Practices](https://apistatuscheck.com/blog/how-to-handle-api-rate-limits) - Exponential backoff with jitter (2026 guide)
- [PostgreSQL Materialized Views Overview](https://risingwave.com/blog/postgresql-materialized-views-an-overview/) - Performance benefits for aggregations
- [Inventory Forecasting Formulas](https://www.shopify.com/blog/available-to-promise) - Available-to-promise calculation
- [ERP Integration Challenges](https://www.jalasoft.com/blog/erp-integration-challenges-solutions) - Duplicate records, data quality issues

### Tertiary (LOW confidence)
- [Demand Planning KPIs](https://www.netsuite.com/portal/resource/articles/accounting/demand-planning-kpis-metrics.shtml) - General KPI patterns (not SellerCloud-specific)
- [Next.js Dashboard Patterns](https://arnab-k.medium.com/building-data-visualization-dashboards-in-next-js-f29e1da0fb4c) - Dashboard architecture ideas
- SellerCloud webhook support mentioned in search results but no official documentation found - needs verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - SellerCloud API documented, existing stack already established
- Architecture: HIGH - Patterns based on official SellerCloud docs and existing codebase conventions
- Pitfalls: MEDIUM - Based on general ERP integration experience, not SellerCloud-specific war stories
- Formulas: MEDIUM - Standard inventory formulas verified with multiple sources, but not SellerCloud's exact calculations

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days) - SellerCloud API stable, but verify rate limits and webhook details before implementation

**Key assumptions:**
- SellerCloud API credentials will be available via VPS setup (currently pending per STATE.md)
- Excel import workflow established in Phase 2 can be used as fallback during API setup
- Existing database schema (inventory, forecasts, purchaseOrders) is sufficient with minor additions (sync tracking tables)
- Team wants automated sync eventually, but manual refresh acceptable initially
