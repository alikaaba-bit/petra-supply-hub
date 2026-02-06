# Phase 1: Foundation & Master Data - Research

**Researched:** 2026-02-06
**Domain:** Full-stack web application (Next.js + PostgreSQL + Auth.js + Drizzle ORM + tRPC + shadcn/ui)
**Confidence:** HIGH

## Summary

Phase 1 establishes the technical foundation for a supply chain management system handling 5 brands, ~160 SKUs, and ~12 retailers. The research validates that the chosen stack (Next.js 16 + Drizzle ORM + PostgreSQL + Auth.js v5 + tRPC v11 + shadcn/ui) is production-ready and represents current best practices for 2026.

**Key findings:**
- Next.js 16 introduces breaking changes (async params/searchParams, proxy.ts) requiring careful migration
- Drizzle ORM with drizzle-seed provides excellent PostgreSQL integration with type-safe migrations
- Auth.js v5 is production-ready with App Router-first design and universal `auth()` function
- Connection pooling is critical for Vercel serverless deployments to avoid connection exhaustion
- shadcn/ui provides production-ready dashboard components with dark mode support
- PostgreSQL schema design for supply chain requires normalized tables with proper foreign keys and audit trails

**Primary recommendation:** Use Next.js 16 App Router with Server Components by default, implement connection pooling from day one, use Drizzle's push mode for rapid prototyping then switch to generated migrations for production, and implement audit logging at the database trigger level for comprehensive change tracking.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16+ | Full-stack React framework | App Router-first, Server Components, RSC, Turbopack stable, industry standard for production apps |
| React | 19.2+ | UI library | Server Components, improved performance, React Compiler stable |
| TypeScript | 5.1+ | Type safety | Required by Next.js 16, industry standard |
| Drizzle ORM | 1.0+ | Type-safe ORM | SQL-like API, excellent TypeScript support, zero dependencies, faster than Prisma |
| PostgreSQL | 16+ | Relational database | ACID compliance, robust for transactional supply chain data, excellent JSON support |
| Auth.js | v5 | Authentication | Next.js App Router native, universal auth() function, role-based access built-in |
| tRPC | v11 | Type-safe API | End-to-end type safety, no code generation, React Server Components support |
| shadcn/ui | Latest | UI components | Copy-paste components, full customization, Tailwind-based, excellent dashboard patterns |
| Tailwind CSS | 4+ | Styling | Utility-first CSS, excellent with shadcn/ui |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Hono | v4 | Backend server (optional with tRPC) | For additional REST endpoints, middleware, edge runtime |
| drizzle-seed | Latest | Database seeding | Development and testing with realistic data |
| drizzle-kit | Latest | Migrations | Generating and running schema migrations |
| pg (node-postgres) | Latest | PostgreSQL driver | Node.js runtime on Vercel/Railway |
| Zod | Latest | Runtime validation | tRPC input validation, form validation |
| TanStack Query | Latest | Client-side data fetching | Works with tRPC, caching, optimistic updates |
| Recharts | Latest | Charts/visualizations | Built-in shadcn/ui chart components |
| @hono/trpc-server | Latest | tRPC + Hono integration | When using Hono as BFF with tRPC |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Drizzle ORM | Prisma | Prisma has larger ecosystem but slower, requires code generation, larger bundle size |
| Auth.js v5 | Clerk / NextAuth v4 | Clerk is managed service (vendor lock-in, cost), v4 lacks App Router support |
| tRPC | REST API / GraphQL | REST requires manual typing, GraphQL adds complexity and tooling overhead |
| shadcn/ui | Radix UI directly / Material UI | Raw Radix requires more setup, MUI has opinionated design and larger bundle |
| PostgreSQL | MySQL / MongoDB | MySQL weaker JSON support, MongoDB not ideal for relational supply chain data |

**Installation:**
```bash
# Create Next.js 16 project
npx create-next-app@latest petra-supply-hub --typescript --tailwind --app --src-dir

# Install core dependencies
npm install drizzle-orm pg @auth/core @auth/drizzle-adapter
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next
npm install @tanstack/react-query zod
npm install server-only client-only

# Install dev dependencies
npm install -D drizzle-kit @types/pg drizzle-seed

# Install shadcn/ui (initializes config)
npx shadcn@latest init

# Install common shadcn components
npx shadcn@latest add button card input table dialog dropdown-menu sidebar
```

## Architecture Patterns

### Recommended Project Structure

```
petra-supply-hub/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # Auth routes group
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/         # Protected dashboard group
│   │   │   ├── layout.tsx       # Dashboard layout with sidebar
│   │   │   ├── page.tsx         # Dashboard home
│   │   │   ├── brands/
│   │   │   ├── skus/
│   │   │   ├── retailers/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts  # Auth.js handler
│   │   │   └── trpc/[trpc]/route.ts         # tRPC handler
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Landing page
│   ├── components/              # Shared React components
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── dashboard/           # Dashboard-specific components
│   │   └── forms/               # Form components
│   ├── server/                  # Backend logic
│   │   ├── db/                  # Drizzle schema and client
│   │   │   ├── schema.ts        # Database schema definitions
│   │   │   ├── index.ts         # Database client export
│   │   │   └── seed.ts          # Seed data script
│   │   ├── api/                 # tRPC routers
│   │   │   ├── root.ts          # Root router
│   │   │   ├── trpc.ts          # tRPC context and procedures
│   │   │   └── routers/         # Feature routers
│   │   │       ├── brands.ts
│   │   │       ├── skus.ts
│   │   │       └── retailers.ts
│   │   └── auth.ts              # Auth.js configuration
│   ├── lib/                     # Utility functions
│   │   ├── utils.ts             # General utilities
│   │   └── trpc.ts              # tRPC client setup
│   ├── hooks/                   # Custom React hooks
│   └── types/                   # TypeScript type definitions
├── drizzle/                     # Generated migrations
│   └── migrations/
├── public/                      # Static assets
├── drizzle.config.ts            # Drizzle Kit configuration
├── auth.config.ts               # Auth.js configuration
└── next.config.ts               # Next.js configuration
```

### Pattern 1: Database Schema Definition (Drizzle ORM)

**What:** Type-safe schema definition using Drizzle's PostgreSQL API
**When to use:** Defining all tables, relationships, and constraints

**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/get-started-postgresql
import { pgTable, serial, text, timestamp, integer, varchar, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Master data: Brands
export const brands = pgTable('brands', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Master data: SKUs
export const skus = pgTable('skus', {
  id: serial('id').primaryKey(),
  brandId: integer('brand_id').references(() => brands.id).notNull(),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations
export const brandsRelations = relations(brands, ({ many }) => ({
  skus: many(skus),
}));

export const skusRelations = relations(skus, ({ one }) => ({
  brand: one(brands, {
    fields: [skus.brandId],
    references: [brands.id],
  }),
}));
```

### Pattern 2: Auth.js v5 Configuration (App Router)

**What:** Universal authentication with role-based access
**When to use:** Setting up authentication system with role-based permissions

**Example:**
```typescript
// Source: https://authjs.dev/getting-started/migrating-to-v5
// src/server/auth.ts
import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/server/db";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // Your auth logic here
        return user;
      },
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      // Add role to session
      if (session.user) {
        session.user.role = user.role; // CEO, sales, purchasing, warehouse
      }
      return session;
    },
  },
});

// Middleware for role checking
export async function requireRole(role: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== role) {
    throw new Error('Unauthorized');
  }
  return session;
}
```

### Pattern 3: tRPC v11 Setup (App Router)

**What:** Type-safe API with React Server Components support
**When to use:** Creating backend procedures with end-to-end type safety

**Example:**
```typescript
// Source: https://dev.to/matowang/trpc-11-setup-for-nextjs-app-router-2025-33fo
// src/server/api/trpc.ts
import { initTRPC } from '@trpc/server';
import { auth } from '@/server/auth';

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();
  return {
    session,
    db,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async (opts) => {
  if (!opts.ctx.session?.user) {
    throw new Error('Unauthorized');
  }
  return opts.next({
    ctx: {
      session: opts.ctx.session,
    },
  });
});

// src/server/api/routers/brands.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const brandsRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.brands.findMany();
  }),
  create: protectedProcedure
    .input(z.object({ name: z.string(), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.insert(brands).values(input).returning();
    }),
});
```

### Pattern 4: Connection Pooling for Vercel

**What:** Efficient database connection management for serverless
**When to use:** Always, from day one on Vercel deployment

**Example:**
```typescript
// Source: https://vercel.com/kb/guide/connection-pooling-with-functions
// src/server/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Global pool instance (reused across function invocations)
const globalForPool = globalThis as unknown as {
  pool: Pool | undefined;
};

export const pool = globalForPool.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1, // Minimum pool size for serverless
  idleTimeoutMillis: 5000, // Close idle connections quickly
  connectionTimeoutMillis: 10000,
});

if (process.env.NODE_ENV !== 'production') globalForPool.pool = pool;

export const db = drizzle(pool, { schema });
```

### Pattern 5: Audit Log Implementation (Trigger-Based)

**What:** Comprehensive audit trail of all data changes
**When to use:** Required for FND-04 - tracking who changed what and when

**Example:**
```typescript
// Source: https://oneuptime.com/blog/post/2026-01-21-postgresql-audit-logging/view
// Schema definition
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  tableName: varchar('table_name', { length: 100 }).notNull(),
  recordId: integer('record_id').notNull(),
  action: varchar('action', { length: 20 }).notNull(), // INSERT, UPDATE, DELETE
  userId: integer('user_id').references(() => users.id),
  changedData: text('changed_data'), // JSON string of changed fields
  previousData: text('previous_data'), // JSON string of old values
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// PostgreSQL trigger function (run via migration)
// drizzle/migrations/0001_audit_triggers.sql
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, action, changed_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW)::text);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, action, changed_data, previous_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(NEW)::text, row_to_json(OLD)::text);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, action, previous_data)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD)::text);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply to critical tables
CREATE TRIGGER brands_audit AFTER INSERT OR UPDATE OR DELETE ON brands
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

### Pattern 6: shadcn/ui Dashboard Layout

**What:** Responsive dashboard with sidebar navigation
**When to use:** Building the main dashboard UI (UX-04)

**Example:**
```typescript
// Source: https://ui.shadcn.com/examples/dashboard
// src/app/(dashboard)/layout.tsx
import { SidebarProvider, Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar"

export default function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>Brands</SidebarMenuItem>
              <SidebarMenuItem>SKUs</SidebarMenuItem>
              <SidebarMenuItem>Retailers</SidebarMenuItem>
              <SidebarMenuItem>Settings</SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
```

### Anti-Patterns to Avoid

- **Synchronous params/searchParams access**: Next.js 16 requires `await params` and `await searchParams` - synchronous access will break
- **Missing connection pooling**: Without pooling, Vercel functions exhaust database connections rapidly
- **Manual SQL strings in queries**: Use Drizzle's type-safe query builder instead of raw SQL
- **Client-side env variables for secrets**: Never use `NEXT_PUBLIC_` prefix for database URLs or auth secrets
- **Skipping migrations in production**: Always use `drizzle-kit generate` + `migrate` for production, not `push`
- **Global database client without pooling**: Always use connection pooling with global singleton pattern
- **Ignoring audit triggers**: Don't implement audit logging in application code - use database triggers for reliability

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication | Custom JWT system | Auth.js v5 | Session management, CSRF protection, OAuth providers, role-based access all built-in |
| Database migrations | Manual SQL scripts | Drizzle Kit | Automatic migration generation from schema, versioning, rollback support |
| API type safety | Manual type definitions | tRPC v11 | Automatic type inference, no code generation, runtime validation with Zod |
| UI components | Custom components from scratch | shadcn/ui | Accessibility, dark mode, responsive design, production-tested patterns |
| Form validation | Custom validators | Zod + React Hook Form | Runtime + compile-time validation, error messages, complex schemas |
| Data seeding | Manual INSERT scripts | drizzle-seed | Realistic fake data, deterministic generation, relationship handling |
| Database connection pooling | Custom connection manager | pg Pool + global singleton | Serverless-aware, automatic cleanup, tested at scale |
| Audit logging | Application-level logging | PostgreSQL triggers | Guaranteed consistency, can't be bypassed, automatic for all operations |

**Key insight:** Supply chain systems require transaction consistency and audit trails that are easier to guarantee at the database level (triggers, constraints) than in application code. The chosen stack provides these primitives out of the box.

## Common Pitfalls

### Pitfall 1: Async Params/SearchParams Migration (Next.js 16)

**What goes wrong:** Existing Next.js code breaks when upgrading to v16 because `params` and `searchParams` are now async
**Why it happens:** Breaking change in Next.js 16 for streaming and concurrent rendering support
**How to avoid:** Use automated codemod `npx @next/codemod@canary upgrade latest` or manually add `await` to all params/searchParams access
**Warning signs:** TypeScript errors like `Property 'id' does not exist on type 'Promise<{ id: string }>'`

**Example fix:**
```typescript
// Before (Next.js 15)
export default function Page({ params }: { params: { id: string } }) {
  return <div>ID: {params.id}</div>;
}

// After (Next.js 16)
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div>ID: {id}</div>;
}
```

### Pitfall 2: Connection Pool Exhaustion on Vercel

**What goes wrong:** Database throws "too many connections" errors in production
**Why it happens:** Each serverless function creates new connections without pooling, exhausting database limits
**How to avoid:** Implement connection pooling with global singleton pattern and `max: 1` pool size
**Warning signs:** Intermittent connection errors, especially under load, "sorry, too many clients already" errors

### Pitfall 3: Drizzle Migration vs Push Confusion

**What goes wrong:** Using `drizzle-kit push` in production causes data loss or schema conflicts
**Why it happens:** `push` is designed for rapid prototyping and doesn't create migration files
**How to avoid:** Use `push` for development only, switch to `generate` + `migrate` before production deployment
**Warning signs:** No migration files in version control, inability to rollback schema changes

### Pitfall 4: Missing Database Indexes

**What goes wrong:** Slow queries as data grows, especially on foreign keys and frequently queried columns
**Why it happens:** Drizzle doesn't automatically create indexes on foreign keys (unlike some ORMs)
**How to avoid:** Explicitly define indexes in schema for foreign keys, search fields (SKU, brand name), and filter columns
**Warning signs:** Query times increasing with data volume, database CPU spikes

**Example fix:**
```typescript
import { index } from 'drizzle-orm/pg-core';

export const skus = pgTable('skus', {
  // ... columns
}, (table) => ({
  brandIdIdx: index('skus_brand_id_idx').on(table.brandId),
  skuIdx: index('skus_sku_idx').on(table.sku),
}));
```

### Pitfall 5: Auth.js Environment Variable Naming

**What goes wrong:** Authentication fails in production with "missing AUTH_SECRET" errors
**Why it happens:** Auth.js v5 uses `AUTH_*` prefix instead of `NEXTAUTH_*` from v4
**How to avoid:** Use `AUTH_SECRET`, `AUTH_URL`, and `AUTH_{PROVIDER}_ID/SECRET` naming convention
**Warning signs:** Auth works locally but fails in production, environment variable errors

### Pitfall 6: Forgetting Role-Based Access in UI

**What goes wrong:** Users see UI elements they shouldn't have access to based on their role
**Why it happens:** Auth.js handles authentication but authorization checks must be implemented manually
**How to avoid:** Check `session.user.role` in both backend (tRPC procedures) and frontend (conditional rendering)
**Warning signs:** Users can see but not interact with unauthorized features, security audit failures

### Pitfall 7: No Soft Deletes for Master Data

**What goes wrong:** Deleting a brand breaks historical records that reference it
**Why it happens:** Hard deletes remove data, breaking foreign key relationships in historical tables
**How to avoid:** Use `active` boolean flag for soft deletes, never hard delete master data
**Warning signs:** Foreign key constraint errors when deleting brands/SKUs, broken audit trails

## Code Examples

Verified patterns from official sources:

### Database Client Initialization

```typescript
// Source: https://orm.drizzle.team/docs/get-started-postgresql
// src/server/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle(pool, { schema });
```

### Seeding Database with drizzle-seed

```typescript
// Source: https://orm.drizzle.team/docs/seed-overview
// src/server/db/seed.ts
import { seed } from 'drizzle-seed';
import { db } from './index';
import * as schema from './schema';

async function main() {
  await seed(db, schema, { count: 100 }).refine((funcs) => ({
    brands: {
      count: 5,
      columns: {
        name: funcs.valuesFromArray({
          values: ['Fomin', 'Luna Naturals', 'EveryMood', 'Roofus', 'House of Party']
        }),
      },
    },
    skus: {
      count: 160,
    },
  }));
}

main();
```

### Protected tRPC Procedure with Role Check

```typescript
// Source: https://trpc.io/docs/server/procedures
import { TRPCError } from '@trpc/server';

export const adminProcedure = protectedProcedure.use(async (opts) => {
  if (opts.ctx.session.user.role !== 'CEO') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return opts.next();
});

export const brandsRouter = router({
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Soft delete only
      return ctx.db.update(brands).set({ active: false }).where(eq(brands.id, input.id));
    }),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma ORM | Drizzle ORM | 2023-2024 | Faster performance, smaller bundle, SQL-like syntax preferred by developers |
| NextAuth v4 | Auth.js v5 | 2024-2025 | App Router native, universal auth() function, simpler setup |
| Pages Router | App Router | 2022+ | Server Components, better performance, streaming, simpler data fetching |
| Implicit caching (Next.js 15) | Explicit caching with "use cache" (Next.js 16) | 2025-2026 | Opt-in caching, more control, dynamic by default |
| middleware.ts | proxy.ts | Next.js 16 | Clearer naming for network boundary |
| Manual connection management | Connection pooling required | Always critical for serverless | Vercel deployments fail without pooling |
| Application-level audit logs | Database triggers | Best practice for compliance | Guaranteed consistency, can't be bypassed |

**Deprecated/outdated:**
- **NextAuth v4**: Use Auth.js v5 instead, v4 lacks App Router support
- **Prisma (for this use case)**: Drizzle faster and more SQL-like, though Prisma still widely used
- **`getServerSession()` / `getToken()`**: Use universal `auth()` function in Auth.js v5
- **Synchronous params/searchParams**: Must use `await` in Next.js 16
- **`middleware.ts`**: Renamed to `proxy.ts` in Next.js 16 (migration required)
- **`drizzle-kit push` for production**: Use `generate` + `migrate` instead
- **AMP support**: Removed entirely in Next.js 16

## Open Questions

Things that couldn't be fully resolved:

1. **Google Sheets Integration Method**
   - What we know: Multiple options exist (Hevo, Coefficient, n8n, Google Apps Script, manual CSV)
   - What's unclear: Which method best fits the workflow for importing ~160 SKUs from https://docs.google.com/spreadsheets/d/1QId6d-cJW7UKxXtTvR7eG9xhUaydJA1RXcSUuki0KbI/
   - Recommendation: Start with manual CSV import via admin UI, add scheduled Google Sheets API sync later if needed (user context says "Start with Excel import, add API later")

2. **SellerCloud ERP Integration**
   - What we know: Manufacturing data lives in SellerCloud ERP, API access pending
   - What's unclear: SellerCloud API capabilities, authentication method, data sync frequency
   - Recommendation: Build schema to accommodate ERP data fields, plan for future integration but don't block Phase 1

3. **Hono v4 + tRPC Integration**
   - What we know: `@hono/trpc-server` provides middleware for Hono + tRPC integration
   - What's unclear: Whether Hono is needed for this project or if tRPC alone is sufficient
   - Recommendation: Start with tRPC only for simplicity, add Hono later if additional REST endpoints or edge runtime is needed

4. **PostgreSQL Hosting**
   - What we know: Railway recommended for PostgreSQL, Vercel provides Vercel Postgres (Neon)
   - What's unclear: Which provider is better for this use case (Railway vs Vercel Postgres vs Supabase)
   - Recommendation: Use Railway for PostgreSQL (mentioned in stack), Vercel automatically provisions connection pooling

5. **Role Hierarchy**
   - What we know: Four roles exist (CEO, sales, purchasing, warehouse)
   - What's unclear: Detailed permissions matrix (what each role can read/write)
   - Recommendation: Document permissions matrix in next phase (planning), implement role checks in tRPC procedures

## Sources

### Primary (HIGH confidence)

- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16) - Breaking changes, new features, Cache Components
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) - Migration checklist
- [Drizzle ORM PostgreSQL Docs](https://orm.drizzle.team/docs/get-started-postgresql) - Setup, drivers, query API
- [Drizzle Migrations Docs](https://orm.drizzle.team/docs/migrations) - Push vs generate, best practices
- [Drizzle Seed Docs](https://orm.drizzle.team/docs/seed-overview) - Seeding patterns, deterministic generation
- [Auth.js v5 Migration Guide](https://authjs.dev/getting-started/migrating-to-v5) - Breaking changes, auth() function
- [Auth.js Role-Based Access Control](https://authjs.dev/guides/role-based-access-control) - RBAC implementation
- [shadcn/ui Dashboard Examples](https://ui.shadcn.com/examples/dashboard) - Layout patterns, components
- [Vercel Connection Pooling Guide](https://vercel.com/kb/guide/connection-pooling-with-functions) - Serverless best practices
- [tRPC v11 Next.js Setup (DEV.to)](https://dev.to/matowang/trpc-11-setup-for-nextjs-app-router-2025-33fo) - Current setup guide

### Secondary (MEDIUM confidence)

- [Async params/searchParams in Next.js 16 (DEV.to)](https://dev.to/peterlidee/async-params-and-searchparams-in-next-16-5ge9) - Migration examples
- [Drizzle ORM Best Practices (GitHub Gist)](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717) - Community best practices
- [PostgreSQL Audit Logging (OneUpTime)](https://oneuptime.com/blog/post/2026-01-21-postgresql-audit-logging/view) - Trigger-based audit implementation
- [Next.js Folder Structure Best Practices (CodeByDeep)](https://www.codebydeep.com/blog/next-js-folder-structure-best-practices-for-scalable-applications-2026-guide) - Project organization
- [shadcn Admin Dashboard Templates (DEV.to)](https://dev.to/tailwindadmin/best-open-source-shadcn-dashboard-templates-29fb) - Dashboard patterns
- [Hono + tRPC Integration (FreeCodeCamp)](https://www.freecodecamp.org/news/type-safety-without-code-generation-using-trpc-and-hono/) - Type safety patterns
- [Railway Database Connection Pooling](https://blog.railway.com/p/database-connection-pooling) - Connection pooling benefits

### Tertiary (LOW confidence)

- Various Medium articles on Next.js 16, Drizzle, Auth.js - Community guides, not official documentation
- Stack Overflow discussions on specific implementation details
- Community templates and boilerplates

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - Official documentation confirms all libraries are production-ready and current
- Architecture: **HIGH** - Patterns verified from official docs (Next.js, Drizzle, Auth.js, tRPC)
- Pitfalls: **MEDIUM** - Based on official docs + community experience, some edge cases may exist
- Google Sheets integration: **LOW** - Multiple approaches exist, unclear which fits workflow best
- SellerCloud integration: **LOW** - API access pending, unknown capabilities

**Research date:** 2026-02-06
**Valid until:** ~30 days (stable technologies, but Next.js/Drizzle release frequently)

**Notes:**
- Next.js 16 is stable as of late 2025, breaking changes are documented
- Auth.js v5 is production-ready despite "v5" label (no longer beta as of 2025)
- Drizzle ORM 1.0+ is stable, active development continues
- tRPC v11 is current stable version with React Server Components support
- shadcn/ui components are copy-paste (no versioning), always current
