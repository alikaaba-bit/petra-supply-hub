import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  brands,
  skus,
  retailers,
  revenueTargets,
  retailSales,
  forecasts,
  inventory,
  purchaseOrders,
  poLineItems,
} from "@/server/db/schema";
import { eq, and, gte, lte, sql, desc, asc, ne } from "drizzle-orm";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  differenceInDays,
  addDays,
} from "date-fns";

// ============================================================================
// VELOCITY TIER DEFINITIONS
// ============================================================================

type VelocityTier = "A" | "B" | "C" | "D" | "F" | "N";

const VELOCITY_WEIGHTS: Record<VelocityTier, number> = {
  A: 1.0,
  B: 0.85,
  C: 0.5,
  D: 0.2,
  F: 0.05,
  N: 0.7,
};

const VELOCITY_LABELS: Record<VelocityTier, string> = {
  A: "Fast Mover",
  B: "Steady",
  C: "Slow Mover",
  D: "Stale",
  F: "Dead Stock",
  N: "New SKU",
};

// Pipeline reliability weights
const PIPELINE_WEIGHTS = {
  onHand: 1.0,
  inTransit: 0.9,
  onOrder: 0.7,
  inProduction: 0.5,
};

// Channel confidence thresholds
const CHANNEL_THRESHOLDS = {
  off_price: 1.5,
  mass: 1.3,
  amazon: 1.2,
  default: 1.5,
};

const formatCurrencyNum = (val: number) => Math.round(val * 100) / 100;

// ============================================================================
// HELPER: Classify SKU velocity tier
// ============================================================================

function classifyVelocity(
  lastSaleDate: Date | null,
  unitsSold90d: number,
  unitsSold30d: number,
  isTop20: boolean,
  skuCreatedAt: Date,
  today: Date
): VelocityTier {
  const daysSinceCreation = differenceInDays(today, skuCreatedAt);
  if (daysSinceCreation < 60 && unitsSold90d < 10) return "N";

  if (!lastSaleDate) return "F";
  const daysSinceLastSale = differenceInDays(today, lastSaleDate);

  if (daysSinceLastSale <= 30) {
    return isTop20 ? "A" : "B";
  }
  if (daysSinceLastSale <= 60) return "C";
  if (daysSinceLastSale <= 180) return "D";
  return "F";
}

export const dashboardRouter = router({
  // ==========================================================================
  // SUPPLY VALIDATION — THE HERO QUERY (4-LAYER CONFIDENCE ENGINE)
  // ==========================================================================
  supplyValidation: protectedProcedure
    .input(z.object({ months: z.number().default(3) }))
    .query(async ({ ctx, input }) => {
      const db = ctx.db;
      const today = new Date();
      const currentMonth = startOfMonth(today);

      // Get all active brands
      const allBrands = await db.query.brands.findMany({
        where: eq(brands.active, true),
        orderBy: [asc(brands.name)],
      });

      // Get all revenue targets for the period
      const targetMonthEnd = startOfMonth(
        addDays(endOfMonth(subMonths(currentMonth, -input.months + 1)), 1)
      );
      const allTargets = await db
        .select()
        .from(revenueTargets)
        .where(
          and(
            gte(revenueTargets.month, currentMonth),
            lte(revenueTargets.month, targetMonthEnd),
            eq(revenueTargets.channel, "all")
          )
        );

      // Get channel-specific targets for threshold calculation
      const channelTargets = await db
        .select()
        .from(revenueTargets)
        .where(
          and(
            gte(revenueTargets.month, currentMonth),
            lte(revenueTargets.month, targetMonthEnd),
            ne(revenueTargets.channel, "all")
          )
        );

      const results = [];

      for (const brand of allBrands) {
        // Get all SKUs for this brand
        const brandSkus = await db.query.skus.findMany({
          where: and(eq(skus.brandId, brand.id), eq(skus.active, true)),
        });

        if (brandSkus.length === 0) continue;

        const skuIds = brandSkus.map((s) => s.id);

        // LAYER 1: Velocity scoring — get sales data for trailing 90 days
        const salesData = await db
          .select({
            skuId: retailSales.skuId,
            month: retailSales.month,
            unitsSold: sql<string>`CAST(COALESCE(SUM(${retailSales.unitsSold}), 0) AS TEXT)`,
            revenue: sql<string>`CAST(COALESCE(SUM(${retailSales.revenue}), 0) AS TEXT)`,
          })
          .from(retailSales)
          .where(
            and(
              sql`${retailSales.skuId} IN (${sql.join(skuIds.map((id) => sql`${id}`), sql`, `)})`,
              gte(retailSales.month, startOfMonth(subMonths(today, 3)))
            )
          )
          .groupBy(retailSales.skuId, retailSales.month);

        // Aggregate 90d and 30d sales per SKU
        const skuSalesMap = new Map<
          number,
          {
            unitsSold90d: number;
            unitsSold30d: number;
            revenue90d: number;
            lastSaleDate: Date | null;
          }
        >();

        for (const row of salesData) {
          const existing = skuSalesMap.get(row.skuId) ?? {
            unitsSold90d: 0,
            unitsSold30d: 0,
            revenue90d: 0,
            lastSaleDate: null,
          };
          const units = Number(row.unitsSold);
          const rev = Number(row.revenue);
          existing.unitsSold90d += units;
          existing.revenue90d += rev;

          if (row.month >= startOfMonth(subMonths(today, 1))) {
            existing.unitsSold30d += units;
          }
          if (units > 0) {
            if (!existing.lastSaleDate || row.month > existing.lastSaleDate) {
              existing.lastSaleDate = row.month;
            }
          }
          skuSalesMap.set(row.skuId, existing);
        }

        // Determine top 20% by 90d revenue
        const revenueRanked = brandSkus
          .map((s) => ({
            id: s.id,
            revenue90d: skuSalesMap.get(s.id)?.revenue90d ?? 0,
          }))
          .sort((a, b) => b.revenue90d - a.revenue90d);
        const top20Cutoff = Math.max(1, Math.ceil(revenueRanked.length * 0.2));
        const top20Set = new Set(
          revenueRanked.slice(0, top20Cutoff).map((s) => s.id)
        );

        // Get inventory for all SKUs
        const invData = await db
          .select({
            skuId: inventory.skuId,
            onHand: inventory.quantityOnHand,
            allocated: inventory.quantityAllocated,
            inTransit: inventory.quantityInTransit,
          })
          .from(inventory)
          .where(
            sql`${inventory.skuId} IN (${sql.join(skuIds.map((id) => sql`${id}`), sql`, `)})`
          );
        const invMap = new Map(invData.map((i) => [i.skuId, i]));

        // Get PO line items by status for pipeline
        const poData = await db
          .select({
            skuId: poLineItems.skuId,
            poStatus: purchaseOrders.status,
            quantity: sql<string>`CAST(COALESCE(SUM(${poLineItems.quantity}), 0) AS TEXT)`,
          })
          .from(poLineItems)
          .innerJoin(purchaseOrders, eq(poLineItems.purchaseOrderId, purchaseOrders.id))
          .where(
            and(
              sql`${poLineItems.skuId} IN (${sql.join(skuIds.map((id) => sql`${id}`), sql`, `)})`,
              ne(purchaseOrders.status, "received"),
              ne(purchaseOrders.status, "cancelled")
            )
          )
          .groupBy(poLineItems.skuId, purchaseOrders.status);

        // Build PO pipeline map per SKU
        const poPipelineMap = new Map<
          number,
          { inTransit: number; onOrder: number; inProduction: number }
        >();
        for (const row of poData) {
          const existing = poPipelineMap.get(row.skuId) ?? {
            inTransit: 0,
            onOrder: 0,
            inProduction: 0,
          };
          const qty = Number(row.quantity);
          const status = row.poStatus.toLowerCase();
          if (status === "shipped" || status === "in_transit" || status === "in transit") {
            existing.inTransit += qty;
          } else if (status === "confirmed" || status === "processing") {
            existing.onOrder += qty;
          } else if (status === "production" || status === "pending" || status === "draft") {
            existing.inProduction += qty;
          }
          poPipelineMap.set(row.skuId, existing);
        }

        // Get forecast data for each month
        const forecastData = await db
          .select({
            skuId: forecasts.skuId,
            month: forecasts.month,
            units: sql<string>`CAST(COALESCE(SUM(${forecasts.forecastedUnits}), 0) AS TEXT)`,
          })
          .from(forecasts)
          .where(
            and(
              sql`${forecasts.skuId} IN (${sql.join(skuIds.map((id) => sql`${id}`), sql`, `)})`,
              gte(forecasts.month, currentMonth),
              lte(forecasts.month, targetMonthEnd)
            )
          )
          .groupBy(forecasts.skuId, forecasts.month);

        const forecastMap = new Map<string, number>();
        for (const row of forecastData) {
          const key = `${row.skuId}-${format(row.month, "yyyy-MM")}`;
          forecastMap.set(key, Number(row.units));
        }

        // Process each month
        for (let i = 0; i < input.months; i++) {
          const monthStart = startOfMonth(subMonths(currentMonth, -i));
          const monthKey = format(monthStart, "yyyy-MM");

          const target = allTargets.find(
            (t) =>
              t.brandId === brand.id &&
              format(t.month, "yyyy-MM") === monthKey
          );
          const revenueTarget = target ? Number(target.revenueTarget) : 0;

          // Channel targets for threshold
          const brandChannelTargets = channelTargets.filter(
            (ct) =>
              ct.brandId === brand.id &&
              format(ct.month, "yyyy-MM") === monthKey
          );
          const amazonTarget = Number(
            brandChannelTargets.find((ct) => ct.channel === "amazon")?.revenueTarget ?? 0
          );
          const retailTarget = Number(
            brandChannelTargets.find((ct) => ct.channel === "retail")?.revenueTarget ?? 0
          );

          // Calculate blended channel threshold
          let channelThreshold = CHANNEL_THRESHOLDS.default;
          if (revenueTarget > 0) {
            const amazonPct = amazonTarget / revenueTarget;
            const retailPct = retailTarget / revenueTarget;
            // Assume retail is primarily off-price for Petra
            channelThreshold =
              retailPct * CHANNEL_THRESHOLDS.off_price +
              amazonPct * CHANNEL_THRESHOLDS.amazon +
              Math.max(0, 1 - amazonPct - retailPct) * CHANNEL_THRESHOLDS.default;
          }

          // Revenue actual from retail_sales
          const [salesResult] = await db
            .select({
              totalRevenue: sql<string>`CAST(COALESCE(SUM(${retailSales.revenue}), 0) AS TEXT)`,
              totalUnits: sql<string>`CAST(COALESCE(SUM(${retailSales.unitsSold}), 0) AS TEXT)`,
            })
            .from(retailSales)
            .innerJoin(skus, eq(retailSales.skuId, skus.id))
            .where(
              and(eq(skus.brandId, brand.id), eq(retailSales.month, monthStart))
            );

          const revenueActual = Number(salesResult?.totalRevenue ?? 0);
          const progressPct =
            revenueTarget > 0
              ? Math.round((revenueActual / revenueTarget) * 100)
              : 0;

          // LAYER 1-3: SKU-level analysis
          const skuAnalysis: Array<{
            skuId: number;
            sku: string;
            name: string;
            velocityTier: VelocityTier;
            velocityWeight: number;
            rawOnHand: number;
            rawInTransit: number;
            rawOnOrder: number;
            rawInProduction: number;
            rawTotalUnits: number;
            reliableSupply: number;
            effectiveSupply: number;
            forecastedDemand: number;
            wholesalePrice: number;
            rawValue: number;
            revenuePotential: number;
          }> = [];

          for (const sku of brandSkus) {
            const sales = skuSalesMap.get(sku.id);
            const inv = invMap.get(sku.id);
            const poPipeline = poPipelineMap.get(sku.id);
            const wholesalePrice = Number(sku.unitPrice ?? 0);

            // Velocity classification
            const tier = classifyVelocity(
              sales?.lastSaleDate ?? null,
              sales?.unitsSold90d ?? 0,
              sales?.unitsSold30d ?? 0,
              top20Set.has(sku.id),
              sku.createdAt,
              today
            );
            const velocityWeight = VELOCITY_WEIGHTS[tier];

            // Pipeline quantities
            const onHand = Math.max(0, (inv?.onHand ?? 0) - (inv?.allocated ?? 0));
            const invInTransit = inv?.inTransit ?? 0;
            const poInTransit = poPipeline?.inTransit ?? 0;
            const totalInTransit = invInTransit + poInTransit;
            const onOrder = poPipeline?.onOrder ?? 0;
            const inProduction = poPipeline?.inProduction ?? 0;
            const rawTotalUnits = onHand + totalInTransit + onOrder + inProduction;

            // LAYER 2: Pipeline reliability
            const reliableSupply =
              onHand * PIPELINE_WEIGHTS.onHand +
              totalInTransit * PIPELINE_WEIGHTS.inTransit +
              onOrder * PIPELINE_WEIGHTS.onOrder +
              inProduction * PIPELINE_WEIGHTS.inProduction;

            // LAYER 3: Effective supply (velocity + reliability)
            const effectiveSupply = reliableSupply * velocityWeight;

            // Forecasted demand (from forecasts or trailing avg)
            const forecastKey = `${sku.id}-${monthKey}`;
            let forecastedDemand = forecastMap.get(forecastKey) ?? 0;
            if (forecastedDemand === 0 && sales) {
              // Fallback: average of trailing 3 months
              forecastedDemand = Math.round(sales.unitsSold90d / 3);
            }

            // Revenue potential: capped at demand
            const cappedUnits = Math.min(effectiveSupply, forecastedDemand);
            const revenuePotential = cappedUnits * wholesalePrice;
            const rawValue = rawTotalUnits * wholesalePrice;

            skuAnalysis.push({
              skuId: sku.id,
              sku: sku.sku,
              name: sku.name,
              velocityTier: tier,
              velocityWeight,
              rawOnHand: onHand,
              rawInTransit: totalInTransit,
              rawOnOrder: onOrder,
              rawInProduction: inProduction,
              rawTotalUnits,
              reliableSupply,
              effectiveSupply,
              forecastedDemand,
              wholesalePrice,
              rawValue,
              revenuePotential,
            });
          }

          // Aggregate brand-level metrics
          const rawInventoryValue = skuAnalysis.reduce((s, a) => s + a.rawValue, 0);
          const effectiveRevenuePotential = skuAnalysis.reduce(
            (s, a) => s + a.revenuePotential,
            0
          );
          const rawOnHand = skuAnalysis.reduce((s, a) => s + a.rawOnHand, 0);
          const rawInTransit = skuAnalysis.reduce((s, a) => s + a.rawInTransit, 0);
          const rawOnOrder = skuAnalysis.reduce((s, a) => s + a.rawOnOrder, 0);
          const rawInProduction = skuAnalysis.reduce((s, a) => s + a.rawInProduction, 0);
          const rawTotalUnits = skuAnalysis.reduce((s, a) => s + a.rawTotalUnits, 0);

          // LAYER 4: Concentration risk
          const sortedByPotential = [...skuAnalysis].sort(
            (a, b) => b.revenuePotential - a.revenuePotential
          );
          const top3Potential = sortedByPotential
            .slice(0, 3)
            .reduce((s, a) => s + a.revenuePotential, 0);
          const top3Share =
            effectiveRevenuePotential > 0
              ? top3Potential / effectiveRevenuePotential
              : 0;
          let concentrationPenalty = 1.0;
          if (top3Share > 0.7) concentrationPenalty = 0.85;
          else if (top3Share > 0.5) concentrationPenalty = 0.92;

          // Final adjusted coverage
          const rawCoverage =
            revenueTarget > 0 ? rawInventoryValue / revenueTarget : 0;
          const adjustedCoverage =
            revenueTarget > 0
              ? (effectiveRevenuePotential / revenueTarget) * concentrationPenalty
              : 0;
          const inventoryQualityGap = rawInventoryValue - effectiveRevenuePotential;
          const qualityGapPct =
            rawInventoryValue > 0
              ? (inventoryQualityGap / rawInventoryValue) * 100
              : 0;
          const bufferNeeded = revenueTarget * channelThreshold;
          const bufferGap = bufferNeeded - effectiveRevenuePotential;

          // Status determination
          let status: "CONFIDENT" | "THIN" | "AT_RISK" | "SHORTFALL" | "NO_TARGET" =
            "NO_TARGET";
          if (revenueTarget === 0) {
            status = "NO_TARGET";
          } else if (adjustedCoverage >= 1.5) {
            status = "CONFIDENT";
          } else if (adjustedCoverage >= 1.0) {
            status = "THIN";
          } else if (adjustedCoverage >= 0.7) {
            status = "AT_RISK";
          } else {
            status = "SHORTFALL";
          }

          // Velocity breakdown
          const tierCounts: Record<VelocityTier, { count: number; value: number }> = {
            A: { count: 0, value: 0 },
            B: { count: 0, value: 0 },
            C: { count: 0, value: 0 },
            D: { count: 0, value: 0 },
            F: { count: 0, value: 0 },
            N: { count: 0, value: 0 },
          };
          for (const sa of skuAnalysis) {
            tierCounts[sa.velocityTier].count++;
            tierCounts[sa.velocityTier].value += sa.rawValue;
          }

          const velocityBreakdown = (
            Object.entries(tierCounts) as [VelocityTier, { count: number; value: number }][]
          ).map(([tier, data]) => ({
            tier,
            label: VELOCITY_LABELS[tier],
            skuCount: data.count,
            totalValue: formatCurrencyNum(data.value),
            pctOfRaw:
              rawInventoryValue > 0
                ? Math.round((data.value / rawInventoryValue) * 100)
                : 0,
          }));

          // Top 3 SKU concentration detail
          const top3Skus = sortedByPotential.slice(0, 3).map((s) => ({
            sku: s.sku,
            name: s.name,
            potential: formatCurrencyNum(s.revenuePotential),
            pctOfTotal:
              effectiveRevenuePotential > 0
                ? Math.round(
                    (s.revenuePotential / effectiveRevenuePotential) * 100
                  )
                : 0,
          }));

          // Top gap SKUs (fast/steady movers with worst coverage)
          const gapSkus = skuAnalysis
            .filter(
              (s) =>
                (s.velocityTier === "A" || s.velocityTier === "B") &&
                s.forecastedDemand > 0
            )
            .map((s) => ({
              sku: s.sku,
              name: s.name,
              velocityTier: s.velocityTier,
              effectiveSupply: Math.round(s.effectiveSupply),
              forecastedDemand: s.forecastedDemand,
              coverageRatio:
                s.forecastedDemand > 0
                  ? Math.round((s.effectiveSupply / s.forecastedDemand) * 100) /
                    100
                  : 0,
              unitsNeeded: Math.max(
                0,
                s.forecastedDemand - Math.round(s.effectiveSupply)
              ),
              revenueAtRisk: formatCurrencyNum(
                Math.max(0, s.forecastedDemand - Math.round(s.effectiveSupply)) *
                  s.wholesalePrice
              ),
            }))
            .sort((a, b) => a.coverageRatio - b.coverageRatio)
            .slice(0, 5);

          results.push({
            brandId: brand.id,
            brandName: brand.name,
            month: monthStart,
            monthLabel: format(monthStart, "MMM yyyy"),
            revenueTarget: formatCurrencyNum(revenueTarget),
            revenueActual: formatCurrencyNum(revenueActual),
            progressPct,
            rawOnHand,
            rawInTransit,
            rawOnOrder,
            rawInProduction,
            rawTotalUnits,
            rawInventoryValue: formatCurrencyNum(rawInventoryValue),
            rawCoverage: Math.round(rawCoverage * 100) / 100,
            effectiveRevenuePotential: formatCurrencyNum(effectiveRevenuePotential),
            adjustedCoverage: Math.round(adjustedCoverage * 100) / 100,
            concentrationPenalty,
            inventoryQualityGap: formatCurrencyNum(inventoryQualityGap),
            qualityGapPct: Math.round(qualityGapPct),
            channelThreshold: Math.round(channelThreshold * 100) / 100,
            bufferNeeded: formatCurrencyNum(bufferNeeded),
            bufferGap: formatCurrencyNum(bufferGap),
            velocityBreakdown,
            totalSkus: brandSkus.length,
            skusByTier: {
              A: tierCounts.A.count,
              B: tierCounts.B.count,
              C: tierCounts.C.count,
              D: tierCounts.D.count,
              F: tierCounts.F.count,
              N: tierCounts.N.count,
            },
            deadStockValue: formatCurrencyNum(tierCounts.F.value),
            staleStockValue: formatCurrencyNum(tierCounts.D.value),
            top3Share: Math.round(top3Share * 100),
            top3Skus,
            topGapSkus: gapSkus,
            status,
          });
        }
      }

      return results;
    }),

  // ==========================================================================
  // KPI STRIP
  // ==========================================================================
  kpiStrip: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db;

    // Use latest month with actual sales data (not necessarily current calendar month)
    const [latestMonthRow] = await db
      .select({ month: sql<Date>`MAX(${retailSales.month})` })
      .from(retailSales);
    const latestMonth = latestMonthRow?.month
      ? startOfMonth(new Date(latestMonthRow.month))
      : startOfMonth(new Date());
    const prevMonth = startOfMonth(subMonths(latestMonth, 1));

    const [currentRev] = await db
      .select({
        revenue: sql<string>`CAST(COALESCE(SUM(${retailSales.revenue}), 0) AS TEXT)`,
        units: sql<string>`CAST(COALESCE(SUM(${retailSales.unitsSold}), 0) AS TEXT)`,
      })
      .from(retailSales)
      .where(eq(retailSales.month, latestMonth));

    const [lastRev] = await db
      .select({
        revenue: sql<string>`CAST(COALESCE(SUM(${retailSales.revenue}), 0) AS TEXT)`,
      })
      .from(retailSales)
      .where(eq(retailSales.month, prevMonth));

    // SKUs at risk: only count SKUs that have recent sales (last 6 months) AND low stock
    const sixMonthsAgo = startOfMonth(subMonths(latestMonth, 6));
    const [atRiskCount] = await db
      .select({
        count: sql<string>`CAST(COUNT(DISTINCT ${inventory.skuId}) AS TEXT)`,
      })
      .from(inventory)
      .innerJoin(
        retailSales,
        eq(inventory.skuId, retailSales.skuId)
      )
      .where(
        and(
          sql`${inventory.quantityOnHand} < 50`,
          gte(retailSales.month, sixMonthsAgo)
        )
      );

    const [poActive] = await db
      .select({
        count: sql<string>`CAST(COUNT(*) AS TEXT)`,
        value: sql<string>`CAST(COALESCE(SUM(${purchaseOrders.totalAmount}), 0) AS TEXT)`,
      })
      .from(purchaseOrders)
      .where(
        and(
          ne(purchaseOrders.status, "received"),
          ne(purchaseOrders.status, "cancelled"),
          ne(purchaseOrders.status, "draft")
        )
      );

    const revMTD = Number(currentRev?.revenue ?? 0);
    const revLast = Number(lastRev?.revenue ?? 0);

    return {
      revenueMTD: revMTD,
      revenueTrendPct:
        revLast > 0 ? Math.round(((revMTD - revLast) / revLast) * 100) : 0,
      unitsMTD: Number(currentRev?.units ?? 0),
      skusAtRisk: Number(atRiskCount?.count ?? 0),
      activePOs: Number(poActive?.count ?? 0),
      activePOValue: Number(poActive?.value ?? 0),
      dataMonth: format(latestMonth, "MMM yyyy"),
    };
  }),

  // ==========================================================================
  // BRAND HEALTH
  // ==========================================================================
  brandHealth: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db;

    // Use latest month with actual sales data
    const [latestMonthRow] = await db
      .select({ month: sql<Date>`MAX(${retailSales.month})` })
      .from(retailSales);
    const currentMonth = latestMonthRow?.month
      ? startOfMonth(new Date(latestMonthRow.month))
      : startOfMonth(new Date());
    const lastMonth = startOfMonth(subMonths(currentMonth, 1));

    const allBrands = await db.query.brands.findMany({
      where: eq(brands.active, true),
      orderBy: [asc(brands.name)],
    });

    const results = [];

    for (const brand of allBrands) {
      const [currentSales] = await db
        .select({
          revenue: sql<string>`CAST(COALESCE(SUM(${retailSales.revenue}), 0) AS TEXT)`,
          units: sql<string>`CAST(COALESCE(SUM(${retailSales.unitsSold}), 0) AS TEXT)`,
        })
        .from(retailSales)
        .innerJoin(skus, eq(retailSales.skuId, skus.id))
        .where(
          and(eq(skus.brandId, brand.id), eq(retailSales.month, currentMonth))
        );

      const [lastSales] = await db
        .select({
          revenue: sql<string>`CAST(COALESCE(SUM(${retailSales.revenue}), 0) AS TEXT)`,
        })
        .from(retailSales)
        .innerJoin(skus, eq(retailSales.skuId, skus.id))
        .where(
          and(eq(skus.brandId, brand.id), eq(retailSales.month, lastMonth))
        );

      const topRetailer = await db
        .select({
          retailerName: retailers.name,
          revenue: sql<string>`CAST(COALESCE(SUM(${retailSales.revenue}), 0) AS TEXT)`,
        })
        .from(retailSales)
        .innerJoin(skus, eq(retailSales.skuId, skus.id))
        .innerJoin(retailers, eq(retailSales.retailerId, retailers.id))
        .where(
          and(eq(skus.brandId, brand.id), eq(retailSales.month, currentMonth))
        )
        .groupBy(retailers.name)
        .orderBy(desc(sql`SUM(${retailSales.revenue})`))
        .limit(1);

      const topSku = await db
        .select({
          skuName: skus.name,
          sku: skus.sku,
          revenue: sql<string>`CAST(COALESCE(SUM(${retailSales.revenue}), 0) AS TEXT)`,
        })
        .from(retailSales)
        .innerJoin(skus, eq(retailSales.skuId, skus.id))
        .where(
          and(eq(skus.brandId, brand.id), eq(retailSales.month, currentMonth))
        )
        .groupBy(skus.name, skus.sku)
        .orderBy(desc(sql`SUM(${retailSales.revenue})`))
        .limit(1);

      const [invHealth] = await db
        .select({
          totalOnHand: sql<string>`CAST(COALESCE(SUM(${inventory.quantityOnHand}), 0) AS TEXT)`,
        })
        .from(inventory)
        .innerJoin(skus, eq(inventory.skuId, skus.id))
        .where(eq(skus.brandId, brand.id));

      const [activePOs] = await db
        .select({
          count: sql<string>`CAST(COUNT(*) AS TEXT)`,
        })
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.brandId, brand.id),
            ne(purchaseOrders.status, "received"),
            ne(purchaseOrders.status, "cancelled")
          )
        );

      const revenueCurrent = Number(currentSales?.revenue ?? 0);
      const revenueLast = Number(lastSales?.revenue ?? 0);
      const revenueTrend =
        revenueLast > 0
          ? Math.round(((revenueCurrent - revenueLast) / revenueLast) * 100)
          : 0;

      const onHand = Number(invHealth?.totalOnHand ?? 0);
      const unitsCurrent = Number(currentSales?.units ?? 0);
      const dailyVelocity = unitsCurrent / Math.max(new Date().getDate(), 1);
      const daysOfSupply =
        dailyVelocity > 0 ? Math.round(onHand / dailyVelocity) : 999;

      let inventorySignal:
        | "HEALTHY"
        | "WATCH"
        | "LOW"
        | "CRITICAL"
        | "OVERSTOCK" = "HEALTHY";
      if (daysOfSupply < 15) inventorySignal = "CRITICAL";
      else if (daysOfSupply < 30) inventorySignal = "LOW";
      else if (daysOfSupply < 45) inventorySignal = "WATCH";
      else if (daysOfSupply > 120) inventorySignal = "OVERSTOCK";

      results.push({
        brandId: brand.id,
        brandName: brand.name,
        revenueMTD: revenueCurrent,
        revenueTrendPct: revenueTrend,
        topRetailer: topRetailer[0]?.retailerName ?? "\u2014",
        topSku: topSku[0]?.skuName ?? "\u2014",
        daysOfSupply,
        inventorySignal,
        activePOCount: Number(activePOs?.count ?? 0),
      });
    }

    return results;
  }),

  // ==========================================================================
  // REVENUE TREND — Last 12 months by brand
  // ==========================================================================
  revenueTrend: protectedProcedure
    .input(z.object({ months: z.number().default(12) }))
    .query(async ({ ctx, input }) => {
      const db = ctx.db;

      // Anchor to latest month with data, not current calendar month
      const [latestRow] = await db
        .select({ month: sql<Date>`MAX(${retailSales.month})` })
        .from(retailSales);
      const endMonth = latestRow?.month
        ? startOfMonth(new Date(latestRow.month))
        : startOfMonth(new Date());
      const startMonth = startOfMonth(
        subMonths(endMonth, input.months - 1)
      );

      const results = await db
        .select({
          brandName: brands.name,
          month: retailSales.month,
          revenue: sql<string>`CAST(COALESCE(SUM(${retailSales.revenue}), 0) AS TEXT)`,
          units: sql<string>`CAST(COALESCE(SUM(${retailSales.unitsSold}), 0) AS TEXT)`,
        })
        .from(retailSales)
        .innerJoin(skus, eq(retailSales.skuId, skus.id))
        .innerJoin(brands, eq(skus.brandId, brands.id))
        .where(
          and(
            gte(retailSales.month, startMonth),
            lte(retailSales.month, endMonth)
          )
        )
        .groupBy(brands.name, retailSales.month)
        .orderBy(retailSales.month, brands.name);

      return results.map((r) => ({
        brandName: r.brandName,
        month: r.month,
        monthLabel: format(r.month, "MMM yy"),
        revenue: Number(r.revenue),
        units: Number(r.units),
      }));
    }),

  // ==========================================================================
  // RETAILER MIX — Revenue by retailer (used by executive page)
  // ==========================================================================
  retailerMix: protectedProcedure
    .input(z.object({ months: z.number().default(3) }))
    .query(async ({ ctx, input }) => {
      const db = ctx.db;

      // Anchor to latest month with data
      const [latestRow] = await db
        .select({ month: sql<Date>`MAX(${retailSales.month})` })
        .from(retailSales);
      const latestMonth = latestRow?.month
        ? startOfMonth(new Date(latestRow.month))
        : startOfMonth(new Date());
      const startMonth = startOfMonth(
        subMonths(latestMonth, input.months - 1)
      );

      const results = await db
        .select({
          retailerName: retailers.name,
          brandName: brands.name,
          revenue: sql<string>`CAST(COALESCE(SUM(${retailSales.revenue}), 0) AS TEXT)`,
          units: sql<string>`CAST(COALESCE(SUM(${retailSales.unitsSold}), 0) AS TEXT)`,
        })
        .from(retailSales)
        .innerJoin(skus, eq(retailSales.skuId, skus.id))
        .innerJoin(brands, eq(skus.brandId, brands.id))
        .innerJoin(retailers, eq(retailSales.retailerId, retailers.id))
        .where(gte(retailSales.month, startMonth))
        .groupBy(retailers.name, brands.name)
        .orderBy(desc(sql`SUM(${retailSales.revenue})`));

      return results.map((r) => ({
        retailerName: r.retailerName,
        brandName: r.brandName,
        revenue: Number(r.revenue),
        units: Number(r.units),
      }));
    }),

  // ==========================================================================
  // ACTION ITEMS
  // ==========================================================================
  actionItems: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db;
    const today = new Date();
    const items: Array<{
      type: "STOCKOUT_RISK" | "PO_ARRIVING" | "PO_LATE" | "COVERAGE_LOW";
      severity: "critical" | "warning" | "info";
      brandName: string;
      title: string;
      detail: string;
    }> = [];

    const allBrands = await db.query.brands.findMany({
      where: eq(brands.active, true),
    });

    for (const brand of allBrands) {
      const invData = await db
        .select({
          skuName: skus.name,
          sku: skus.sku,
          onHand: inventory.quantityOnHand,
          inTransit: inventory.quantityInTransit,
        })
        .from(inventory)
        .innerJoin(skus, eq(inventory.skuId, skus.id))
        .where(eq(skus.brandId, brand.id));

      for (const inv of invData) {
        if ((inv.onHand ?? 0) < 50) {
          items.push({
            type: "STOCKOUT_RISK",
            severity: (inv.onHand ?? 0) < 10 ? "critical" : "warning",
            brandName: brand.name,
            title: `${inv.sku} critically low`,
            detail: `Only ${inv.onHand} units on hand. ${inv.inTransit ?? 0} in transit.`,
          });
        }
      }

      const arrivingPOs = await db
        .select({
          poNumber: purchaseOrders.poNumber,
          expectedArrival: purchaseOrders.expectedArrival,
          status: purchaseOrders.status,
        })
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.brandId, brand.id),
            ne(purchaseOrders.status, "received"),
            ne(purchaseOrders.status, "cancelled"),
            lte(purchaseOrders.expectedArrival, addDays(today, 7))
          )
        );

      for (const po of arrivingPOs) {
        if (po.expectedArrival && po.expectedArrival < today) {
          items.push({
            type: "PO_LATE",
            severity: "critical",
            brandName: brand.name,
            title: `PO ${po.poNumber} is late`,
            detail: `Expected ${format(po.expectedArrival, "MMM d")}. ${differenceInDays(today, po.expectedArrival)} days overdue.`,
          });
        } else if (po.expectedArrival) {
          items.push({
            type: "PO_ARRIVING",
            severity: "info",
            brandName: brand.name,
            title: `PO ${po.poNumber} arriving soon`,
            detail: `Expected ${format(po.expectedArrival, "MMM d")} (${differenceInDays(po.expectedArrival, today)} days).`,
          });
        }
      }
    }

    const severityOrder = { critical: 0, warning: 1, info: 2 };
    items.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );

    return items;
  }),

  // ==========================================================================
  // TARGET CRUD
  // ==========================================================================
  targets: router({
    list: protectedProcedure
      .input(z.object({ brandId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const conditions = [];
        if (input.brandId)
          conditions.push(eq(revenueTargets.brandId, input.brandId));

        return await ctx.db
          .select({
            id: revenueTargets.id,
            brandId: revenueTargets.brandId,
            brandName: brands.name,
            month: revenueTargets.month,
            revenueTarget: revenueTargets.revenueTarget,
            channel: revenueTargets.channel,
          })
          .from(revenueTargets)
          .innerJoin(brands, eq(revenueTargets.brandId, brands.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(revenueTargets.month, brands.name, revenueTargets.channel);
      }),

    upsert: protectedProcedure
      .input(
        z.object({
          brandId: z.number(),
          month: z.date(),
          revenueTarget: z.string(),
          channel: z.string().default("all"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const [result] = await ctx.db
          .insert(revenueTargets)
          .values({
            brandId: input.brandId,
            month: input.month,
            revenueTarget: input.revenueTarget,
            channel: input.channel,
          })
          .onConflictDoUpdate({
            target: [
              revenueTargets.brandId,
              revenueTargets.month,
              revenueTargets.channel,
            ],
            set: {
              revenueTarget: input.revenueTarget,
              updatedAt: new Date(),
            },
          })
          .returning();

        return result;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .delete(revenueTargets)
          .where(eq(revenueTargets.id, input.id));
        return { success: true };
      }),
  }),
});
