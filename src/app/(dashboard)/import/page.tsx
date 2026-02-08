"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  Package,
  Target,
  TrendingUp,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

interface DataSource {
  name: string;
  icon: React.ElementType;
  description: string;
  source: string;
  tables: string[];
  dashboardImpact: string;
}

const DATA_SOURCES: DataSource[] = [
  {
    name: "Inventory",
    icon: Package,
    description: "On-hand quantities, allocated, in-transit",
    source: "SellerCloud",
    tables: ["inventory"],
    dashboardImpact: "Layer 2 pipeline weights, KPI strip",
  },
  {
    name: "Purchase Orders",
    icon: ShoppingCart,
    description: "PO status, line items, expected arrivals",
    source: "SellerCloud",
    tables: ["purchase_orders", "po_line_items"],
    dashboardImpact: "Layer 2 pipeline (on-order, in-production), action items",
  },
  {
    name: "Retail Sales",
    icon: TrendingUp,
    description: "Units sold, revenue by SKU by retailer",
    source: "Sheets sync",
    tables: ["retail_sales"],
    dashboardImpact: "Layer 1 velocity scoring, revenue actuals, trend charts",
  },
  {
    name: "Forecasts",
    icon: Database,
    description: "Forecasted demand per SKU per month",
    source: "Sheets sync",
    tables: ["forecasts"],
    dashboardImpact: "Layer 3 demand capping (prevents cross-subsidizing)",
  },
  {
    name: "Revenue Targets",
    icon: Target,
    description: "Monthly revenue targets per brand per channel",
    source: "Scorecard sync",
    tables: ["revenue_targets"],
    dashboardImpact: "Target numbers in supply validation hero section",
  },
];

function SyncStatusBadge({ status }: { status: string }) {
  if (status === "running") {
    return (
      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
        Running
      </Badge>
    );
  }
  if (status === "completed") {
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Synced
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
        <XCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
      <Clock className="h-3 w-3 mr-1" />
      Pending
    </Badge>
  );
}

export default function DataSyncPage() {
  const [isSyncingPOs, setIsSyncingPOs] = useState(false);
  const [isSyncingInventory, setIsSyncingInventory] = useState(false);

  const { data: syncStatus, refetch: refetchSyncStatus } =
    trpc.sellercloud.syncStatus.useQuery();
  const { data: lastPOSync } = trpc.sellercloud.lastSync.useQuery({
    entityType: "purchase_order",
  });
  const { data: lastInventorySync } = trpc.sellercloud.lastSync.useQuery({
    entityType: "inventory",
  });

  // Target counts
  const { data: targets } = trpc.dashboard.targets.list.useQuery({});

  const syncPurchaseOrders = trpc.sellercloud.syncPurchaseOrders.useMutation({
    onSuccess: (data) => {
      if (data.error) {
        toast.error("SellerCloud not configured", { description: data.error });
      } else {
        toast.success("Purchase orders synced", {
          description: `${data.recordsProcessed} processed, ${data.recordsCreated} created, ${data.recordsUpdated} updated`,
        });
        refetchSyncStatus();
      }
      setIsSyncingPOs(false);
    },
    onError: (error) => {
      toast.error("Sync failed", { description: error.message });
      setIsSyncingPOs(false);
    },
  });

  const syncInventory = trpc.sellercloud.syncInventory.useMutation({
    onSuccess: (data) => {
      if (data.error) {
        toast.error("SellerCloud not configured", { description: data.error });
      } else {
        toast.success("Inventory synced", {
          description: `${data.recordsProcessed} processed, ${data.recordsCreated} created, ${data.recordsUpdated} updated`,
        });
        refetchSyncStatus();
      }
      setIsSyncingInventory(false);
    },
    onError: (error) => {
      toast.error("Sync failed", { description: error.message });
      setIsSyncingInventory(false);
    },
  });

  const targetCount = (targets ?? []).filter((t) => t.channel === "all").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Pipeline</h1>
        <p className="text-muted-foreground">
          All data syncs automatically from SellerCloud and Sheets. Manual triggers available below.
        </p>
      </div>

      {/* Pipeline Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Inventory */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Inventory
              </CardTitle>
              {lastInventorySync ? (
                <SyncStatusBadge status="completed" />
              ) : (
                <SyncStatusBadge status="pending" />
              )}
            </div>
            <CardDescription>SellerCloud — on-hand, allocated, in-transit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lastInventorySync?.syncCompletedAt && (
              <div className="text-xs text-muted-foreground">
                Last: {format(new Date(lastInventorySync.syncCompletedAt), "MMM d, h:mm a")}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Powers: Layer 2 pipeline weights
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                setIsSyncingInventory(true);
                syncInventory.mutate({});
              }}
              disabled={isSyncingInventory}
            >
              {isSyncingInventory ? (
                <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1.5" />
              )}
              Sync Now
            </Button>
          </CardContent>
        </Card>

        {/* Purchase Orders */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Purchase Orders
              </CardTitle>
              {lastPOSync ? (
                <SyncStatusBadge status="completed" />
              ) : (
                <SyncStatusBadge status="pending" />
              )}
            </div>
            <CardDescription>SellerCloud — POs, line items, arrivals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lastPOSync?.syncCompletedAt && (
              <div className="text-xs text-muted-foreground">
                Last: {format(new Date(lastPOSync.syncCompletedAt), "MMM d, h:mm a")}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Powers: Layer 2 on-order/in-production, action items
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                setIsSyncingPOs(true);
                syncPurchaseOrders.mutate({});
              }}
              disabled={isSyncingPOs}
            >
              {isSyncingPOs ? (
                <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1.5" />
              )}
              Sync Now
            </Button>
          </CardContent>
        </Card>

        {/* Retail Sales */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Retail Sales
              </CardTitle>
              <SyncStatusBadge status="completed" />
            </div>
            <CardDescription>Sheets — units sold, revenue by SKU</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Auto-syncs daily from Google Sheets
            </div>
            <div className="text-xs text-muted-foreground">
              Powers: Layer 1 velocity scoring, revenue actuals, KPIs
            </div>
          </CardContent>
        </Card>

        {/* Forecasts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                Forecasts
              </CardTitle>
              <SyncStatusBadge status="completed" />
            </div>
            <CardDescription>Sheets — demand forecasts per SKU</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Auto-syncs daily from Google Sheets
            </div>
            <div className="text-xs text-muted-foreground">
              Powers: Layer 3 demand capping (no cross-subsidizing)
            </div>
          </CardContent>
        </Card>

        {/* Revenue Targets */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Revenue Targets
              </CardTitle>
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {targetCount} targets
              </Badge>
            </div>
            <CardDescription>Scorecard — monthly targets per brand</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Auto-syncs from master scorecard
            </div>
            <div className="text-xs text-muted-foreground">
              Powers: Supply validation targets, coverage thresholds
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How the Pipeline Feeds the Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How Data Flows to the Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="font-mono text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded mt-0.5">L1</div>
              <div>
                <div className="font-medium">Velocity Scoring</div>
                <div className="text-xs text-muted-foreground">
                  Retail Sales (90d history) → classify every SKU as A/B/C/D/F/N → weight inventory sellability
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded mt-0.5">L2</div>
              <div>
                <div className="font-medium">Pipeline Reliability</div>
                <div className="text-xs text-muted-foreground">
                  Inventory + POs → weight by certainty: on-hand 1.0x, in-transit 0.9x, on-order 0.7x, in-production 0.5x
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="font-mono text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded mt-0.5">L3</div>
              <div>
                <div className="font-medium">Demand Capping</div>
                <div className="text-xs text-muted-foreground">
                  Forecasts → cap each SKU at min(supply, demand) → excess in one SKU can't mask shortage in another
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="font-mono text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded mt-0.5">L4</div>
              <div>
                <div className="font-medium">Concentration Risk</div>
                <div className="text-xs text-muted-foreground">
                  Revenue Targets + all layers → penalize if top 3 SKUs dominate → one stockout shouldn't kill the quarter
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync History</CardTitle>
        </CardHeader>
        <CardContent>
          {!syncStatus || syncStatus.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No sync history yet. Trigger a manual sync above or wait for the daily auto-sync.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Processed</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncStatus.map((sync) => (
                  <TableRow key={sync.id}>
                    <TableCell className="font-medium capitalize">
                      {sync.entityType.replace("_", " ")}
                    </TableCell>
                    <TableCell>
                      <SyncStatusBadge status={sync.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {sync.recordsProcessed ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {sync.recordsCreated ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {sync.recordsUpdated ?? 0}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(sync.syncStartedAt), "MMM d, h:mm a")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
