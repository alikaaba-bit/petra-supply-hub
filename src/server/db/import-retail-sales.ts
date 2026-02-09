/**
 * Import Retail Sales from "Sale Data" sheet in retail-sales.xlsx
 *
 * Reads: /tmp/retail-sales.xlsx (sheet: "Sale Data", ~5,883 rows)
 * Date range: Nov 2023 to Feb 2026
 * Brands: Fomin, House of Party, Roofus, Luna Naturals, EveryMood
 *
 * Steps:
 *   1. Delete existing retail sales from previous SellerCloud imports
 *   2. Create/update retailers from Wholesale Customer names
 *   3. Aggregate into monthly retail sales (grouped by SKU, retailer, month)
 *   4. Create brand-retailer mappings
 *
 * Run with:
 *   DATABASE_URL=... npx tsx src/server/db/import-retail-sales.ts
 */

import { db } from "./index";
import {
  retailers,
  retailSales,
  brandRetailers,
} from "./schema";
import { eq, sql, inArray } from "drizzle-orm";
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

/** Parse a date value from Excel (could be a Date object, string, or serial number) */
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

/** Generate a retailer code from a name: uppercase, replace spaces/special chars with hyphens, max 50 chars */
function nameToCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50);
}

/**
 * Normalize a company/retailer name: trim whitespace, collapse internal whitespace.
 * Returns null for empty/blank names.
 */
function normalizeName(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.toLowerCase() === "null") return null;
  return trimmed;
}

// ---------------------------------------------------------------------------
// Column indices (1-based, matching the Sale Data sheet layout)
// ---------------------------------------------------------------------------

// ExcelJS uses 1-based column indices
const COL_SHIP_DATE = 3; // Col C: Ship Date (datetime) — sales month
const COL_COMPANY = 10; // Col J: Company (brand name)
const COL_SKU = 12; // Col L: SKU
const COL_WHOLESALE_CUSTOMER = 25; // Col Y: Wholesale Customer (retailer name)
const COL_QTY_SOLD = 26; // Col Z: Qty Sold
const COL_QTY_RETURNED = 27; // Col AA: Qty Returned
const COL_TOTAL_REVENUE = 38; // Col AL: Total Revenue

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("============================================================");
  console.log("  Petra Supply Hub — Retail Sales Import");
  console.log("  Source: /tmp/retail-sales.xlsx (Sale Data sheet)");
  console.log("============================================================");
  console.log("");

  // ------------------------------------------------------------------
  // Load reference data from DB
  // ------------------------------------------------------------------

  console.log("[0] Loading reference data from database ...");

  // Load all SKUs: sku code -> { id, brandId }
  const allSkus = await db.query.skus.findMany();
  const skuMap = new Map<string, { id: number; brandId: number }>();
  for (const s of allSkus) {
    skuMap.set(String(s.sku), { id: s.id as number, brandId: s.brandId as number });
  }
  console.log(`  Loaded ${skuMap.size} SKUs`);

  // Load all brands: name -> id
  const allBrands = await db.query.brands.findMany();
  const brandMap = new Map<string, number>();
  for (const b of allBrands) {
    brandMap.set(String(b.name), b.id as number);
  }
  console.log(`  Loaded ${brandMap.size} brands: ${Array.from(brandMap.keys()).join(", ")}`);
  console.log("");

  // ------------------------------------------------------------------
  // Read the Excel file
  // ------------------------------------------------------------------

  const filePath = "/tmp/retail-sales.xlsx";
  console.log(`[1] Reading ${filePath} ...`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet("Sale Data") || workbook.worksheets[0];
  if (!sheet) {
    console.error("ERROR: No 'Sale Data' worksheet found.");
    process.exit(1);
  }

  const totalRows = sheet.rowCount - 1; // exclude header
  console.log(`  Found ${totalRows} data rows in sheet "${sheet.name}"`);
  console.log("");

  // ------------------------------------------------------------------
  // Step 1: Delete existing retail sales from previous imports
  // ------------------------------------------------------------------

  console.log("[2] Deleting existing retail sales (source IN ('sellercloud', 'sellercloud-orders')) ...");

  await db
    .delete(retailSales)
    .where(inArray(retailSales.source, ["sellercloud", "sellercloud-orders"]));

  console.log("  Deleted existing sellercloud/sellercloud-orders retail sales rows.");
  console.log("");

  // ------------------------------------------------------------------
  // Step 2: Read all rows and extract data
  // ------------------------------------------------------------------

  console.log("[3] Reading all sale rows ...");

  interface SaleRow {
    shipDate: Date;
    brandName: string;
    skuCode: string;
    customerName: string;
    qtySold: number;
    qtyReturned: number;
    totalRevenue: number;
  }

  const saleRows: SaleRow[] = [];
  const uniqueCustomers = new Set<string>();
  let rowsRead = 0;
  let rowsSkippedNoDate = 0;
  let rowsSkippedNoCustomer = 0;
  let rowsSkippedNoSku = 0;

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    // Parse ship date
    const dateVal = row.getCell(COL_SHIP_DATE).value;
    const shipDate = parseExcelDate(dateVal);
    if (!shipDate) {
      rowsSkippedNoDate++;
      return;
    }

    // Parse wholesale customer
    const customerRaw = cellStr(row, COL_WHOLESALE_CUSTOMER);
    const customerName = normalizeName(customerRaw);
    if (!customerName) {
      rowsSkippedNoCustomer++;
      return;
    }

    // Parse SKU
    const skuCode = cellStr(row, COL_SKU);
    if (!skuCode) {
      rowsSkippedNoSku++;
      return;
    }

    // Parse brand name
    const brandName = cellStr(row, COL_COMPANY);

    // Parse quantities and revenue
    const qtySold = cellNum(row, COL_QTY_SOLD);
    const qtyReturned = cellNum(row, COL_QTY_RETURNED);
    const totalRevenue = cellNum(row, COL_TOTAL_REVENUE);

    saleRows.push({
      shipDate,
      brandName,
      skuCode,
      customerName,
      qtySold,
      qtyReturned,
      totalRevenue,
    });

    uniqueCustomers.add(customerName);

    rowsRead++;
    if (rowsRead % 200 === 0) {
      console.log(`  Read ${rowsRead} rows ...`);
    }
  });

  console.log(`  Total valid sale rows: ${saleRows.length}`);
  console.log(`  Skipped (no date): ${rowsSkippedNoDate}`);
  console.log(`  Skipped (no customer): ${rowsSkippedNoCustomer}`);
  console.log(`  Skipped (no SKU): ${rowsSkippedNoSku}`);
  console.log(`  Unique wholesale customers: ${uniqueCustomers.size}`);
  console.log("");

  // ------------------------------------------------------------------
  // Step 3: Upsert retailers from unique customer names
  // ------------------------------------------------------------------

  console.log("[4] Upserting retailers ...");

  const retailerMap = new Map<string, number>(); // customerName -> retailerId
  let retailersCreated = 0;
  let retailersExisting = 0;

  for (const customerName of Array.from(uniqueCustomers)) {
    const code = nameToCode(customerName);

    // Check if retailer already exists by name
    let retailer = await db.query.retailers.findFirst({
      where: eq(retailers.name, customerName),
    });

    if (retailer) {
      retailerMap.set(customerName, retailer.id as number);
      retailersExisting++;
      continue;
    }

    // Check by code (in case name differs slightly but code matches)
    retailer = await db.query.retailers.findFirst({
      where: eq(retailers.code, code),
    });

    if (retailer) {
      retailerMap.set(customerName, retailer.id as number);
      retailersExisting++;
      continue;
    }

    // Create new retailer
    try {
      const [inserted] = await db
        .insert(retailers)
        .values({
          name: customerName,
          code,
          channel: "Wholesale",
          active: true,
        })
        .returning();
      retailerMap.set(customerName, inserted.id as number);
      retailersCreated++;
    } catch (err) {
      // Handle unique constraint violation — re-fetch
      const existing = await db.query.retailers.findFirst({
        where: eq(retailers.name, customerName),
      });
      if (existing) {
        retailerMap.set(customerName, existing.id as number);
        retailersExisting++;
      } else {
        console.error(`  Failed to create retailer "${customerName}":`, err);
      }
    }
  }

  console.log(`  Retailers created: ${retailersCreated}`);
  console.log(`  Retailers already existed: ${retailersExisting}`);
  console.log("");

  // ------------------------------------------------------------------
  // Step 4: Aggregate into monthly retail sales
  // ------------------------------------------------------------------

  console.log("[5] Aggregating into monthly retail sales ...");

  // Aggregation key: skuCode|customerName|YYYY-MM
  interface SalesAgg {
    skuCode: string;
    customerName: string;
    brandName: string;
    monthDate: Date;
    unitsSold: number; // net = qtySold - qtyReturned
    revenue: number;
  }

  const aggMap = new Map<string, SalesAgg>();

  for (const row of saleRows) {
    const month = firstOfMonth(row.shipDate);
    const key = `${row.skuCode}|${row.customerName}|${monthKey(row.shipDate)}`;

    const existing = aggMap.get(key);
    if (existing) {
      existing.unitsSold += row.qtySold - row.qtyReturned;
      existing.revenue += row.totalRevenue;
    } else {
      aggMap.set(key, {
        skuCode: row.skuCode,
        customerName: row.customerName,
        brandName: row.brandName,
        monthDate: month,
        unitsSold: row.qtySold - row.qtyReturned,
        revenue: row.totalRevenue,
      });
    }
  }

  console.log(`  Aggregated into ${aggMap.size} monthly sales groups`);
  console.log("");

  // ------------------------------------------------------------------
  // Step 5: Insert retail sales
  // ------------------------------------------------------------------

  console.log("[6] Inserting retail sales ...");

  let salesInserted = 0;
  let salesSkippedNoSku = 0;
  let salesSkippedNoRetailer = 0;
  let processed = 0;

  for (const [, agg] of Array.from(aggMap.entries())) {
    const skuData = skuMap.get(agg.skuCode);
    if (!skuData) {
      salesSkippedNoSku++;
      processed++;
      if (processed % 200 === 0) {
        console.log(`  Processed ${processed}/${aggMap.size} groups ...`);
      }
      continue;
    }

    const retailerId = retailerMap.get(agg.customerName);
    if (!retailerId) {
      salesSkippedNoRetailer++;
      processed++;
      if (processed % 200 === 0) {
        console.log(`  Processed ${processed}/${aggMap.size} groups ...`);
      }
      continue;
    }

    const unitsSold = agg.unitsSold;
    const revenue = agg.revenue.toFixed(2);

    try {
      await db
        .insert(retailSales)
        .values({
          skuId: skuData.id,
          retailerId,
          month: agg.monthDate,
          unitsSold,
          revenue,
          source: "retail-sales-sheet",
        })
        .onConflictDoUpdate({
          target: [retailSales.skuId, retailSales.retailerId, retailSales.month],
          set: {
            unitsSold: sql`EXCLUDED.units_sold`,
            revenue: sql`EXCLUDED.revenue`,
            source: sql`'retail-sales-sheet'`,
            updatedAt: sql`NOW()`,
          },
        });
      salesInserted++;
    } catch (err) {
      console.error(
        `  Failed to upsert sales for SKU=${agg.skuCode}, retailer=${agg.customerName}, month=${monthKey(agg.monthDate)}:`,
        err
      );
    }

    processed++;
    if (processed % 200 === 0) {
      console.log(`  Processed ${processed}/${aggMap.size} groups ...`);
    }
  }

  console.log(`  Sales inserted/updated: ${salesInserted}`);
  console.log(`  Skipped (no matching SKU in DB): ${salesSkippedNoSku}`);
  console.log(`  Skipped (no matching retailer): ${salesSkippedNoRetailer}`);
  console.log("");

  // ------------------------------------------------------------------
  // Step 6: Create brand-retailer mappings
  // ------------------------------------------------------------------

  console.log("[7] Creating brand-retailer mappings ...");

  // Collect unique brand+retailer pairs from the data
  // Use the brand from the Company column (col 9) to look up brandId
  // Fall back to the SKU's brandId if brand name doesn't match
  const brandRetailerPairs = new Set<string>();

  for (const [, agg] of Array.from(aggMap.entries())) {
    const skuData = skuMap.get(agg.skuCode);
    const retailerId = retailerMap.get(agg.customerName);
    if (!skuData || !retailerId) continue;

    // Prefer brand from Company column, fall back to SKU's brandId
    let brandId: number | undefined;
    if (agg.brandName) {
      brandId = brandMap.get(agg.brandName);
    }
    if (!brandId) {
      brandId = skuData.brandId;
    }

    brandRetailerPairs.add(`${brandId}|${retailerId}`);
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
      brExisting++;
    }
  }

  console.log(`  Brand-retailer mappings created/confirmed: ${brCreated}`);
  console.log(`  Brand-retailer conflicts (already existed): ${brExisting}`);
  console.log("");

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------

  console.log("============================================================");
  console.log("  Import Summary");
  console.log("============================================================");
  console.log(`  Total sale rows read:             ${saleRows.length}`);
  console.log(`  Rows skipped (no date):           ${rowsSkippedNoDate}`);
  console.log(`  Rows skipped (no customer):       ${rowsSkippedNoCustomer}`);
  console.log(`  Rows skipped (no SKU):            ${rowsSkippedNoSku}`);
  console.log(`  Unique wholesale customers:       ${uniqueCustomers.size}`);
  console.log(`  Retailers created:                ${retailersCreated}`);
  console.log(`  Retailers already existed:        ${retailersExisting}`);
  console.log(`  Monthly sales groups:             ${aggMap.size}`);
  console.log(`  Sales inserted/updated:           ${salesInserted}`);
  console.log(`  Sales skipped (no matching SKU):  ${salesSkippedNoSku}`);
  console.log(`  Sales skipped (no retailer):      ${salesSkippedNoRetailer}`);
  console.log(`  Brand-retailer pairs:             ${brandRetailerPairs.size}`);
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
