import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  skus,
  brands,
  inventory,
  retailSales,
  cogsMaster,
} from "@/server/db/schema";
import { eq, sql, desc, and, gte, lte } from "drizzle-orm";
import { subDays, differenceInDays, format } from "date-fns";
import {
  getVelocityTier,
  getDiscountTier,
  getDiscountedPrice,
  getAgeBucket,
} from "@/server/lib/velocity";

type AgeBucket = "<30" | "30-59" | "60-89" | "90-119" | "120+";

export const salesPushRouter = router({
  pushList: protectedProcedure
    .input(
      z.object({
        brandId: z.number().optional(),
        ageBucket: z.string().optional(),
        topN: z.number().optional(),
        slowMoversOnly: z.boolean().optional(),
        overstockOnly: z.boolean().optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
        sortBy: z.string().default("valueAtRisk"),
        sortDir: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const day30ago = subDays(now, 30);
      const day90ago = subDays(now, 90);

      // Get all SKUs with inventory and brand info
      const allSkus = await ctx.db
        .select({
          skuId: skus.id,
          skuCode: skus.sku,
          skuName: skus.name,
          brandId: skus.brandId,
          brandName: brands.name,
          unitCost: skus.unitCost,
          unitPrice: skus.unitPrice,
          skuCreatedAt: skus.createdAt,
          quantityOnHand: inventory.quantityOnHand,
          quantityAllocated: inventory.quantityAllocated,
          receivedDate: inventory.receivedDate,
          lastUpdated: inventory.lastUpdated,
        })
        .from(skus)
        .innerJoin(brands, eq(skus.brandId, brands.id))
        .innerJoin(inventory, eq(inventory.skuId, skus.id))
        .where(
          input.brandId ? eq(skus.brandId, input.brandId) : undefined
        );

      // Get 30d and 90d sales per SKU
      const salesData = await ctx.db
        .select({
          skuId: retailSales.skuId,
          unitsSold30d: sql<number>`COALESCE(SUM(CASE WHEN ${retailSales.month} >= ${day30ago} THEN ${retailSales.unitsSold} ELSE 0 END), 0)`,
          unitsSold90d: sql<number>`COALESCE(SUM(CASE WHEN ${retailSales.month} >= ${day90ago} THEN ${retailSales.unitsSold} ELSE 0 END), 0)`,
          revenue90d: sql<number>`COALESCE(SUM(CASE WHEN ${retailSales.month} >= ${day90ago} THEN ${retailSales.revenue} ELSE 0 END), 0)`,
          lastSaleDate: sql<Date | null>`MAX(${retailSales.month})`,
        })
        .from(retailSales)
        .groupBy(retailSales.skuId);

      const salesMap = new Map(salesData.map((s) => [s.skuId, s]));

      // Get latest COGS from cogs_master per SKU
      const cogsData = await ctx.db
        .select({
          skuId: cogsMaster.skuId,
          cogs: cogsMaster.cogs,
        })
        .from(cogsMaster)
        .where(
          sql`(${cogsMaster.skuId}, ${cogsMaster.effectiveDate}) IN (
            SELECT sku_id, MAX(effective_date) FROM cogs_master GROUP BY sku_id
          )`
        );

      const cogsMap = new Map(
        cogsData.map((c) => [c.skuId, Number(c.cogs)])
      );

      // Determine top 20% by 90d revenue for velocity classification
      const revenueRanked = [...salesData]
        .sort((a, b) => Number(b.revenue90d) - Number(a.revenue90d));
      const top20Cutoff = Math.ceil(revenueRanked.length * 0.2);
      const top20SkuIds = new Set(
        revenueRanked.slice(0, top20Cutoff).map((s) => s.skuId)
      );

      // Build push list rows
      let rows = allSkus.map((sku) => {
        const sales = salesMap.get(sku.skuId);
        const unitsSold30d = sales ? Number(sales.unitsSold30d) : 0;
        const unitsSold90d = sales ? Number(sales.unitsSold90d) : 0;
        const lastSaleDate = sales?.lastSaleDate
          ? new Date(sales.lastSaleDate)
          : null;

        const unitsOnHand =
          (sku.quantityOnHand ?? 0) - (sku.quantityAllocated ?? 0);

        // COGS: cogsMaster > unitCost fallback
        const cogs = cogsMap.get(sku.skuId) ?? Number(sku.unitCost ?? 0);
        const wholesalePrice = Number(sku.unitPrice ?? 0);

        // Stock age: use receivedDate, fall back to lastUpdated
        const ageReference = sku.receivedDate ?? sku.lastUpdated ?? now;
        const stockAgeDays = differenceInDays(now, ageReference);

        const ageBucket = getAgeBucket(stockAgeDays);
        const inventoryValue = unitsOnHand * cogs;
        const wholesaleValue = unitsOnHand * wholesalePrice;
        const valueAtRisk = stockAgeDays > 30 ? unitsOnHand * cogs : 0;

        const discountTier = getDiscountTier(stockAgeDays);
        const discountedPrice = getDiscountedPrice(
          wholesalePrice,
          cogs,
          stockAgeDays
        );

        const velocity = getVelocityTier(
          unitsSold30d,
          unitsSold90d,
          lastSaleDate,
          sku.skuCreatedAt,
          top20SkuIds.has(sku.skuId)
        );

        const cogsWarning = cogs === 0;

        return {
          skuId: sku.skuId,
          skuCode: sku.skuCode,
          skuName: sku.skuName,
          brandId: sku.brandId,
          brandName: sku.brandName,
          stockAgeDays,
          ageBucket: ageBucket as AgeBucket,
          unitsOnHand,
          cogs,
          wholesalePrice,
          inventoryValue,
          wholesaleValue,
          valueAtRisk,
          discountTier: discountTier.label,
          discountPct: discountTier.discountPct,
          discountedPrice,
          unitsSold30d,
          isSlowMover: unitsSold30d === 0,
          velocityTier: velocity.tier,
          cogsWarning,
        };
      });

      // Apply filters
      if (input.ageBucket) {
        rows = rows.filter((r) => r.ageBucket === input.ageBucket);
      }
      if (input.slowMoversOnly) {
        rows = rows.filter((r) => r.isSlowMover);
      }
      if (input.overstockOnly) {
        rows = rows.filter((r) => {
          const sales = salesMap.get(r.skuId);
          const avgMonthly = (Number(sales?.unitsSold90d ?? 0) / 3) || 1;
          return r.unitsOnHand > avgMonthly * 2;
        });
      }
      if (input.search) {
        const q = input.search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.skuCode.toLowerCase().includes(q) ||
            r.skuName.toLowerCase().includes(q)
        );
      }

      // Sort
      const sortKey = input.sortBy as keyof (typeof rows)[0];
      rows.sort((a, b) => {
        const aVal = a[sortKey] ?? 0;
        const bVal = b[sortKey] ?? 0;
        if (typeof aVal === "string" && typeof bVal === "string") {
          return input.sortDir === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        return input.sortDir === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });

      // Totals before pagination
      const totals = {
        totalUnits: rows.reduce((s, r) => s + r.unitsOnHand, 0),
        totalInventoryValue: rows.reduce((s, r) => s + r.inventoryValue, 0),
        totalValueAtRisk: rows.reduce((s, r) => s + r.valueAtRisk, 0),
        totalRows: rows.length,
      };

      // Apply topN or paginate
      if (input.topN) {
        rows = rows.slice(0, input.topN);
      } else {
        const start = (input.page - 1) * input.pageSize;
        rows = rows.slice(start, start + input.pageSize);
      }

      return { rows, totals };
    }),

  kpiSummary: protectedProcedure
    .input(z.object({ brandId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();

      const invRows = await ctx.db
        .select({
          skuId: inventory.skuId,
          quantityOnHand: inventory.quantityOnHand,
          quantityAllocated: inventory.quantityAllocated,
          receivedDate: inventory.receivedDate,
          lastUpdated: inventory.lastUpdated,
          unitCost: skus.unitCost,
          brandId: skus.brandId,
        })
        .from(inventory)
        .innerJoin(skus, eq(inventory.skuId, skus.id))
        .where(input.brandId ? eq(skus.brandId, input.brandId) : undefined);

      // Get latest COGS
      const cogsData = await ctx.db
        .select({
          skuId: cogsMaster.skuId,
          cogs: cogsMaster.cogs,
        })
        .from(cogsMaster)
        .where(
          sql`(${cogsMaster.skuId}, ${cogsMaster.effectiveDate}) IN (
            SELECT sku_id, MAX(effective_date) FROM cogs_master GROUP BY sku_id
          )`
        );
      const cogsMap = new Map(
        cogsData.map((c) => [c.skuId, Number(c.cogs)])
      );

      let valueOver30d = 0;
      let valueOver60d = 0;
      let valueOver90d = 0;
      let valueOver120d = 0;
      let totalInventoryValue = 0;
      let skuCountAtRisk = 0;
      let skuCount120Plus = 0;

      for (const row of invRows) {
        const units =
          (row.quantityOnHand ?? 0) - (row.quantityAllocated ?? 0);
        const cogs = cogsMap.get(row.skuId) ?? Number(row.unitCost ?? 0);
        const ageRef = row.receivedDate ?? row.lastUpdated ?? now;
        const ageDays = differenceInDays(now, ageRef);
        const value = units * cogs;

        totalInventoryValue += value;
        if (ageDays > 30) {
          valueOver30d += value;
          skuCountAtRisk++;
        }
        if (ageDays > 60) valueOver60d += value;
        if (ageDays > 90) valueOver90d += value;
        if (ageDays > 120) {
          valueOver120d += value;
          skuCount120Plus++;
        }
      }

      return {
        valueOver30d,
        valueOver60d,
        valueOver90d,
        valueOver120d,
        totalAtRisk: valueOver30d,
        totalInventoryValue,
        atRiskPct:
          totalInventoryValue > 0
            ? valueOver30d / totalInventoryValue
            : 0,
        skuCountAtRisk,
        skuCount120Plus,
      };
    }),

  charts: protectedProcedure
    .input(z.object({ brandId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();

      const invRows = await ctx.db
        .select({
          skuId: inventory.skuId,
          quantityOnHand: inventory.quantityOnHand,
          quantityAllocated: inventory.quantityAllocated,
          receivedDate: inventory.receivedDate,
          lastUpdated: inventory.lastUpdated,
          unitCost: skus.unitCost,
          skuCode: skus.sku,
          skuName: skus.name,
          brandId: skus.brandId,
          brandName: brands.name,
        })
        .from(inventory)
        .innerJoin(skus, eq(inventory.skuId, skus.id))
        .innerJoin(brands, eq(skus.brandId, brands.id))
        .where(input.brandId ? eq(skus.brandId, input.brandId) : undefined);

      const cogsData = await ctx.db
        .select({
          skuId: cogsMaster.skuId,
          cogs: cogsMaster.cogs,
        })
        .from(cogsMaster)
        .where(
          sql`(${cogsMaster.skuId}, ${cogsMaster.effectiveDate}) IN (
            SELECT sku_id, MAX(effective_date) FROM cogs_master GROUP BY sku_id
          )`
        );
      const cogsMap = new Map(
        cogsData.map((c) => [c.skuId, Number(c.cogs)])
      );

      // Process each row
      const skuRisks: Array<{
        skuCode: string;
        skuName: string;
        brandName: string;
        valueAtRisk: number;
        ageBucket: AgeBucket;
      }> = [];

      const bucketTotals = new Map<
        AgeBucket,
        { totalValue: number; skuCount: number }
      >();
      const brandBuckets = new Map<
        string,
        Map<AgeBucket, number>
      >();

      for (const row of invRows) {
        const units =
          (row.quantityOnHand ?? 0) - (row.quantityAllocated ?? 0);
        const cogs = cogsMap.get(row.skuId) ?? Number(row.unitCost ?? 0);
        const ageRef = row.receivedDate ?? row.lastUpdated ?? now;
        const ageDays = differenceInDays(now, ageRef);
        const ageBucket = getAgeBucket(ageDays);
        const value = units * cogs;
        const valueAtRisk = ageDays > 30 ? value : 0;

        skuRisks.push({
          skuCode: row.skuCode,
          skuName: row.skuName,
          brandName: row.brandName,
          valueAtRisk,
          ageBucket,
        });

        // Bucket totals
        const existing = bucketTotals.get(ageBucket) ?? {
          totalValue: 0,
          skuCount: 0,
        };
        existing.totalValue += value;
        existing.skuCount++;
        bucketTotals.set(ageBucket, existing);

        // Brand × bucket
        if (!brandBuckets.has(row.brandName)) {
          brandBuckets.set(row.brandName, new Map());
        }
        const bMap = brandBuckets.get(row.brandName)!;
        bMap.set(ageBucket, (bMap.get(ageBucket) ?? 0) + value);
      }

      // Top 10 by value at risk
      const top10ByValueAtRisk = skuRisks
        .sort((a, b) => b.valueAtRisk - a.valueAtRisk)
        .slice(0, 10);

      // Value by age bucket
      const bucketOrder: AgeBucket[] = [
        "<30",
        "30-59",
        "60-89",
        "90-119",
        "120+",
      ];
      const valueByAgeBucket = bucketOrder.map((bucket) => ({
        ageBucket: bucket,
        totalValue: bucketTotals.get(bucket)?.totalValue ?? 0,
        skuCount: bucketTotals.get(bucket)?.skuCount ?? 0,
      }));

      // Value by age bucket by brand
      const valueByAgeBucketByBrand: Array<{
        brandName: string;
        ageBucket: AgeBucket;
        totalValue: number;
      }> = [];
      for (const [brandName, bMap] of brandBuckets) {
        for (const bucket of bucketOrder) {
          valueByAgeBucketByBrand.push({
            brandName,
            ageBucket: bucket,
            totalValue: bMap.get(bucket) ?? 0,
          });
        }
      }

      return {
        top10ByValueAtRisk,
        valueByAgeBucket,
        valueByAgeBucketByBrand,
      };
    }),

  emailDigest: protectedProcedure
    .input(z.object({ brandId: z.number() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const day30ago = subDays(now, 30);
      const day90ago = subDays(now, 90);

      const brand = await ctx.db
        .select({ name: brands.name })
        .from(brands)
        .where(eq(brands.id, input.brandId))
        .then((r) => r[0]);

      const invRows = await ctx.db
        .select({
          skuId: inventory.skuId,
          quantityOnHand: inventory.quantityOnHand,
          quantityAllocated: inventory.quantityAllocated,
          receivedDate: inventory.receivedDate,
          lastUpdated: inventory.lastUpdated,
          skuCode: skus.sku,
          skuName: skus.name,
          unitCost: skus.unitCost,
          unitPrice: skus.unitPrice,
        })
        .from(inventory)
        .innerJoin(skus, eq(inventory.skuId, skus.id))
        .where(eq(skus.brandId, input.brandId));

      const salesData = await ctx.db
        .select({
          skuId: retailSales.skuId,
          unitsSold30d: sql<number>`COALESCE(SUM(CASE WHEN ${retailSales.month} >= ${day30ago} THEN ${retailSales.unitsSold} ELSE 0 END), 0)`,
        })
        .from(retailSales)
        .where(gte(retailSales.month, day90ago))
        .groupBy(retailSales.skuId);

      const salesMap = new Map(
        salesData.map((s) => [s.skuId, Number(s.unitsSold30d)])
      );

      const cogsData = await ctx.db
        .select({ skuId: cogsMaster.skuId, cogs: cogsMaster.cogs })
        .from(cogsMaster)
        .where(
          sql`(${cogsMaster.skuId}, ${cogsMaster.effectiveDate}) IN (
            SELECT sku_id, MAX(effective_date) FROM cogs_master GROUP BY sku_id
          )`
        );
      const cogsMap = new Map(
        cogsData.map((c) => [c.skuId, Number(c.cogs)])
      );

      let totalAtRisk = 0;
      let slowMoverCount = 0;
      let cogsWarnings = 0;
      const bucketCounts: Record<string, number> = {};
      const skuRows: Array<{
        skuCode: string;
        skuName: string;
        units: number;
        valueAtRisk: number;
        ageDays: number;
        discountTier: string;
      }> = [];

      for (const row of invRows) {
        const units =
          (row.quantityOnHand ?? 0) - (row.quantityAllocated ?? 0);
        const cogs = cogsMap.get(row.skuId) ?? Number(row.unitCost ?? 0);
        const ageRef = row.receivedDate ?? row.lastUpdated ?? now;
        const ageDays = differenceInDays(now, ageRef);
        const ageBucket = getAgeBucket(ageDays);
        const valueAtRisk = ageDays > 30 ? units * cogs : 0;

        if (cogs === 0) cogsWarnings++;

        const sold30d = salesMap.get(row.skuId) ?? 0;
        if (sold30d === 0) slowMoverCount++;

        totalAtRisk += valueAtRisk;
        bucketCounts[ageBucket] = (bucketCounts[ageBucket] ?? 0) + 1;

        if (valueAtRisk > 0) {
          skuRows.push({
            skuCode: row.skuCode,
            skuName: row.skuName,
            units,
            valueAtRisk,
            ageDays,
            discountTier: getDiscountTier(ageDays).label,
          });
        }
      }

      skuRows.sort((a, b) => b.valueAtRisk - a.valueAtRisk);

      return {
        brandName: brand?.name ?? "Unknown",
        totalAtRisk,
        top10: skuRows.slice(0, 10),
        bucketCounts,
        slowMoverCount,
        cogsWarnings,
        generatedAt: format(now, "MMM d, yyyy"),
      };
    }),
});
