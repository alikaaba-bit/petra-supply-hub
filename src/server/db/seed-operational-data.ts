import { db } from "./index";
import {
  brands,
  skus,
  retailers,
  retailSales,
  inventory,
  revenueTargets,
  forecasts,
  purchaseOrders,
  poLineItems,
  retailOrders,
  retailOrderLineItems,
  users,
} from "./schema";
import { sql, eq, gte, gt, desc, asc } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return a random integer between min and max (inclusive). */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Return a random float between min and max. */
function randFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Build a Date for the first of a given year/month. */
function monthDate(year: number, month: number): Date {
  return new Date(year, month - 1, 1);
}

/** Format a Date as YYYY-MM for display. */
function fmtMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Return a random date between two dates. */
function randomDateBetween(start: Date, end: Date): Date {
  const s = start.getTime();
  const e = end.getTime();
  return new Date(s + Math.random() * (e - s));
}

/** Add days to a date. */
function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

// Batch size for bulk inserts
const BATCH = 100;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedOperationalData() {
  console.log("=== Seeding Operational Data ===\n");

  // ------------------------------------------------------------------
  // Fetch prerequisite data
  // ------------------------------------------------------------------

  // Admin user for createdBy fields
  const adminUser = await db.query.users.findFirst({
    where: eq(users.role, "ceo"),
  });
  const adminId = adminUser?.id ?? "ceo-kaaba";
  console.log(`Using admin user: ${adminId}`);

  // All brands
  const allBrands = await db.query.brands.findMany();
  console.log(`Found ${allBrands.length} brands`);

  // All retailers
  const allRetailers = await db.query.retailers.findMany();
  console.log(`Found ${allRetailers.length} retailers`);

  // All SKUs with brand info
  const allSkus = await db.query.skus.findMany();
  console.log(`Found ${allSkus.length} SKUs`);

  // Brand lookup by ID
  const brandById = new Map(allBrands.map((b) => [b.id, b]));

  // Retailer lookup by ID
  const retailerById = new Map(allRetailers.map((r) => [r.id, r]));

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based

  // ==================================================================
  // 1. REVENUE TARGETS
  // ==================================================================
  console.log("\n--- 1. Revenue Targets ---");

  const existingTargets = await db.select({ count: sql<number>`count(*)` }).from(revenueTargets);
  const targetCount = Number(existingTargets[0].count);

  if (targetCount > 0) {
    console.log(`Skipping: ${targetCount} revenue targets already exist.`);
  } else {
    // Query actual monthly revenue from retail_sales grouped by brand + month
    const actualRevenue = await db
      .select({
        brandId: skus.brandId,
        month: retailSales.month,
        totalRevenue: sql<string>`sum(${retailSales.revenue})`,
      })
      .from(retailSales)
      .innerJoin(skus, eq(retailSales.skuId, skus.id))
      .groupBy(skus.brandId, retailSales.month)
      .orderBy(skus.brandId, asc(retailSales.month));

    // Organize by brand -> month -> revenue
    const revenueByBrand = new Map<number, Map<string, number>>();
    for (const row of actualRevenue) {
      if (!revenueByBrand.has(row.brandId)) {
        revenueByBrand.set(row.brandId, new Map());
      }
      const monthKey = fmtMonth(new Date(row.month));
      revenueByBrand.get(row.brandId)!.set(monthKey, parseFloat(row.totalRevenue ?? "0"));
    }

    const targetRows: Array<{
      brandId: number;
      month: Date;
      revenueTarget: string;
      channel: string;
    }> = [];

    // Jan 2025 to Jun 2026 = 18 months
    const targetMonths: Array<{ year: number; month: number }> = [];
    for (let y = 2025, m = 1; !(y === 2026 && m > 6); m++) {
      if (m > 12) {
        m = 1;
        y++;
      }
      targetMonths.push({ year: y, month: m });
      if (y === 2026 && m === 6) break;
    }

    for (const brand of allBrands) {
      const monthRevMap = revenueByBrand.get(brand.id) ?? new Map<string, number>();

      // Collect all months with data, sorted chronologically
      const sortedDataMonths = Array.from(monthRevMap.entries())
        .sort(([a], [b]) => a.localeCompare(b));

      // Last 3 months of data for fallback average
      const last3Revenues = sortedDataMonths.slice(-3).map(([, rev]) => rev);
      const avgLast3 =
        last3Revenues.length > 0
          ? last3Revenues.reduce((a, b) => a + b, 0) / last3Revenues.length
          : 50000; // sensible default if no data at all

      for (const { year, month } of targetMonths) {
        const key = `${year}-${String(month).padStart(2, "0")}`;
        const actual = monthRevMap.get(key);
        let target: number;

        if (actual !== undefined && actual > 0) {
          target = actual * 1.15;
        } else {
          // Future or missing month: use average * 1.15
          target = avgLast3 * 1.15;
        }

        targetRows.push({
          brandId: brand.id,
          month: monthDate(year, month),
          revenueTarget: target.toFixed(2),
          channel: "all",
        });
      }
    }

    // Insert in batches
    let inserted = 0;
    for (let i = 0; i < targetRows.length; i += BATCH) {
      const batch = targetRows.slice(i, i + BATCH);
      await db.insert(revenueTargets).values(batch).onConflictDoNothing();
      inserted += batch.length;
    }

    console.log(`Inserted ${inserted} revenue target rows.`);
  }

  // ==================================================================
  // 2. FORECASTS
  // ==================================================================
  console.log("\n--- 2. Forecasts ---");

  const existingForecasts = await db.select({ count: sql<number>`count(*)` }).from(forecasts);
  const forecastCount = Number(existingForecasts[0].count);

  if (forecastCount > 0) {
    console.log(`Skipping: ${forecastCount} forecasts already exist.`);
  } else {
    // Find distinct SKU+retailer pairs with sales data
    const skuRetailerPairs = await db
      .selectDistinct({
        skuId: retailSales.skuId,
        retailerId: retailSales.retailerId,
      })
      .from(retailSales);

    console.log(`Found ${skuRetailerPairs.length} SKU-retailer pairs with sales data.`);

    // Determine latest month in sales data
    const latestSaleRow = await db
      .select({ maxMonth: sql<string>`max(${retailSales.month})` })
      .from(retailSales);
    const latestSaleDate = new Date(latestSaleRow[0].maxMonth);
    const latestYear = latestSaleDate.getFullYear();
    const latestMonth = latestSaleDate.getMonth() + 1;

    // Six months ago for averaging window
    const sixMonthsAgo = new Date(latestYear, latestMonth - 1 - 6, 1);

    // Fetch last 6 months of sales per SKU+retailer
    const recentSales = await db
      .select({
        skuId: retailSales.skuId,
        retailerId: retailSales.retailerId,
        unitsSold: retailSales.unitsSold,
      })
      .from(retailSales)
      .where(gte(retailSales.month, sixMonthsAgo));

    // Aggregate: (skuId-retailerId) -> total units over the period
    const salesAgg = new Map<string, { totalUnits: number; months: number }>();
    for (const row of recentSales) {
      const key = `${row.skuId}-${row.retailerId}`;
      const cur = salesAgg.get(key) ?? { totalUnits: 0, months: 0 };
      cur.totalUnits += row.unitsSold;
      cur.months += 1;
      salesAgg.set(key, cur);
    }

    // Next 3 months from the latest month in data
    const forecastMonths: Date[] = [];
    for (let i = 1; i <= 3; i++) {
      const fm = new Date(latestYear, latestMonth - 1 + i, 1);
      forecastMonths.push(fm);
    }

    const forecastRows: Array<{
      skuId: number;
      retailerId: number;
      month: Date;
      forecastedUnits: number;
      source: string;
      createdBy: string;
    }> = [];

    for (const pair of skuRetailerPairs) {
      const key = `${pair.skuId}-${pair.retailerId}`;
      const agg = salesAgg.get(key);

      // Average monthly units (default to small number if no recent data)
      const avgMonthly = agg && agg.months > 0 ? agg.totalUnits / agg.months : 10;

      for (const fm of forecastMonths) {
        // Apply +-20% randomness
        const jitter = 1 + randFloat(-0.2, 0.2);
        const forecastedUnits = Math.max(1, Math.round(avgMonthly * jitter));

        forecastRows.push({
          skuId: pair.skuId,
          retailerId: pair.retailerId,
          month: fm,
          forecastedUnits,
          source: "auto-generated",
          createdBy: adminId,
        });
      }
    }

    // Insert in batches
    let fInserted = 0;
    for (let i = 0; i < forecastRows.length; i += BATCH) {
      const batch = forecastRows.slice(i, i + BATCH);
      await db.insert(forecasts).values(batch).onConflictDoNothing();
      fInserted += batch.length;
    }

    console.log(`Inserted ${fInserted} forecast rows across ${forecastMonths.length} months.`);
  }

  // ==================================================================
  // 3. PURCHASE ORDERS + PO LINE ITEMS
  // ==================================================================
  console.log("\n--- 3. Purchase Orders ---");

  const existingPOs = await db.select({ count: sql<number>`count(*)` }).from(purchaseOrders);
  const poCount = Number(existingPOs[0].count);

  if (poCount > 0) {
    console.log(`Skipping: ${poCount} purchase orders already exist.`);
  } else {
    // ---- A) In-transit POs: inventory rows where quantityInTransit > 0 ----
    const inTransitInventory = await db
      .select({
        skuId: inventory.skuId,
        quantityInTransit: inventory.quantityInTransit,
      })
      .from(inventory)
      .where(gt(inventory.quantityInTransit, 0));

    console.log(`Found ${inTransitInventory.length} inventory rows with in-transit quantities.`);

    // Get unit costs from SKUs or COGS
    const skuCostMap = new Map<number, number>();
    for (const s of allSkus) {
      skuCostMap.set(s.id, parseFloat(s.unitCost ?? "5.00"));
    }

    // Also try COGS master for more accurate costs
    const cogsRows = await db.query.cogsMaster.findMany();
    for (const c of cogsRows) {
      skuCostMap.set(c.skuId, parseFloat(c.cogs));
    }

    // SKU -> brand mapping
    const skuBrandMap = new Map<number, number>();
    for (const s of allSkus) {
      skuBrandMap.set(s.id, s.brandId);
    }

    // Group in-transit inventory by brand
    const transitByBrand = new Map<number, Array<{ skuId: number; qty: number }>>();
    for (const row of inTransitInventory) {
      const brandId = skuBrandMap.get(row.skuId);
      if (!brandId) continue;
      if (!transitByBrand.has(brandId)) transitByBrand.set(brandId, []);
      transitByBrand.get(brandId)!.push({
        skuId: row.skuId,
        qty: row.quantityInTransit ?? 0,
      });
    }

    let poSeq = 1;
    let totalPOs = 0;
    let totalPOLineItems = 0;

    const currentMonthStr = `${currentYear}${String(currentMonth).padStart(2, "0")}`;

    for (const [brandId, items] of transitByBrand.entries()) {
      const brand = brandById.get(brandId);
      if (!brand) continue;

      // Generate PO number: PO-{BRAND_CODE}-{YYYYMM}-{SEQ}
      const brandCode = brand.name.toUpperCase().replace(/\s+/g, "").slice(0, 5);
      const poNumber = `PO-${brandCode}-${currentMonthStr}-${String(poSeq).padStart(3, "0")}`;
      poSeq++;

      // Random order date 30-60 days ago
      const orderDate = addDays(now, -randInt(30, 60));
      // Random expected arrival 15-45 days from now
      const expectedArrival = addDays(now, randInt(15, 45));

      // Calculate total
      let totalAmount = 0;
      for (const item of items) {
        const unitCost = skuCostMap.get(item.skuId) ?? 5.0;
        totalAmount += item.qty * unitCost;
      }

      const [insertedPO] = await db
        .insert(purchaseOrders)
        .values({
          poNumber,
          brandId,
          supplier: `${brand.name} Manufacturing`,
          status: "in_transit",
          orderDate,
          expectedArrival,
          totalAmount: totalAmount.toFixed(2),
          currency: "USD",
          depositAmount: (totalAmount * 0.3).toFixed(2),
          depositPaid: true,
          notes: "Auto-generated from in-transit inventory data",
          createdBy: adminId,
        })
        .returning();

      // Create line items
      for (const item of items) {
        const unitCost = skuCostMap.get(item.skuId) ?? 5.0;
        await db.insert(poLineItems).values({
          purchaseOrderId: insertedPO.id,
          skuId: item.skuId,
          quantity: item.qty,
          unitCost: unitCost.toFixed(2),
          totalCost: (item.qty * unitCost).toFixed(2),
        });
        totalPOLineItems++;
      }

      totalPOs++;
    }

    console.log(`Created ${totalPOs} in-transit POs with ${totalPOLineItems} line items.`);

    // ---- B) Arrived POs: inventory rows with recent receivedDate ----
    const recentArrivalCutoff = addDays(now, -90); // last 90 days
    const arrivedInventory = await db
      .select({
        skuId: inventory.skuId,
        quantityOnHand: inventory.quantityOnHand,
        receivedDate: inventory.receivedDate,
      })
      .from(inventory)
      .where(gte(inventory.receivedDate, recentArrivalCutoff));

    console.log(`Found ${arrivedInventory.length} recently received inventory rows.`);

    // Group arrived inventory by brand
    const arrivedByBrand = new Map<
      number,
      Array<{ skuId: number; qty: number; receivedDate: Date }>
    >();
    for (const row of arrivedInventory) {
      const brandId = skuBrandMap.get(row.skuId);
      if (!brandId) continue;
      if (!arrivedByBrand.has(brandId)) arrivedByBrand.set(brandId, []);
      arrivedByBrand.get(brandId)!.push({
        skuId: row.skuId,
        qty: row.quantityOnHand,
        receivedDate: row.receivedDate ?? now,
      });
    }

    let arrivedPOs = 0;
    let arrivedLineItems = 0;

    for (const [brandId, items] of arrivedByBrand.entries()) {
      const brand = brandById.get(brandId);
      if (!brand) continue;

      const brandCode = brand.name.toUpperCase().replace(/\s+/g, "").slice(0, 5);
      const poNumber = `PO-${brandCode}-${currentMonthStr}-${String(poSeq).padStart(3, "0")}`;
      poSeq++;

      // Find earliest received date in this group for the arrival date
      const earliestReceived = items.reduce(
        (min, i) => (i.receivedDate < min ? i.receivedDate : min),
        items[0].receivedDate
      );

      // Order date was before arrival
      const orderDate = addDays(earliestReceived, -randInt(30, 60));

      let totalAmount = 0;
      for (const item of items) {
        const unitCost = skuCostMap.get(item.skuId) ?? 5.0;
        totalAmount += item.qty * unitCost;
      }

      const [insertedPO] = await db
        .insert(purchaseOrders)
        .values({
          poNumber,
          brandId,
          supplier: `${brand.name} Manufacturing`,
          status: "arrived",
          orderDate,
          expectedArrival: addDays(earliestReceived, -randInt(0, 5)),
          actualArrival: earliestReceived,
          totalAmount: totalAmount.toFixed(2),
          currency: "USD",
          depositAmount: (totalAmount * 0.3).toFixed(2),
          depositPaid: true,
          notes: "Auto-generated from received inventory data",
          createdBy: adminId,
        })
        .returning();

      for (const item of items) {
        const unitCost = skuCostMap.get(item.skuId) ?? 5.0;
        await db.insert(poLineItems).values({
          purchaseOrderId: insertedPO.id,
          skuId: item.skuId,
          quantity: item.qty,
          unitCost: unitCost.toFixed(2),
          totalCost: (item.qty * unitCost).toFixed(2),
        });
        arrivedLineItems++;
      }

      arrivedPOs++;
    }

    console.log(`Created ${arrivedPOs} arrived POs with ${arrivedLineItems} line items.`);
    console.log(`Total POs: ${totalPOs + arrivedPOs}`);
  }

  // ==================================================================
  // 4. RETAIL ORDERS + LINE ITEMS
  // ==================================================================
  console.log("\n--- 4. Retail Orders ---");

  const existingROs = await db.select({ count: sql<number>`count(*)` }).from(retailOrders);
  const roCount = Number(existingROs[0].count);

  if (roCount > 0) {
    console.log(`Skipping: ${roCount} retail orders already exist.`);
  } else {
    // Find the latest 3 months with sales data
    const distinctMonths = await db
      .selectDistinct({ month: retailSales.month })
      .from(retailSales)
      .orderBy(desc(retailSales.month));

    const latest3Months = distinctMonths.slice(0, 3).map((r) => new Date(r.month));
    console.log(
      `Using most recent 3 sales months: ${latest3Months.map((d) => fmtMonth(d)).join(", ")}`
    );

    if (latest3Months.length === 0) {
      console.log("No sales data found -- skipping retail orders.");
    } else {
      // The "current" month for determining shipped vs received
      const currentMonthDate = monthDate(currentYear, currentMonth);

      // For each of the 3 months, query sales grouped by retailer + brand + SKU
      let roTotal = 0;
      let roLineTotal = 0;

      for (const salesMonth of latest3Months) {
        // Determine status
        const isCurrentMonth =
          salesMonth.getFullYear() === currentMonthDate.getFullYear() &&
          salesMonth.getMonth() === currentMonthDate.getMonth();
        const orderStatus = isCurrentMonth ? "received" : "shipped";

        // Get all sales for this month, joined to SKU for brand info
        const monthSales = await db
          .select({
            skuId: retailSales.skuId,
            retailerId: retailSales.retailerId,
            brandId: skus.brandId,
            unitsSold: retailSales.unitsSold,
            revenue: retailSales.revenue,
          })
          .from(retailSales)
          .innerJoin(skus, eq(retailSales.skuId, skus.id))
          .where(eq(retailSales.month, salesMonth));

        // Group by retailer + brand
        const orderGroups = new Map<
          string,
          {
            retailerId: number;
            brandId: number;
            totalRevenue: number;
            lines: Array<{ skuId: number; qty: number; revenue: number }>;
          }
        >();

        for (const row of monthSales) {
          const key = `${row.retailerId}-${row.brandId}`;
          if (!orderGroups.has(key)) {
            orderGroups.set(key, {
              retailerId: row.retailerId,
              brandId: row.brandId,
              totalRevenue: 0,
              lines: [],
            });
          }
          const group = orderGroups.get(key)!;
          const rev = parseFloat(row.revenue ?? "0");
          group.totalRevenue += rev;
          group.lines.push({
            skuId: row.skuId,
            qty: row.unitsSold,
            revenue: rev,
          });
        }

        const monthStr = fmtMonth(salesMonth).replace("-", "");

        // Lookup table for fallback unit prices
        const skuPriceMap = new Map<number, number>();
        for (const s of allSkus) {
          skuPriceMap.set(s.id, parseFloat(s.unitPrice ?? "9.99"));
        }

        for (const [, group] of orderGroups.entries()) {
          const retailer = retailerById.get(group.retailerId);
          if (!retailer) continue;

          const retailerCode = retailer.code;
          const retailerPoNumber = `RO-${retailerCode}-${monthStr}`;

          // Random order date within the sales month
          const monthStart = new Date(salesMonth);
          const monthEnd = new Date(
            salesMonth.getFullYear(),
            salesMonth.getMonth() + 1,
            0 // last day of month
          );
          const orderDate = randomDateBetween(monthStart, monthEnd);
          const shipByDate = addDays(orderDate, 14);

          const [insertedRO] = await db
            .insert(retailOrders)
            .values({
              retailerId: group.retailerId,
              brandId: group.brandId,
              retailerPoNumber,
              status: orderStatus,
              orderDate,
              shipByDate,
              totalAmount: group.totalRevenue.toFixed(2),
              notes: `Auto-generated from ${fmtMonth(salesMonth)} sales data`,
              createdBy: adminId,
            })
            .returning();

          // Create line items
          for (const line of group.lines) {
            const unitPrice =
              line.qty > 0
                ? line.revenue / line.qty
                : skuPriceMap.get(line.skuId) ?? 9.99;

            await db.insert(retailOrderLineItems).values({
              retailOrderId: insertedRO.id,
              skuId: line.skuId,
              quantity: line.qty,
              unitPrice: unitPrice.toFixed(2),
              totalPrice: line.revenue.toFixed(2),
            });
            roLineTotal++;
          }

          roTotal++;
        }

        console.log(
          `  Month ${fmtMonth(salesMonth)}: ${orderGroups.size} retail orders (status: ${orderStatus})`
        );
      }

      console.log(`Total retail orders: ${roTotal}, line items: ${roLineTotal}`);
    }
  }

  // ==================================================================
  // Summary
  // ==================================================================
  console.log("\n=== Operational Data Seed Complete ===");

  const [rt, fc, po, pli, ro, roli] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(revenueTargets),
    db.select({ count: sql<number>`count(*)` }).from(forecasts),
    db.select({ count: sql<number>`count(*)` }).from(purchaseOrders),
    db.select({ count: sql<number>`count(*)` }).from(poLineItems),
    db.select({ count: sql<number>`count(*)` }).from(retailOrders),
    db.select({ count: sql<number>`count(*)` }).from(retailOrderLineItems),
  ]);

  console.log("\nTable Row Counts:");
  console.log(`  revenue_targets:          ${rt[0].count}`);
  console.log(`  forecasts:                ${fc[0].count}`);
  console.log(`  purchase_orders:          ${po[0].count}`);
  console.log(`  po_line_items:            ${pli[0].count}`);
  console.log(`  retail_orders:            ${ro[0].count}`);
  console.log(`  retail_order_line_items:  ${roli[0].count}`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

seedOperationalData()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
