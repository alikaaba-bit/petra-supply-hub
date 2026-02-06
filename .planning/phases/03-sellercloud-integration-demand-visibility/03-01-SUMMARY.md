# Phase 03 Plan 01: SellerCloud API Integration Layer Summary

---
phase: 03-sellercloud-integration-demand-visibility
plan: 01
subsystem: external-integration
tags: [sellercloud, erp-integration, api-client, sync-tracking, data-import]
requires: [02-03]
provides: [sellercloud-api-client, sync-tracking-schema, manual-sync-procedures]
affects: [03-02, 03-03, 03-04]
tech-stack.added: []
tech-stack.patterns: [retry-with-backoff, idempotent-upsert, singleton-factory, graceful-degradation]
key-files.created:
  - src/server/services/sellercloud-client.ts
  - src/server/api/routers/sellercloud.ts
key-files.modified:
  - src/server/db/schema.ts
decisions:
  - id: vendor-brand-mapping-deferred
    desc: Default to brandId 1 until vendor->brand mapping table is implemented
    context: SellerCloud VendorID doesn't directly map to local brand records
    rationale: Allows sync to work immediately while proper mapping can be added in Plan 02
  - id: post-inventory-endpoint
    desc: Use POST /api/Inventory/Details instead of GET endpoint
    context: GET endpoint has issues with special characters per research
    rationale: Follows documented best practice from SellerCloud API research
  - id: manual-sync-only
    desc: tRPC procedures for manual sync triggers, no automated cron jobs yet
    context: Phase 3 Plan 01 focuses on integration foundation
    rationale: Verify integration works correctly before adding automation complexity
  - id: graceful-env-handling
    desc: Return descriptive error objects instead of throwing when credentials missing
    context: Development environment may not have SellerCloud access configured
    rationale: Allows UI to display helpful setup instructions to user
duration: 3
completed: 2026-02-06
---

**One-liner:** Built SellerCloud API client with retry/backoff, sync tracking schema with unique constraints, and tRPC procedures for manual PO/inventory import.

## What Was Built

### SellerCloud API Client (src/server/services/sellercloud-client.ts)
- **SellerCloudClient class:** Authenticated HTTP client for SellerCloud REST API
  - `authenticate()`: JWT Bearer token generation, 60-minute expiry tracking
  - `fetchWithRetry()`: Exponential backoff with jitter for 429/500/503 errors, automatic token refresh on 401
  - `getPurchaseOrders()`: Paginated PO fetching with status/date filters
  - `getAllPurchaseOrders()`: Auto-pagination helper to fetch all pages
  - `getInventoryForProduct()`: POST endpoint for inventory details (avoids special char issues)
- **Singleton factory:** `getSellerCloudClient()` creates/reuses single instance
- **Error handling:** Descriptive errors on auth failure, rate limiting, network issues
- **Date formatting:** Uses date-fns to format dates in SellerCloud's MM/dd/yyyy HH:mm format

### Sync Tracking Schema (src/server/db/schema.ts)
- **sellercloudSyncLog table:** Tracks sync operations with status, counts, errors
  - Fields: entityType, syncStartedAt, syncCompletedAt, status (running/completed/failed)
  - Metrics: recordsProcessed, recordsCreated, recordsUpdated
  - Audit: triggeredBy (user ID), errorMessage
  - Index on (entityType, syncStartedAt) for efficient status queries
- **sellercloudIdMap table:** Prevents duplicate imports via unique constraints
  - Fields: entityType, sellercloudId (unique per entityType), localTableName, localId
  - rawData: JSON string of original API response for change detection
  - Unique constraint on (entityType, sellercloudId) enforces idempotent sync
  - Index on (localTableName, localId) for reverse lookups
- **Relations:** sellercloudSyncLog -> users via triggeredBy

### SellerCloud tRPC Router (src/server/api/routers/sellercloud.ts)
- **syncPurchaseOrders mutation:**
  - Input: dateFrom/dateTo (optional), statuses (optional array)
  - Fetches all POs from SellerCloud API with filters
  - Idempotent upsert: checks sellercloudIdMap, creates or updates based on rawData changes
  - Status mapping: SellerCloud statuses (Saved, Ordered, Received, etc.) → local values
  - Returns: syncLogId, recordsProcessed, recordsCreated, recordsUpdated
  - Graceful degradation: Returns error object if credentials not configured
- **syncInventory mutation:**
  - Input: skuIds (optional array, defaults to all SKUs)
  - For each SKU, fetches inventory from SellerCloud using SKU code
  - Upserts inventory table with quantityOnHand, quantityInTransit, quantityAllocated
  - Continues on individual SKU errors, logs to console
  - Returns: syncLogId, counts
- **syncStatus query:**
  - Returns last 10 sync operations ordered by syncStartedAt desc
- **lastSync query:**
  - Input: entityType
  - Returns most recent completed sync for that entity type

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

### 1. Vendor-to-Brand Mapping Deferred
**Problem:** SellerCloud POs have VendorID field, but local schema uses brandId (integer FK to brands table)

**Decision:** Default to `brandId: 1` in syncPurchaseOrders, add TODO comment for mapping table

**Rationale:** Allows sync to work immediately for single-brand testing. Proper solution requires vendor->brand mapping UI/configuration, which can be added in Plan 02 when building admin tools.

**Impact:** Multi-brand setups will need the mapping table before production use. For MVP testing with single brand, this works fine.

### 2. POST Inventory Endpoint
**Problem:** Research flagged that GET /api/Inventory/{id} endpoint has issues with special characters in SKU codes

**Decision:** Use POST /api/Inventory/Details endpoint with body payload

**Implementation:** `getInventoryForProduct()` uses POST with `{ ProductID: productId }` body

**Rationale:** Follows documented best practice from SellerCloud API research. Avoids potential URL encoding issues.

### 3. Manual Sync Only (No Cron Scheduler)
**Problem:** Plan explicitly deferred node-cron scheduler implementation

**Decision:** Expose tRPC procedures for manual sync triggers only

**Rationale:**
- Verify integration works correctly with real SellerCloud credentials before automation
- Manual triggers easier to debug during initial setup
- Automated sync can be layered on in Plan 02 once manual flow proven stable

**Next steps:** Plan 02 will add cron jobs or Vercel Cron for automated 15-30 minute sync intervals.

### 4. Graceful Environment Variable Handling
**Problem:** Development environments may not have SellerCloud credentials configured

**Decision:** Check env vars at procedure start, return descriptive error object instead of throwing

**Implementation:**
```typescript
if (!checkSellerCloudConfigured()) {
  return {
    error: "SellerCloud not configured. Set SELLERCLOUD_BASE_URL, ...",
    syncLogId: 0,
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
  };
}
```

**Rationale:** Allows UI to display helpful setup instructions. Prevents cryptic error messages in non-production environments.

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | SellerCloud API client and sync tracking schema | 8e8e49e | sellercloud-client.ts, schema.ts |
| 2 | SellerCloud sync tRPC router | 0e7efef | sellercloud.ts (router) |

## Technical Deep Dive

### Retry Logic with Exponential Backoff
The `fetchWithRetry()` method implements intelligent retry for various failure modes:

**429 Rate Limiting:**
- Base backoff: 1 second
- Exponential multiplier: 2^attempt
- Max backoff: 8 seconds
- Jitter: Random 0-1 second added to prevent thundering herd

**401 Authentication:**
- Single re-authentication attempt
- Refreshes token proactively if < 5 minutes remaining
- Prevents mid-sync token expiry

**500/503 Server Errors:**
- Retries with exponential backoff
- Max 3 retries before giving up

**Network Errors:**
- Catches fetch failures (DNS, connection timeout)
- Retries with backoff

### Idempotent Sync Pattern
The sync prevents duplicate records using a two-table approach:

1. **sellercloudIdMap:** Acts as registry of synced entities
   - Unique constraint on (entityType, sellercloudId) enforces one-to-one mapping
   - Stores rawData JSON for change detection

2. **Sync logic:**
   ```
   IF mapping exists:
     IF rawData changed:
       UPDATE local record
       UPDATE mapping.lastSyncedAt
       recordsUpdated++
   ELSE:
     INSERT local record
     INSERT mapping
     recordsCreated++
   ```

This ensures:
- Running sync multiple times doesn't create duplicates
- Only changed records trigger database updates (efficient)
- Full audit trail via rawData field

### Status Mapping Strategy
SellerCloud uses string statuses: "Saved", "Ordered", "Received", "Pending", "Cancelled", "Completed"

Local schema uses simpler values: "draft", "ordered", "received", "pending", "cancelled", "completed"

Mapping function provides translation layer, defaulting to "draft" for unknown statuses.

## Next Phase Readiness

### Blockers
None. Router is ready for use once SellerCloud credentials are available.

### Prerequisites for Plan 02
1. **Router registration:** Plan 02 should add `sellercloud: sellercloudRouter` to root.ts
2. **Database migration:** Run `npm run db:push` to create new tables
3. **Environment variables:** Set SELLERCLOUD_BASE_URL, USERNAME, PASSWORD for testing

### Known Limitations
1. **Vendor-to-brand mapping:** Defaults to brandId 1, needs mapping table for multi-brand
2. **Line items not synced:** Current sync only handles PO headers, not individual line items
3. **No shipment tracking:** TrackingNumber/CourierService fields exist on PO endpoint but not yet synced
4. **No payment status:** PO payment fields exist but not yet synced

These are intentional scope limitations for Plan 01. Plan 02/03 will expand sync coverage.

### Testing Checklist
Before marking Plan 02 complete, verify:
- [ ] SellerCloud credentials configured in .env
- [ ] `npm run db:push` applied schema changes successfully
- [ ] Can call `syncPurchaseOrders` without errors (even if returns 0 records)
- [ ] sellercloudSyncLog entries created with "completed" status
- [ ] If credentials invalid, returns descriptive error message (not crash)

## Performance Notes

**Token caching:** Singleton factory pattern ensures one client instance per server process, avoiding redundant auth calls.

**Pagination efficiency:** `getAllPurchaseOrders()` auto-paginates with 100 records per page. For 1000 POs, makes 10 API calls instead of 1000.

**Change detection:** rawData comparison prevents unnecessary database updates when SellerCloud data unchanged.

**Index usage:**
- sellercloudIdMap unique constraint on (entityType, sellercloudId) provides O(1) lookup
- Index on (entityType, syncStartedAt) optimizes syncStatus query

## Security Considerations

**Credentials storage:** Environment variables for SELLERCLOUD_BASE_URL, USERNAME, PASSWORD. Never committed to git.

**Token lifetime:** 60-minute expiry per SellerCloud docs. Client proactively refreshes at 55-minute mark to prevent mid-operation expiry.

**Audit trail:** triggeredBy field tracks which user initiated sync. Supports future RBAC restrictions (e.g., only admins can trigger PO sync).

**Error message sanitization:** Error responses don't expose credentials or internal system details.

## Self-Check: PASSED

All key files exist:
- src/server/services/sellercloud-client.ts (7,821 bytes)
- src/server/api/routers/sellercloud.ts (12,385 bytes)
- src/server/db/schema.ts (modified, contains sellercloud_sync_log and sellercloud_id_map tables)

All commits exist:
- 8e8e49e: Task 1 - API client and schema
- 0e7efef: Task 2 - tRPC router

TypeScript compiles cleanly with no errors.
