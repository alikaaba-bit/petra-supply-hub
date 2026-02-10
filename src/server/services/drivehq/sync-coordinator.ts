/**
 * DriveHQ Sync Coordinator
 *
 * Orchestrates downloading the latest files from DriveHQ FTP
 * and processing them through the appropriate processors.
 * Each entity syncs independently — if one fails, others still run.
 * Tracks processed filenames to avoid duplicate processing.
 */

import { db } from "@/server/db";
import { sellercloudSyncLog } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { downloadLatestFile } from "./ftp-client";
import { processInventoryFile } from "./processors/inventory";
import { processProfitLossFile } from "./processors/profit-loss";
import { processOrdersFile } from "./processors/orders";

const DRIVEHQ_PATHS = {
  profitLoss:
    "/sellercloud/Profit and Loss/Product Profit Details/",
  inventory:
    "/sellercloud/Inventory/Inventory by Warehouse Detail/",
  orders: "/sellercloud/Order Detail/Order by Date/",
} as const;

interface SyncEntityResult {
  entityType: string;
  status: "completed" | "failed" | "skipped";
  fileName: string | null;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  errorMessage: string | null;
  durationMs: number;
}

export interface SyncResult {
  results: SyncEntityResult[];
  totalDurationMs: number;
}

/**
 * Check if a file was already processed by looking at sync log.
 */
async function wasFileProcessed(
  entityType: string,
  fileName: string
): Promise<boolean> {
  const existing = await db
    .select()
    .from(sellercloudSyncLog)
    .where(
      and(
        eq(sellercloudSyncLog.entityType, entityType),
        eq(sellercloudSyncLog.fileName, fileName),
        eq(sellercloudSyncLog.status, "completed"),
        eq(sellercloudSyncLog.syncSource, "drivehq")
      )
    )
    .limit(1);

  return existing.length > 0;
}

/**
 * Create a sync log entry.
 */
async function createSyncLog(
  entityType: string,
  fileName: string | null,
  triggeredBy: string | null
): Promise<number> {
  const [log] = await db
    .insert(sellercloudSyncLog)
    .values({
      entityType,
      status: "running",
      fileName,
      syncSource: "drivehq",
      triggeredBy,
    })
    .returning();
  return log.id;
}

/**
 * Update a sync log entry with result.
 */
async function updateSyncLog(
  logId: number,
  result: {
    status: string;
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    errorMessage: string | null;
  }
): Promise<void> {
  await db
    .update(sellercloudSyncLog)
    .set({
      status: result.status,
      syncCompletedAt: new Date(),
      recordsProcessed: result.recordsProcessed,
      recordsCreated: result.recordsCreated,
      recordsUpdated: result.recordsUpdated,
      errorMessage: result.errorMessage,
    })
    .where(eq(sellercloudSyncLog.id, logId));
}

/**
 * Sync a single entity type.
 */
async function syncEntity(
  entityType: string,
  ftpPath: string,
  processor: (data: Buffer) => Promise<{
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    errors: string[];
  }>,
  triggeredBy: string | null
): Promise<SyncEntityResult> {
  const start = Date.now();

  try {
    // Download latest file
    const file = await downloadLatestFile(ftpPath);
    if (!file) {
      return {
        entityType,
        status: "skipped",
        fileName: null,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        errorMessage: "No files found in directory",
        durationMs: Date.now() - start,
      };
    }

    // Check if already processed
    const alreadyProcessed = await wasFileProcessed(entityType, file.fileName);
    if (alreadyProcessed) {
      return {
        entityType,
        status: "skipped",
        fileName: file.fileName,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        errorMessage: `File ${file.fileName} already processed`,
        durationMs: Date.now() - start,
      };
    }

    // Create sync log entry
    const logId = await createSyncLog(entityType, file.fileName, triggeredBy);

    try {
      // Process file
      const result = await processor(file.data);

      const errorMsg =
        result.errors.length > 0
          ? result.errors.slice(0, 10).join("; ")
          : null;

      await updateSyncLog(logId, {
        status: "completed",
        recordsProcessed: result.recordsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        errorMessage: errorMsg,
      });

      return {
        entityType,
        status: "completed",
        fileName: file.fileName,
        recordsProcessed: result.recordsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        errorMessage: errorMsg,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : String(err);
      await updateSyncLog(logId, {
        status: "failed",
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        errorMessage,
      });

      return {
        entityType,
        status: "failed",
        fileName: file.fileName,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        errorMessage,
        durationMs: Date.now() - start,
      };
    }
  } catch (err) {
    return {
      entityType,
      status: "failed",
      fileName: null,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      errorMessage: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Run the full DriveHQ sync — all 3 entities independently.
 */
export async function runDriveHQSync(
  triggeredBy: string | null = null
): Promise<SyncResult> {
  const totalStart = Date.now();

  console.log("[DriveHQ Sync] Starting sync...");

  // Run all three syncs independently (sequentially to avoid FTP connection limits)
  const inventoryResult = await syncEntity(
    "drivehq-inventory",
    DRIVEHQ_PATHS.inventory,
    processInventoryFile,
    triggeredBy
  );
  console.log(
    `[DriveHQ Sync] Inventory: ${inventoryResult.status} (${inventoryResult.durationMs}ms)`
  );

  const pnlResult = await syncEntity(
    "drivehq-pnl",
    DRIVEHQ_PATHS.profitLoss,
    processProfitLossFile,
    triggeredBy
  );
  console.log(
    `[DriveHQ Sync] P&L: ${pnlResult.status} (${pnlResult.durationMs}ms)`
  );

  const ordersResult = await syncEntity(
    "drivehq-orders",
    DRIVEHQ_PATHS.orders,
    processOrdersFile,
    triggeredBy
  );
  console.log(
    `[DriveHQ Sync] Orders: ${ordersResult.status} (${ordersResult.durationMs}ms)`
  );

  const totalDurationMs = Date.now() - totalStart;
  console.log(`[DriveHQ Sync] Complete in ${totalDurationMs}ms`);

  return {
    results: [inventoryResult, pnlResult, ordersResult],
    totalDurationMs,
  };
}
