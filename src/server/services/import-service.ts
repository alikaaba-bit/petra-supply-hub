import { db } from "@/server/db";
import { forecasts } from "@/server/db/schema";
import { sql } from "drizzle-orm";
import type { ValidatedForecastRow } from "./validators/forecast-validator";
import type { ValidatedSalesRow } from "./validators/sales-validator";

/**
 * Batch upserts forecast data into the forecasts table.
 *
 * Uses onConflictDoUpdate on (skuId, retailerId, month) unique constraint.
 * On conflict, updates forecastedUnits, source, and updatedAt.
 *
 * Processes in batches of 100 to avoid oversized queries.
 *
 * @returns Count of imported and updated rows
 */
export async function importForecasts(
  rows: ValidatedForecastRow[],
  userId: string
): Promise<{ imported: number; updated: number }> {
  if (rows.length === 0) {
    return { imported: 0, updated: 0 };
  }

  const batchSize = 100;
  let imported = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const records = batch.map(row => ({
      skuId: row.skuId,
      retailerId: row.retailerId,
      month: row.month,
      forecastedUnits: row.forecastedUnits,
      source: "excel_import" as const,
      createdBy: userId,
      updatedAt: new Date(),
    }));

    const result = await db
      .insert(forecasts)
      .values(records)
      .onConflictDoUpdate({
        target: [forecasts.skuId, forecasts.retailerId, forecasts.month],
        set: {
          forecastedUnits: sql`EXCLUDED.forecasted_units`,
          source: sql`EXCLUDED.source`,
          updatedAt: sql`EXCLUDED.updated_at`,
        },
      });

    // Note: Drizzle doesn't return affected rows count in a standard way
    // We'll approximate by assuming all rows were either inserted or updated
    imported += batch.length;
  }

  return { imported, updated: 0 };
}

/**
 * Batch upserts retail sales data into the retailSales table.
 *
 * Uses onConflictDoUpdate on (skuId, retailerId, month) unique constraint.
 * On conflict, updates unitsSold, revenue, source, and updatedAt.
 *
 * Processes in batches of 100 to avoid oversized queries.
 *
 * @returns Count of imported rows
 */
export async function importRetailSales(
  rows: ValidatedSalesRow[],
  userId: string
): Promise<{ imported: number }> {
  if (rows.length === 0) {
    return { imported: 0 };
  }

  // Note: retailSales table will be added in Task 4
  // For now, this is a placeholder that will be functional after schema update

  const batchSize = 100;
  let imported = 0;

  // TODO: Uncomment when retailSales table is added to schema
  /*
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const records = batch.map(row => ({
      skuId: row.skuId,
      retailerId: row.retailerId,
      month: row.month,
      unitsSold: row.unitsSold,
      revenue: row.revenue,
      source: "excel_import" as const,
      createdBy: userId,
      updatedAt: new Date(),
    }));

    await db
      .insert(retailSales)
      .values(records)
      .onConflictDoUpdate({
        target: [retailSales.skuId, retailSales.retailerId, retailSales.month],
        set: {
          unitsSold: sql`EXCLUDED.units_sold`,
          revenue: sql`EXCLUDED.revenue`,
          source: sql`EXCLUDED.source`,
          updatedAt: sql`EXCLUDED.updated_at`,
        },
      });

    imported += batch.length;
  }
  */

  return { imported };
}
