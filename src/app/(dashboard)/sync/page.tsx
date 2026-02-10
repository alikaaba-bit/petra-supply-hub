"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, Package, Info, HardDrive, TrendingUp, ShoppingCart } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

function SyncStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { color: string; text: string }> = {
    running: { color: "bg-blue-100 text-blue-800 border-blue-200", text: "Running" },
    completed: { color: "bg-green-100 text-green-800 border-green-200", text: "Completed" },
    failed: { color: "bg-red-100 text-red-800 border-red-200", text: "Failed" },
    skipped: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", text: "Skipped" },
  };

  const variant = variants[status] ?? variants.completed;

  return (
    <Badge variant="outline" className={variant.color}>
      {variant.text}
    </Badge>
  );
}

const DRIVEHQ_ENTITY_LABELS: Record<string, { label: string; icon: typeof HardDrive }> = {
  "drivehq-inventory": { label: "Inventory", icon: Package },
  "drivehq-pnl": { label: "Profit & Loss", icon: TrendingUp },
  "drivehq-orders": { label: "Orders", icon: ShoppingCart },
};

export default function SyncManagementPage() {
  const [isSyncingPOs, setIsSyncingPOs] = useState(false);
  const [isSyncingInventory, setIsSyncingInventory] = useState(false);
  const [isSyncingDriveHQ, setIsSyncingDriveHQ] = useState(false);

  const { data: syncStatus, refetch: refetchSyncStatus } = trpc.sellercloud.syncStatus.useQuery();
  const { data: lastPOSync } = trpc.sellercloud.lastSync.useQuery({ entityType: "purchase_order" });
  const { data: lastInventorySync } = trpc.sellercloud.lastSync.useQuery({ entityType: "inventory" });
  const { data: driveHQStatus, refetch: refetchDriveHQ } = trpc.sellercloud.driveHQSyncStatus.useQuery();

  const syncPurchaseOrders = trpc.sellercloud.syncPurchaseOrders.useMutation({
    onSuccess: (data) => {
      if (data.error) {
        toast.error("SellerCloud not configured", {
          description: data.error,
        });
      } else {
        toast.success("Purchase orders sync completed", {
          description: `Processed: ${data.recordsProcessed} | Created: ${data.recordsCreated} | Updated: ${data.recordsUpdated}`,
        });
        refetchSyncStatus();
      }
      setIsSyncingPOs(false);
    },
    onError: (error) => {
      toast.error("Purchase orders sync failed", {
        description: error.message,
      });
      setIsSyncingPOs(false);
    },
  });

  const syncInventory = trpc.sellercloud.syncInventory.useMutation({
    onSuccess: (data) => {
      if (data.error) {
        toast.error("SellerCloud not configured", {
          description: data.error,
        });
      } else {
        toast.success("Inventory sync completed", {
          description: `Processed: ${data.recordsProcessed} | Created: ${data.recordsCreated} | Updated: ${data.recordsUpdated}`,
        });
        refetchSyncStatus();
      }
      setIsSyncingInventory(false);
    },
    onError: (error) => {
      toast.error("Inventory sync failed", {
        description: error.message,
      });
      setIsSyncingInventory(false);
    },
  });

  const triggerDriveHQ = trpc.sellercloud.triggerDriveHQSync.useMutation({
    onSuccess: (data) => {
      const completed = data.results.filter((r) => r.status === "completed").length;
      const failed = data.results.filter((r) => r.status === "failed").length;
      const skipped = data.results.filter((r) => r.status === "skipped").length;

      if (failed > 0) {
        toast.error("DriveHQ sync completed with errors", {
          description: `Completed: ${completed} | Failed: ${failed} | Skipped: ${skipped}`,
        });
      } else {
        toast.success("DriveHQ sync completed", {
          description: `Completed: ${completed} | Skipped: ${skipped} | ${data.totalDurationMs}ms`,
        });
      }
      refetchSyncStatus();
      refetchDriveHQ();
      setIsSyncingDriveHQ(false);
    },
    onError: (error) => {
      toast.error("DriveHQ sync failed", {
        description: error.message,
      });
      setIsSyncingDriveHQ(false);
    },
  });

  const handleSyncPurchaseOrders = () => {
    setIsSyncingPOs(true);
    syncPurchaseOrders.mutate({});
  };

  const handleSyncInventory = () => {
    setIsSyncingInventory(true);
    syncInventory.mutate({});
  };

  const handleDriveHQSync = () => {
    setIsSyncingDriveHQ(true);
    triggerDriveHQ.mutate();
  };

  const isNotConfigured = !process.env.NEXT_PUBLIC_TRPC_URL;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Sync</h1>
        <p className="text-muted-foreground">
          Manage data synchronization from SellerCloud and DriveHQ
        </p>
      </div>

      {/* DriveHQ Auto-Sync Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">DriveHQ Auto-Sync (Hourly)</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {driveHQStatus?.map((entity) => {
            const meta = DRIVEHQ_ENTITY_LABELS[entity.entityType];
            if (!meta) return null;
            const Icon = meta.icon;
            const sync = entity.lastSync;

            return (
              <Card key={entity.entityType}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4" />
                    {meta.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sync ? (
                    <>
                      <div className="flex items-center justify-between">
                        <SyncStatusBadge status={sync.status} />
                        <span className="text-xs text-muted-foreground">
                          {sync.syncCompletedAt
                            ? format(new Date(sync.syncCompletedAt), "MMM d, h:mm a")
                            : "In progress..."}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {sync.fileName && (
                          <div>File: {sync.fileName}</div>
                        )}
                        <div>
                          Processed: {sync.recordsProcessed ?? 0} |
                          Created: {sync.recordsCreated ?? 0} |
                          Updated: {sync.recordsUpdated ?? 0}
                        </div>
                      </div>
                      {sync.errorMessage && (
                        <div className="text-xs text-red-600 truncate" title={sync.errorMessage}>
                          {sync.errorMessage}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Never synced
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="mt-3">
          <Button
            onClick={handleDriveHQSync}
            disabled={isSyncingDriveHQ}
            variant="outline"
          >
            {isSyncingDriveHQ ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing DriveHQ...
              </>
            ) : (
              <>
                <HardDrive className="h-4 w-4 mr-2" />
                Trigger DriveHQ Sync Now
              </>
            )}
          </Button>
        </div>
      </div>

      {/* SellerCloud API Sync Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">SellerCloud API Sync</h2>

        {isNotConfigured && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Configuration Required</AlertTitle>
            <AlertDescription>
              SellerCloud credentials are not configured. Set SELLERCLOUD_BASE_URL, SELLERCLOUD_USERNAME, and SELLERCLOUD_PASSWORD environment variables to enable sync.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Sync Purchase Orders
              </CardTitle>
              <CardDescription>
                Import purchase orders from SellerCloud
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {lastPOSync && (
                <div className="text-sm text-muted-foreground">
                  Last sync: {format(new Date(lastPOSync.syncCompletedAt!), "MMM d, yyyy 'at' h:mm a")}
                </div>
              )}
              <Button
                onClick={handleSyncPurchaseOrders}
                disabled={isSyncingPOs}
                className="w-full"
              >
                {isSyncingPOs ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Purchase Orders
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Sync Inventory
              </CardTitle>
              <CardDescription>
                Update inventory levels from SellerCloud
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {lastInventorySync && (
                <div className="text-sm text-muted-foreground">
                  Last sync: {format(new Date(lastInventorySync.syncCompletedAt!), "MMM d, yyyy 'at' h:mm a")}
                </div>
              )}
              <Button
                onClick={handleSyncInventory}
                disabled={isSyncingInventory}
                className="w-full"
              >
                {isSyncingInventory ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Sync Inventory
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sync History */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Sync History</h2>
        <Card>
          <CardContent className="pt-6">
            {!syncStatus || syncStatus.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No sync history available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Started At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncStatus.map((sync) => {
                    const duration = sync.syncCompletedAt && sync.syncStartedAt
                      ? Math.round((new Date(sync.syncCompletedAt).getTime() - new Date(sync.syncStartedAt).getTime()) / 1000)
                      : null;

                    return (
                      <TableRow key={sync.id}>
                        <TableCell className="font-medium capitalize">
                          {sync.entityType.replace(/[-_]/g, " ")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {sync.syncSource ?? "api"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <SyncStatusBadge status={sync.status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                          {sync.fileName ?? "—"}
                        </TableCell>
                        <TableCell>{sync.recordsProcessed ?? 0}</TableCell>
                        <TableCell>{sync.recordsCreated ?? 0}</TableCell>
                        <TableCell>{sync.recordsUpdated ?? 0}</TableCell>
                        <TableCell>
                          {duration !== null ? `${duration}s` : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(sync.syncStartedAt), "MMM d, h:mm a")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
