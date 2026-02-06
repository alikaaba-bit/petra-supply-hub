"use server";

import ExcelJS from "exceljs";
import { auth } from "@/server/auth";
import { detectFormat } from "@/server/services/parsers/format-detector";
import { parseRTLForecast } from "@/server/services/parsers/rtl-forecast";
import { parseHOPForecast } from "@/server/services/parsers/hop-forecast";
import { validateForecastRows } from "@/server/services/validators/forecast-validator";
import { importForecasts } from "@/server/services/import-service";
import { db } from "@/server/db";
import { skus, retailers } from "@/server/db/schema";
import { inArray } from "drizzle-orm";

/**
 * Serialized forecast row for wire transfer (Date -> string)
 */
export interface SerializedForecastRow {
  skuId: number;
  retailerId: number;
  sku: string;
  retailer: string;
  month: string; // ISO date string
  forecastedUnits: number;
  rowNumber: number;
  sheetName: string;
}

/**
 * Server Action: Parse and validate forecast Excel file.
 *
 * Steps:
 * 1. Extract file from FormData
 * 2. Validate size (10MB max) and MIME type (.xlsx)
 * 3. Validate file signature (PK zip header)
 * 4. Parse with ExcelJS
 * 5. Detect format and route to appropriate parser
 * 6. Validate rows against master data
 * 7. Return preview (first 100 rows) with validation results
 *
 * Does NOT commit to database - preview only.
 */
export async function parseAndValidateForecast(formData: FormData) {
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

    // Reject retail sales format
    if (format === "RETAIL_SALES") {
      return {
        success: false,
        error: "This appears to be a retail sales file. Please use the retail sales import.",
      };
    }

    // Parse based on format
    const parsedRows =
      format === "RTL_FORECAST"
        ? parseRTLForecast(workbook)
        : parseHOPForecast(workbook);

    if (parsedRows.length === 0) {
      return { success: false, error: "No forecast data found in file" };
    }

    // Validate rows
    const validation = await validateForecastRows(parsedRows);

    // Serialize dates for wire transfer
    const serializedValid: SerializedForecastRow[] = validation.valid.map(
      (row) => ({
        ...row,
        month: row.month.toISOString(),
      })
    );

    // Preview: first 100 rows
    const previewData = serializedValid.slice(0, 100);

    return {
      success: true,
      format,
      validation: {
        valid: serializedValid,
        errors: validation.errors,
        warnings: validation.warnings,
        summary: validation.summary,
      },
      previewData,
    };
  } catch (error) {
    console.error("Forecast parse error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse file",
    };
  }
}

/**
 * Server Action: Commit validated forecast rows to database.
 *
 * SECURITY: Re-validates that all skuId and retailerId values exist in database
 * before importing (client could have tampered with data).
 *
 * @param rows - Serialized forecast rows from parseAndValidateForecast
 */
export async function commitForecastImport(rows: SerializedForecastRow[]) {
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
    const result = await importForecasts(deserializedRows, session.user.id);

    return {
      success: true,
      imported: result.imported,
      updated: result.updated,
    };
  } catch (error) {
    console.error("Forecast import error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to import data",
    };
  }
}
