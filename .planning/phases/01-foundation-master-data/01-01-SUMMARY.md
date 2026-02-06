---
phase: 01-foundation-master-data
plan: 01
subsystem: database
tags: [nextjs, drizzle-orm, postgresql, shadcn-ui, trpc, auth-js]

# Dependency graph
requires:
  - phase: none
    provides: Initial project setup
provides:
  - Next.js 16 project with TypeScript, Tailwind, and App Router
  - Complete PostgreSQL schema with 16 tables using Drizzle ORM
  - Connection pooling configured for serverless deployment
  - shadcn/ui component library installed
  - tRPC and Auth.js dependencies ready for use
affects: [01-02, 01-03, all future phases]

# Tech tracking
tech-stack:
  added:
    - next@16.1.6
    - drizzle-orm@0.45.1
    - next-auth@5.0.0-beta.30
    - @trpc/server@11.9.0
    - shadcn/ui components
    - pg@8.18.0
  patterns:
    - "Drizzle ORM with node-postgres connection pooling"
    - "Global singleton pool (max:1) for serverless"
    - "Auth.js DrizzleAdapter schema structure"

key-files:
  created:
    - src/server/db/schema.ts
    - src/server/db/index.ts
    - drizzle.config.ts
    - package.json
    - tsconfig.json
    - next.config.ts
    - .env.local
    - .env.example
  modified: []

key-decisions:
  - "Use Drizzle ORM over Prisma for lighter serverless footprint"
  - "Connection pool max:1 for serverless environments"
  - "Include Auth.js adapter tables in initial schema"
  - "16 tables total: auth (4), master data (4), transactions (6), supporting (2)"

patterns-established:
  - "Schema organized by domain: Auth.js, Master Data, Forecasts, Purchase Orders, Inventory, Retail Orders, Payments, Audit"
  - "All foreign keys have indexes for query performance"
  - "Timestamps (createdAt, updatedAt) on all mutable entities"
  - "Soft deletes via 'active' boolean where appropriate"

# Metrics
duration: 20min
completed: 2026-02-06
---

# Phase 01 Plan 01: Project Scaffolding, Database Schema & Connection Pooling Summary

**Next.js 16 with complete supply chain schema (16 tables) using Drizzle ORM and serverless connection pooling**

## Performance

- **Duration:** 20 min
- **Started:** 2026-02-06T08:47:03Z
- **Completed:** 2026-02-06T09:06:55Z
- **Tasks:** 2
- **Files modified:** 27

## Accomplishments

- Created Next.js 16 project with TypeScript, Tailwind CSS, and App Router in existing git repo
- Defined complete database schema with 16 tables covering all supply chain entities
- Configured connection pooling with global singleton (max:1 for serverless)
- Installed shadcn/ui base components for Phase 1 UI
- Set up Drizzle Kit with migration and studio scripts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Next.js 16 project and install all dependencies** - `0597da5`, `15340c7` (chore)
2. **Task 2: Define complete database schema with Drizzle ORM** - `fda2f58` (feat)

## Files Created/Modified

### Core Configuration
- `package.json` - Next.js project with all dependencies (Drizzle, Auth.js, tRPC, shadcn/ui)
- `tsconfig.json` - TypeScript configuration with path aliases
- `next.config.ts` - Next.js 16 configuration
- `drizzle.config.ts` - Drizzle Kit configuration for migrations

### Database
- `src/server/db/schema.ts` - Complete schema with 16 tables and relations
- `src/server/db/index.ts` - Database client with connection pooling singleton

### Environment
- `.env.local` - Local environment variables (DATABASE_URL, AUTH_SECRET, AUTH_URL)
- `.env.example` - Example environment variables for team reference

### UI Components (shadcn/ui)
- `src/components/ui/` - Button, Card, Input, Label, Table, Dialog, Dropdown Menu, Sidebar, Avatar, Badge, Separator, Sheet, Tabs, Sonner

## Database Schema Details

### Auth.js Tables (4)
- `users` - User accounts with roles (admin, editor, viewer)
- `accounts` - OAuth provider accounts
- `sessions` - Active user sessions
- `verification_tokens` - Email verification tokens

### Master Data Tables (4)
- `brands` - Brand information with lead times
- `skus` - Product SKUs linked to brands
- `retailers` - Retailer/customer information
- `brand_retailers` - Many-to-many relationship between brands and retailers

### Transaction Tables (6)
- `purchase_orders` - Purchase orders from suppliers
- `po_line_items` - Line items for purchase orders
- `retail_orders` - Orders from retailers
- `retail_order_line_items` - Line items for retail orders
- `payments` - Payment tracking for both POs and retail orders
- `forecasts` - Monthly demand forecasts by SKU and retailer

### Supporting Tables (2)
- `inventory` - Current inventory levels per SKU
- `audit_log` - Audit trail for all data changes

## Decisions Made

- **Drizzle ORM over Prisma**: Lighter bundle size for serverless, faster cold starts
- **Connection pooling singleton**: Global variable in development, production uses max:1 to prevent connection exhaustion in serverless
- **Auth.js schema upfront**: Include authentication tables in initial schema to avoid migration conflicts later
- **Comprehensive indexing**: Indexes on all foreign keys and frequently queried columns (status, dates, codes)
- **Soft deletes**: Use `active` boolean on master data tables rather than hard deletes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**1. create-next-app in non-empty directory**
- **Issue:** Directory contains `.planning/` and `.git/`, create-next-app refuses to run
- **Resolution:** Created Next.js app in `/tmp/petra-temp`, then copied files to project directory, preserving `.planning/` and `.git/`

**2. Module not found after initial copy**
- **Issue:** `next` binary failed with "Cannot find module '../server/require-hook'" after copying files
- **Resolution:** Cleaned and reinstalled node_modules with `npm install` in the project directory

**3. .env.example gitignored**
- **Issue:** Default `.gitignore` ignores all `.env*` files including `.env.example`
- **Resolution:** Force-added `.env.example` with `git add -f .env.example`

## Next Phase Readiness

**Ready for Phase 01-02:**
- Database schema defined and ready for migration
- Auth.js tables in place for authentication implementation
- tRPC dependencies installed for API layer
- shadcn/ui components available for UI development

**Blockers:**
- PostgreSQL database must be running locally or remotely (DATABASE_URL in .env.local)
- Run `npm run db:push` to apply schema to database before Phase 01-02

**Next steps:**
1. Ensure PostgreSQL is running and accessible
2. Run `npm run db:push` to create database tables
3. Proceed to Phase 01-02 for Auth.js setup and tRPC API layer

---
*Phase: 01-foundation-master-data*
*Completed: 2026-02-06*

## Self-Check: PASSED

All files created and commits verified.
