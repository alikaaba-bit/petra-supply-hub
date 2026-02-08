import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  retailSales,
  skus,
  brands,
  retailers,
  purchaseOrders,
  forecasts,
  inventory,
} from "@/server/db/schema";
import { eq, gte, sql, count } from "drizzle-orm";
import { startOfMonth, subMonths, format } from "date-fns";

/**
 * Dashboard router
 * Provides chart data and KPI metrics for Phase 5 visualizations
 * All queries use PostgreSQL-level aggregation for performance
 */
export const dashboardRouter = router({
  /**
   * VIZ-01: Revenue Trend
   * Returns monthly revenue by brand in wide format for stacked area chart
   * Output: [{ month: "Feb 2026", "Fomin": 12345, "Luna Naturals": 6789, ... }]
   */
  revenueTrend: protectedProcedure
    .input(
      z.object({
        months: z.number().default(12),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;

      // Calculate start date for filter
      const startDate = startOfMonth(subMonths(new Date(), input.months));

      // PostgreSQL aggregation query
      const results = await db
        .select({
          month: retailSales.month,
          brandName: brands.name,
          revenue: sql<string>`CAST(COALESCE(SUM(${retailSales.revenue}), 0) AS TEXT)`,
        })
        .from(retailSales)
        .innerJoin(skus, eq(retailSales.skuId, skus.id))
        .innerJoin(brands, eq(skus.brandId, brands.id))
        .where(gte(retailSales.month, startDate))
        .groupBy(retailSales.month, brands.name)
        .orderBy(retailSales.month);

      // Transform from long format to wide format for Recharts
      const monthMap = new Map<
        string,
        Record<string, number | string>
      >();

      for (const row of results) {
        const monthKey = format(row.month, "MMM yyyy");
        const revenue = Number(row.revenue ?? 0);

        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, { month: monthKey });
        }

        const monthData = monthMap.get(monthKey)!;
        monthData[row.brandName] = revenue;
      }

      // Convert map to array and ensure all brands appear in each month
      const allBrands = [
        "Fomin",
        "Luna Naturals",
        "EveryMood",
        "Roofus",
        "House of Party",
      ];
      const data = Array.from(monthMap.values()).map((monthData) => {
        const complete: Record<string, number | string> = { ...monthData };
        // Fill in 0 for any missing brands
        for (const brand of allBrands) {
          if (!(brand in complete)) {
            complete[brand] = 0;
          }
        }
        return complete;
      });

      return data;
    }),

  /**
   * VIZ-02: Brand Performance
   * Returns total revenue by brand
   * Output: [{ brandName: string, revenue: number }]
   */
  brandPerformance: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db;

    const results = await db
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
      revenue: Number(row.revenue ?? 0),
    }));
  }),

  /**
   * VIZ-03: Retailer Mix
   * Returns revenue by retailer and brand in wide format for horizontal stacked bar
   * Output: [{ retailerName: string, "Fomin": number, "Luna Naturals": number, ... }]
   */
  retailerMix: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db;

    const results = await db
      .select({
        retailerName: retailers.name,
        brandName: brands.name,
        revenue: sql<string>`CAST(COALESCE(SUM(${retailSales.revenue}), 0) AS TEXT)`,
      })
      .from(retailSales)
      .innerJoin(skus, eq(retailSales.skuId, skus.id))
      .innerJoin(brands, eq(skus.brandId, brands.id))
      .innerJoin(retailers, eq(retailSales.retailerId, retailers.id))
      .groupBy(retailers.name, brands.name);

    // Transform to wide format and calculate total revenue per retailer
    const retailerMap = new Map<
      string,
      Record<string, number | string>
    >();

    for (const row of results) {
      const revenue = Number(row.revenue ?? 0);

      if (!retailerMap.has(row.retailerName)) {
        retailerMap.set(row.retailerName, {
          retailerName: row.retailerName,
          _total: 0,
        });
      }

      const retailerData = retailerMap.get(row.retailerName)!;
      retailerData[row.brandName] = revenue;
      (retailerData._total as number) += revenue;
    }

    // Sort by total revenue descending and remove the _total field
    const data = Array.from(retailerMap.values())
      .sort((a, b) => (b._total as number) - (a._total as number))
      .map(({ _total, ...rest }) => rest);

    return data;
  }),

  /**
   * VIZ-04: KPI Summary
   * Returns current month KPIs: revenue MTD, units shipped MTD, open alerts, active POs
   * Output: { revenueMTD: number, unitsShippedMTD: number, openAlerts: number, activePOs: number }
   */
  kpiSummary: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db;
    const currentMonth = startOfMonth(new Date());

    // Query 1: Revenue MTD + Units Shipped MTD
    const salesResults = await db
      .select({
        revenue: sql<string>`CAST(COALESCE(SUM(${retailSales.revenue}), 0) AS TEXT)`,
        unitsShipped: sql<string>`CAST(COALESCE(SUM(${retailSales.unitsSold}), 0) AS TEXT)`,
      })
      .from(retailSales)
      .where(eq(retailSales.month, currentMonth));

    const revenueMTD = Number(salesResults[0]?.revenue ?? 0);
    const unitsShippedMTD = Number(salesResults[0]?.unitsShipped ?? 0);

    // Query 2: Open Alerts (shortage + excess count)
    const alertResults = await db
      .select({
        skuId: skus.id,
        forecastedUnits: sql<string>`CAST(COALESCE(SUM(${forecasts.forecastedUnits}), 0) AS TEXT)`,
        orderedUnits: sql<string>`CAST(COALESCE(SUM(${forecasts.orderedUnits}), 0) AS TEXT)`,
        onHandUnits: sql<string>`CAST(COALESCE(${inventory.quantityOnHand}, 0) AS TEXT)`,
        inTransitUnits: sql<string>`CAST(COALESCE(${inventory.quantityInTransit}, 0) AS TEXT)`,
        allocatedUnits: sql<string>`CAST(COALESCE(${inventory.quantityAllocated}, 0) AS TEXT)`,
      })
      .from(forecasts)
      .innerJoin(skus, eq(forecasts.skuId, skus.id))
      .leftJoin(inventory, eq(skus.id, inventory.skuId))
      .where(eq(forecasts.month, currentMonth))
      .groupBy(
        skus.id,
        inventory.quantityOnHand,
        inventory.quantityInTransit,
        inventory.quantityAllocated
      );

    // Calculate shortages and excesses using same logic from alerts.ts
    let shortageCount = 0;
    let excessCount = 0;

    for (const row of alertResults) {
      const forecastedUnits = Number(row.forecastedUnits ?? 0);
      const orderedUnits = Number(row.orderedUnits ?? 0);
      const onHandUnits = Number(row.onHandUnits ?? 0);
      const inTransitUnits = Number(row.inTransitUnits ?? 0);
      const allocatedUnits = Number(row.allocatedUnits ?? 0);

      const availableUnits = onHandUnits + inTransitUnits - allocatedUnits;
      const shortage = Math.max(
        0,
        forecastedUnits - orderedUnits - availableUnits
      );

      // Calculate excess: supply/forecast ratio > 2.0
      const supply = orderedUnits + availableUnits;
      let excess = 0;
      if (forecastedUnits === 0) {
        excess = supply > 0 ? supply : 0;
      } else {
        const ratio = supply / forecastedUnits;
        excess =
          ratio > 2.0 ? Math.round(supply - forecastedUnits * 2.0) : 0;
      }

      if (shortage > 0) shortageCount++;
      if (excess > 0) excessCount++;
    }

    const openAlerts = shortageCount + excessCount;

    // Query 3: Active POs
    const poResults = await db
      .select({ count: count() })
      .from(purchaseOrders);

    const activePOs = poResults[0]?.count ?? 0;

    return {
      revenueMTD,
      unitsShippedMTD,
      openAlerts,
      activePOs,
    };
  }),
});
