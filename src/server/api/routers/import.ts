import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { forecasts, retailSales, skus, retailers } from "@/server/db/schema";
import { eq, desc, count, and, gte, lte, sql } from "drizzle-orm";

export const importRouter = router({
  // Forecasts queries
  forecasts: router({
    count: publicProcedure.query(async ({ ctx }) => {
      const result = await ctx.db.select({ count: count() }).from(forecasts);
      return result[0]?.count ?? 0;
    }),

    list: protectedProcedure
      .input(
        z.object({
          brandId: z.number().optional(),
          retailerId: z.number().optional(),
          monthStart: z.date().optional(),
          monthEnd: z.date().optional(),
          limit: z.number().int().positive().max(1000).default(100),
          offset: z.number().int().nonnegative().default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const conditions = [];

        if (input.retailerId) {
          conditions.push(eq(forecasts.retailerId, input.retailerId));
        }

        if (input.monthStart) {
          conditions.push(gte(forecasts.month, input.monthStart));
        }

        if (input.monthEnd) {
          conditions.push(lte(forecasts.month, input.monthEnd));
        }

        // Build query with joins
        const query = ctx.db
          .select({
            id: forecasts.id,
            month: forecasts.month,
            forecastedUnits: forecasts.forecastedUnits,
            orderedUnits: forecasts.orderedUnits,
            source: forecasts.source,
            notes: forecasts.notes,
            createdAt: forecasts.createdAt,
            updatedAt: forecasts.updatedAt,
            sku: {
              id: skus.id,
              sku: skus.sku,
              name: skus.name,
              brandId: skus.brandId,
            },
            retailer: {
              id: retailers.id,
              name: retailers.name,
            },
          })
          .from(forecasts)
          .innerJoin(skus, eq(forecasts.skuId, skus.id))
          .innerJoin(retailers, eq(forecasts.retailerId, retailers.id))
          .orderBy(desc(forecasts.month))
          .limit(input.limit)
          .offset(input.offset);

        // Apply brand filter on joined skus table
        if (input.brandId) {
          conditions.push(eq(skus.brandId, input.brandId));
        }

        if (conditions.length > 0) {
          return await query.where(and(...conditions));
        }

        return await query;
      }),

    byBrand: protectedProcedure
      .input(
        z.object({
          brandId: z.number(),
          monthStart: z.date().optional(),
          monthEnd: z.date().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const conditions = [eq(skus.brandId, input.brandId)];

        if (input.monthStart) {
          conditions.push(gte(forecasts.month, input.monthStart));
        }

        if (input.monthEnd) {
          conditions.push(lte(forecasts.month, input.monthEnd));
        }

        // Group by month and aggregate
        return await ctx.db
          .select({
            month: forecasts.month,
            totalForecastedUnits: sql<number>`sum(${forecasts.forecastedUnits})`,
            totalOrderedUnits: sql<number>`sum(${forecasts.orderedUnits})`,
          })
          .from(forecasts)
          .innerJoin(skus, eq(forecasts.skuId, skus.id))
          .where(and(...conditions))
          .groupBy(forecasts.month)
          .orderBy(desc(forecasts.month));
      }),
  }),

  // Retail sales queries
  retailSales: router({
    count: publicProcedure.query(async ({ ctx }) => {
      const result = await ctx.db.select({ count: count() }).from(retailSales);
      return result[0]?.count ?? 0;
    }),

    list: protectedProcedure
      .input(
        z.object({
          brandId: z.number().optional(),
          retailerId: z.number().optional(),
          monthStart: z.date().optional(),
          monthEnd: z.date().optional(),
          limit: z.number().int().positive().max(1000).default(100),
          offset: z.number().int().nonnegative().default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const conditions = [];

        if (input.retailerId) {
          conditions.push(eq(retailSales.retailerId, input.retailerId));
        }

        if (input.monthStart) {
          conditions.push(gte(retailSales.month, input.monthStart));
        }

        if (input.monthEnd) {
          conditions.push(lte(retailSales.month, input.monthEnd));
        }

        // Build query with joins
        const query = ctx.db
          .select({
            id: retailSales.id,
            month: retailSales.month,
            unitsSold: retailSales.unitsSold,
            revenue: retailSales.revenue,
            source: retailSales.source,
            notes: retailSales.notes,
            createdAt: retailSales.createdAt,
            updatedAt: retailSales.updatedAt,
            sku: {
              id: skus.id,
              sku: skus.sku,
              name: skus.name,
              brandId: skus.brandId,
            },
            retailer: {
              id: retailers.id,
              name: retailers.name,
            },
          })
          .from(retailSales)
          .innerJoin(skus, eq(retailSales.skuId, skus.id))
          .innerJoin(retailers, eq(retailSales.retailerId, retailers.id))
          .orderBy(desc(retailSales.month))
          .limit(input.limit)
          .offset(input.offset);

        // Apply brand filter on joined skus table
        if (input.brandId) {
          conditions.push(eq(skus.brandId, input.brandId));
        }

        if (conditions.length > 0) {
          return await query.where(and(...conditions));
        }

        return await query;
      }),
  }),
});
