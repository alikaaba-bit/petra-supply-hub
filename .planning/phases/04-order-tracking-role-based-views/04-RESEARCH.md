# Phase 4: Order Tracking & Role-Based Views - Research

**Researched:** 2026-02-06
**Domain:** Order tracking dashboards, role-based views, timeline visualization
**Confidence:** HIGH

## Summary

Phase 4 implements order tracking dashboards with role-specific views for CEO, Sales, Purchasing, and Warehouse roles. The research focused on implementing purchase order lifecycle visualization, retail order fulfillment tracking, lead time visibility, and role-based dashboard access control.

The existing stack (Next.js 16 + tRPC v11 + Auth.js v5 + shadcn/ui + Tailwind CSS 4) provides all necessary primitives for this phase. No new core dependencies are required. The key technical challenges are:

1. **Timeline visualization** - Custom component using shadcn Card primitives (shadcn has no official timeline component)
2. **Role-based view filtering** - Leverage existing tRPC middleware and Auth.js session
3. **Status tracking** - Consistent badge colors and clear status progression
4. **Lead time calculations** - Per-brand lead times already in schema (brands.leadTimeDays)

The standard approach is middleware-based access control with conditional rendering for role-specific dashboard sections. Timeline components should be built using shadcn Card + Tailwind, not external libraries, to maintain consistency with existing UI patterns.

**Primary recommendation:** Build custom timeline component using shadcn Card primitives, implement role-based views through tRPC procedures filtering by session.user.role, and create dedicated dashboard routes per role (CEO, Sales, Purchasing, Warehouse) with shared underlying components.

## Standard Stack

All required libraries already exist in the project. No additional dependencies needed.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App framework | Latest stable, App Router with RSC support |
| tRPC | v11.9.0 | API layer | Type-safe APIs, v11 has RSC + React Query integration |
| Auth.js | v5.0.0-beta.30 | Authentication | NextAuth v5, session management with role field |
| shadcn/ui | 3.8.4 | UI components | Radix UI + Tailwind, copy-paste philosophy |
| Tailwind CSS | v4 | Styling | Latest major version, performance improvements |
| @tanstack/react-table | 8.21.3 | Data tables | Already used for PO/RO list pages |
| date-fns | 4.1.0 | Date handling | Already used for date formatting |
| lucide-react | 0.563.0 | Icons | Consistent icon library |

### Supporting (Existing UI Components)
| Component | Location | Purpose | When to Use |
|---------|---------|---------|-------------|
| DataTable | /components/dashboard/data-table.tsx | List views | Order lists with filtering |
| StatCard | /components/dashboard/stat-card.tsx | Dashboard metrics | KPI cards for role views |
| Badge | shadcn/ui | Status indicators | Order status display |
| Card | shadcn/ui | Containers | Timeline steps, dashboard sections |

### Timeline Component
| Instead of | Use | Tradeoff |
|------------|-----------|----------|
| Material-UI Timeline | Custom shadcn Card-based | Full control, no dependency bloat, matches existing design system |
| Syncfusion Timeline | Custom component | Free, lighter, no licensing complexity |
| Flowbite Timeline | Custom component | Better integration with existing shadcn patterns |

**Note:** While libraries like Material-UI Timeline, Syncfusion, and Flowbite offer prebuilt timeline components, building custom using shadcn primitives provides better integration, no licensing concerns, and full design control.

**Installation:**
No new packages required. All dependencies already present.

## Architecture Patterns

### Project Structure
```
src/app/(dashboard)/
├── tracking/                    # New: Order tracking pages
│   ├── supplier-orders/         # Supplier PO tracking (ORD-01)
│   ├── retail-orders/           # Retail PO tracking (ORD-02)
│   └── timeline/                # Timeline component demos
├── roles/                       # New: Role-based dashboard views (UX-02)
│   ├── ceo/                     # CEO overview + alerts
│   ├── sales/                   # Sales view: retailer status + forecasts
│   ├── purchasing/              # Purchasing view: supply gaps + PO tracking
│   └── warehouse/               # Warehouse view: inbound + stock levels
components/
├── tracking/                    # New: Tracking-specific components
│   ├── po-timeline.tsx          # PO lifecycle timeline (ORD-04)
│   ├── lead-time-badge.tsx      # Lead time display (ORD-03)
│   ├── status-badge.tsx         # Consistent status badges
│   └── order-status-card.tsx    # Order status summaries
└── dashboard/
    ├── role-dashboard-card.tsx  # Reusable role-specific cards
    └── stat-card.tsx            # Existing KPI cards
server/api/routers/
└── tracking.ts                  # New: Tracking-specific tRPC router
```

### Pattern 1: Role-Based Dashboard Views
**What:** Conditional rendering based on `session.user.role` from Auth.js
**When to use:** Dashboard pages that show different data per role
**Example:**
```typescript
// src/app/(dashboard)/roles/ceo/page.tsx
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";

export default async function CEODashboard() {
  const session = await auth();

  if (!session?.user || (session.user.role !== "ceo" && session.user.role !== "admin")) {
    redirect("/"); // Redirect unauthorized users
  }

  return (
    <div className="space-y-6">
      <h1>CEO Overview</h1>
      {/* CEO-specific content */}
    </div>
  );
}
```

### Pattern 2: tRPC Role-Filtered Queries
**What:** Use existing tRPC middleware to filter data by user role
**When to use:** API endpoints that return different data per role
**Example:**
```typescript
// server/api/routers/tracking.ts
export const trackingRouter = router({
  dashboard: protectedProcedure
    .query(async ({ ctx }) => {
      const role = ctx.session.user.role;

      // Filter data based on role
      if (role === "warehouse") {
        // Return only inbound shipments + stock levels
        return getWarehouseData(ctx.db);
      } else if (role === "sales") {
        // Return retailer status + forecasts
        return getSalesData(ctx.db);
      }
      // ... other roles
    }),
});
```

### Pattern 3: Custom Timeline Component (shadcn Card-based)
**What:** Build timeline using Card + Tailwind CSS vertical layout
**When to use:** PO lifecycle visualization (ordered → production → shipped → arrived)
**Example:**
```typescript
// components/tracking/po-timeline.tsx
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Package, Truck } from "lucide-react";

const steps = [
  { status: "ordered", label: "Ordered", icon: Check },
  { status: "in_production", label: "In Production", icon: Clock },
  { status: "shipped", label: "Shipped", icon: Package },
  { status: "in_transit", label: "In Transit", icon: Truck },
  { status: "arrived", label: "Arrived", icon: Check },
];

export function POTimeline({ currentStatus, dates }) {
  return (
    <div className="space-y-4">
      {steps.map((step, idx) => {
        const isActive = getCurrentStepIndex(currentStatus) === idx;
        const isComplete = getCurrentStepIndex(currentStatus) > idx;

        return (
          <Card key={step.status} className={isActive ? "border-blue-500" : ""}>
            <div className="flex items-center gap-4 p-4">
              <step.icon className={isComplete ? "text-green-600" : "text-muted-foreground"} />
              <div className="flex-1">
                <p className="font-medium">{step.label}</p>
                {dates[step.status] && (
                  <p className="text-sm text-muted-foreground">
                    {format(dates[step.status], "MMM d, yyyy")}
                  </p>
                )}
              </div>
              {isComplete && <Badge variant="success">Complete</Badge>}
              {isActive && <Badge variant="default">Current</Badge>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
```

### Pattern 4: Lead Time Calculation (ORD-03)
**What:** Calculate order-by dates and expected arrival dates per SKU using brand lead times
**When to use:** Displaying when to order to avoid stockouts
**Example:**
```typescript
// lib/lead-time.ts
import { addDays, subDays } from "date-fns";

export function calculateOrderByDate(
  needByDate: Date,
  leadTimeDays: number
): Date {
  // Order by = need by date - lead time - buffer (5 days)
  return subDays(needByDate, leadTimeDays + 5);
}

export function calculateExpectedArrival(
  orderDate: Date,
  leadTimeDays: number
): Date {
  return addDays(orderDate, leadTimeDays);
}

// Brand-specific lead times from schema:
// Fomin/Luna/EveryMood/Roofus: 30 days
// HOP: 60 days
```

### Pattern 5: Consistent Status Badges
**What:** Use consistent colors for order statuses across all views
**When to use:** Displaying order status in tables, cards, timelines
**Status color conventions:**
```typescript
// components/tracking/status-badge.tsx
const statusConfig = {
  // Purchase Orders
  draft: { variant: "secondary", label: "Draft" },
  ordered: { variant: "default", label: "Ordered" },
  confirmed: { variant: "default", label: "Confirmed" },
  in_production: { variant: "default", label: "In Production" },
  shipped: { variant: "default", label: "Shipped" },
  in_transit: { variant: "default", label: "In Transit" },
  arrived: { variant: "success", label: "Arrived" },
  cancelled: { variant: "destructive", label: "Cancelled" },

  // Retail Orders
  received: { variant: "default", label: "Received" },
  processing: { variant: "default", label: "Processing" },
  allocated: { variant: "default", label: "Allocated" },
  shipped: { variant: "default", label: "Shipped" },
  delivered: { variant: "success", label: "Delivered" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { variant: "secondary", label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
```

### Anti-Patterns to Avoid

- **Don't use external timeline libraries** - Material-UI, Syncfusion, etc. introduce dependency bloat and inconsistent design. Build custom using shadcn Card.
- **Don't replicate role checks everywhere** - Use tRPC middleware and Server Components for access control, not client-side conditionals scattered across pages.
- **Don't overuse colors in status badges** - Too many colors (rainbow effect) reduces usability. Stick to 3-4 semantic colors: neutral (default), success (green), destructive (red), secondary (gray).
- **Don't calculate lead times client-side** - Use tRPC procedures to calculate server-side with brand lead times from database.
- **Don't expose unauthorized data** - Filter at query level (tRPC), not by hiding UI elements. Unauthorized users should never receive sensitive data.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Data tables with sorting/filtering | Custom table component | @tanstack/react-table | Already in project, handles complex state, pagination, sorting, filtering |
| Date calculations | Manual date math | date-fns | Already in project, handles timezones, edge cases, i18n |
| Form validation | Custom validators | Zod + react-hook-form | Already in project, type-safe, reusable schemas |
| Status transition logic | Hard-coded if/else chains | State machine pattern or simple lookup map | Maintainable, testable, clear transitions |
| Authorization checks | Manual role checks on every page | Auth.js middleware + tRPC procedures | Centralized, secure, DRY |

**Key insight:** The existing stack provides all necessary primitives. Don't add new dependencies. Custom timeline component using shadcn Card is simpler and more maintainable than external libraries.

## Common Pitfalls

### Pitfall 1: Role-Based Access Only on Client Side
**What goes wrong:** Checking `session.user.role` only in client components allows unauthorized users to access data by inspecting network requests.
**Why it happens:** Developers add conditional rendering (`{role === "ceo" && <CEOData />}`) without server-side filtering.
**How to avoid:**
- Always filter at tRPC query level using `ctx.session.user.role`
- Use Next.js Server Components for initial role check and redirect
- Client-side role checks are for UI only, never for data access control
**Warning signs:** Network tab shows sensitive data even when UI is hidden; API routes don't check session.user.role.

### Pitfall 2: Inconsistent Status Values
**What goes wrong:** Purchase order status "in_transit" in one place, "in-transit" in another, "In Transit" elsewhere.
**Why it happens:** No centralized status enum; direct string comparisons.
**How to avoid:**
- Define status enums in Zod schemas
- Use TypeScript union types for status fields
- Create shared status config object (see Pattern 5 above)
**Warning signs:** Status badges show wrong colors; filtering by status doesn't work; timeline shows wrong steps.

### Pitfall 3: Not Accounting for Missing Dates
**What goes wrong:** Timeline crashes when `expectedArrival` is null; lead time calculation fails.
**Why it happens:** Assuming all POs have complete date information.
**How to avoid:**
- Handle null/undefined dates gracefully in timeline component
- Show placeholder text ("Not yet scheduled") for missing dates
- Use optional chaining and nullish coalescing
**Warning signs:** "Cannot read property of undefined" errors; blank timeline sections; dates showing "Invalid Date".

### Pitfall 4: Rainbow Status Badges
**What goes wrong:** Too many status colors (10+ different badges) makes it impossible to learn what each means; everything competes for attention.
**Why it happens:** Assigning unique color to every status without considering cognitive load.
**How to avoid:**
- Limit to 3-4 semantic colors: neutral (blue/gray), success (green), destructive (red), warning (amber)
- Group similar statuses under same color (ordered/confirmed/in_production all use "default" variant)
- Only use color for high-priority states (success = complete, destructive = cancelled/error)
**Warning signs:** Users confused about status meanings; table looks like pixelated rainbow; can't quickly scan for problems.

### Pitfall 5: Hard-Coded Lead Times
**What goes wrong:** Lead time calculations break when brand lead times change; requires code changes instead of data updates.
**Why it happens:** Developer hard-codes `leadTimeDays: 30` in calculation function.
**How to avoid:**
- Always fetch lead time from `brands.leadTimeDays` in database
- Pass brand lead time as parameter to calculation functions
- Use tRPC query to join SKU → Brand → leadTimeDays
**Warning signs:** Wrong expected arrival dates; order-by dates don't match reality; requires code deploy to update lead times.

### Pitfall 6: Mixing Timezones
**What goes wrong:** Order dates show wrong day depending on user's timezone; "Expected Arrival: Jan 15" in US, "Jan 16" in Asia.
**Why it happens:** Using JavaScript Date objects without timezone handling; storing dates as timestamps instead of dates.
**How to avoid:**
- Use `date` type in Postgres (not `timestamp`) for order dates (schema already does this)
- Use date-fns `format()` consistently across app
- Store dates in UTC, display in user's timezone only if needed (supply chain dates are usually timezone-agnostic)
**Warning signs:** Dates off by one day; date shows time component when it shouldn't; dates change based on user location.

## Code Examples

Verified patterns from existing codebase and official documentation.

### Role-Based Server Component
```typescript
// src/app/(dashboard)/roles/purchasing/page.tsx
// Source: Auth.js official docs + existing executive/page.tsx pattern
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";

export default async function PurchasingDashboard() {
  const session = await auth();

  if (!session?.user || session.user.role !== "purchasing") {
    redirect("/"); // Unauthorized
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Purchasing Dashboard</h1>
        <p className="text-muted-foreground">
          Supply gaps and PO tracking
        </p>
      </div>
      {/* Dashboard content */}
    </div>
  );
}
```

### tRPC Query with Role Filtering
```typescript
// server/api/routers/tracking.ts
// Source: Existing orders.ts router pattern
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { purchaseOrders, brands, inventory, skus } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const trackingRouter = router({
  supplierOrders: protectedProcedure
    .input(z.object({
      brandId: z.number().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // All authenticated users can view supplier orders
      // But filter by conditions
      const conditions = [];

      if (input.brandId) {
        conditions.push(eq(purchaseOrders.brandId, input.brandId));
      }

      if (input.status) {
        conditions.push(eq(purchaseOrders.status, input.status));
      }

      const query = ctx.db
        .select({
          id: purchaseOrders.id,
          poNumber: purchaseOrders.poNumber,
          supplier: purchaseOrders.supplier,
          status: purchaseOrders.status,
          orderDate: purchaseOrders.orderDate,
          expectedArrival: purchaseOrders.expectedArrival,
          depositPaid: purchaseOrders.depositPaid,
          brand: {
            id: brands.id,
            name: brands.name,
            leadTimeDays: brands.leadTimeDays, // Include for lead time calculations
          },
        })
        .from(purchaseOrders)
        .innerJoin(brands, eq(purchaseOrders.brandId, brands.id))
        .orderBy(desc(purchaseOrders.orderDate));

      if (conditions.length > 0) {
        return await query.where(and(...conditions));
      }

      return await query;
    }),

  warehouseView: protectedProcedure
    .query(async ({ ctx }) => {
      // Only warehouse users see this
      if (ctx.session.user.role !== "warehouse") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Return inbound shipments + stock levels
      return ctx.db
        .select({
          sku: skus.sku,
          name: skus.name,
          onHand: inventory.quantityOnHand,
          inTransit: inventory.quantityInTransit,
          allocated: inventory.quantityAllocated,
        })
        .from(inventory)
        .innerJoin(skus, eq(inventory.skuId, skus.id));
    }),
});
```

### Timeline Component Using shadcn Card
```typescript
// components/tracking/po-timeline.tsx
// Source: shadcn Card docs + custom pattern
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Package, Truck, Warehouse } from "lucide-react";
import { format } from "date-fns";

interface TimelineStep {
  status: string;
  label: string;
  icon: React.ElementType;
  date?: Date | null;
}

interface POTimelineProps {
  currentStatus: string;
  orderDate?: Date | null;
  expectedArrival?: Date | null;
  actualArrival?: Date | null;
}

const statusOrder = ["ordered", "confirmed", "in_production", "shipped", "in_transit", "arrived"];

export function POTimeline({ currentStatus, orderDate, expectedArrival, actualArrival }: POTimelineProps) {
  const steps: TimelineStep[] = [
    { status: "ordered", label: "Ordered", icon: Check, date: orderDate },
    { status: "confirmed", label: "Confirmed by Supplier", icon: Check, date: null },
    { status: "in_production", label: "In Production", icon: Clock, date: null },
    { status: "shipped", label: "Shipped from Supplier", icon: Package, date: null },
    { status: "in_transit", label: "In Transit", icon: Truck, date: null },
    { status: "arrived", label: "Arrived at Warehouse", icon: Warehouse, date: actualArrival ?? expectedArrival },
  ];

  const currentIndex = statusOrder.indexOf(currentStatus);

  return (
    <div className="space-y-2">
      {steps.map((step, idx) => {
        const stepIndex = statusOrder.indexOf(step.status);
        const isComplete = stepIndex < currentIndex;
        const isActive = stepIndex === currentIndex;
        const Icon = step.icon;

        return (
          <Card
            key={step.status}
            className={`${isActive ? "border-blue-500 bg-blue-50" : ""} ${
              isComplete ? "bg-green-50" : ""
            }`}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  isComplete
                    ? "bg-green-600 text-white"
                    : isActive
                    ? "bg-blue-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{step.label}</p>
                {step.date && (
                  <p className="text-sm text-muted-foreground">
                    {format(step.date, "MMM d, yyyy")}
                  </p>
                )}
                {!step.date && !isComplete && (
                  <p className="text-sm text-muted-foreground">Not yet scheduled</p>
                )}
              </div>
              {isComplete && <Badge variant="secondary">Complete</Badge>}
              {isActive && <Badge variant="default">Current</Badge>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

### Lead Time Badge Component
```typescript
// components/tracking/lead-time-badge.tsx
// Source: date-fns + custom logic
import { Badge } from "@/components/ui/badge";
import { differenceInDays, isPast } from "date-fns";

interface LeadTimeBadgeProps {
  orderByDate: Date;
  className?: string;
}

export function LeadTimeBadge({ orderByDate, className }: LeadTimeBadgeProps) {
  const today = new Date();
  const daysRemaining = differenceInDays(orderByDate, today);

  // Overdue
  if (isPast(orderByDate)) {
    return (
      <Badge variant="destructive" className={className}>
        Overdue by {Math.abs(daysRemaining)} days
      </Badge>
    );
  }

  // Urgent (less than 7 days)
  if (daysRemaining <= 7) {
    return (
      <Badge variant="warning" className={className}>
        Order in {daysRemaining} days
      </Badge>
    );
  }

  // Normal
  return (
    <Badge variant="secondary" className={className}>
      Order by {daysRemaining} days
    </Badge>
  );
}
```

### Status Badge Component
```typescript
// components/tracking/status-badge.tsx
// Source: shadcn Badge + custom config
import { Badge } from "@/components/ui/badge";

type OrderStatus =
  | "draft"
  | "ordered"
  | "confirmed"
  | "in_production"
  | "shipped"
  | "in_transit"
  | "arrived"
  | "cancelled"
  | "received"
  | "processing"
  | "allocated"
  | "delivered";

const statusConfig: Record<
  OrderStatus,
  { variant: "default" | "secondary" | "success" | "destructive"; label: string }
> = {
  // Purchase Orders
  draft: { variant: "secondary", label: "Draft" },
  ordered: { variant: "default", label: "Ordered" },
  confirmed: { variant: "default", label: "Confirmed" },
  in_production: { variant: "default", label: "In Production" },
  shipped: { variant: "default", label: "Shipped" },
  in_transit: { variant: "default", label: "In Transit" },
  arrived: { variant: "success", label: "Arrived" },
  cancelled: { variant: "destructive", label: "Cancelled" },

  // Retail Orders
  received: { variant: "default", label: "Received" },
  processing: { variant: "default", label: "Processing" },
  allocated: { variant: "default", label: "Allocated" },
  delivered: { variant: "success", label: "Delivered" },
};

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { variant: "secondary", label: status };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| External timeline libraries (Material-UI, etc.) | Custom shadcn Card-based timelines | 2024-2025 | Lighter bundle, better design system integration, full control |
| Client-side role checks only | Server-side filtering with tRPC + RSC | 2023-2024 (Next.js 13+, tRPC v11) | More secure, prevents data leaks, better performance |
| Page-level auth guards | Auth.js middleware + tRPC procedures | 2024 (Auth.js v5) | Centralized auth logic, fewer bugs, easier maintenance |
| React Query v4 | React Query v5 (@tanstack/react-query 5.90) | 2024 | Better DX, improved hydration with RSC |
| Tailwind CSS v3 | Tailwind CSS v4 | 2025 | Performance improvements, native nesting |

**Deprecated/outdated:**
- NextAuth v4: Replaced by Auth.js v5 (same library, new name). v5 has better TypeScript support and simpler API.
- tRPC v10: v11 added native RSC support and prefetch helpers for App Router.
- Material-UI Timeline: Heavy dependency for simple timeline. Shadcn Card-based custom components are preferred in 2025-2026.

## Open Questions

Things that couldn't be fully resolved:

1. **Production status tracking granularity**
   - What we know: Requirements mention "production status" for supplier POs
   - What's unclear: Do suppliers provide detailed production updates, or just binary "in production" status? Do we track % completion?
   - Recommendation: Start with simple binary status (ordered/confirmed/in_production/shipped). Add granular tracking (e.g., "50% complete") in later iteration if suppliers provide that data.

2. **Shipping provider integration**
   - What we know: Timeline shows "in transit" status
   - What's unclear: Do we integrate with shipping providers (FedEx, DHL) for live tracking, or manually update status?
   - Recommendation: Start with manual status updates. Add shipping provider webhooks in Phase 5+ if needed.

3. **Notification/Alert System**
   - What we know: CEO view should show "alerts"
   - What's unclear: Email/SMS notifications when PO status changes? Or just in-app alerts on dashboard?
   - Recommendation: In-app alerts only for Phase 4. Notifications can be Phase 5+.

4. **Historical Timeline Data**
   - What we know: Timeline shows dates for each status
   - What's unclear: Do we track history of all status changes (audit trail), or just current status + key dates?
   - Recommendation: Use existing audit log (audit table already exists from Phase 1) for full history. Timeline component shows key dates only (orderDate, expectedArrival, actualArrival).

## Sources

### Primary (HIGH confidence)
- Next.js 16 App Router documentation - File-system conventions for Server Components and layouts
- tRPC v11 documentation - React Server Components integration, protectedProcedure patterns
- Auth.js v5 documentation - Role-based access control and session management
- shadcn/ui documentation - Card, Badge, and component composition patterns
- date-fns 4.1.0 documentation - Date calculations and formatting
- Existing codebase analysis:
  - `/src/server/api/trpc.ts` - protectedProcedure and adminProcedure middleware
  - `/src/server/db/schema.ts` - purchaseOrders, retailOrders, brands tables
  - `/src/app/(dashboard)/executive/page.tsx` - Role-based dashboard pattern
  - `/src/app/(dashboard)/orders/purchase-orders/page.tsx` - Order list page pattern
  - `/src/components/dashboard/stat-card.tsx` - Dashboard card component pattern

### Secondary (MEDIUM confidence)
- [Mastering tRPC with React Server Components: The Definitive 2026 Guide](https://dev.to/christadrian/mastering-trpc-with-react-server-components-the-definitive-2026-guide-1i2e) - tRPC v11 + RSC patterns
- [Building a Scalable Role-Based Access Control (RBAC) System in Next.js](https://medium.com/@muhebollah.diu/building-a-scalable-role-based-access-control-rbac-system-in-next-js-b67b9ecfe5fa) - Middleware-based access control
- [Auth.js Role Based Access Control](https://authjs.dev/guides/role-based-access-control) - Official RBAC guide
- [Purchase Order Tracking: The complete guide](https://ziphq.com/blog/purchase-order-tracking) - PO lifecycle best practices
- [Shadcn Timeline Component](https://github.com/timDeHof/shadcn-timeline) - Custom timeline pattern using shadcn primitives
- [Status Badge UI Design Best Practices](https://cieden.com/book/atoms/badge/badge-ui-design) - Color conventions and accessibility

### Tertiary (LOW confidence)
- Web search results for "order tracking timeline visualization React 2026" - Community patterns for timeline components
- Web search results for "supply chain lead time calculation 2026" - Industry best practices for lead time forecasting
- Web search results for "order status badge color conventions 2026" - UI/UX color accessibility guidelines

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed and verified in package.json
- Architecture: HIGH - Patterns verified in existing codebase (executive dashboard, orders pages, tRPC routers)
- Pitfalls: MEDIUM - Based on web research + general Next.js/tRPC best practices (not project-specific)
- Code examples: HIGH - Derived from existing codebase patterns + official documentation

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable stack, minimal churn expected)

**Notes:**
- No new dependencies required
- All patterns compatible with existing Phase 1-3 implementations
- Timeline component requires custom implementation (no official shadcn timeline)
- Role-based views leverage existing Auth.js session + tRPC middleware
- Lead time calculations use existing `brands.leadTimeDays` field from schema
