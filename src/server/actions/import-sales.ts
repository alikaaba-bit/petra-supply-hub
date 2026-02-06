"use server";

import ExcelJS from "exceljs";
import { auth } from "@/server/auth";
import { detectFormat } from "@/server/services/parsers/format-detector";
import { parseRetailSales } from "@/server/services/parsers/retail-sales";
import { validateSalesRows } from "@/server/services/validators/sales-validator";
import { importRetailSales } from "@/server/services/import-service";
import { db } from "@/server/db";
import { skus, retailers } from "@/server/db/schema";
import { inArray } from "drizzle-orm";

/**
 * Serialized sales row for wire transfer (Date -> string)
 */
export interface SerializedSalesRow {
  skuId: number;
  retailerId: number;
  sku: string;
  retailer: string;
  month: string; // ISO date string
  unitsSold: number;
  revenue: number | null;
  rowNumber: number;
}

/**
 * Server Action: Parse and validate retail sales Excel file.
 *
 * Steps:
 * 1. Extract file from FormData
 * 2. Validate size (10MB max) and MIME type (.xlsx)
 * 3. Validate file signature (PK zip header)
 * 4. Parse with ExcelJS
 * 5. Detect format (must be RETAIL_SALES)
 * 6. Validate rows against master data
 * 7. Return preview (first 100 rows) with validation results
 *
 * Does NOT commit to database - preview only.
 */
export async function parseAndValidateSales(formData: FormData) {
  const file = formData.get("file") as File | null;

  if (!file) {
    return { success: false, error: "No file provided" };
  }

  // Validate size (10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { success: false, error: "File size exceeds 10MB limit" };
  }

  // Validate MIME type
  if (
    file.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
    !file.name.endsWith(".xlsx")
  ) {
    return { success: false, error: "File must be .xlsx format" };
  }

  try {
    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const buffer = Buffer.from(uint8Array);

    // Validate file signature (PK zip header: 504b0304)
    if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) {
      return { success: false, error: "Invalid .xlsx file signature" };
    }

    // Parse with ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // Detect format
    const format = detectFormat(workbook);

    // Must be RETAIL_SALES format
    if (format !== "RETAIL_SALES") {
      return {
        success: false,
        error: "This appears to be a forecast file. Please use the forecast import.",
      };
    }

    // Parse retail sales
    const parsedRows = parseRetailSales(workbook);

    if (parsedRows.length === 0) {
      return { success: false, error: "No sales data found in file" };
    }

    // Validate rows
    const validation = await validateSalesRows(parsedRows);

    // Serialize dates for wire transfer
    const serializedValid: SerializedSalesRow[] = validation.valid.map(
      (row) => ({
        ...row,
        month: row.month.toISOString(),
      })
    );

    // Preview: first 100 rows
    const previewData = serializedValid.slice(0, 100);

    return {
      success: true,
      validation: {
        valid: serializedValid,
        errors: validation.errors,
        warnings: validation.warnings,
        summary: validation.summary,
      },
      previewData,
    };
  } catch (error) {
    console.error("Sales parse error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse file",
    };
  }
}

/**
 * Server Action: Commit validated sales rows to database.
 *
 * SECURITY: Re-validates that all skuId and retailerId values exist in database
 * before importing (client could have tampered with data).
 *
 * @param rows - Serialized sales rows from parseAndValidateSales
 */
export async function commitSalesImport(rows: SerializedSalesRow[]) {
  // Auth check
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (rows.length === 0) {
    return { success: false, error: "No rows to import" };
  }

  try {
    // SECURITY: Re-validate that all referenced IDs exist in database
    const skuIds = [...new Set(rows.map((r) => r.skuId))];
    const retailerIds = [...new Set(rows.map((r) => r.retailerId))];

    const validSkus = await db
      .select({ id: skus.id })
      .from(skus)
      .where(inArray(skus.id, skuIds));

    const validRetailers = await db
      .select({ id: retailers.id })
      .from(retailers)
      .where(inArray(retailers.id, retailerIds));

    const validSkuIdSet = new Set(validSkus.map((s) => s.id));
    const validRetailerIdSet = new Set(validRetailers.map((r) => r.id));

    // Filter out any rows with invalid references
    const validatedRows = rows.filter(
      (row) => validSkuIdSet.has(row.skuId) && validRetailerIdSet.has(row.retailerId)
    );

    if (validatedRows.length === 0) {
      return {
        success: false,
        error: "No valid rows after security validation",
      };
    }

    // Deserialize dates
    const deserializedRows = validatedRows.map((row) => ({
      ...row,
      month: new Date(row.month),
    }));

    // Import to database
    const result = await importRetailSales(deserializedRows, session.user.id);

    return {
      success: true,
      imported: result.imported,
    };
  } catch (error) {
    console.error("Sales import error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to import data",
    };
  }
}
