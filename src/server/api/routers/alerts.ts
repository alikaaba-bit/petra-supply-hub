import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { forecasts, skus, brands, inventory } from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { startOfMonth } from "date-fns";

/**
 * Calculate shortage for a SKU balance
 * Shortage = Forecasted - Ordered - Available
 * Where Available = OnHand + InTransit - Allocated
 */
export function calculateShortage(balance: {
  forecastedUnits: number;
  orderedUnits: number;
  onHandUnits: number;
  inTransitUnits: number;
  allocatedUnits: number;
}): number {
  const available =
    balance.onHandUnits + balance.inTransitUnits - balance.allocatedUnits;
  const shortage =
    balance.forecastedUnits - balance.orderedUnits - available;
  return Math.max(0, shortage);
}

/**
 * Calculate excess for a SKU balance
 * Excess = units where supply/forecast ratio > threshold (default 2.0)
 * If forecast is 0, any supply is considered excess
 */
export function calculateExcess(
  balance: {
    forecastedUnits: number;
    orderedUnits: number;
    onHandUnits: number;
    inTransitUnits: number;
    allocatedUnits: number;
  },
  threshold = 2.0
): number {
  const available =
    balance.onHandUnits + balance.inTransitUnits - balance.allocatedUnits;
  const supply = balance.orderedUnits + available;

  if (balance.forecastedUnits === 0) {
    return supply > 0 ? supply : 0;
  }

  const ratio = supply / balance.forecastedUnits;
  return ratio > threshold
    ? Math.round(supply - balance.forecastedUnits * threshold)
    : 0;
}

/**
 * Alerts router
 * Identifies shortage and excess inventory situations
 */
export const alertsRouter = router({
  /**
   * Shortages: SKUs where forecasted demand exceeds ordered + available
   * Used by DEM-04 dashboard
   */
  shortages: protectedProcedure
    .input(
      z.object({
        brandId: z.number().optional(),
        month: z.date().optional(),
        minShortage: z.number().default(0),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;

      // Default to current month if not specified
      const month = input.month ?? startOfMonth(new Date());

      // Build WHERE conditions
      const conditions = [eq(forecasts.month, month)];

      if (input.brandId) {
        conditions.push(eq(brands.id, input.brandId));
      }

      // PostgreSQL aggregation query
      const results = await db
        .select({
          skuId: skus.id,
          sku: skus.sku,
          skuName: skus.name,
          brandName: brands.name,
          brandId: brands.id,
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
          brands.id,
          inventory.quantityOnHand,
          inventory.quantityInTransit,
          inventory.quantityAllocated
        );

      // Calculate shortage for each row and filter
      const shortageItems = results
        .map((row) => {
          const forecastedUnits = Number(row.forecastedUnits ?? 0);
          const orderedUnits = Number(row.orderedUnits ?? 0);
          const onHandUnits = Number(row.onHandUnits ?? 0);
          const inTransitUnits = Number(row.inTransitUnits ?? 0);
          const allocatedUnits = Number(row.allocatedUnits ?? 0);

          const shortage = calculateShortage({
            forecastedUnits,
            orderedUnits,
            onHandUnits,
            inTransitUnits,
            allocatedUnits,
          });

          const availableUnits =
            onHandUnits + inTransitUnits - allocatedUnits;

          return {
            skuId: row.skuId,
            sku: row.sku,
            skuName: row.skuName,
            brandName: row.brandName,
            brandId: row.brandId,
            forecastedUnits,
            orderedUnits,
            onHandUnits,
            inTransitUnits,
            allocatedUnits,
            availableUnits,
            shortage,
          };
        })
        .filter((item) => item.shortage > input.minShortage)
        .sort((a, b) => b.shortage - a.shortage) // Sort by shortage DESC
        .slice(0, input.limit);

      return shortageItems;
    }),

  /**
   * Excesses: SKUs where ordered + available significantly exceeds forecast
   * Used by DEM-05 dashboard
   */
  excesses: protectedProcedure
    .input(
      z.object({
        brandId: z.number().optional(),
        month: z.date().optional(),
        threshold: z.number().default(2.0),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;

      // Default to current month if not specified
      const month = input.month ?? startOfMonth(new Date());

      // Build WHERE conditions
      const conditions = [eq(forecasts.month, month)];

      if (input.brandId) {
        conditions.push(eq(brands.id, input.brandId));
      }

      // PostgreSQL aggregation query
      const results = await db
        .select({
          skuId: skus.id,
          sku: skus.sku,
          skuName: skus.name,
          brandName: brands.name,
          brandId: brands.id,
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
          brands.id,
          inventory.quantityOnHand,
          inventory.quantityInTransit,
          inventory.quantityAllocated
        );

      // Calculate excess for each row and filter
      const excessItems = results
        .map((row) => {
          const forecastedUnits = Number(row.forecastedUnits ?? 0);
          const orderedUnits = Number(row.orderedUnits ?? 0);
          const onHandUnits = Number(row.onHandUnits ?? 0);
          const inTransitUnits = Number(row.inTransitUnits ?? 0);
          const allocatedUnits = Number(row.allocatedUnits ?? 0);

          const availableUnits =
            onHandUnits + inTransitUnits - allocatedUnits;
          const supply = orderedUnits + availableUnits;

          const excess = calculateExcess(
            {
              forecastedUnits,
              orderedUnits,
              onHandUnits,
              inTransitUnits,
              allocatedUnits,
            },
            input.threshold
          );

          const ratio = forecastedUnits > 0 ? supply / forecastedUnits : 0;

          return {
            skuId: row.skuId,
            sku: row.sku,
            skuName: row.skuName,
            brandName: row.brandName,
            brandId: row.brandId,
            forecastedUnits,
            orderedUnits,
            supply,
            excess,
            ratio,
          };
        })
        .filter((item) => item.excess > 0)
        .sort((a, b) => b.excess - a.excess) // Sort by excess DESC
        .slice(0, input.limit);

      return excessItems;
    }),

  /**
   * Summary: Aggregate alert counts and top alerts
   * Used by executive dashboard for quick overview
   */
  summary: protectedProcedure
    .input(
      z.object({
        brandId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;
      const month = startOfMonth(new Date());

      // Build WHERE conditions
      const conditions = [eq(forecasts.month, month)];

      if (input.brandId) {
        conditions.push(eq(brands.id, input.brandId));
      }

      // Get all SKU balances for current month
      const results = await db
        .select({
          skuId: skus.id,
          sku: skus.sku,
          skuName: skus.name,
          brandName: brands.name,
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
          inventory.quantityOnHand,
          inventory.quantityInTransit,
          inventory.quantityAllocated
        );

      // Calculate shortages and excesses
      const shortages: Array<{ sku: string; skuName: string; brandName: string; shortage: number }> = [];
      const excesses: Array<{ sku: string; skuName: string; brandName: string; excess: number }> = [];
      let totalShortageUnits = 0;
      let totalExcessUnits = 0;

      for (const row of results) {
        const forecastedUnits = Number(row.forecastedUnits ?? 0);
        const orderedUnits = Number(row.orderedUnits ?? 0);
        const onHandUnits = Number(row.onHandUnits ?? 0);
        const inTransitUnits = Number(row.inTransitUnits ?? 0);
        const allocatedUnits = Number(row.allocatedUnits ?? 0);

        const shortage = calculateShortage({
          forecastedUnits,
          orderedUnits,
          onHandUnits,
          inTransitUnits,
          allocatedUnits,
        });

        const excess = calculateExcess({
          forecastedUnits,
          orderedUnits,
          onHandUnits,
          inTransitUnits,
          allocatedUnits,
        });

        if (shortage > 0) {
          shortages.push({
            sku: row.sku,
            skuName: row.skuName,
            brandName: row.brandName,
            shortage,
          });
          totalShortageUnits += shortage;
        }

        if (excess > 0) {
          excesses.push({
            sku: row.sku,
            skuName: row.skuName,
            brandName: row.brandName,
            excess,
          });
          totalExcessUnits += excess;
        }
      }

      // Sort and get top 3
      const topShortages = shortages
        .sort((a, b) => b.shortage - a.shortage)
        .slice(0, 3);

      const topExcesses = excesses
        .sort((a, b) => b.excess - a.excess)
        .slice(0, 3);

      return {
        totalShortageSkus: shortages.length,
        totalExcessSkus: excesses.length,
        topShortages,
        topExcesses,
        totalShortageUnits,
        totalExcessUnits,
      };
    }),
});
