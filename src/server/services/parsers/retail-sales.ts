import type ExcelJS from "exceljs";

export interface ParsedSalesRow {
  sku: string;
  retailer: string;
  month: Date;
  unitsSold: number;
  revenue: number | null;
  rowNumber: number;
}

/**
 * Parses retail sales Excel files.
 *
 * Expected columns (case-insensitive, flexible matching):
 * - SKU
 * - Retailer
 * - Month/Date/Period
 * - Units Sold/Qty Sold
 * - Revenue/Sales Amount (optional)
 *
 * Returns array of sales rows with resolved SKU, retailer, month, units, revenue.
 */
export function parseRetailSales(workbook: ExcelJS.Workbook): ParsedSalesRow[] {
  const results: ParsedSalesRow[] = [];
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    throw new Error("Workbook is empty");
  }

  // Parse header row to map column names to indices
  const headerRow = sheet.getRow(1);
  const columnMap: {
    sku?: number;
    retailer?: number;
    month?: number;
    unitsSold?: number;
    revenue?: number;
  } = {};

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const value = cell.value;
    let header = "";

    if (typeof value === "string") {
      header = value.toLowerCase().trim();
    } else if (value && typeof value === "object" && "text" in value) {
      header = String(value.text).toLowerCase().trim();
    }

    // Map known column patterns
    if (header.includes("sku")) {
      columnMap.sku = colNumber;
    } else if (header.includes("retailer") || header.includes("customer")) {
      columnMap.retailer = colNumber;
    } else if (header.includes("month") || header.includes("date") || header.includes("period")) {
      columnMap.month = colNumber;
    } else if (header.includes("units sold") || header.includes("qty sold") || header.includes("quantity")) {
      columnMap.unitsSold = colNumber;
    } else if (header.includes("revenue") || header.includes("sales") || header.includes("amount")) {
      columnMap.revenue = colNumber;
    }
  });

  // Validate required columns
  if (!columnMap.sku || !columnMap.retailer || !columnMap.month || !columnMap.unitsSold) {
    throw new Error(
      `Missing required columns in retail sales file. Found: ${JSON.stringify(columnMap)}`
    );
  }

  // Parse data rows (row 2+)
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    // Extract SKU
    const skuCell = row.getCell(columnMap.sku!);
    const skuValue = skuCell.value;
    let sku = "";

    if (typeof skuValue === "string") {
      sku = skuValue.trim();
    } else if (typeof skuValue === "number") {
      sku = String(skuValue);
    } else if (skuValue && typeof skuValue === "object" && "text" in skuValue) {
      sku = String(skuValue.text).trim();
    }

    if (!sku) return; // Skip empty rows

    // Extract Retailer
    const retailerCell = row.getCell(columnMap.retailer!);
    const retailerValue = retailerCell.value;
    let retailer = "";

    if (typeof retailerValue === "string") {
      retailer = retailerValue.trim();
    } else if (retailerValue && typeof retailerValue === "object" && "text" in retailerValue) {
      retailer = String(retailerValue.text).trim();
    }

    if (!retailer) return;

    // Extract Month (date)
    const monthCell = row.getCell(columnMap.month!);
    const monthValue = monthCell.value;
    let month: Date | null = null;

    if (monthValue instanceof Date) {
      month = new Date(monthValue.getFullYear(), monthValue.getMonth(), 1);
    } else if (typeof monthValue === "string") {
      const parsed = new Date(monthValue);
      if (!isNaN(parsed.getTime())) {
        month = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      }
    }

    if (!month) return; // Skip rows with invalid dates

    // Extract Units Sold
    const unitsSoldCell = row.getCell(columnMap.unitsSold!);
    const unitsSoldValue = unitsSoldCell.value;
    let unitsSold = 0;

    if (typeof unitsSoldValue === "number") {
      unitsSold = Math.floor(unitsSoldValue);
    }

    if (unitsSold < 0) return; // Skip invalid quantities

    // Extract Revenue (optional)
    let revenue: number | null = null;
    if (columnMap.revenue) {
      const revenueCell = row.getCell(columnMap.revenue);
      const revenueValue = revenueCell.value;

      if (typeof revenueValue === "number") {
        revenue = revenueValue;
      }
    }

    results.push({
      sku,
      retailer,
      month,
      unitsSold,
      revenue,
      rowNumber,
    });
  });

  return results;
}
