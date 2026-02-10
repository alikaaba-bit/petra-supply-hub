import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { getSellerCloudClient } from "@/server/services/sellercloud-client";
import {
  sellercloudSyncLog,
  sellercloudIdMap,
  purchaseOrders,
  inventory,
  skus,
} from "@/server/db/schema";
import { eq, desc, and, like } from "drizzle-orm";
import { runDriveHQSync } from "@/server/services/drivehq/sync-coordinator";

/**
 * Map SellerCloud PO status to local status values
 */
function mapPOStatus(scStatus: string): string {
  const statusMap: Record<string, string> = {
    Saved: "draft",
    Ordered: "ordered",
    Received: "received",
    Pending: "pending",
    Cancelled: "cancelled",
    Completed: "completed",
  };

  return statusMap[scStatus] ?? "draft";
}

/**
 * Check if SellerCloud credentials are configured
 */
function checkSellerCloudConfigured() {
  const baseUrl = process.env.SELLERCLOUD_BASE_URL;
  const username = process.env.SELLERCLOUD_USERNAME;
  const password = process.env.SELLERCLOUD_PASSWORD;

  return !!(baseUrl && username && password);
}

export const sellercloudRouter = router({
  /**
   * Sync purchase orders from SellerCloud
   * Creates/updates local POs based on SellerCloud data
   */
  syncPurchaseOrders: protectedProcedure
    .input(
      z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        statuses: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if SellerCloud is configured
      if (!checkSellerCloudConfigured()) {
        return {
          error:
            "SellerCloud not configured. Set SELLERCLOUD_BASE_URL, SELLERCLOUD_USERNAME, SELLERCLOUD_PASSWORD in .env",
          syncLogId: 0,
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
        };
      }

      // Create sync log entry
      const [syncLog] = await ctx.db
        .insert(sellercloudSyncLog)
        .values({
          entityType: "purchase_order",
          status: "running",
          triggeredBy: ctx.session.user.id,
        })
        .returning();

      let recordsProcessed = 0;
      let recordsCreated = 0;
      let recordsUpdated = 0;

      try {
        const client = getSellerCloudClient();

        // Fetch all POs with filters
        const params: any = {};
        if (input.dateFrom) params.createDateFrom = input.dateFrom;
        if (input.dateTo) params.createDateTo = input.dateTo;
        if (input.statuses?.length) params.pOStatuses = input.statuses;

        const purchaseOrdersData = await client.getAllPurchaseOrders(params);

        // Process each PO
        for (const scPO of purchaseOrdersData) {
          recordsProcessed++;

          // Check if PO already synced
          const existingMapping = await ctx.db
            .select()
            .from(sellercloudIdMap)
            .where(
              and(
                eq(sellercloudIdMap.entityType, "purchase_order"),
                eq(sellercloudIdMap.sellercloudId, String(scPO.ID))
              )
            )
            .limit(1);

          const rawDataString = JSON.stringify(scPO);

          if (existingMapping.length > 0) {
            // Check if data changed
            const hasChanges =
              existingMapping[0].rawData !== rawDataString;

            if (hasChanges) {
              // Update local PO
              await ctx.db
                .update(purchaseOrders)
                .set({
                  poNumber: scPO.PONumber ?? `SC-${scPO.ID}`,
                  supplier: String(scPO.VendorID ?? ""),
                  status: mapPOStatus(scPO.Status ?? "Saved"),
                  orderDate: scPO.OrderDate ? new Date(scPO.OrderDate) : null,
                  expectedArrival: scPO.ExpectedArrivalDate
                    ? new Date(scPO.ExpectedArrivalDate)
                    : null,
                  actualArrival: scPO.ActualArrivalDate
                    ? new Date(scPO.ActualArrivalDate)
                    : null,
                  totalAmount: scPO.TotalAmount
                    ? String(scPO.TotalAmount)
                    : null,
                  notes: scPO.Notes ?? null,
                  updatedAt: new Date(),
                })
                .where(eq(purchaseOrders.id, existingMapping[0].localId));

              // Update mapping
              await ctx.db
                .update(sellercloudIdMap)
                .set({
                  rawData: rawDataString,
                  lastSyncedAt: new Date(),
                })
                .where(eq(sellercloudIdMap.id, existingMapping[0].id));

              recordsUpdated++;
            }
          } else {
            // Create new local PO
            // Note: brandId is required but we don't have vendor->brand mapping yet
            // For now, default to brandId 1 (should be configured via mapping table in future)
            const [newPO] = await ctx.db
              .insert(purchaseOrders)
              .values({
                poNumber: scPO.PONumber ?? `SC-${scPO.ID}`,
                brandId: 1, // TODO: Map VendorID to brandId via mapping table
                supplier: String(scPO.VendorID ?? ""),
                status: mapPOStatus(scPO.Status ?? "Saved"),
                orderDate: scPO.OrderDate ? new Date(scPO.OrderDate) : null,
                expectedArrival: scPO.ExpectedArrivalDate
                  ? new Date(scPO.ExpectedArrivalDate)
                  : null,
                actualArrival: scPO.ActualArrivalDate
                  ? new Date(scPO.ActualArrivalDate)
                  : null,
                totalAmount: scPO.TotalAmount ? String(scPO.TotalAmount) : null,
                notes: scPO.Notes ?? null,
                createdBy: ctx.session.user.id,
              })
              .returning();

            // Create mapping
            await ctx.db.insert(sellercloudIdMap).values({
              entityType: "purchase_order",
              sellercloudId: String(scPO.ID),
              localTableName: "purchase_orders",
              localId: newPO.id,
              rawData: rawDataString,
            });

            recordsCreated++;
          }
        }

        // Update sync log with success
        await ctx.db
          .update(sellercloudSyncLog)
          .set({
            status: "completed",
            syncCompletedAt: new Date(),
            recordsProcessed,
            recordsCreated,
            recordsUpdated,
          })
          .where(eq(sellercloudSyncLog.id, syncLog!.id));

        return {
          syncLogId: syncLog!.id,
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
        };
      } catch (error) {
        // Update sync log with failure
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        await ctx.db
          .update(sellercloudSyncLog)
          .set({
            status: "failed",
            syncCompletedAt: new Date(),
            errorMessage,
            recordsProcessed,
            recordsCreated,
            recordsUpdated,
          })
          .where(eq(sellercloudSyncLog.id, syncLog!.id));

        throw error;
      }
    }),

  /**
   * Sync inventory from SellerCloud
   * Updates local inventory records with current SellerCloud data
   */
  syncInventory: protectedProcedure
    .input(
      z.object({
        skuIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if SellerCloud is configured
      if (!checkSellerCloudConfigured()) {
        return {
          error:
            "SellerCloud not configured. Set SELLERCLOUD_BASE_URL, SELLERCLOUD_USERNAME, SELLERCLOUD_PASSWORD in .env",
          syncLogId: 0,
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
        };
      }

      // Create sync log entry
      const [syncLog] = await ctx.db
        .insert(sellercloudSyncLog)
        .values({
          entityType: "inventory",
          status: "running",
          triggeredBy: ctx.session.user.id,
        })
        .returning();

      let recordsProcessed = 0;
      let recordsCreated = 0;
      let recordsUpdated = 0;

      try {
        const client = getSellerCloudClient();

        // Get SKUs to sync
        const skusQuery = input.skuIds?.length
          ? ctx.db
              .select()
              .from(skus)
              .where(
                and(
                  ...input.skuIds.map((id) => eq(skus.id, id))
                )
              )
          : ctx.db.select().from(skus);

        const skusToSync = await skusQuery;

        // Process each SKU
        for (const sku of skusToSync) {
          recordsProcessed++;

          try {
            // Fetch inventory from SellerCloud using SKU code
            const scInventory = await client.getInventoryForProduct(sku.sku);

            // Check if local inventory record exists
            const existingInventory = await ctx.db
              .select()
              .from(inventory)
              .where(eq(inventory.skuId, sku.id))
              .limit(1);

            if (existingInventory.length > 0) {
              // Update existing inventory
              await ctx.db
                .update(inventory)
                .set({
                  quantityOnHand: scInventory.QuantityOnHand ?? 0,
                  quantityInTransit: scInventory.QuantityOnOrder ?? 0,
                  quantityAllocated: scInventory.QuantityReserved ?? 0,
                  source: "sellercloud",
                  lastUpdated: new Date(),
                  updatedBy: ctx.session.user.id,
                })
                .where(eq(inventory.id, existingInventory[0].id));

              recordsUpdated++;
            } else {
              // Create new inventory record
              await ctx.db.insert(inventory).values({
                skuId: sku.id,
                quantityOnHand: scInventory.QuantityOnHand ?? 0,
                quantityInTransit: scInventory.QuantityOnOrder ?? 0,
                quantityAllocated: scInventory.QuantityReserved ?? 0,
                source: "sellercloud",
                updatedBy: ctx.session.user.id,
              });

              recordsCreated++;
            }
          } catch (error) {
            // Log error but continue with other SKUs
            console.error(`Failed to sync inventory for SKU ${sku.sku}:`, error);
          }
        }

        // Update sync log with success
        await ctx.db
          .update(sellercloudSyncLog)
          .set({
            status: "completed",
            syncCompletedAt: new Date(),
            recordsProcessed,
            recordsCreated,
            recordsUpdated,
          })
          .where(eq(sellercloudSyncLog.id, syncLog!.id));

        return {
          syncLogId: syncLog!.id,
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
        };
      } catch (error) {
        // Update sync log with failure
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        await ctx.db
          .update(sellercloudSyncLog)
          .set({
            status: "failed",
            syncCompletedAt: new Date(),
            errorMessage,
            recordsProcessed,
            recordsCreated,
            recordsUpdated,
          })
          .where(eq(sellercloudSyncLog.id, syncLog!.id));

        throw error;
      }
    }),

  /**
   * Get recent sync status for all entity types
   * Returns last 10 sync operations
   */
  syncStatus: protectedProcedure.query(async ({ ctx }) => {
    const recentSyncs = await ctx.db
      .select()
      .from(sellercloudSyncLog)
      .orderBy(desc(sellercloudSyncLog.syncStartedAt))
      .limit(10);

    return recentSyncs;
  }),

  /**
   * Get most recent sync for a specific entity type
   */
  lastSync: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const lastSync = await ctx.db
        .select()
        .from(sellercloudSyncLog)
        .where(
          and(
            eq(sellercloudSyncLog.entityType, input.entityType),
            eq(sellercloudSyncLog.status, "completed")
          )
        )
        .orderBy(desc(sellercloudSyncLog.syncCompletedAt))
        .limit(1);

      return lastSync[0] ?? null;
    }),

  /**
   * Trigger a manual DriveHQ sync (all 3 entities)
   */
  triggerDriveHQSync: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await runDriveHQSync(ctx.session.user.id);
    return result;
  }),

  /**
   * Get DriveHQ sync status — latest sync per entity type
   */
  driveHQSyncStatus: protectedProcedure.query(async ({ ctx }) => {
    const entityTypes = ["drivehq-inventory", "drivehq-pnl", "drivehq-orders"];
    const statuses = [];

    for (const entityType of entityTypes) {
      const latest = await ctx.db
        .select()
        .from(sellercloudSyncLog)
        .where(eq(sellercloudSyncLog.entityType, entityType))
        .orderBy(desc(sellercloudSyncLog.syncStartedAt))
        .limit(1);

      statuses.push({
        entityType,
        lastSync: latest[0] ?? null,
      });
    }

    return statuses;
  }),
});
