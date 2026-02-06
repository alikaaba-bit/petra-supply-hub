"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Warehouse,
  Truck,
  Package,
  ShoppingBag,
  ArrowRight,
  Box,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { StatusBadge } from "@/components/tracking/status-badge";
import { format } from "date-fns";

export function WarehouseDashboardClient() {
  // Get inbound shipments (shipped/in_transit POs)
  const { data: inboundPOs, isLoading: inboundLoading } =
    trpc.tracking.supplierOrders.useQuery({});

  // Get retail orders needing allocation
  const { data: retailOrders, isLoading: retailLoading } =
    trpc.tracking.retailOrders.useQuery({});

  // Get current stock levels
  const { data: crossBrandSummary, isLoading: stockLoading } =
    trpc.demand.crossBrandSummary.useQuery({
      monthStart: new Date(),
      monthEnd: new Date(),
    });

  // Filter inbound shipments
  const inboundShipments =
    inboundPOs?.filter(
      (po) => po.status === "shipped" || po.status === "in_transit"
    ) ?? [];

  // Filter retail orders needing allocation (confirmed/processing)
  const ordersNeedingAllocation =
    retailOrders?.filter(
      (order) =>
        order.status === "confirmed" || order.status === "processing"
    ) ?? [];

  // Calculate total stock levels
  const totalOnHand =
    crossBrandSummary?.reduce((sum, item) => sum + item.onHandUnits, 0) ?? 0;
  const totalInTransit =
    crossBrandSummary?.reduce((sum, item) => sum + item.inTransitUnits, 0) ?? 0;
  const totalAllocated =
    crossBrandSummary?.reduce((sum, item) => sum + item.allocatedUnits, 0) ?? 0;
  const totalAvailable = totalOnHand + totalInTransit - totalAllocated;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Warehouse className="h-8 w-8" />
          <h1 className="text-3xl font-bold tracking-tight">Warehouse View</h1>
        </div>
        <p className="text-muted-foreground">
          Inbound shipments and stock levels — {format(new Date(), "MMMM d, yyyy")}
        </p>
      </div>

      {/* Stock Levels */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Current Stock Levels</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Box className="h-4 w-4 text-muted-foreground" />
                On Hand
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stockLoading ? (
                <div className="h-8 animate-pulse rounded bg-muted" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {totalOnHand.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">units in warehouse</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                In Transit
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stockLoading ? (
                <div className="h-8 animate-pulse rounded bg-muted" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {totalInTransit.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">units arriving</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                Allocated
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stockLoading ? (
                <div className="h-8 animate-pulse rounded bg-muted" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {totalAllocated.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">units allocated</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-green-600" />
                Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stockLoading ? (
                <div className="h-8 animate-pulse rounded bg-muted" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-700">
                    {totalAvailable.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">units free</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inbound Shipments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Inbound Shipments</h2>
          <Link
            href="/tracking/supplier-orders"
            className="text-sm text-primary hover:underline"
          >
            View all POs
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            {inboundLoading ? (
              <div className="h-48 animate-pulse rounded bg-muted" />
            ) : inboundShipments.length > 0 ? (
              <div className="space-y-3">
                {inboundShipments.map((po) => (
                  <Link
                    key={po.id}
                    href={`/orders/purchase-orders/${po.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                      <div className="space-y-1">
                        <div className="font-medium">{po.poNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {po.supplier} • {po.brand.name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {po.expectedArrival
                            ? format(po.expectedArrival, "MMM d, yyyy")
                            : "No arrival date"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {po.totalAmount?.toLocaleString() ?? "N/A"} {po.currency}
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
                No inbound shipments at this time
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items Needing Allocation */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Items Needing Allocation</h2>
          <Link
            href="/tracking/retail-orders"
            className="text-sm text-primary hover:underline"
          >
            View all orders
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            {retailLoading ? (
              <div className="h-48 animate-pulse rounded bg-muted" />
            ) : ordersNeedingAllocation.length > 0 ? (
              <div className="space-y-3">
                {ordersNeedingAllocation.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/retail-orders/${order.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="h-5 w-5 text-amber-600" />
                      <div className="space-y-1">
                        <div className="font-medium">
                          {order.retailerPoNumber}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.retailer.name} • {order.brand.name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          Ship by: {order.shipByDate ? format(order.shipByDate, "MMM d, yyyy") : "No date"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${order.totalAmount?.toLocaleString() ?? "N/A"}
                        </div>
                      </div>
                      <StatusBadge status={order.status} />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No orders needing allocation
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock by Brand */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Stock by Brand</h2>
        <Card>
          <CardContent className="pt-6">
            {stockLoading ? (
              <div className="h-48 animate-pulse rounded bg-muted" />
            ) : crossBrandSummary && crossBrandSummary.length > 0 ? (
              <div className="space-y-3">
                {crossBrandSummary.map((brand) => (
                  <div
                    key={brand.brandId}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <div className="font-medium">{brand.brandName}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <div className="text-muted-foreground">On Hand</div>
                        <div className="font-medium">
                          {brand.onHandUnits.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-muted-foreground">In Transit</div>
                        <div className="font-medium">
                          {brand.inTransitUnits.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-muted-foreground">Allocated</div>
                        <div className="font-medium">
                          {brand.allocatedUnits.toLocaleString()}
                        </div>
                      </div>
                      <Badge
                        variant="default"
                        className="min-w-[100px] justify-center bg-green-600"
                      >
                        {brand.availableUnits.toLocaleString()} avail
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No stock data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
