# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** Every team member can open one dashboard and instantly see: what's the demand, what's been ordered, what's in stock, what's arriving, and what cash is needed — across all brands and retailers.

**Current focus:** PAUSED — Phase 4 planned, ready for execution

## Current Position

Phase: 4 of 4 (Order Tracking & Role-Based Views) — IN PROGRESS
Plan: 2 of 3 (Wave 2 in progress)
Status: In progress
Last activity: 2026-02-06 — Completed 04-02-PLAN.md

Progress: [█████████░] 94%

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: 6.3 min
- Total execution time: ~1.4 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-master-data | 3/3 | 36min | 12min |
| 02-data-integration-manual-entry | 3/3 | 21min | 7min |
| 03-sellercloud-integration-demand-visibility | 4/4 | 14min | 3.5min |
| 04-order-tracking-role-based-views | 2/3 | 7min | 3.5min |

**Recent Trend:**
- Last 5 plans: 03-03 (4min), 03-04 (4min), 04-01 (3min), 04-02 (4min)
- Trend: Consistent fast execution, Phase 4 maintaining 3-4 min per plan

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Web app over Google Sheets: Need role-based views, SellerCloud integration, and clean UX
- Start with Excel import, add API later: SellerCloud API access not yet available; team needs visibility now
- Cash flow visibility deferred: Focus on demand and order tracking first; CFW features moved to next session
- **01-01**: Drizzle ORM over Prisma for lighter serverless footprint
- **01-01**: Connection pool max:1 for serverless environments
- **01-01**: Include Auth.js adapter tables in initial schema (16 tables total)
- **01-02**: Removed DrizzleAdapter from Auth.js (type conflict with JWT strategy)
- **01-02**: JWT strategy required for Credentials provider (no database sessions)
- **01-02**: protectedProcedure sets app.current_user_id PostgreSQL session variable
- **01-02**: Audit triggers capture INSERT/UPDATE/DELETE with before/after data
- **01-03**: SessionProvider added to Providers for useSession() support
- **01-03**: Count queries added to all routers for dashboard stat cards
- **01-03**: SKUs generated programmatically (158 total) to prevent context exhaustion
- **01-03**: Seed script made idempotent by checking existing records
- **02-01**: Excel-first approach: Manual file uploads before SellerCloud API integration
- **02-01**: Security re-validation pattern: Server Actions re-check IDs to prevent client tampering
- **02-01**: Date serialization for Server Actions: Convert Date to ISO string for JSON wire transfer
- **02-01**: Batch processing: 100 rows per batch to avoid oversized database queries
- **02-01**: HOP parser flexibility: Adapts to unknown format with "Retailer - Month" or simple columns
- **02-02**: Multi-step wizard flow: Clear progress indication for non-technical users (4 steps: Upload, Validate, Preview, Commit)
- **02-02**: Preview limited to 100 rows: Balance between completeness and UI performance
- **02-02**: Blocking validation: Errors prevent import to ensure data quality
- **02-02**: Format auto-detection badge: User confirmation of detected format (RTL vs HOP)
- **02-03**: useFieldArray for line items: React Hook Form's API for dynamic add/remove with proper form state
- **02-03**: Auto-calculate totals: Watch line items with form.watch() for real-time total calculation
- **02-03**: Grouped sidebar navigation: Organized into 5 sections (Overview, Data, Orders, Master Data, System)
- **02-03**: Zod schema without defaults: Removed .optional() from fields with .default() to avoid type inference issues
- **03-01**: Vendor-brand mapping deferred: Default to brandId 1 until mapping table implemented
- **03-01**: POST inventory endpoint: Use POST /api/Inventory/Details to avoid special character issues
- **03-01**: Manual sync only: tRPC procedures for manual triggers, no cron scheduler yet
- **03-01**: Graceful env handling: Return descriptive error objects when credentials not configured
- **03-02**: PostgreSQL-level aggregation: Use SQL aggregation (Drizzle sql template) instead of client-side reduce for performance
- **03-02**: String-to-number conversion: PostgreSQL SUM returns strings; explicit Number() conversion required
- **03-02**: Standardized inventory formulas: Available = OnHand + InTransit - Allocated; Shortage = Forecasted - Ordered - Available
- **03-03**: Reusable BrandSelector component: Shared across all demand views for consistent filtering UX
- **03-03**: Color-coded visual indicators: Red badges for shortages, amber for excess, green for healthy state
- **03-03**: SKU drill-down pagination: 50 records per page for optimal UI performance
- **03-03**: Month selector pattern: Current + past 3 months for historical comparison using date-fns
- **03-03**: Summary cards aggregate by brand: Client-side reduce of crossBrandSummary data by brandId
- **03-04**: Executive summary one-screen design: CEO-facing dashboard shows all key health indicators without scrolling
- **03-04**: Auto-generated action items: Dynamic list based on shortage/excess counts, forecast availability, and sync status
- **03-04**: Nested route highlighting: Use pathname.startsWith for active detection (except root) to match multi-level nav
- **03-04**: Demand health on main dashboard: Surfacing shortage/excess alerts immediately for increased visibility
- **03-04**: Manual sync only: Explicit button triggers for PO/inventory sync; auto-scheduling deferred to Phase 4
- **04-01**: 5-day buffer for order-by calculations: calculateOrderByDate subtracts (leadTimeDays + 5) from need-by date
- **04-01**: StatusBadge semantic color scheme: Secondary for draft, default for in-progress, green for complete, destructive for cancelled
- **04-01**: LeadTimeBadge urgency thresholds: Overdue (past) = red, urgent (<=7 days) = amber, normal (>7 days) = gray
- **04-01**: POTimeline fixed 6-step lifecycle: ordered → confirmed → in_production → shipped → in_transit → arrived
- **04-01**: Status summary uses PostgreSQL aggregation (COUNT + GROUP BY) for performance
- **04-02**: Deposit status as icon: Green check / red X for compact at-a-glance visibility
- **04-02**: Lead time badge on supplier PO list: Inline calculateOrderByDate for immediate order-by urgency display
- **04-02**: Ship-by urgency as text color: Amber text (not badge) for dates <=7 days away
- **04-02**: POTimeline as primary lifecycle view: Visual storytelling on supplier detail page

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 1-2 complete - User setup required:**
- PostgreSQL database must be running and accessible (DATABASE_URL configured)
- Run `npm run db:push` to apply schema (includes retailSales table from Phase 2)
- Run `npm run db:seed` to populate 4 users, 5 brands, 158 SKUs, 16 retailers
- Login at http://localhost:3000/login with any user (password: admin123)

**Phase 2 notes:**
- Real HOP Excel files not yet available - HOP parser may need adjustment when format is known
- Data quality in existing Excel files not yet audited (research flags 90% of spreadsheets contain errors)
- 6 human verification items flagged by verifier for end-to-end testing with real files

**Phase 3 complete:**
- SellerCloud API integration layer complete, awaiting credentials for testing
- Demand aggregation and alert calculation backend complete (9 tRPC routers total)
- Demand visibility UI complete: 3 pages (summary, by-retailer, by-sku) with brand filtering
- Executive summary dashboard and sync management page complete
- Navigation enhanced with 6 sections (Overview, Demand, Data, Orders, Master Data, System)
- Must run `npm run db:push` to create sellercloud_sync_log and sellercloud_id_map tables
- Vendor-to-brand mapping table needed for multi-brand PO sync

**Phase 4 in progress:**
- Tracking tRPC router complete (10 routers total now)
- 4 shared tracking UI components ready for tracking pages and role dashboards
- Wave 1 complete (04-01), Wave 2 ready for execution (04-02, 04-03)

**Change management:**
- Non-technical team requires intuitive UI design from day one
- Parallel Excel usage needed during transition period
- Internal champion should be identified for adoption advocacy

## Session Continuity

Last session: 2026-02-06 (Phase 4 execution continuing)
Stopped at: Completed 04-02-PLAN.md (Wave 2 in progress)
Resume file: None
Resume with: Execute 04-03 to complete Phase 4
Plans completed:
  - 01-01-PLAN.md: Project scaffolding, database schema, connection pooling ✓
  - 01-02-PLAN.md: Auth.js v5, tRPC v11, audit triggers ✓
  - 01-03-PLAN.md: Dashboard UI, master data CRUD pages, seed data ✓
  - 02-01-PLAN.md: Excel parsers, validators, import service, Server Actions, tRPC routers ✓
  - 02-02-PLAN.md: Import wizard UI, drag-drop upload, validation results, preview table ✓
  - 02-03-PLAN.md: Order entry forms, sidebar navigation, dashboard stats, forecasts page ✓
  - 03-01-PLAN.md: SellerCloud API client, sync tracking schema, manual sync procedures ✓
  - 03-02-PLAN.md: Demand/alerts routers, PostgreSQL aggregation, all Phase 3 routers registered ✓
  - 03-03-PLAN.md: Demand dashboard pages (summary, by-retailer, by-sku) ✓
  - 03-04-PLAN.md: Executive summary, sync management, enhanced navigation ✓
  - 04-01-PLAN.md: Tracking tRPC router, lead time utils, 4 shared UI components ✓
  - 04-02-PLAN.md: Supplier PO tracking + retail order tracking pages ✓
Plans ready (not yet executed):
  - 04-03-PLAN.md: 4 role-based dashboards + sidebar navigation update (Wave 2)
Phase 1 status: Complete (verified)
Phase 2 status: Complete (verified - 5/5 success criteria)
Phase 3 status: Complete (verified - 9/9 success criteria)
Phase 4 status: In progress (2/3 complete - Wave 2 in progress)
Next: Execute 04-03 to complete Phase 4
