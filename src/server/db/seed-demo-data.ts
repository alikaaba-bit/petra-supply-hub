import { db } from "./index";
import {
  brands,
  skus,
  retailers,
  forecasts,
  inventory,
  purchaseOrders,
  poLineItems,
  retailOrders,
  retailOrderLineItems,
  retailSales,
  payments,
} from "./schema";
import { sql } from "drizzle-orm";

/**
 * Seeds realistic demo data for Petra Supply Hub.
 * Run after the main seed (which creates users, brands, SKUs, retailers).
 *
 * Generates: forecasts, inventory, purchase orders, retail orders, retail sales, payments
 */
async function seedDemoData() {
  console.log("📦 Seeding demo transactional data...\n");

  // Load existing master data
  const allBrands = await db.select().from(brands);
  const allSkus = await db.select().from(skus);
  const allRetailers = await db.select().from(retailers);

  console.log(`Found: ${allBrands.length} brands, ${allSkus.length} SKUs, ${allRetailers.length} retailers\n`);

  const brandMap = Object.fromEntries(allBrands.map((b) => [b.name, b]));
  const skusByBrand = Object.fromEntries(
    allBrands.map((b) => [b.id, allSkus.filter((s) => s.brandId === b.id)])
  );

  // Key retailers per brand (realistic mappings)
  const brandRetailerMap: Record<string, string[]> = {
    Fomin: ["TJX-TJM", "TJX-MAR", "TJX-HG", "KROGER", "CVS", "MEIJER"],
    "Luna Naturals": ["TJX-TJM", "TJX-HG", "TGT-ONL", "WFM", "CVS"],
    EveryMood: ["TJX-TJM", "TJX-MAR", "FIVE", "OLLIES", "BURL"],
    Roofus: ["TJX-TJM", "FIVE", "BURL", "BEALLS", "ROSS"],
    "House of Party": ["BN", "FIVE", "TJX-HG", "TJX-HS", "MEIJER"],
  };

  const retailerByCode = Object.fromEntries(allRetailers.map((r) => [r.code, r]));

  // Helper: random int in range
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  // Months: Jan 2026 through Jun 2026
  const months = [
    new Date("2026-01-01"),
    new Date("2026-02-01"),
    new Date("2026-03-01"),
    new Date("2026-04-01"),
    new Date("2026-05-01"),
    new Date("2026-06-01"),
  ];

  // =========================================================================
  // 1. FORECASTS — demand forecasts per SKU per retailer per month
  // =========================================================================
  console.log("Creating forecasts...");
  let forecastCount = 0;

  for (const [brandName, retailerCodes] of Object.entries(brandRetailerMap)) {
    const brand = brandMap[brandName];
    const brandSkus = skusByBrand[brand.id];
    // Pick top 6 SKUs per brand for forecasts (not all 158)
    const topSkus = brandSkus.slice(0, Math.min(6, brandSkus.length));

    for (const sku of topSkus) {
      for (const code of retailerCodes) {
        const retailer = retailerByCode[code];
        if (!retailer) continue;

        // Base demand varies by brand size
        const baseDemand =
          brandName === "Fomin" ? rand(800, 2000) :
          brandName === "House of Party" ? rand(300, 800) :
          rand(400, 1200);

        for (const month of months) {
          // Seasonal variation: spring/summer higher for Luna (mosquito repellent)
          const monthIdx = month.getMonth();
          let seasonal = 1.0;
          if (brandName === "Luna Naturals" && monthIdx >= 3 && monthIdx <= 5) seasonal = 1.6;
          if (brandName === "House of Party" && monthIdx >= 3 && monthIdx <= 4) seasonal = 1.3;

          const forecastedUnits = Math.round(baseDemand * seasonal * (0.8 + Math.random() * 0.4));
          // Ordered units: past months ~90-100% of forecast, future months ~60-80%
          const isPast = month < new Date("2026-02-01");
          const orderedPct = isPast ? 0.85 + Math.random() * 0.15 : 0.5 + Math.random() * 0.3;
          const orderedUnits = Math.round(forecastedUnits * orderedPct);

          await db.insert(forecasts).values({
            skuId: sku.id,
            retailerId: retailer.id,
            month,
            forecastedUnits,
            orderedUnits,
            source: "seed",
            createdBy: "ceo-kaaba",
          });
          forecastCount++;
        }
      }
    }
  }
  console.log(`✓ ${forecastCount} forecast records created`);

  // =========================================================================
  // 2. INVENTORY — current stock levels for all SKUs
  // =========================================================================
  console.log("Creating inventory...");

  for (const sku of allSkus) {
    const brand = allBrands.find((b) => b.id === sku.brandId);
    // Fomin has more inventory (higher volume)
    const onHand = brand?.name === "Fomin" ? rand(500, 3000) :
                   brand?.name === "House of Party" ? rand(200, 1500) :
                   rand(100, 2000);
    const allocated = Math.round(onHand * (0.1 + Math.random() * 0.3));
    const inTransit = rand(0, 1) ? rand(200, 1500) : 0; // ~50% have items in transit

    await db.insert(inventory).values({
      skuId: sku.id,
      quantityOnHand: onHand,
      quantityAllocated: allocated,
      quantityInTransit: inTransit,
      source: "seed",
      updatedBy: "ceo-kaaba",
    });
  }
  console.log(`✓ ${allSkus.length} inventory records created`);

  // =========================================================================
  // 3. PURCHASE ORDERS — supplier POs to China
  // =========================================================================
  console.log("Creating purchase orders...");

  const poStatuses = ["draft", "confirmed", "in_production", "shipped", "in_transit", "arrived", "allocated"];
  const suppliers: Record<string, string> = {
    Fomin: "Shenzhen GreenTech Manufacturing",
    "Luna Naturals": "Guangzhou Wellness Products Co.",
    EveryMood: "Yiwu Fragrance & Wellness Ltd.",
    Roofus: "Dongguan Pet Products Factory",
    "House of Party": "Ningbo Creative Party Supplies",
  };

  let poCount = 0;
  const createdPOs: Array<{ id: number; brandId: number; totalAmount: string }> = [];

  for (const [brandName, supplier] of Object.entries(suppliers)) {
    const brand = brandMap[brandName];
    const brandSkus = skusByBrand[brand.id];

    // 3-5 POs per brand at various stages
    const numPOs = rand(3, 5);
    for (let p = 0; p < numPOs; p++) {
      const status = poStatuses[rand(0, poStatuses.length - 1)];
      const orderDate = new Date(`2026-0${rand(1, 2)}-${String(rand(1, 28)).padStart(2, "0")}`);
      const leadDays = brand.leadTimeDays;
      const expectedArrival = new Date(orderDate.getTime() + leadDays * 86400000);
      const arrived = ["arrived", "allocated"].includes(status);
      const actualArrival = arrived ? new Date(expectedArrival.getTime() + rand(-3, 5) * 86400000) : null;

      // Pick 2-4 SKUs for this PO
      const poSkuCount = Math.min(rand(2, 4), brandSkus.length);
      const shuffled = [...brandSkus].sort(() => Math.random() - 0.5);
      const selectedSkus = shuffled.slice(0, poSkuCount);

      let totalAmount = 0;
      const lineItemsData: Array<{ skuId: number; quantity: number; unitCost: string; totalCost: string }> = [];

      for (const sku of selectedSkus) {
        const qty = rand(500, 5000);
        const cost = parseFloat(sku.unitCost || "3.00");
        const lineCost = qty * cost;
        totalAmount += lineCost;
        lineItemsData.push({
          skuId: sku.id,
          quantity: qty,
          unitCost: cost.toFixed(2),
          totalCost: lineCost.toFixed(2),
        });
      }

      const depositAmt = totalAmount * 0.3;
      const depositPaid = status !== "draft";

      const [po] = await db
        .insert(purchaseOrders)
        .values({
          poNumber: `PO-${brandName.substring(0, 3).toUpperCase()}-2026-${String(poCount + 1).padStart(3, "0")}`,
          brandId: brand.id,
          supplier,
          status,
          orderDate,
          expectedArrival,
          actualArrival,
          totalAmount: totalAmount.toFixed(2),
          currency: "USD",
          depositAmount: depositAmt.toFixed(2),
          depositPaid,
          notes: `${brandName} Q1 2026 order batch ${p + 1}`,
          createdBy: "ceo-kaaba",
        })
        .returning();

      createdPOs.push({ id: po.id, brandId: brand.id, totalAmount: totalAmount.toFixed(2) });

      // Insert line items
      for (const item of lineItemsData) {
        await db.insert(poLineItems).values({
          purchaseOrderId: po.id,
          ...item,
        });
      }

      poCount++;
    }
  }
  console.log(`✓ ${poCount} purchase orders with line items created`);

  // =========================================================================
  // 4. RETAIL ORDERS — incoming POs from retailers
  // =========================================================================
  console.log("Creating retail orders...");

  const retailStatuses = ["received", "processing", "picking", "shipped", "delivered"];
  let roCount = 0;
  const createdROs: Array<{ id: number; retailerId: number; totalAmount: string }> = [];

  for (const [brandName, retailerCodes] of Object.entries(brandRetailerMap)) {
    const brand = brandMap[brandName];
    const brandSkus = skusByBrand[brand.id];

    for (const code of retailerCodes.slice(0, 3)) {
      const retailer = retailerByCode[code];
      if (!retailer) continue;

      // 1-2 orders per retailer
      const numOrders = rand(1, 2);
      for (let o = 0; o < numOrders; o++) {
        const status = retailStatuses[rand(0, retailStatuses.length - 1)];
        const orderDate = new Date(`2026-0${rand(1, 2)}-${String(rand(1, 28)).padStart(2, "0")}`);
        const shipByDate = new Date(orderDate.getTime() + rand(7, 21) * 86400000);

        // 2-3 SKUs per retail order
        const roSkuCount = Math.min(rand(2, 3), brandSkus.length);
        const shuffled = [...brandSkus].sort(() => Math.random() - 0.5);
        const selectedSkus = shuffled.slice(0, roSkuCount);

        let totalAmount = 0;
        const lineItemsData: Array<{ skuId: number; quantity: number; unitPrice: string; totalPrice: string }> = [];

        for (const sku of selectedSkus) {
          const qty = rand(100, 2000);
          const price = parseFloat(sku.unitPrice || "8.00");
          const linePrice = qty * price;
          totalAmount += linePrice;
          lineItemsData.push({
            skuId: sku.id,
            quantity: qty,
            unitPrice: price.toFixed(2),
            totalPrice: linePrice.toFixed(2),
          });
        }

        const [ro] = await db
          .insert(retailOrders)
          .values({
            retailerId: retailer.id,
            retailerPoNumber: `${code}-${rand(100000, 999999)}`,
            brandId: brand.id,
            status,
            orderDate,
            shipByDate,
            totalAmount: totalAmount.toFixed(2),
            notes: `${retailer.name} order for ${brandName}`,
            createdBy: "ceo-kaaba",
          })
          .returning();

        createdROs.push({ id: ro.id, retailerId: retailer.id, totalAmount: totalAmount.toFixed(2) });

        for (const item of lineItemsData) {
          await db.insert(retailOrderLineItems).values({
            retailOrderId: ro.id,
            ...item,
          });
        }

        roCount++;
      }
    }
  }
  console.log(`✓ ${roCount} retail orders with line items created`);

  // =========================================================================
  // 5. RETAIL SALES — historical sell-through data
  // =========================================================================
  console.log("Creating retail sales...");
  let salesCount = 0;

  for (const [brandName, retailerCodes] of Object.entries(brandRetailerMap)) {
    const brand = brandMap[brandName];
    const brandSkus = skusByBrand[brand.id];
    const topSkus = brandSkus.slice(0, Math.min(6, brandSkus.length));

    for (const sku of topSkus) {
      for (const code of retailerCodes) {
        const retailer = retailerByCode[code];
        if (!retailer) continue;

        // Sales for past month (Jan 2026) only
        const unitsSold = rand(50, 800);
        const price = parseFloat(sku.unitPrice || "8.00");
        const revenue = unitsSold * price;

        await db.insert(retailSales).values({
          skuId: sku.id,
          retailerId: retailer.id,
          month: new Date("2026-01-01"),
          unitsSold,
          revenue: revenue.toFixed(2),
          source: "seed",
          createdBy: "ceo-kaaba",
        });
        salesCount++;
      }
    }
  }
  console.log(`✓ ${salesCount} retail sales records created`);

  // =========================================================================
  // 6. PAYMENTS — deposits and payments for POs + receivables from retail orders
  // =========================================================================
  console.log("Creating payments...");
  let paymentCount = 0;

  // Supplier PO payments (outgoing)
  for (const po of createdPOs) {
    const total = parseFloat(po.totalAmount);
    const depositAmt = total * 0.3;

    // Deposit payment
    await db.insert(payments).values({
      purchaseOrderId: po.id,
      type: "deposit",
      amount: depositAmt.toFixed(2),
      currency: "USD",
      status: Math.random() > 0.3 ? "paid" : "pending",
      dueDate: new Date("2026-01-15"),
      paidDate: Math.random() > 0.3 ? new Date("2026-01-14") : null,
      notes: "30% deposit to supplier",
      createdBy: "ceo-kaaba",
    });
    paymentCount++;

    // Pre-shipment balance (70%)
    await db.insert(payments).values({
      purchaseOrderId: po.id,
      type: "pre_shipment",
      amount: (total - depositAmt).toFixed(2),
      currency: "USD",
      status: Math.random() > 0.6 ? "paid" : "pending",
      dueDate: new Date("2026-02-28"),
      paidDate: Math.random() > 0.6 ? new Date("2026-02-25") : null,
      notes: "70% pre-shipment balance",
      createdBy: "ceo-kaaba",
    });
    paymentCount++;
  }

  // Retail order receivables (incoming)
  for (const ro of createdROs) {
    await db.insert(payments).values({
      retailOrderId: ro.id,
      type: "invoice",
      amount: ro.totalAmount,
      currency: "USD",
      status: Math.random() > 0.5 ? "paid" : "pending",
      dueDate: new Date(`2026-0${rand(2, 3)}-${String(rand(1, 28)).padStart(2, "0")}`),
      paidDate: Math.random() > 0.5 ? new Date(`2026-02-${String(rand(1, 15)).padStart(2, "0")}`) : null,
      notes: "Retailer invoice",
      createdBy: "ceo-kaaba",
    });
    paymentCount++;
  }

  console.log(`✓ ${paymentCount} payment records created`);

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("\n🎉 Demo data seeded successfully!\n");
  console.log("Summary:");
  console.log(`- ${forecastCount} forecasts (6 months, multiple SKUs x retailers)`);
  console.log(`- ${allSkus.length} inventory records`);
  console.log(`- ${poCount} purchase orders with line items`);
  console.log(`- ${roCount} retail orders with line items`);
  console.log(`- ${salesCount} retail sales records`);
  console.log(`- ${paymentCount} payment records`);
  console.log("\nRefresh the dashboard to see the data!");
}

seedDemoData()
  .catch((err) => {
    console.error("❌ Demo seed failed:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
