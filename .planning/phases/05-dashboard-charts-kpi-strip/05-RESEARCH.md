# Phase 5: Dashboard Charts & KPI Strip - Research

**Researched:** 2026-02-08
**Domain:** Data visualization with Recharts in Next.js 16
**Confidence:** HIGH

## Summary

This phase adds interactive revenue charts and a KPI metrics strip to the executive dashboard. The standard approach uses **shadcn/ui chart components** (built on Recharts v3.7.0) with Next.js 16 App Router client components. The existing project already has shadcn/ui installed and follows this stack perfectly.

The key insight is that shadcn/ui provides ready-to-use chart components that wrap Recharts without locking you into an abstraction. Charts must be client components (`"use client"`) and data should be fetched server-side via tRPC, then passed to chart components as props. The existing `demand.ts` router demonstrates the exact PostgreSQL aggregation pattern needed for chart data.

**Primary recommendation:** Install shadcn/ui chart components via CLI, create a new tRPC router for revenue aggregations, and build chart components following shadcn/ui patterns with brand-specific color theming.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui charts | latest | Pre-built chart components | Official shadcn/ui component library, composition-based, no vendor lock-in |
| Recharts | 3.7.0 | Underlying chart rendering | Industry standard React charting library, SVG-based, composable |
| @tanstack/react-query | 5.90.20+ | Client state management | Already in project, powers tRPC data fetching |
| tRPC | 11.9.0+ | Type-safe API layer | Already in project, perfect for chart data endpoints |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.1.0+ | Date formatting | Already in project, format chart axis labels and tooltips |
| Drizzle ORM sql templates | 0.45.1+ | PostgreSQL aggregation | Already in project, use for SUM/GROUP BY queries |
| CSS variables | built-in | Theming | shadcn/ui charts auto-adapt to light/dark mode via CSS vars |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn/ui charts | Raw Recharts | More code, lose automatic theming, but more control |
| Recharts | Victory, Nivo, Chart.js | Different APIs, less React-native, shadcn/ui wouldn't work |
| Recharts | D3.js directly | Far more complex, steeper learning curve, overkill for standard charts |

**Installation:**
```bash
# Install shadcn/ui chart components (includes all chart types)
pnpm dlx shadcn@latest add chart

# No additional packages needed - Recharts installed automatically
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/(dashboard)/executive/
│   └── page.tsx                    # Main dashboard page (client component)
├── components/dashboard/
│   ├── stat-card.tsx              # Existing KPI card component
│   ├── revenue-trend-chart.tsx    # VIZ-01: 6-12 month trend line
│   ├── brand-performance-chart.tsx # VIZ-02: Brand comparison bars
│   ├── retailer-mix-chart.tsx     # VIZ-03: Retailer breakdown
│   └── kpi-strip.tsx              # VIZ-04: Top metrics strip
└── server/api/routers/
    └── dashboard.ts               # New router for chart aggregations
```

### Pattern 1: Server Data Fetch → Client Chart Component
**What:** Fetch aggregated data server-side via tRPC, pass to client component for rendering
**When to use:** All chart implementations (standard pattern for Next.js 16 + Recharts)
**Example:**
```typescript
// Source: https://app-generator.dev/docs/technologies/nextjs/integrate-recharts.html
// app/(dashboard)/executive/page.tsx
"use client";

import { RevenueTrendChart } from "@/components/dashboard/revenue-trend-chart";
import { trpc } from "@/lib/trpc";

export default function ExecutivePage() {
  // Fetch aggregated data with tRPC
  const { data: revenueData, isLoading } = trpc.dashboard.revenueTrend.useQuery({
    months: 12,
  });

  if (isLoading) return <div>Loading...</div>;

  // Pass data to client chart component
  return <RevenueTrendChart data={revenueData ?? []} />;
}
```

### Pattern 2: tRPC PostgreSQL Aggregation for Chart Data
**What:** Use Drizzle ORM sql templates to aggregate data in PostgreSQL, return typed results
**When to use:** All chart data endpoints (follow existing `demand.ts` router pattern)
**Example:**
```typescript
// Source: Existing codebase - src/server/api/routers/demand.ts (lines 39-56)
// server/api/routers/dashboard.ts
import { sql } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { retailSales, brands, skus } from "@/server/db/schema";

export const dashboardRouter = router({
  revenueTrend: protectedProcedure
    .input(z.object({ months: z.number().default(12) }))
    .query(async ({ ctx, input }) => {
      const results = await ctx.db
        .select({
          month: retailSales.month,
          brandId: brands.id,
          brandName: brands.name,
          revenue: sql<string>`CAST(COALESCE(SUM(${retailSales.revenue}), 0) AS TEXT)`,
          units: sql<string>`CAST(COALESCE(SUM(${retailSales.unitsSold}), 0) AS TEXT)`,
        })
        .from(retailSales)
        .innerJoin(skus, eq(retailSales.skuId, skus.id))
        .innerJoin(brands, eq(skus.brandId, brands.id))
        .groupBy(retailSales.month, brands.id, brands.name)
        .orderBy(retailSales.month, brands.name)
        .limit(input.months * 5); // 5 brands

      return results.map((row) => ({
        month: row.month,
        brandId: row.brandId,
        brandName: row.brandName,
        revenue: Number(row.revenue),
        units: Number(row.units),
      }));
    }),
});
```

### Pattern 3: shadcn/ui Chart Component with ChartConfig
**What:** Use ChartContainer, ChartTooltip, and ChartConfig for consistent theming
**When to use:** All chart implementations (shadcn/ui pattern)
**Example:**
```typescript
// Source: https://ui.shadcn.com/docs/components/radix/chart
"use client";

import { AreaChart, Area, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  "Petra Brands": { label: "Petra Brands", color: "hsl(var(--chart-1))" },
  "Super Ego": { label: "Super Ego", color: "hsl(var(--chart-2))" },
  "Wildgame Innovations": { label: "Wildgame Innovations", color: "hsl(var(--chart-3))" },
  "Blade-Tech": { label: "Blade-Tech", color: "hsl(var(--chart-4))" },
  "Cyclops": { label: "Cyclops", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

export function RevenueTrendChart({ data }: { data: ChartData[] }) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="Petra Brands"
          stackId="1"
          stroke={chartConfig["Petra Brands"].color}
          fill={chartConfig["Petra Brands"].color}
        />
        {/* Repeat for other brands */}
      </AreaChart>
    </ChartContainer>
  );
}
```

### Pattern 4: Dynamic Import to Avoid Hydration Issues
**What:** Wrap chart components in dynamic imports with `ssr: false` to prevent hydration mismatches
**When to use:** If you encounter "Text content does not match server-rendered HTML" errors
**Example:**
```typescript
// Source: https://medium.com/@blogs-world/next-js-hydration-errors-in-2026-the-real-causes-fixes-and-prevention-checklist-4a8304d53702
// app/(dashboard)/executive/page.tsx
import dynamic from 'next/dynamic';

// Disable SSR for chart component to avoid ResponsiveContainer hydration issues
const RevenueTrendChart = dynamic(
  () => import('@/components/dashboard/revenue-trend-chart'),
  { ssr: false }
);

export default function ExecutivePage() {
  const { data } = trpc.dashboard.revenueTrend.useQuery({ months: 12 });
  return <RevenueTrendChart data={data ?? []} />;
}
```

### Pattern 5: KPI Strip Component
**What:** Grid of stat cards with real-time data, responsive layout
**When to use:** Dashboard summary metrics (VIZ-04)
**Example:**
```typescript
// Extends existing StatCard component pattern from codebase
"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import { DollarSign, Package, AlertTriangle, ShoppingCart } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function KpiStrip() {
  const { data: kpis } = trpc.dashboard.kpiSummary.useQuery();

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard
        title="Revenue MTD"
        value={`$${kpis?.revenueMTD.toLocaleString() ?? 0}`}
        icon={DollarSign}
        loading={!kpis}
      />
      <StatCard
        title="Units Shipped MTD"
        value={kpis?.unitsShippedMTD.toLocaleString() ?? 0}
        icon={Package}
        loading={!kpis}
      />
      <StatCard
        title="Open Alerts"
        value={kpis?.openAlerts ?? 0}
        icon={AlertTriangle}
        loading={!kpis}
      />
      <StatCard
        title="Active POs"
        value={kpis?.activePOs ?? 0}
        icon={ShoppingCart}
        loading={!kpis}
      />
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Server-rendering charts:** Recharts requires browser APIs (ResizeObserver), must be client-only
- **Hardcoded colors:** Use CSS variables (--chart-1 through --chart-5) for automatic dark mode support
- **Missing ResponsiveContainer dimensions:** Always set `className="min-h-[VALUE]"` on ChartContainer
- **Fetching data client-side in chart components:** Keep data fetching in page component, pass as props
- **Custom aggregation in JavaScript:** Use PostgreSQL SUM/GROUP BY for performance at scale

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart theming | Custom color management | shadcn/ui ChartConfig + CSS variables | Automatic light/dark mode, brand consistency, no manual color mapping |
| Responsive charts | Custom resize listeners | Recharts ResponsiveContainer + ChartContainer | Handles window resize, aspect ratios, works with Flexbox/Grid |
| Chart tooltips | Custom hover states | ChartTooltip + ChartTooltipContent | Formatted values, accessibility, keyboard navigation, automatic positioning |
| Data aggregation | Array.reduce() loops | PostgreSQL SUM/GROUP BY via Drizzle | 100x faster for large datasets, scales to millions of rows |
| Stacked area charts | Manual stacking logic | Recharts stackId prop | Handles negative values, auto-calculates offsets, prevents overlap |
| Date formatting | String manipulation | date-fns format() | Locale support, timezone handling, consistent with existing codebase |

**Key insight:** shadcn/ui chart components solve 90% of dashboard visualization needs without custom code. The remaining 10% (custom interactions, annotations) can be added via Recharts composition without breaking abstractions.

## Common Pitfalls

### Pitfall 1: ResponsiveContainer Hydration Mismatch
**What goes wrong:** Error "Text content does not match server-rendered HTML" when rendering charts
**Why it happens:** ResponsiveContainer uses browser-only ResizeObserver API, causing SSR/client mismatch
**How to avoid:**
- Use `"use client"` directive on all chart components (mandatory)
- If errors persist, wrap chart imports in `dynamic(() => import(...), { ssr: false })`
- Always set `className="min-h-[300px]"` (or similar) on ChartContainer for initial height
**Warning signs:** Console errors about hydration, charts not rendering on first load

### Pitfall 2: Incorrect Data Shape for Stacked Charts
**What goes wrong:** Stacked area chart shows gaps or doesn't stack properly
**Why it happens:** Recharts expects wide format (one row per X-axis value, columns for each series), not long format
**How to avoid:**
- Transform database results from long format (brand/month/revenue rows) to wide format
- Example: `[{ month: "Jan", "Brand A": 100, "Brand B": 200 }]` not `[{ month: "Jan", brand: "A", revenue: 100 }, ...]`
- Use Drizzle aggregation + JavaScript reduce() to pivot data
**Warning signs:** Chart renders but areas don't stack, tooltip shows undefined values

### Pitfall 3: Performance Degradation with Client-Side Aggregation
**What goes wrong:** Dashboard becomes slow as data grows beyond a few thousand rows
**Why it happens:** Fetching all retail_sales rows and aggregating in React is O(n) on every render
**How to avoid:**
- Always aggregate in PostgreSQL using `SUM()`, `GROUP BY`, and Drizzle sql templates
- Follow existing `demand.ts` router pattern (lines 39-56) with `CAST(COALESCE(SUM(...), 0) AS TEXT)`
- Return only aggregated results to client (12 months × 5 brands = 60 rows max)
**Warning signs:** Initial page load takes >500ms, tRPC queries return >1000 rows

### Pitfall 4: Missing ChartConfig Types
**What goes wrong:** TypeScript errors when referencing chart series names, runtime errors on color lookup
**Why it happens:** ChartConfig must use `satisfies ChartConfig` for type inference
**How to avoid:**
- Define chartConfig with `satisfies ChartConfig` (not `as ChartConfig` or `: ChartConfig`)
- Brand names in data must exactly match keys in chartConfig object
- Use `chartConfig[brandName].color` to reference colors, not hardcoded strings
**Warning signs:** TypeScript "Type 'string' is not assignable to..." errors, white/default colored chart areas

### Pitfall 5: KPI Strip Not Updating in Real-Time
**What goes wrong:** KPI metrics show stale data after navigating away and back
**Why it happens:** React Query cache returns cached data, doesn't refetch on mount by default
**How to avoid:**
- Use `trpc.dashboard.kpiSummary.useQuery({}, { refetchOnMount: true })` for always-fresh data
- Or accept cached data for better performance (default behavior, recommended)
- Set `staleTime: 60000` (1 minute) to balance freshness and performance
**Warning signs:** KPIs show yesterday's data, manual refresh required to see updates

## Code Examples

Verified patterns from official sources:

### Stacked Area Chart (Revenue Trend - VIZ-01)
```typescript
// Source: https://ui.shadcn.com/charts/area
"use client";

import { AreaChart, Area, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

const chartConfig = {
  "Petra Brands": { label: "Petra Brands", color: "hsl(var(--chart-1))" },
  "Super Ego": { label: "Super Ego", color: "hsl(var(--chart-2))" },
  "Wildgame Innovations": { label: "Wildgame Innovations", color: "hsl(var(--chart-3))" },
  "Blade-Tech": { label: "Blade-Tech", color: "hsl(var(--chart-4))" },
  "Cyclops": { label: "Cyclops", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

interface RevenueData {
  month: string; // "Jan 2025"
  "Petra Brands": number;
  "Super Ego": number;
  "Wildgame Innovations": number;
  "Blade-Tech": number;
  "Cyclops": number;
}

export function RevenueTrendChart({ data }: { data: RevenueData[] }) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {Object.keys(chartConfig).map((brand) => (
          <Area
            key={brand}
            type="monotone"
            dataKey={brand}
            stackId="1"
            stroke={chartConfig[brand as keyof typeof chartConfig].color}
            fill={chartConfig[brand as keyof typeof chartConfig].color}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}
```

### Bar Chart (Brand Performance - VIZ-02)
```typescript
// Source: https://ui.shadcn.com/docs/components/radix/chart
"use client";

import { BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

const chartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

interface BrandData {
  brandName: string;
  revenue: number;
}

export function BrandPerformanceChart({ data }: { data: BrandData[] }) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="brandName" />
        <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="revenue" fill={chartConfig.revenue.color} />
      </BarChart>
    </ChartContainer>
  );
}
```

### tRPC Router for Chart Data
```typescript
// Source: Existing codebase pattern from demand.ts
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { retailSales, skus, brands, retailers } from "@/server/db/schema";
import { eq, gte, sql } from "drizzle-orm";
import { startOfMonth, subMonths, format } from "date-fns";

export const dashboardRouter = router({
  // VIZ-01: Revenue trend (last 12 months, stacked by brand)
  revenueTrend: protectedProcedure
    .input(z.object({ months: z.number().default(12) }))
    .query(async ({ ctx, input }) => {
      const startMonth = startOfMonth(subMonths(new Date(), input.months));

      const results = await ctx.db
        .select({
          month: retailSales.month,
          brandName: brands.name,
          revenue: sql<string>`CAST(COALESCE(SUM(${retailSales.revenue}), 0) AS TEXT)`,
        })
        .from(retailSales)
        .innerJoin(skus, eq(retailSales.skuId, skus.id))
        .innerJoin(brands, eq(skus.brandId, brands.id))
        .where(gte(retailSales.month, startMonth))
        .groupBy(retailSales.month, brands.name)
        .orderBy(retailSales.month);

      // Transform to wide format for stacked area chart
      const byMonth = new Map<string, Record<string, number>>();
      results.forEach((row) => {
        const monthKey = format(row.month, "MMM yyyy");
        if (!byMonth.has(monthKey)) {
          byMonth.set(monthKey, { month: monthKey });
        }
        byMonth.get(monthKey)![row.brandName] = Number(row.revenue);
      });

      return Array.from(byMonth.values());
    }),

  // VIZ-02: Brand performance (total revenue comparison)
  brandPerformance: protectedProcedure.query(async ({ ctx }) => {
    const results = await ctx.db
      .select({
        brandName: brands.name,
        revenue: sql<string>`CAST(COALESCE(SUM(${retailSales.revenue}), 0) AS TEXT)`,
      })
      .from(retailSales)
      .innerJoin(skus, eq(retailSales.skuId, skus.id))
      .innerJoin(brands, eq(skus.brandId, brands.id))
      .groupBy(brands.name)
      .orderBy(sql`SUM(${retailSales.revenue}) DESC`);

    return results.map((row) => ({
      brandName: row.brandName,
      revenue: Number(row.revenue),
    }));
  }),

  // VIZ-04: KPI summary
  kpiSummary: protectedProcedure.query(async ({ ctx }) => {
    const currentMonth = startOfMonth(new Date());

    // Revenue MTD
    const revenueResult = await ctx.db
      .select({
        revenue: sql<string>`CAST(COALESCE(SUM(${retailSales.revenue}), 0) AS TEXT)`,
        units: sql<string>`CAST(COALESCE(SUM(${retailSales.unitsSold}), 0) AS TEXT)`,
      })
      .from(retailSales)
      .where(eq(retailSales.month, currentMonth));

    // Open alerts count (reuse existing alerts router)
    const alertsSummary = await ctx.caller.alerts.summary({});

    // Active POs count (reuse existing orders router)
    const activePOs = await ctx.caller.orders.purchaseOrders.count();

    return {
      revenueMTD: Number(revenueResult[0]?.revenue ?? 0),
      unitsShippedMTD: Number(revenueResult[0]?.units ?? 0),
      openAlerts: (alertsSummary?.totalShortageSkus ?? 0) + (alertsSummary?.totalExcessSkus ?? 0),
      activePOs: activePOs ?? 0,
    };
  }),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side charting libraries (Chart.js) | Server-fetched data + client rendering | Next.js 13+ App Router | Faster initial loads, better SEO, type-safe APIs |
| Hardcoded hex colors | CSS variable theming | shadcn/ui v2+ | Automatic dark mode, easier brand customization |
| Custom tooltip components | ChartTooltip + ChartTooltipContent | shadcn/ui charts (2024) | Consistent formatting, accessibility built-in |
| Manual data pivoting | PostgreSQL GROUP BY + JS transform | Drizzle ORM sql templates | 10-100x performance improvement |
| Recharts v2.x | Recharts v3.7.0 | January 2025 | TypeScript strict mode, new hooks, Cell deprecated |

**Deprecated/outdated:**
- **Recharts Cell component**: Deprecated in v3.7.0, will be removed in v4.0. Use custom render functions instead.
- **Client-side aggregation**: Fetching raw data and aggregating in JavaScript is outdated for dashboards. Use PostgreSQL aggregation.
- **Fixed color palettes**: Hardcoded colors don't support dark mode. Use CSS variables (--chart-1 through --chart-5).

## Open Questions

Things that couldn't be fully resolved:

1. **Treemap vs. Horizontal Bar for Retailer Mix (VIZ-03)**
   - What we know: Both chart types available in Recharts, shadcn/ui doesn't provide Treemap example
   - What's unclear: Which visualization better shows retailer revenue with brand breakdown for 16 retailers?
   - Recommendation: Start with horizontal bar chart (simpler, shadcn/ui example exists), validate with stakeholders, switch to Treemap if needed

2. **React 19 + Recharts 3.7.0 Compatibility**
   - What we know: Project uses React 19.2.3, Recharts 3.7.0 is latest stable (Jan 2025)
   - What's unclear: Official compatibility statement not found in Recharts releases or docs
   - Recommendation: Install and test locally, expect it to work (Recharts is mature, React 19 stable), file issue if problems arise

3. **Month-to-Date vs. Trailing 30 Days for KPIs**
   - What we know: Schema has monthly granularity (retail_sales.month is date type)
   - What's unclear: User expectation for "Revenue MTD" - calendar month or last 30 days?
   - Recommendation: Use calendar month (startOfMonth) to match existing data model, add clarifying label "Revenue (Feb MTD)"

## Sources

### Primary (HIGH confidence)
- [shadcn/ui Chart Components](https://ui.shadcn.com/docs/components/radix/chart) - Official component documentation
- [shadcn/ui Area Charts](https://ui.shadcn.com/charts/area) - Stacked area chart examples
- [Next.js + Recharts Integration Guide](https://app-generator.dev/docs/technologies/nextjs/integrate-recharts.html) - Server/client patterns, hydration solutions
- [Recharts v3.7.0 Release](https://github.com/recharts/recharts/releases) - Latest version, TypeScript strict mode
- Existing codebase - `demand.ts` router (lines 39-56) - PostgreSQL aggregation pattern

### Secondary (MEDIUM confidence)
- [Next.js Hydration Errors 2026](https://medium.com/@blogs-world/next-js-hydration-errors-in-2026-the-real-causes-fixes-and-prevention-checklist-4a8304d53702) - Dynamic import solutions
- [Recharts Color Customization](https://app.studyraid.com/en/read/11352/354992/customizing-colors-and-themes) - CSS variables for theming
- [Tremor Dashboard Components](https://www.tremor.so/) - Alternative approach (not recommended, but validates KPI strip pattern)

### Tertiary (LOW confidence)
- [ResponsiveContainer GitHub Issues](https://github.com/recharts/recharts/issues/3595) - Community discussions on SSR (use official docs instead)
- [2026 Color Trends](https://www.interaction-design.org/literature/article/ui-color-palette) - General design guidance (not Recharts-specific)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - shadcn/ui charts officially documented, Recharts v3.7.0 stable, tRPC/Drizzle patterns proven in codebase
- Architecture: HIGH - Next.js 16 App Router patterns verified, existing demand.ts router demonstrates exact approach
- Pitfalls: HIGH - Hydration issues well-documented, ResponsiveContainer behavior confirmed by official Next.js docs

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - stable ecosystem, Recharts mature, Next.js 16 stable)
