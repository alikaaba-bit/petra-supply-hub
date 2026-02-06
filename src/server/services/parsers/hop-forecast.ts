import type ExcelJS from "exceljs";
import type { ParsedForecastRow } from "./rtl-forecast";

/**
 * Parses HOP product-centric forecast Excel format.
 *
 * Format (TENTATIVE - may need adjustment with real HOP files):
 * - Products/SKUs in rows
 * - First column: "Product", "Item", or "SKU"
 * - Subsequent columns: Retailer names or "Retailer - Month" patterns
 *
 * Since exact HOP format is not yet known, this parser implements a flexible
 * approach that can be adjusted when real files are available.
 *
 * Returns same ParsedForecastRow[] format as RTL parser for consistency.
 */
export function parseHOPForecast(workbook: ExcelJS.Workbook): ParsedForecastRow[] {
  const results: ParsedForecastRow[] = [];
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    throw new Error("Workbook is empty");
  }

  // Parse header row (row 1)
  const headerRow = sheet.getRow(1);
  const headers: { colNumber: number; value: string }[] = [];

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const value = cell.value;
    if (value && typeof value === "string") {
      headers.push({ colNumber, value: value.trim() });
    } else if (value && typeof value === "object" && "text" in value) {
      headers.push({ colNumber, value: String(value.text).trim() });
    }
  });

  if (headers.length === 0) {
    throw new Error("No headers found in HOP forecast sheet");
  }

  // First column should be product/SKU identifier
  const productColNumber = headers[0]?.colNumber ?? 1;

  // Parse retailer columns (columns 2+)
  const retailerColumns: {
    colNumber: number;
    retailer: string;
    month: Date;
  }[] = [];

  for (let i = 1; i < headers.length; i++) {
    const header = headers[i];
    if (!header) continue;

    // Try to parse "Retailer - Month Year" pattern
    const monthPattern = /(.+?)\s*[-–]\s*(\w{3})\s+(\d{4})/i;
    const match = header.value.match(monthPattern);

    if (match) {
      const [, retailerName, monthAbbr, yearStr] = match;
      const year = parseInt(yearStr, 10);

      const monthMap: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      const monthIndex = monthMap[monthAbbr.toLowerCase()];

      if (monthIndex !== undefined) {
        retailerColumns.push({
          colNumber: header.colNumber,
          retailer: retailerName.trim(),
          month: new Date(year, monthIndex, 1),
        });
      }
    } else {
      // Simple retailer name without month - use current month as placeholder
      const now = new Date();
      retailerColumns.push({
        colNumber: header.colNumber,
        retailer: header.value,
        month: new Date(now.getFullYear(), now.getMonth(), 1),
      });
    }
  }

  if (retailerColumns.length === 0) {
    throw new Error("No retailer columns found in HOP forecast sheet");
  }

  // Parse data rows (row 2+)
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    // Get SKU/Product from first column
    const productCell = row.getCell(productColNumber);
    const productValue = productCell.value;
    let sku = "";

    if (typeof productValue === "string") {
      sku = productValue.trim();
    } else if (productValue && typeof productValue === "object" && "text" in productValue) {
      sku = String(productValue.text).trim();
    }

    if (!sku) return; // Skip empty rows

    // Parse each retailer column
    for (const { colNumber, retailer, month } of retailerColumns) {
      const cell = row.getCell(colNumber);
      const value = cell.value;

      // Only process numeric values > 0
      if (typeof value === "number" && value > 0) {
        results.push({
          sku,
          retailer,
          month,
          forecastedUnits: Math.floor(value),
          rowNumber,
          sheetName: sheet.name,
        });
      }
    }
  });

  return results;
}
