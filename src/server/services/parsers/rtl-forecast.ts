import type ExcelJS from "exceljs";

export interface ParsedForecastRow {
  sku: string;
  retailer: string;
  month: Date;
  forecastedUnits: number;
  rowNumber: number;
  sheetName: string;
}

/**
 * Parses RTL FORECAST_MASTER Excel format.
 *
 * Format:
 * - Multiple sheets named like "Jan 2026 PO", "Feb 2026 PO"
 * - Row 1: Headers (Column 1 = "Retailer", remaining columns = SKU codes)
 * - Row 2+: Data (Column 1 = retailer name, remaining = forecasted units per SKU)
 *
 * Returns array of forecast rows with SKU, retailer, month, units, row number, and sheet name.
 */
export function parseRTLForecast(workbook: ExcelJS.Workbook): ParsedForecastRow[] {
  const results: ParsedForecastRow[] = [];
  const monthlyPoPattern = /(\w{3})\s+(\d{4})\s+po/i;

  // Filter to monthly PO sheets
  const poSheets = workbook.worksheets.filter(ws =>
    monthlyPoPattern.test(ws.name)
  );

  if (poSheets.length === 0) {
    throw new Error("No monthly PO sheets found in workbook");
  }

  for (const sheet of poSheets) {
    // Extract month and year from sheet name
    const match = sheet.name.match(monthlyPoPattern);
    if (!match) continue;

    const [, monthAbbr, yearStr] = match;
    const year = parseInt(yearStr, 10);

    // Map month abbreviation to month index (0-11)
    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const monthIndex = monthMap[monthAbbr.toLowerCase()];
    if (monthIndex === undefined) continue;

    const month = new Date(year, monthIndex, 1);

    // Parse headers from row 1
    const headerRow = sheet.getRow(1);
    const skuHeaders: { colNumber: number; sku: string }[] = [];

    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      if (colNumber === 1) return; // Skip column 1 (Retailer)

      const value = cell.value;
      if (value && typeof value === "string") {
        skuHeaders.push({ colNumber, sku: value.trim() });
      } else if (value && typeof value === "object" && "text" in value) {
        skuHeaders.push({ colNumber, sku: String(value.text).trim() });
      }
    });

    // Parse data rows (row 2+)
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      // Get retailer name from column 1
      const retailerCell = row.getCell(1);
      const retailerValue = retailerCell.value;
      let retailer = "";

      if (typeof retailerValue === "string") {
        retailer = retailerValue.trim();
      } else if (retailerValue && typeof retailerValue === "object" && "text" in retailerValue) {
        retailer = String(retailerValue.text).trim();
      }

      if (!retailer) return; // Skip empty rows

      // Parse each SKU column
      for (const { colNumber, sku } of skuHeaders) {
        const cell = row.getCell(colNumber);
        const value = cell.value;

        // Only process numeric values
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
  }

  return results;
}
