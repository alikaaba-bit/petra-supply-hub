"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Store, TrendingUp, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { StatusBadge } from "@/components/tracking/status-badge";
import { format } from "date-fns";

export function SalesDashboardClient() {
  // Get recent retail orders
  const { data: retailOrders, isLoading: ordersLoading } =
    trpc.tracking.retailOrders.useQuery({});

  // Get demand by retailer for current month
  const { data: retailerBreakdown, isLoading: breakdownLoading } =
    trpc.demand.retailerBreakdown.useQuery({
      month: new Date(),
    });

  // Get forecast summary
  const { data: monthlySummary, isLoading: monthlyLoading } =
    trpc.demand.monthlySummary.useQuery({});

  // Group recent orders by status
  const ordersByStatus = retailOrders?.reduce(
    (acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Users className="h-8 w-8" />
          <h1 className="text-3xl font-bold tracking-tight">Sales View</h1>
        </div>
        <p className="text-muted-foreground">
          Retailer orders and demand tracking — {format(new Date(), "MMMM d, yyyy")}
        </p>
      </div>

      {/* Retailer Order Status */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Retailer Order Status</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Status Summary Cards */}
          {ordersByStatus &&
            Object.entries(ordersByStatus).map(([status, count]) => (
              <Card key={status}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    <StatusBadge status={status} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-xs text-muted-foreground">
                    {count === 1 ? "order" : "orders"}
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

      {/* Recent Retail Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent Retail Orders</h2>
          <Link
            href="/tracking/retail-orders"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            {ordersLoading ? (
              <div className="h-48 animate-pulse rounded bg-muted" />
            ) : retailOrders && retailOrders.length > 0 ? (
              <div className="space-y-3">
                {retailOrders.slice(0, 10).map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/retail-orders/${order.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">
                        {order.retailerPoNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.retailer.name} • {order.brand.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          ${order.totalAmount?.toLocaleString() ?? "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.orderDate ? format(order.orderDate, "MMM d, yyyy") : "No date"}
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
                No retail orders found
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Demand by Retailer */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            Demand by Retailer ({format(new Date(), "MMMM")})
          </h2>
          <Link
            href="/demand/by-retailer"
            className="text-sm text-primary hover:underline"
          >
            View details
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            {breakdownLoading ? (
              <div className="h-48 animate-pulse rounded bg-muted" />
            ) : retailerBreakdown && retailerBreakdown.length > 0 ? (
              <div className="space-y-3">
                {retailerBreakdown.map((item) => {
                  // retailerBreakdown only includes forecasted and ordered, no available
                  const gap = item.forecastedUnits - item.orderedUnits;
                  const needsOrder = gap > 0;
                  return (
                    <div
                      key={item.retailerId}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Store className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{item.retailerName}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.brandName}
                          </div>
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
                        <Badge
                          variant={needsOrder ? "destructive" : "default"}
                          className="min-w-[100px] justify-center"
                        >
                          {needsOrder ? `-${gap.toLocaleString()}` : "Fulfilled"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No demand data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Forecast Summary */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Forecast Summary</h2>
        <Card>
          <CardContent className="pt-6">
            {monthlyLoading ? (
              <div className="h-24 animate-pulse rounded bg-muted" />
            ) : monthlySummary && monthlySummary.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-4">
                {monthlySummary.map((monthData) => {
                  const balance =
                    monthData.orderedUnits +
                    monthData.availableUnits -
                    monthData.forecastedUnits;
                  const isPositive = balance >= 0;
                  return (
                    <div
                      key={monthData.month.toISOString()}
                      className={`rounded-lg border p-4 ${
                        isPositive
                          ? "border-green-200 bg-green-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="text-sm font-medium mb-2">
                        {format(monthData.month, "MMM yyyy")}
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Forecasted:
                          </span>
                          <span className="font-medium">
                            {monthData.forecastedUnits.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ordered:</span>
                          <span className="font-medium">
                            {monthData.orderedUnits.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Available:
                          </span>
                          <span className="font-medium">
                            {monthData.availableUnits.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1">
                          <span className="font-medium">Balance:</span>
                          <span
                            className={`font-bold ${
                              isPositive ? "text-green-700" : "text-red-700"
                            }`}
                          >
                            {isPositive ? "+" : ""}
                            {balance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No forecast data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
