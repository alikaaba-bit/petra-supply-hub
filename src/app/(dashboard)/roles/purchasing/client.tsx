"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clipboard,
  AlertTriangle,
  ShoppingCart,
  ArrowRight,
  Clock,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { StatusBadge } from "@/components/tracking/status-badge";
import { LeadTimeBadge } from "@/components/tracking/lead-time-badge";
import { format } from "date-fns";

export function PurchasingDashboardClient() {
  // Get shortage alerts
  const { data: shortages, isLoading: shortagesLoading } =
    trpc.alerts.shortages.useQuery({
      limit: 10,
    });

  // Get recent supplier orders
  const { data: supplierOrders, isLoading: ordersLoading } =
    trpc.tracking.supplierOrders.useQuery({});

  // Get lead time overview
  const { data: leadTimeOverview, isLoading: leadTimeLoading } =
    trpc.tracking.leadTimeOverview.useQuery({});

  // Calculate PO status counts
  const posByStatus = supplierOrders?.reduce(
    (acc, po) => {
      acc[po.status] = (acc[po.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate urgency breakdown
  const urgencyCounts = leadTimeOverview?.reduce(
    (acc, po) => {
      if (!po.daysUntilOrderBy) return acc;
      if (po.daysUntilOrderBy < 0) {
        acc.overdue++;
      } else if (po.daysUntilOrderBy <= 7) {
        acc.urgent++;
      } else {
        acc.normal++;
      }
      return acc;
    },
    { overdue: 0, urgent: 0, normal: 0 }
  ) ?? { overdue: 0, urgent: 0, normal: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Clipboard className="h-8 w-8" />
          <h1 className="text-3xl font-bold tracking-tight">Purchasing View</h1>
        </div>
        <p className="text-muted-foreground">
          Supply gaps and PO tracking — {format(new Date(), "MMMM d, yyyy")}
        </p>
      </div>

      {/* Supply Gaps */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Top Supply Gaps</h2>
          <Link
            href="/demand/by-sku"
            className="text-sm text-primary hover:underline"
          >
            View all shortages
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            {shortagesLoading ? (
              <div className="h-48 animate-pulse rounded bg-muted" />
            ) : shortages && shortages.length > 0 ? (
              <div className="space-y-3">
                {shortages.map((item) => (
                  <div
                    key={item.skuId}
                    className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{item.sku}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.skuName} • {item.brandName}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <div className="text-muted-foreground">Forecasted</div>
                        <div className="font-medium">
                          {item.forecastedUnits.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-muted-foreground">Ordered</div>
                        <div className="font-medium">
                          {item.orderedUnits.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-muted-foreground">Available</div>
                        <div className="font-medium">
                          {item.availableUnits.toLocaleString()}
                        </div>
                      </div>
                      <Badge variant="destructive" className="min-w-[100px] justify-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {item.shortage.toLocaleString()} short
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No shortage alerts — all supply levels healthy
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PO Tracking Status */}
      <div>
        <h2 className="text-lg font-semibold mb-3">PO Tracking Status</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {posByStatus &&
            Object.entries(posByStatus).map(([status, count]) => (
              <Card key={status}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    <StatusBadge status={status} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-xs text-muted-foreground">
                    {count === 1 ? "PO" : "POs"}
                  </p>
                </CardContent>
              </Card>
            ))}
          {ordersLoading && (
            <>
              <div className="h-32 animate-pulse rounded bg-muted" />
              <div className="h-32 animate-pulse rounded bg-muted" />
              <div className="h-32 animate-pulse rounded bg-muted" />
            </>
          )}
        </div>
      </div>

      {/* Recent Purchase Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent Purchase Orders</h2>
          <Link
            href="/tracking/supplier-orders"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            {ordersLoading ? (
              <div className="h-48 animate-pulse rounded bg-muted" />
            ) : supplierOrders && supplierOrders.length > 0 ? (
              <div className="space-y-3">
                {supplierOrders.slice(0, 10).map((po) => (
                  <Link
                    key={po.id}
                    href={`/orders/purchase-orders/${po.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{po.poNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {po.supplier} • {po.brand.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {po.totalAmount?.toLocaleString() ?? "N/A"} {po.currency}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {po.expectedArrival
                            ? `Arrive: ${format(po.expectedArrival, "MMM d")}`
                            : "No arrival date"}
                        </div>
                      </div>
                      <StatusBadge status={po.status} />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No purchase orders found
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lead Time Alerts */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Lead Time Alerts</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-600" />
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">
                {urgencyCounts.overdue}
              </div>
              <p className="text-xs text-muted-foreground">Past order-by date</p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Urgent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700">
                {urgencyCounts.urgent}
              </div>
              <p className="text-xs text-muted-foreground">7 days or less</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Normal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{urgencyCounts.normal}</div>
              <p className="text-xs text-muted-foreground">More than 7 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Active POs with urgency badges */}
        {leadTimeOverview && leadTimeOverview.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Active POs by Order-By Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leadTimeOverview.slice(0, 10).map((po) => (
                  <div
                    key={po.id}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <div className="font-medium">{po.poNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {po.supplier}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {po.orderByDate && (
                        <div className="text-xs text-muted-foreground">
                          Order by: {format(po.orderByDate, "MMM d")}
                        </div>
                      )}
                      {po.orderByDate && (
                        <LeadTimeBadge orderByDate={po.orderByDate} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
