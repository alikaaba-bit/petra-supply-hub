import type ExcelJS from "exceljs";

export type ExcelFormat = "RTL_FORECAST" | "HOP_FORECAST" | "RETAIL_SALES";

/**
 * Detects the format of an Excel workbook by analyzing sheet names and headers.
 *
 * RTL_FORECAST: Monthly PO sheets like "Jan 2026 PO", "Feb 2026 PO"
 * HOP_FORECAST: Product-centric with "Product"/"Item" in first column
 * RETAIL_SALES: Headers include "SKU" AND ("Units Sold" or "Revenue" or "Sales")
 */
export function detectFormat(workbook: ExcelJS.Workbook): ExcelFormat {
  const sheetNames = workbook.worksheets.map((ws) => ws.name);

  // Check for RTL format: monthly PO sheets
  const monthlyPoPattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}\s+po\b/i;
  const hasMonthlyPOSheets = sheetNames.some(name => monthlyPoPattern.test(name));

  if (hasMonthlyPOSheets) {
    return "RTL_FORECAST";
  }

  // Get first worksheet for header analysis
  const firstSheet = workbook.worksheets[0];
  if (!firstSheet) {
    throw new Error("Workbook is empty");
  }

  const headerRow = firstSheet.getRow(1);
  const headers: string[] = [];

  // Collect all header values (ExcelJS is 1-indexed, index 0 is undefined)
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const value = cell.value;
    if (value && typeof value === "string") {
      headers.push(value.toLowerCase().trim());
    } else if (value && typeof value === "object" && "text" in value) {
      // Handle rich text
      headers.push(String(value.text).toLowerCase().trim());
    }
  });

  // Check for RETAIL_SALES format
  const hasSKU = headers.some(h => h.includes("sku"));
  const hasSalesData = headers.some(h =>
    h.includes("units sold") ||
    h.includes("qty sold") ||
    h.includes("revenue") ||
    h.includes("sales")
  );

  if (hasSKU && hasSalesData) {
    return "RETAIL_SALES";
  }

  // Check for HOP_FORECAST format: Product/Item in first column
  const firstHeader = headers[0] || "";
  if (firstHeader.includes("product") || firstHeader.includes("item")) {
    return "HOP_FORECAST";
  }

  // Unable to determine format
  throw new Error(
    `Unable to detect Excel format. Sheet names: ${sheetNames.join(", ")}. ` +
    `First row headers: ${headers.join(", ")}`
  );
}
