/**
 * Profit & Loss processor for DriveHQ sync.
 *
 * Reads "Product Profit Details" XLSX from DriveHQ,
 * aggregates by SKU+retailer+month, and upserts into
 * retail_sales, cogs_master, and retailers tables.
 *
 * Strategy:
 *   - retail_sales: Upsert on (skuId, retailerId, month) unique constraint
 *   - cogs_master: Upsert per-SKU unit cost
 *   - retailers: Create new from "Wholesale Customer" names
 *   - skus: Create if new Petra SKU encountered
 */

import ExcelJS from "exceljs";
import { db } from "@/server/db";
import {
  skus,
  retailers,
  retailSales,
  cogsMaster,
  brands,
} from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { isPetraBrand, normalizeBrandName } from "../brand-filter";

interface ProcessResult {
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  skipped: number;
  errors: string[];
}

function parseNum(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[$,%]/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

function cellStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "number") return String(val);
  if (typeof val === "object" && "text" in (val as any)) {
    return String((val as any).text).trim();
  }
  return String(val).trim();
}

function parseDate(val: unknown): Date | null {
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    // Excel serial date
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + val * 86400000);
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof val === "string" && val.trim()) {
    const parsed = new Date(val.trim());
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/** Truncate date to first of month */
function toMonthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Generate a URL-safe retailer code from a name */
function makeRetailerCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50) || "unknown";
}

export async function processProfitLossFile(
  data: Buffer | ArrayBuffer
): Promise<ProcessResult> {
  const result: ProcessResult = {
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    skipped: 0,
    errors: [],
  };

  // Parse XLSX
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("P&L file has no worksheets");

  // Build header map
  const headerRow = sheet.getRow(1);
  const colMap: Record<string, number> = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const header = cellStr(cell.value).toLowerCase();
    colMap[header] = colNumber;
  });

  // Identify columns
  const shipDateCol =
    colMap["ship date"] ?? colMap["shipdate"];
  const orderDateCol =
    colMap["order date"] ?? colMap["orderdate"];
  const companyCol = colMap["company"] ?? colMap["brand"];
  const skuCol = colMap["sku"] ?? colMap["productid"];
  const productNameCol =
    colMap["product name"] ?? colMap["productname"] ?? colMap["product"];
  const customerCol =
    colMap["wholesale customer"] ??
    colMap["wholesalecustomer"] ??
    colMap["customer"];
  const qtySoldCol =
    colMap["qty sold"] ?? colMap["qtysold"] ?? colMap["quantity"] ?? colMap["qty"];
  const subtotalCol =
    colMap["subtotal"] ?? colMap["sub total"] ?? colMap["revenue"] ?? colMap["total"];
  const itemsCostCol =
    colMap["items cost"] ?? colMap["itemscost"] ?? colMap["cost"];

  if (!skuCol || !companyCol) {
    throw new Error(
      `Missing required columns in P&L file. Found: ${Object.keys(colMap).join(", ")}`
    );
  }

  // Load brand lookup
  const allBrands = await db.query.brands.findMany();
  const brandMap = new Map<string, number>();
  for (const b of allBrands) {
    brandMap.set(b.name.toLowerCase(), b.id);
  }

  // Load existing retailers into cache
  const allRetailers = await db.query.retailers.findMany();
  const retailerCache = new Map<string, number>();
  for (const r of allRetailers) {
    retailerCache.set(r.name.toLowerCase(), r.id);
  }

  // Load existing SKUs into cache
  const allSkus = await db.query.skus.findMany();
  const skuCache = new Map<string, number>();
  for (const s of allSkus) {
    skuCache.set(s.sku.toLowerCase(), s.id);
  }

  // Aggregation key: `${skuId}-${retailerId}-${monthISO}`
  const salesAgg = new Map<
    string,
    { skuId: number; retailerId: number; month: Date; units: number; revenue: number }
  >();
  // COGS: per skuId, keep latest
  const cogsMap = new Map<number, number>();

  // Ensure "Unattributed" retailer exists
  if (!retailerCache.has("unattributed")) {
    const code = "UNATTRIBUTED";
    try {
      const [inserted] = await db
        .insert(retailers)
        .values({
          name: "Unattributed",
          code,
          channel: "Wholesale",
          active: true,
        })
        .returning();
      retailerCache.set("unattributed", inserted.id);
    } catch {
      // May already exist from a race condition
      const existing = await db.query.retailers.findFirst({
        where: eq(retailers.name, "Unattributed"),
      });
      if (existing) retailerCache.set("unattributed", existing.id);
    }
  }

  // Process each data row
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const company = cellStr(row.getCell(companyCol).value);
    if (!isPetraBrand(company)) {
      result.skipped++;
      return;
    }

    const skuCode = cellStr(row.getCell(skuCol).value);
    if (!skuCode) {
      result.skipped++;
      return;
    }

    // Date: prefer Ship Date, fall back to Order Date
    let dateVal: Date | null = null;
    if (shipDateCol) dateVal = parseDate(row.getCell(shipDateCol).value);
    if (!dateVal && orderDateCol)
      dateVal = parseDate(row.getCell(orderDateCol).value);
    if (!dateVal) {
      result.skipped++;
      return;
    }

    const month = toMonthStart(dateVal);
    const brandName = normalizeBrandName(company);
    const productName = productNameCol
      ? cellStr(row.getCell(productNameCol).value) || skuCode
      : skuCode;
    const customerName = customerCol
      ? cellStr(row.getCell(customerCol).value) || "Unattributed"
      : "Unattributed";
    const qtySold = qtySoldCol
      ? parseNum(row.getCell(qtySoldCol).value)
      : 0;
    const subtotal = subtotalCol
      ? parseNum(row.getCell(subtotalCol).value)
      : 0;
    const itemsCost = itemsCostCol
      ? parseNum(row.getCell(itemsCostCol).value)
      : 0;

    // Store raw row for deferred processing
    (row as any)._parsed = {
      skuCode,
      brandName,
      productName,
      customerName,
      month,
      qtySold,
      subtotal,
      itemsCost,
    };

    result.recordsProcessed++;
  });

  // Second pass: create missing SKUs and retailers, then aggregate
  // We need to re-iterate since eachRow doesn't support async
  const parsedRows: Array<{
    skuCode: string;
    brandName: string | null;
    productName: string;
    customerName: string;
    month: Date;
    qtySold: number;
    subtotal: number;
    itemsCost: number;
  }> = [];

  result.recordsProcessed = 0;

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const company = cellStr(row.getCell(companyCol).value);
    if (!isPetraBrand(company)) return;

    const skuCode = cellStr(row.getCell(skuCol).value);
    if (!skuCode) return;

    let dateVal: Date | null = null;
    if (shipDateCol) dateVal = parseDate(row.getCell(shipDateCol).value);
    if (!dateVal && orderDateCol)
      dateVal = parseDate(row.getCell(orderDateCol).value);
    if (!dateVal) return;

    result.recordsProcessed++;

    parsedRows.push({
      skuCode,
      brandName: normalizeBrandName(company),
      productName: productNameCol
        ? cellStr(row.getCell(productNameCol).value) || skuCode
        : skuCode,
      customerName: customerCol
        ? cellStr(row.getCell(customerCol).value) || "Unattributed"
        : "Unattributed",
      month: toMonthStart(dateVal),
      qtySold: qtySoldCol ? parseNum(row.getCell(qtySoldCol).value) : 0,
      subtotal: subtotalCol ? parseNum(row.getCell(subtotalCol).value) : 0,
      itemsCost: itemsCostCol ? parseNum(row.getCell(itemsCostCol).value) : 0,
    });
  });

  // Create missing retailers and SKUs
  for (const row of parsedRows) {
    try {
      // Ensure retailer exists
      const customerLower = row.customerName.toLowerCase();
      if (!retailerCache.has(customerLower)) {
        const code = makeRetailerCode(row.customerName);
        // Check for duplicate code
        let finalCode = code;
        let suffix = 1;
        while (true) {
          try {
            const [inserted] = await db
              .insert(retailers)
              .values({
                name: row.customerName,
                code: finalCode,
                channel: "Wholesale",
                active: true,
              })
              .returning();
            retailerCache.set(customerLower, inserted.id);
            break;
          } catch (err: any) {
            if (err?.code === "23505" && err?.constraint?.includes("code")) {
              // Duplicate code — append suffix
              finalCode = `${code}-${suffix++}`;
            } else if (err?.code === "23505") {
              // Duplicate name — just fetch existing
              const existing = await db.query.retailers.findFirst({
                where: eq(retailers.name, row.customerName),
              });
              if (existing) retailerCache.set(customerLower, existing.id);
              break;
            } else {
              throw err;
            }
          }
        }
      }

      // Ensure SKU exists
      const skuLower = row.skuCode.toLowerCase();
      if (!skuCache.has(skuLower)) {
        const brandId = row.brandName
          ? brandMap.get(row.brandName.toLowerCase())
          : null;
        if (!brandId) {
          result.skipped++;
          continue;
        }
        try {
          const [inserted] = await db
            .insert(skus)
            .values({
              brandId,
              sku: row.skuCode,
              name: row.productName,
              active: true,
            })
            .returning();
          skuCache.set(skuLower, inserted.id);
        } catch (err: any) {
          if (err?.code === "23505") {
            // Duplicate SKU — fetch existing
            const existing = await db.query.skus.findFirst({
              where: eq(skus.sku, row.skuCode),
            });
            if (existing) skuCache.set(skuLower, existing.id);
          } else {
            throw err;
          }
        }
      }

      const skuId = skuCache.get(skuLower);
      const retailerId = retailerCache.get(customerLower);
      if (!skuId || !retailerId) continue;

      // Aggregate sales
      const monthISO = row.month.toISOString().slice(0, 10);
      const aggKey = `${skuId}-${retailerId}-${monthISO}`;
      const existing = salesAgg.get(aggKey);
      if (existing) {
        existing.units += row.qtySold;
        existing.revenue += row.subtotal;
      } else {
        salesAgg.set(aggKey, {
          skuId,
          retailerId,
          month: row.month,
          units: row.qtySold,
          revenue: row.subtotal,
        });
      }

      // COGS: per-unit cost from Items Cost / Qty Sold
      if (row.qtySold > 0 && row.itemsCost > 0) {
        const unitCost = row.itemsCost / row.qtySold;
        cogsMap.set(skuId, unitCost);
      }
    } catch (err) {
      result.errors.push(
        `P&L SKU="${row.skuCode}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // Upsert aggregated retail_sales
  const salesEntries = Array.from(salesAgg.values());
  for (let i = 0; i < salesEntries.length; i += 100) {
    const batch = salesEntries.slice(i, i + 100);
    for (const entry of batch) {
      try {
        await db
          .insert(retailSales)
          .values({
            skuId: entry.skuId,
            retailerId: entry.retailerId,
            month: entry.month,
            unitsSold: Math.round(entry.units),
            revenue: entry.revenue.toFixed(2),
            source: "drivehq-pnl",
          })
          .onConflictDoUpdate({
            target: [retailSales.skuId, retailSales.retailerId, retailSales.month],
            set: {
              unitsSold: sql`EXCLUDED.units_sold`,
              revenue: sql`EXCLUDED.revenue`,
              source: sql`'drivehq-pnl'`,
              updatedAt: sql`NOW()`,
            },
          });
        result.recordsCreated++;
      } catch (err) {
        result.errors.push(
          `Sales upsert skuId=${entry.skuId}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  // Upsert COGS
  const today = new Date();
  const effectiveDate = new Date(today.getFullYear(), today.getMonth(), 1);
  for (const [skuId, unitCost] of cogsMap) {
    try {
      await db.insert(cogsMaster).values({
        skuId,
        cogs: unitCost.toFixed(2),
        effectiveDate,
        source: "drivehq-pnl",
      });
    } catch {
      // Duplicate entry — just update if needed
    }
  }

  result.recordsUpdated = salesAgg.size;

  return result;
}
