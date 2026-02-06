import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { forecasts, skus, brands, retailers, inventory } from "@/server/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { startOfMonth, addMonths, eachMonthOfInterval } from "date-fns";

/**
 * Demand aggregation router
 * Provides cross-brand summaries, retailer breakdowns, and SKU-level drill-downs
 * All queries use PostgreSQL-level aggregation for performance
 */
export const demandRouter = router({
  /**
   * Cross-brand summary: Aggregated demand and supply per brand per month
   * Used by DEM-01 dashboard
   */
  crossBrandSummary: protectedProcedure
    .input(
      z.object({
        monthStart: z.date(),
        monthEnd: z.date(),
        brandId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;

      // Build WHERE conditions
      const conditions = [
        gte(forecasts.month, input.monthStart),
        lte(forecasts.month, input.monthEnd),
      ];

      if (input.brandId) {
        conditions.push(eq(brands.id, input.brandId));
      }

      // PostgreSQL aggregation query
      const results = await db
        .select({
          brandId: brands.id,
          brandName: brands.name,
          month: forecasts.month,
          forecastedUnits: sql<string>`CAST(COALESCE(SUM(${forecasts.forecastedUnits}), 0) AS TEXT)`,
          orderedUnits: sql<string>`CAST(COALESCE(SUM(${forecasts.orderedUnits}), 0) AS TEXT)`,
          onHandUnits: sql<string>`CAST(COALESCE(SUM(${inventory.quantityOnHand}), 0) AS TEXT)`,
          inTransitUnits: sql<string>`CAST(COALESCE(SUM(${inventory.quantityInTransit}), 0) AS TEXT)`,
          allocatedUnits: sql<string>`CAST(COALESCE(SUM(${inventory.quantityAllocated}), 0) AS TEXT)`,
        })
        .from(forecasts)
        .innerJoin(skus, eq(forecasts.skuId, skus.id))
        .innerJoin(brands, eq(skus.brandId, brands.id))
        .leftJoin(inventory, eq(skus.id, inventory.skuId))
        .where(and(...conditions))
        .groupBy(brands.id, brands.name, forecasts.month)
        .orderBy(forecasts.month, brands.name);

      // Convert string results to numbers and calculate derived fields
      return results.map((row) => {
        const forecastedUnits = Number(row.forecastedUnits ?? 0);
        const orderedUnits = Number(row.orderedUnits ?? 0);
        const onHandUnits = Number(row.onHandUnits ?? 0);
        const inTransitUnits = Number(row.inTransitUnits ?? 0);
        const allocatedUnits = Number(row.allocatedUnits ?? 0);
        const availableUnits = onHandUnits + inTransitUnits - allocatedUnits;
        const balance = orderedUnits + availableUnits - forecastedUnits;

        return {
          brandId: row.brandId,
          brandName: row.brandName,
          month: row.month,
          forecastedUnits,
          orderedUnits,
          onHandUnits,
          inTransitUnits,
          allocatedUnits,
          availableUnits,
          balance,
        };
      });
    }),

  /**
   * Retailer breakdown: Demand per retailer across brands for a given month
   * Used by DEM-02 dashboard
   */
  retailerBreakdown: protectedProcedure
    .input(
      z.object({
        month: z.date(),
        brandId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;

      // Build WHERE conditions
      const conditions = [eq(forecasts.month, input.month)];

      if (input.brandId) {
        conditions.push(eq(brands.id, input.brandId));
      }

      // PostgreSQL aggregation query
      const results = await db
        .select({
          retailerId: retailers.id,
          retailerName: retailers.name,
          brandId: brands.id,
          brandName: brands.name,
          forecastedUnits: sql<string>`CAST(COALESCE(SUM(${forecasts.forecastedUnits}), 0) AS TEXT)`,
          orderedUnits: sql<string>`CAST(COALESCE(SUM(${forecasts.orderedUnits}), 0) AS TEXT)`,
        })
        .from(forecasts)
        .innerJoin(skus, eq(forecasts.skuId, skus.id))
        .innerJoin(brands, eq(skus.brandId, brands.id))
        .innerJoin(retailers, eq(forecasts.retailerId, retailers.id))
        .where(and(...conditions))
        .groupBy(retailers.id, retailers.name, brands.id, brands.name)
        .orderBy(retailers.name, brands.name);

      // Convert string results to numbers
      return results.map((row) => ({
        retailerId: row.retailerId,
        retailerName: row.retailerName,
        brandId: row.brandId,
        brandName: row.brandName,
        forecastedUnits: Number(row.forecastedUnits ?? 0),
        orderedUnits: Number(row.orderedUnits ?? 0),
      }));
    }),

  /**
   * SKU drill-down: Individual SKU balances with pagination
   * Used by DEM-03 dashboard
   */
  skuDrillDown: protectedProcedure
    .input(
      z.object({
        month: z.date(),
        brandId: z.number().optional(),
        retailerId: z.number().optional(),
        limit: z.number().default(200),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;

      // Build WHERE conditions
      const conditions = [eq(forecasts.month, input.month)];

      if (input.brandId) {
        conditions.push(eq(brands.id, input.brandId));
      }

      if (input.retailerId) {
        conditions.push(eq(retailers.id, input.retailerId));
      }

      // Get total count for pagination
      const countResult = await db
        .select({
          count: sql<string>`CAST(COUNT(*) AS TEXT)`,
        })
        .from(forecasts)
        .innerJoin(skus, eq(forecasts.skuId, skus.id))
        .innerJoin(brands, eq(skus.brandId, brands.id))
        .leftJoin(inventory, eq(skus.id, inventory.skuId))
        .where(and(...conditions));

      const totalCount = Number(countResult[0]?.count ?? 0);

      // PostgreSQL aggregation query with pagination
      const results = await db
        .select({
          skuId: skus.id,
          sku: skus.sku,
          skuName: skus.name,
          brandName: brands.name,
          month: forecasts.month,
          forecastedUnits: sql<string>`CAST(COALESCE(SUM(${forecasts.forecastedUnits}), 0) AS TEXT)`,
          orderedUnits: sql<string>`CAST(COALESCE(SUM(${forecasts.orderedUnits}), 0) AS TEXT)`,
          onHandUnits: sql<string>`CAST(COALESCE(${inventory.quantityOnHand}, 0) AS TEXT)`,
          inTransitUnits: sql<string>`CAST(COALESCE(${inventory.quantityInTransit}, 0) AS TEXT)`,
          allocatedUnits: sql<string>`CAST(COALESCE(${inventory.quantityAllocated}, 0) AS TEXT)`,
        })
        .from(forecasts)
        .innerJoin(skus, eq(forecasts.skuId, skus.id))
        .innerJoin(brands, eq(skus.brandId, brands.id))
        .leftJoin(inventory, eq(skus.id, inventory.skuId))
        .where(and(...conditions))
        .groupBy(
          skus.id,
          skus.sku,
          skus.name,
          brands.name,
          forecasts.month,
          inventory.quantityOnHand,
          inventory.quantityInTransit,
          inventory.quantityAllocated
        )
        .orderBy(skus.sku)
        .limit(input.limit)
        .offset(input.offset);

      // Convert string results to numbers and calculate derived fields
      const items = results.map((row) => {
        const forecastedUnits = Number(row.forecastedUnits ?? 0);
        const orderedUnits = Number(row.orderedUnits ?? 0);
        const onHandUnits = Number(row.onHandUnits ?? 0);
        const inTransitUnits = Number(row.inTransitUnits ?? 0);
        const allocatedUnits = Number(row.allocatedUnits ?? 0);
        const availableUnits = onHandUnits + inTransitUnits - allocatedUnits;
        const shortage = Math.max(0, forecastedUnits - orderedUnits - availableUnits);

        // Calculate excess: supply/forecast ratio > 2.0
        const supply = orderedUnits + availableUnits;
        let excess = 0;
        if (forecastedUnits === 0) {
          excess = supply > 0 ? supply : 0;
        } else {
          const ratio = supply / forecastedUnits;
          excess = ratio > 2.0 ? Math.round(supply - forecastedUnits * 2.0) : 0;
        }

        return {
          skuId: row.skuId,
          sku: row.sku,
          skuName: row.skuName,
          brandName: row.brandName,
          month: row.month,
          forecastedUnits,
          orderedUnits,
          onHandUnits,
          inTransitUnits,
          allocatedUnits,
          availableUnits,
          shortage,
          excess,
        };
      });

      return {
        items,
        totalCount,
      };
    }),

  /**
   * Monthly summary: Aggregated totals for current month and next 3 months
   * Used by DEM-01 executive summary
   */
  monthlySummary: protectedProcedure
    .input(
      z.object({
        brandId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;

      // Generate month range: current month through +3 months
      const today = new Date();
      const currentMonth = startOfMonth(today);
      const monthRange = eachMonthOfInterval({
        start: currentMonth,
        end: addMonths(currentMonth, 3),
      });

      const summaryPromises = monthRange.map(async (month) => {
        // Build WHERE conditions
        const conditions = [eq(forecasts.month, month)];

        if (input.brandId) {
          conditions.push(eq(brands.id, input.brandId));
        }

        // PostgreSQL aggregation query
        const results = await db
          .select({
            forecastedUnits: sql<string>`CAST(COALESCE(SUM(${forecasts.forecastedUnits}), 0) AS TEXT)`,
            orderedUnits: sql<string>`CAST(COALESCE(SUM(${forecasts.orderedUnits}), 0) AS TEXT)`,
            onHandUnits: sql<string>`CAST(COALESCE(SUM(${inventory.quantityOnHand}), 0) AS TEXT)`,
            inTransitUnits: sql<string>`CAST(COALESCE(SUM(${inventory.quantityInTransit}), 0) AS TEXT)`,
            allocatedUnits: sql<string>`CAST(COALESCE(SUM(${inventory.quantityAllocated}), 0) AS TEXT)`,
          })
          .from(forecasts)
          .innerJoin(skus, eq(forecasts.skuId, skus.id))
          .innerJoin(brands, eq(skus.brandId, brands.id))
          .leftJoin(inventory, eq(skus.id, inventory.skuId))
          .where(and(...conditions));

        const result = results[0];
        const forecastedUnits = Number(result?.forecastedUnits ?? 0);
        const orderedUnits = Number(result?.orderedUnits ?? 0);
        const onHandUnits = Number(result?.onHandUnits ?? 0);
        const inTransitUnits = Number(result?.inTransitUnits ?? 0);
        const allocatedUnits = Number(result?.allocatedUnits ?? 0);
        const availableUnits = onHandUnits + inTransitUnits - allocatedUnits;

        return {
          month,
          forecastedUnits,
          orderedUnits,
          availableUnits,
        };
      });

      const summary = await Promise.all(summaryPromises);

      return summary;
    }),
});
