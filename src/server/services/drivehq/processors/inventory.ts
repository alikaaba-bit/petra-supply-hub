/**
 * Inventory processor for DriveHQ sync.
 *
 * Reads "Inventory by Warehouse Detail" XLSX from DriveHQ,
 * filters to Petra brands only, and upserts into skus + inventory tables.
 *
 * Strategy: Transactional replace for inventory (DELETE WHERE source='drivehq-inventory', INSERT all).
 * SKUs are upserted (create new, update existing).
 */

import ExcelJS from "exceljs";
import { db } from "@/server/db";
import { skus, inventory, brands } from "@/server/db/schema";
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

export async function processInventoryFile(
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
  if (!sheet) throw new Error("Inventory file has no worksheets");

  // Build header map from row 1
  const headerRow = sheet.getRow(1);
  const colMap: Record<string, number> = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const header = cellStr(cell.value).toLowerCase();
    colMap[header] = colNumber;
  });

  // Identify columns (flexible matching)
  const productIdCol =
    colMap["productid"] ?? colMap["product id"] ?? colMap["sku"];
  const productNameCol =
    colMap["productname"] ?? colMap["product name"] ?? colMap["product"];
  const companyCol = colMap["company"] ?? colMap["brand"];
  const usaWarehouseCol =
    colMap["usa warehouse"] ?? colMap["us warehouse"] ?? colMap["usa w/h"];
  const fbaWarehouseCol =
    colMap["fba warehouse"] ?? colMap["fba"];
  const onOrderCol = colMap["onorder"] ?? colMap["on order"];
  const costCol = colMap["cost"] ?? colMap["unit cost"] ?? colMap["cost / unit"];
  const statusCol =
    colMap["productstatus"] ?? colMap["product status"] ?? colMap["status"];
  const stockAgeCol =
    colMap["stock age (days since last receiving)"] ??
    colMap["stock age"] ??
    colMap["stockage"] ??
    colMap["days since last receiving"];

  if (!productIdCol || !companyCol) {
    throw new Error(
      `Missing required columns. Found: ${Object.keys(colMap).join(", ")}`
    );
  }

  // Load brand lookup
  const allBrands = await db.query.brands.findMany();
  const brandMap = new Map<string, number>();
  for (const b of allBrands) {
    brandMap.set(b.name.toLowerCase(), b.id);
  }

  // Collect inventory rows to insert
  const inventoryRows: {
    skuId: number;
    quantityOnHand: number;
    quantityInTransit: number;
    receivedDate: Date | null;
  }[] = [];

  // Process data rows
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const company = cellStr(row.getCell(companyCol).value);
    if (!isPetraBrand(company)) {
      result.skipped++;
      return;
    }

    const productId = cellStr(row.getCell(productIdCol).value);
    if (!productId) {
      result.skipped++;
      return;
    }

    result.recordsProcessed++;
  });

  // Reset and do the actual processing with DB operations
  // We need to process in two passes: first collect all data, then do DB ops
  result.recordsProcessed = 0;

  interface InventoryRow {
    sku: string;
    name: string;
    company: string;
    brandName: string;
    usaWarehouse: number;
    fbaWarehouse: number;
    onOrder: number;
    cost: number;
    isActive: boolean;
    stockAgeDays: number;
  }

  const rows: InventoryRow[] = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const company = cellStr(row.getCell(companyCol).value);
    if (!isPetraBrand(company)) return;

    const sku = cellStr(row.getCell(productIdCol).value);
    if (!sku) return;

    const brandName = normalizeBrandName(company);
    if (!brandName) return;

    rows.push({
      sku,
      name: productNameCol
        ? cellStr(row.getCell(productNameCol).value) || sku
        : sku,
      company,
      brandName,
      usaWarehouse: Math.max(
        0,
        usaWarehouseCol ? parseNum(row.getCell(usaWarehouseCol).value) : 0
      ),
      fbaWarehouse: Math.max(
        0,
        fbaWarehouseCol ? parseNum(row.getCell(fbaWarehouseCol).value) : 0
      ),
      onOrder: Math.max(
        0,
        onOrderCol ? parseNum(row.getCell(onOrderCol).value) : 0
      ),
      cost: costCol ? parseNum(row.getCell(costCol).value) : 0,
      isActive: statusCol
        ? cellStr(row.getCell(statusCol).value).toLowerCase() === "active"
        : true,
      stockAgeDays: stockAgeCol
        ? parseNum(row.getCell(stockAgeCol).value)
        : 0,
    });
  });

  // Process rows with DB operations
  for (const row of rows) {
    result.recordsProcessed++;

    try {
      const brandId = brandMap.get(row.brandName.toLowerCase());
      if (!brandId) {
        result.errors.push(`Brand "${row.brandName}" not in DB for SKU "${row.sku}"`);
        result.skipped++;
        continue;
      }

      // Upsert SKU
      const existingSku = await db.query.skus.findFirst({
        where: eq(skus.sku, row.sku),
      });

      let skuId: number;

      if (existingSku) {
        await db
          .update(skus)
          .set({
            name: row.name,
            brandId,
            unitCost: row.cost > 0 ? row.cost.toFixed(2) : existingSku.unitCost,
            active: row.isActive,
            updatedAt: new Date(),
          })
          .where(eq(skus.sku, row.sku));
        skuId = existingSku.id;
        result.recordsUpdated++;
      } else {
        const [inserted] = await db
          .insert(skus)
          .values({
            brandId,
            sku: row.sku,
            name: row.name,
            unitCost: row.cost > 0 ? row.cost.toFixed(2) : null,
            active: row.isActive,
          })
          .returning();
        skuId = inserted.id;
        result.recordsCreated++;
      }

      // Calculate receivedDate from stock age days
      let receivedDate: Date | null = null;
      if (row.stockAgeDays > 0) {
        receivedDate = new Date();
        receivedDate.setDate(receivedDate.getDate() - row.stockAgeDays);
      }

      inventoryRows.push({
        skuId,
        quantityOnHand: row.usaWarehouse + row.fbaWarehouse,
        quantityInTransit: row.onOrder,
        receivedDate,
      });
    } catch (err) {
      result.errors.push(
        `Row SKU="${row.sku}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // Transactional replace: DELETE all drivehq-inventory, INSERT fresh
  if (inventoryRows.length > 0) {
    await db.transaction(async (tx) => {
      // Delete existing drivehq inventory records
      await tx
        .delete(inventory)
        .where(eq(inventory.source, "drivehq-inventory"));

      // Batch insert in groups of 100
      for (let i = 0; i < inventoryRows.length; i += 100) {
        const batch = inventoryRows.slice(i, i + 100);
        await tx.insert(inventory).values(
          batch.map((r) => ({
            skuId: r.skuId,
            quantityOnHand: r.quantityOnHand,
            quantityInTransit: r.quantityInTransit,
            quantityAllocated: 0,
            receivedDate: r.receivedDate,
            source: "drivehq-inventory",
            lastUpdated: new Date(),
          }))
        ).onConflictDoUpdate({
          target: [inventory.skuId],
          set: {
            quantityOnHand: sql`EXCLUDED.quantity_on_hand`,
            quantityInTransit: sql`EXCLUDED.quantity_in_transit`,
            receivedDate: sql`EXCLUDED.received_date`,
            source: sql`'drivehq-inventory'`,
            lastUpdated: sql`NOW()`,
          },
        });
      }
    });
  }

  return result;
}
