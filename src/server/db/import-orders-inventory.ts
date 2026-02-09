/**
 * Import Orders & Warehouse Inventory from SellerCloud Excel Exports
 *
 * File 1: /Users/kaaba/Downloads/223812.xlsx — Warehouse Inventory
 * File 2: /Users/kaaba/Downloads/Orders_Export_223810.xlsx — Sales Orders
 *
 * Run with:
 *   DATABASE_URL=... npx tsx src/server/db/import-orders-inventory.ts
 */

import { db } from "./index";
import {
  skus,
  retailers,
  inventory,
  retailSales,
  brandRetailers,
} from "./schema";
import { eq, sql, and } from "drizzle-orm";
import * as ExcelJS from "exceljs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safely extract a cell's value as a trimmed string */
function cellStr(row: ExcelJS.Row, col: number): string {
  const cell = row.getCell(col);
  if (cell.value === null || cell.value === undefined) return "";
  // Handle rich text objects
  if (typeof cell.value === "object" && "richText" in (cell.value as object)) {
    const rt = cell.value as { richText: { text: string }[] };
    return rt.richText.map((r) => r.text).join("").trim();
  }
  return String(cell.value).trim();
}

/** Safely extract a cell's value as a number (0 for nulls/NaNs) */
function cellNum(row: ExcelJS.Row, col: number): number {
  const cell = row.getCell(col);
  if (cell.value === null || cell.value === undefined) return 0;
  const n = Number(cell.value);
  return isNaN(n) ? 0 : n;
}

/** Build a column-name-to-index map from the header row */
function buildHeaderMap(headerRow: ExcelJS.Row): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const name = String(cell.value ?? "").trim();
    if (name) map[name] = colNumber;
  });
  return map;
}

/**
 * Normalize a company name: trim whitespace, collapse internal whitespace.
 * Returns null for empty/blank names.
 */
function normalizeCompanyName(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.toLowerCase() === "null") return null;
  return trimmed;
}

/** Generate a retailer code from a name: uppercase, spaces to hyphens, max 50 chars */
function nameToCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50);
}

/** Parse a date value from Excel (could be a Date object or a string) */
function parseExcelDate(val: ExcelJS.CellValue): Date | null {
  if (val instanceof Date) return val;
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === "number") {
    // Excel serial date number
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Get first-of-month Date for a given date */
function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Format a date as YYYY-MM for use as a map key */
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// PART 1: Import Warehouse Inventory
// ---------------------------------------------------------------------------

async function importWarehouseInventory(
  skuMap: Map<string, { id: number; brandId: number }>
) {
  console.log("=== PART 1: Warehouse Inventory Import ===");
  console.log("");

  const filePath = "/Users/kaaba/Downloads/223812.xlsx";
  console.log(`[1.1] Reading ${filePath} ...`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    console.error("ERROR: No worksheet found in inventory file.");
    return;
  }

  const headerRow = sheet.getRow(1);
  const hmap = buildHeaderMap(headerRow);
  const totalRows = sheet.rowCount - 1; // exclude header

  console.log(`  Found ${totalRows} data rows, columns: ${Object.keys(hmap).join(", ")}`);

  // Validate required columns
  const requiredCols = ["ProductID", "Warehouse", "Qty"];
  for (const c of requiredCols) {
    if (hmap[c] === undefined) {
      console.error(`  ERROR: Required column "${c}" not found. Aborting inventory import.`);
      return;
    }
  }

  // Step 1: Aggregate USA Warehouse + FBA Warehouse quantities per ProductID
  console.log("[1.2] Aggregating USA Warehouse + FBA Warehouse quantities ...");

  const TARGET_WAREHOUSES = new Set(["USA Warehouse", "FBA Warehouse"]);
  const qtyByProduct = new Map<string, number>();

  let rowsRead = 0;
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const productId = cellStr(row, hmap["ProductID"]);
    const warehouse = cellStr(row, hmap["Warehouse"]);
    const qty = cellNum(row, hmap["Qty"]);

    if (!productId) return;

    if (TARGET_WAREHOUSES.has(warehouse)) {
      const current = qtyByProduct.get(productId) || 0;
      qtyByProduct.set(productId, current + qty);
    }

    rowsRead++;
    if (rowsRead % 5000 === 0) {
      console.log(`  Read ${rowsRead}/${totalRows} rows ...`);
    }
  });

  console.log(`  Read ${rowsRead} data rows`);
  console.log(`  Found ${qtyByProduct.size} unique products with USA/FBA warehouse inventory`);

  // Step 2: Update inventory for matching SKUs
  console.log("[1.3] Updating inventory records ...");

  let inventoryUpdated = 0;
  let inventoryCreated = 0;
  let skippedNoMatch = 0;
  let processed = 0;

  for (const [productId, totalQty] of Array.from(qtyByProduct.entries())) {
    const skuData = skuMap.get(productId);
    if (!skuData) {
      skippedNoMatch++;
      continue;
    }

    const qtyOnHand = Math.max(0, totalQty);

    // Upsert inventory
    const existingInv = await db.query.inventory.findFirst({
      where: eq(inventory.skuId, skuData.id),
    });

    if (existingInv) {
      await db
        .update(inventory)
        .set({
          quantityOnHand: qtyOnHand,
          lastUpdated: new Date(),
          source: "sellercloud-warehouse",
        })
        .where(eq(inventory.skuId, skuData.id));
      inventoryUpdated++;
    } else {
      await db.insert(inventory).values({
        skuId: skuData.id,
        quantityOnHand: qtyOnHand,
        quantityAllocated: 0,
        quantityInTransit: 0,
        lastUpdated: new Date(),
        source: "sellercloud-warehouse",
      });
      inventoryCreated++;
    }

    processed++;
    if (processed % 100 === 0) {
      console.log(`  Processed ${processed}/${qtyByProduct.size} products ...`);
    }
  }

  console.log("");
  console.log("=== Inventory Import Summary ===");
  console.log(`  Products with USA/FBA inventory: ${qtyByProduct.size}`);
  console.log(`  Inventory updated: ${inventoryUpdated}`);
  console.log(`  Inventory created: ${inventoryCreated}`);
  console.log(`  Skipped (no matching SKU): ${skippedNoMatch}`);
  console.log("");
}

// ---------------------------------------------------------------------------
// PART 2: Import Sales Orders
// ---------------------------------------------------------------------------

async function importSalesOrders(
  skuMap: Map<string, { id: number; brandId: number }>
) {
  console.log("=== PART 2: Sales Orders Import ===");
  console.log("");

  const filePath = "/Users/kaaba/Downloads/Orders_Export_223810.xlsx";
  console.log(`[2.1] Reading ${filePath} ...`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  // Find the "Orders" sheet
  const sheet =
    workbook.getWorksheet("Orders") || workbook.worksheets[0];
  if (!sheet) {
    console.error("ERROR: No worksheet found in orders file.");
    return;
  }

  const headerRow = sheet.getRow(1);
  const hmap = buildHeaderMap(headerRow);
  const totalRows = sheet.rowCount - 1;

  console.log(`  Found ${totalRows} data rows in sheet "${sheet.name}"`);
  console.log(`  Columns: ${Object.keys(hmap).join(", ")}`);

  // Validate required columns
  const requiredCols = [
    "OrderID",
    "TimeOfOrder",
    "StatusCode",
    "ProductID",
    "Qty",
    "LineTotal",
    "OrderSource",
  ];
  for (const c of requiredCols) {
    if (hmap[c] === undefined) {
      console.error(`  ERROR: Required column "${c}" not found. Aborting orders import.`);
      return;
    }
  }

  // ------------------------------------------------------------------
  // Step 1: Read all order rows and extract unique company names
  // ------------------------------------------------------------------
  console.log("[2.2] Reading all order rows ...");

  interface OrderRow {
    orderId: string;
    timeOfOrder: Date;
    statusCode: string;
    productId: string;
    qty: number;
    lineTotal: number;
    originalUnitPrice: number;
    orderSource: string;
    companyName: string;
  }

  const orderRows: OrderRow[] = [];
  const companySourceMap = new Map<string, string>(); // companyName -> orderSource
  let rowsRead = 0;

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const orderId = cellStr(row, hmap["OrderID"]);
    if (!orderId) return;

    const timeVal = row.getCell(hmap["TimeOfOrder"]).value;
    const timeOfOrder = parseExcelDate(timeVal);
    if (!timeOfOrder) return;

    const statusCode = cellStr(row, hmap["StatusCode"]);
    const productId = cellStr(row, hmap["ProductID"]);
    const qty = cellNum(row, hmap["Qty"]);
    const lineTotal = cellNum(row, hmap["LineTotal"]);
    const originalUnitPrice = hmap["OriginalUnitPrice"]
      ? cellNum(row, hmap["OriginalUnitPrice"])
      : 0;
    const orderSource = cellStr(row, hmap["OrderSource"]);

    // Use BusinessName if present, fall back to CompanyName
    let companyRaw = "";
    if (hmap["BusinessName"]) {
      companyRaw = cellStr(row, hmap["BusinessName"]);
    }
    if (!companyRaw && hmap["CompanyName"]) {
      companyRaw = cellStr(row, hmap["CompanyName"]);
    }

    const companyName = normalizeCompanyName(companyRaw);
    if (!companyName) return; // skip rows with no company

    orderRows.push({
      orderId,
      timeOfOrder,
      statusCode,
      productId,
      qty,
      lineTotal,
      originalUnitPrice,
      orderSource,
      companyName,
    });

    // Track which source each company belongs to (last seen wins, they should be consistent)
    if (!companySourceMap.has(companyName)) {
      companySourceMap.set(companyName, orderSource);
    }

    rowsRead++;
    if (rowsRead % 2000 === 0) {
      console.log(`  Read ${rowsRead} rows ...`);
    }
  });

  console.log(`  Read ${orderRows.length} valid order rows`);
  console.log(`  Unique companies: ${companySourceMap.size}`);

  // ------------------------------------------------------------------
  // Step 2: Upsert retailers from unique company names
  // ------------------------------------------------------------------
  console.log("[2.3] Upserting retailers ...");

  const retailerMap = new Map<string, number>(); // companyName -> retailerId
  let retailersCreated = 0;
  let retailersExisting = 0;

  for (const [companyName, orderSource] of Array.from(companySourceMap.entries())) {
    const code = nameToCode(companyName);
    const channel = orderSource || "Wholesale";

    // Check if retailer already exists by name
    let retailer = await db.query.retailers.findFirst({
      where: eq(retailers.name, companyName),
    });

    if (retailer) {
      retailerMap.set(companyName, retailer.id);
      retailersExisting++;
      continue;
    }

    // Check by code (in case name differs slightly but code matches)
    retailer = await db.query.retailers.findFirst({
      where: eq(retailers.code, code),
    });

    if (retailer) {
      retailerMap.set(companyName, retailer.id);
      retailersExisting++;
      continue;
    }

    // Create new retailer
    try {
      const [inserted] = await db
        .insert(retailers)
        .values({
          name: companyName,
          code,
          channel,
          active: true,
        })
        .returning();
      retailerMap.set(companyName, inserted.id);
      retailersCreated++;
    } catch (err) {
      // Handle potential race condition or unique constraint violation
      // by re-fetching
      const existing = await db.query.retailers.findFirst({
        where: eq(retailers.name, companyName),
      });
      if (existing) {
        retailerMap.set(companyName, existing.id);
        retailersExisting++;
      } else {
        console.error(`  Failed to create retailer "${companyName}":`, err);
      }
    }
  }

  console.log(`  Retailers created: ${retailersCreated}`);
  console.log(`  Retailers already existed: ${retailersExisting}`);

  // ------------------------------------------------------------------
  // Step 3: Delete existing synthetic retail sales (source = 'sellercloud')
  // ------------------------------------------------------------------
  console.log("[2.4] Deleting existing synthetic retail sales (source = 'sellercloud') ...");

  await db
    .delete(retailSales)
    .where(eq(retailSales.source, "sellercloud"));

  console.log("  Deleted existing sellercloud retail sales rows.");

  // ------------------------------------------------------------------
  // Step 4: Aggregate completed orders into monthly retail sales
  // ------------------------------------------------------------------
  console.log("[2.5] Aggregating completed orders into monthly retail sales ...");

  // Filter to completed orders only
  const completedOrders = orderRows.filter((r) => r.statusCode === "Completed");
  console.log(`  Completed orders: ${completedOrders.length} of ${orderRows.length} total`);

  // Build aggregation key: productId|companyName|YYYY-MM
  interface SalesAgg {
    productId: string;
    companyName: string;
    monthDate: Date;
    unitsSold: number;
    revenue: number;
  }

  const aggMap = new Map<string, SalesAgg>();

  for (const row of completedOrders) {
    const month = firstOfMonth(row.timeOfOrder);
    const key = `${row.productId}|${row.companyName}|${monthKey(row.timeOfOrder)}`;

    const existing = aggMap.get(key);
    if (existing) {
      existing.unitsSold += row.qty;
      existing.revenue += row.lineTotal;
    } else {
      aggMap.set(key, {
        productId: row.productId,
        companyName: row.companyName,
        monthDate: month,
        unitsSold: row.qty,
        revenue: row.lineTotal,
      });
    }
  }

  console.log(`  Aggregated into ${aggMap.size} monthly sales groups`);

  // Insert retail sales
  console.log("[2.6] Inserting retail sales ...");

  let salesInserted = 0;
  let salesSkippedNoSku = 0;
  let salesSkippedNoRetailer = 0;
  let processed = 0;

  for (const [, agg] of Array.from(aggMap.entries())) {
    const skuData = skuMap.get(agg.productId);
    if (!skuData) {
      salesSkippedNoSku++;
      continue;
    }

    const retailerId = retailerMap.get(agg.companyName);
    if (!retailerId) {
      salesSkippedNoRetailer++;
      continue;
    }

    const unitsSold = Math.max(0, agg.unitsSold);
    const revenue = Math.max(0, agg.revenue).toFixed(2);

    try {
      await db
        .insert(retailSales)
        .values({
          skuId: skuData.id,
          retailerId,
          month: agg.monthDate,
          unitsSold,
          revenue,
          source: "sellercloud-orders",
        })
        .onConflictDoUpdate({
          target: [retailSales.skuId, retailSales.retailerId, retailSales.month],
          set: {
            unitsSold: sql`EXCLUDED.units_sold`,
            revenue: sql`EXCLUDED.revenue`,
            source: sql`'sellercloud-orders'`,
            updatedAt: sql`NOW()`,
          },
        });
      salesInserted++;
    } catch (err) {
      // Fallback: try manual upsert
      try {
        const existing = await db.query.retailSales.findFirst({
          where: and(
            eq(retailSales.skuId, skuData.id),
            eq(retailSales.retailerId, retailerId),
            sql`month = ${agg.monthDate.toISOString().slice(0, 10)}`
          ),
        });
        if (existing) {
          await db
            .update(retailSales)
            .set({
              unitsSold,
              revenue,
              source: "sellercloud-orders",
              updatedAt: new Date(),
            })
            .where(eq(retailSales.id, existing.id));
        } else {
          await db.insert(retailSales).values({
            skuId: skuData.id,
            retailerId,
            month: agg.monthDate,
            unitsSold,
            revenue,
            source: "sellercloud-orders",
          });
        }
        salesInserted++;
      } catch (innerErr) {
        console.error(
          `  Failed to insert sales for SKU=${agg.productId}, retailer=${agg.companyName}, month=${monthKey(agg.monthDate)}:`,
          innerErr
        );
      }
    }

    processed++;
    if (processed % 100 === 0) {
      console.log(`  Inserted ${processed}/${aggMap.size} sales groups ...`);
    }
  }

  console.log(`  Sales inserted/updated: ${salesInserted}`);
  console.log(`  Skipped (no matching SKU): ${salesSkippedNoSku}`);
  console.log(`  Skipped (no matching retailer): ${salesSkippedNoRetailer}`);

  // ------------------------------------------------------------------
  // Step 5: Create brand-retailer mappings
  // ------------------------------------------------------------------
  console.log("[2.7] Creating brand-retailer mappings ...");

  // Collect unique brand+retailer pairs from the orders we just processed
  const brandRetailerPairs = new Set<string>();
  for (const [, agg] of Array.from(aggMap.entries())) {
    const skuData = skuMap.get(agg.productId);
    const retailerId = retailerMap.get(agg.companyName);
    if (skuData && retailerId) {
      brandRetailerPairs.add(`${skuData.brandId}|${retailerId}`);
    }
  }

  let brCreated = 0;
  let brExisting = 0;

  for (const pair of Array.from(brandRetailerPairs)) {
    const [brandIdStr, retailerIdStr] = pair.split("|");
    const brandId = Number(brandIdStr);
    const retailerId = Number(retailerIdStr);

    try {
      await db
        .insert(brandRetailers)
        .values({
          brandId,
          retailerId,
          active: true,
        })
        .onConflictDoNothing({
          target: [brandRetailers.brandId, brandRetailers.retailerId],
        });
      brCreated++;
    } catch {
      // Already exists (unique constraint)
      brExisting++;
    }
  }

  console.log(`  Brand-retailer mappings created: ${brCreated}`);
  console.log(`  Brand-retailer already existed: ${brExisting}`);

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------
  console.log("");
  console.log("=== Orders Import Summary ===");
  console.log(`  Total order rows read: ${orderRows.length}`);
  console.log(`  Completed orders: ${completedOrders.length}`);
  console.log(`  Unique companies: ${companySourceMap.size}`);
  console.log(`  Retailers created: ${retailersCreated}`);
  console.log(`  Monthly sales groups: ${aggMap.size}`);
  console.log(`  Sales inserted/updated: ${salesInserted}`);
  console.log(`  Sales skipped (no SKU): ${salesSkippedNoSku}`);
  console.log(`  Sales skipped (no retailer): ${salesSkippedNoRetailer}`);
  console.log(`  Brand-retailer mappings: ${brandRetailerPairs.size}`);
  console.log("");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("============================================================");
  console.log("  Petra Supply Hub — Orders & Inventory Import");
  console.log("============================================================");
  console.log("");

  // Load all existing SKUs into a lookup map: sku code -> { id, brandId }
  console.log("[0] Loading existing SKUs from database ...");
  const allSkus = await db.query.skus.findMany();
  const skuMap = new Map<string, { id: number; brandId: number }>();
  for (const s of allSkus) {
    skuMap.set(String(s.sku), { id: s.id as number, brandId: s.brandId as number });
  }
  console.log(`  Loaded ${skuMap.size} SKUs`);
  console.log("");

  // Part 1: Warehouse Inventory
  await importWarehouseInventory(skuMap);

  // Part 2: Sales Orders
  await importSalesOrders(skuMap);

  console.log("============================================================");
  console.log("  Import complete!");
  console.log("============================================================");
}

main()
  .catch((err: unknown) => {
    console.error("Import failed:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
