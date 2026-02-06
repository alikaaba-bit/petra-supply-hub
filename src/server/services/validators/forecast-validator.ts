import { db } from "@/server/db";
import { skus, retailers } from "@/server/db/schema";
import type { ParsedForecastRow } from "../parsers/rtl-forecast";

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  sheet?: string;
}

export interface ValidationWarning {
  row: number;
  message: string;
  sheet?: string;
}

export interface ValidationResult<T> {
  valid: T[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
}

export interface ValidatedForecastRow {
  skuId: number;
  retailerId: number;
  sku: string;
  retailer: string;
  month: Date;
  forecastedUnits: number;
  rowNumber: number;
  sheetName: string;
}

/**
 * Validates parsed forecast rows against master data.
 *
 * Checks:
 * - SKU exists in master data (case-insensitive)
 * - Retailer exists in master data (case-insensitive)
 * - Month is within 2 years of today
 * - ForecastedUnits is positive
 * - No duplicates within batch (sku + retailer + month)
 *
 * Returns validation result with valid rows, errors, warnings, and summary.
 */
export async function validateForecastRows(
  rows: ParsedForecastRow[]
): Promise<ValidationResult<ValidatedForecastRow>> {
  const valid: ValidatedForecastRow[] = [];
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Query master data once
  const allSkus = await db
    .select({ sku: skus.sku, id: skus.id })
    .from(skus);

  const allRetailers = await db
    .select({ name: retailers.name, id: retailers.id })
    .from(retailers);

  // Build lookup maps (case-insensitive)
  const skuMap = new Map<string, number>();
  for (const s of allSkus) {
    skuMap.set(s.sku.toLowerCase(), s.id);
  }

  const retailerMap = new Map<string, number>();
  for (const r of allRetailers) {
    retailerMap.set(r.name.toLowerCase(), r.id);
  }

  // Track duplicates within batch
  const seen = new Set<string>();

  // Date validation: within 2 years of today
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), 1);
  const twoYearsAhead = new Date(now.getFullYear() + 2, now.getMonth(), 1);

  for (const row of rows) {
    const rowErrors: ValidationError[] = [];

    // Validate SKU exists
    const skuId = skuMap.get(row.sku.toLowerCase());
    if (!skuId) {
      rowErrors.push({
        row: row.rowNumber,
        field: "sku",
        message: `SKU "${row.sku}" not found in master data`,
        sheet: row.sheetName,
      });
    }

    // Validate retailer exists
    const retailerId = retailerMap.get(row.retailer.toLowerCase());
    if (!retailerId) {
      rowErrors.push({
        row: row.rowNumber,
        field: "retailer",
        message: `Retailer "${row.retailer}" not found in master data`,
        sheet: row.sheetName,
      });
    }

    // Validate month is within range
    if (row.month < twoYearsAgo || row.month > twoYearsAhead) {
      rowErrors.push({
        row: row.rowNumber,
        field: "month",
        message: `Month ${row.month.toISOString().split('T')[0]} is outside valid range (2 years)`,
        sheet: row.sheetName,
      });
    }

    // Validate forecastedUnits is positive
    if (row.forecastedUnits <= 0) {
      rowErrors.push({
        row: row.rowNumber,
        field: "forecastedUnits",
        message: `Forecasted units must be positive (got ${row.forecastedUnits})`,
        sheet: row.sheetName,
      });
    }

    // Check for duplicates within batch
    if (skuId && retailerId) {
      const key = `${skuId}-${retailerId}-${row.month.toISOString()}`;
      if (seen.has(key)) {
        warnings.push({
          row: row.rowNumber,
          message: `Duplicate entry for SKU "${row.sku}", retailer "${row.retailer}", month ${row.month.toISOString().split('T')[0]} (later row will overwrite)`,
          sheet: row.sheetName,
        });
      }
      seen.add(key);
    }

    // If any errors, add to errors array and skip this row
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    // Row is valid
    valid.push({
      skuId: skuId!,
      retailerId: retailerId!,
      sku: row.sku,
      retailer: row.retailer,
      month: row.month,
      forecastedUnits: row.forecastedUnits,
      rowNumber: row.rowNumber,
      sheetName: row.sheetName,
    });
  }

  // Calculate summary
  const errorRowNumbers = new Set(errors.map(e => e.row));
  const warningRowNumbers = new Set(warnings.map(w => w.row));

  return {
    valid,
    errors,
    warnings,
    summary: {
      totalRows: rows.length,
      validRows: valid.length,
      errorRows: errorRowNumbers.size,
      warningRows: warningRowNumbers.size,
    },
  };
}
