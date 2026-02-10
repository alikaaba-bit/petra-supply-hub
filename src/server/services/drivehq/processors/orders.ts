/**
 * Orders processor for DriveHQ sync.
 *
 * Reads "Order by Date" XLSX from DriveHQ and upserts into retail_orders table.
 * Uses Order # as the natural key via sellercloudIdMap for deduplication.
 *
 * Strategy: Upsert via sellercloudIdMap lookup. Update status on re-sync
 * (e.g., UnShipped -> Shipped).
 */

import ExcelJS from "exceljs";
import { db } from "@/server/db";
import {
  retailers,
  retailOrders,
  sellercloudIdMap,
  brands,
} from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
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

function mapShipStatus(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower === "shipped") return "shipped";
  if (lower === "unshipped") return "received";
  if (lower === "partially shipped") return "partially_shipped";
  return "received";
}

function makeRetailerCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50) || "unknown";
}

export async function processOrdersFile(
  data: Buffer | ArrayBuffer
): Promise<ProcessResult> {
  const result: ProcessResult = {
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    skipped: 0,
    errors: [],
  };

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Orders file has no worksheets");

  // Build header map
  const headerRow = sheet.getRow(1);
  const colMap: Record<string, number> = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const header = cellStr(cell.value).toLowerCase();
    colMap[header] = colNumber;
  });

  // Identify columns
  const orderNumCol =
    colMap["order #"] ?? colMap["order#"] ?? colMap["ordernumber"] ?? colMap["order number"];
  const orderDateCol =
    colMap["order date"] ?? colMap["orderdate"];
  const shipDateCol =
    colMap["ship date"] ?? colMap["shipdate"];
  const shipStatusCol =
    colMap["ship status"] ?? colMap["shipstatus"] ?? colMap["status"];
  const grandTotalCol =
    colMap["grand total"] ?? colMap["grandtotal"] ?? colMap["total"];
  const companyCol = colMap["company"] ?? colMap["brand"];
  const customerCol =
    colMap["wholesale customer"] ??
    colMap["wholesalecustomer"] ??
    colMap["customer"] ??
    colMap["customer name"];

  if (!orderNumCol) {
    throw new Error(
      `Missing "Order #" column in orders file. Found: ${Object.keys(colMap).join(", ")}`
    );
  }

  // Load lookups
  const allBrands = await db.query.brands.findMany();
  const brandMap = new Map<string, number>();
  for (const b of allBrands) {
    brandMap.set(b.name.toLowerCase(), b.id);
  }

  const allRetailers = await db.query.retailers.findMany();
  const retailerCache = new Map<string, number>();
  for (const r of allRetailers) {
    retailerCache.set(r.name.toLowerCase(), r.id);
  }

  // Ensure "Unattributed" retailer
  if (!retailerCache.has("unattributed")) {
    try {
      const [inserted] = await db
        .insert(retailers)
        .values({
          name: "Unattributed",
          code: "UNATTRIBUTED",
          channel: "Wholesale",
          active: true,
        })
        .returning();
      retailerCache.set("unattributed", inserted.id);
    } catch {
      const existing = await db.query.retailers.findFirst({
        where: eq(retailers.name, "Unattributed"),
      });
      if (existing) retailerCache.set("unattributed", existing.id);
    }
  }

  // Collect rows
  interface OrderRow {
    orderNum: string;
    orderDate: Date | null;
    shipDate: Date | null;
    shipStatus: string;
    grandTotal: number;
    company: string;
    brandName: string | null;
    customerName: string;
  }

  const rows: OrderRow[] = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const company = companyCol
      ? cellStr(row.getCell(companyCol).value)
      : "";

    // If company column exists, filter to Petra brands only
    if (companyCol && company && !isPetraBrand(company)) {
      result.skipped++;
      return;
    }

    const orderNum = cellStr(row.getCell(orderNumCol).value);
    if (!orderNum) {
      result.skipped++;
      return;
    }

    rows.push({
      orderNum,
      orderDate: orderDateCol
        ? parseDate(row.getCell(orderDateCol).value)
        : null,
      shipDate: shipDateCol
        ? parseDate(row.getCell(shipDateCol).value)
        : null,
      shipStatus: shipStatusCol
        ? cellStr(row.getCell(shipStatusCol).value)
        : "received",
      grandTotal: grandTotalCol
        ? parseNum(row.getCell(grandTotalCol).value)
        : 0,
      company,
      brandName: company ? normalizeBrandName(company) : null,
      customerName: customerCol
        ? cellStr(row.getCell(customerCol).value) || "Unattributed"
        : "Unattributed",
    });
  });

  // Process rows
  for (const row of rows) {
    result.recordsProcessed++;

    try {
      // Resolve brand
      let brandId: number;
      if (row.brandName) {
        brandId = brandMap.get(row.brandName.toLowerCase()) ?? 1;
      } else {
        brandId = 1; // Default brand if no company column
      }

      // Ensure retailer
      const customerLower = row.customerName.toLowerCase();
      if (!retailerCache.has(customerLower)) {
        const code = makeRetailerCode(row.customerName);
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
              finalCode = `${code}-${suffix++}`;
            } else if (err?.code === "23505") {
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
      const retailerId = retailerCache.get(customerLower)!;

      // Check if order already exists via sellercloudIdMap
      const existingMapping = await db
        .select()
        .from(sellercloudIdMap)
        .where(
          and(
            eq(sellercloudIdMap.entityType, "drivehq-order"),
            eq(sellercloudIdMap.sellercloudId, row.orderNum)
          )
        )
        .limit(1);

      if (existingMapping.length > 0) {
        // Update existing order (status may have changed)
        await db
          .update(retailOrders)
          .set({
            status: mapShipStatus(row.shipStatus),
            shipByDate: row.shipDate,
            totalAmount: row.grandTotal > 0 ? row.grandTotal.toFixed(2) : null,
            updatedAt: new Date(),
          })
          .where(eq(retailOrders.id, existingMapping[0].localId));

        await db
          .update(sellercloudIdMap)
          .set({ lastSyncedAt: new Date() })
          .where(eq(sellercloudIdMap.id, existingMapping[0].id));

        result.recordsUpdated++;
      } else {
        // Create new order
        const [newOrder] = await db
          .insert(retailOrders)
          .values({
            retailerId,
            brandId,
            retailerPoNumber: row.orderNum,
            status: mapShipStatus(row.shipStatus),
            orderDate: row.orderDate,
            shipByDate: row.shipDate,
            totalAmount: row.grandTotal > 0 ? row.grandTotal.toFixed(2) : null,
          })
          .returning();

        // Create ID mapping
        await db.insert(sellercloudIdMap).values({
          entityType: "drivehq-order",
          sellercloudId: row.orderNum,
          localTableName: "retail_orders",
          localId: newOrder.id,
        });

        result.recordsCreated++;
      }
    } catch (err) {
      result.errors.push(
        `Order #${row.orderNum}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return result;
}
