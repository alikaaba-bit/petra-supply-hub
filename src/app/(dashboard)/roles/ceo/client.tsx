"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  ShoppingBag,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { OrderStatusCard } from "@/components/tracking/order-status-card";
import { format } from "date-fns";

export function CEODashboardClient() {
  const { data: alertsSummary, isLoading: alertsLoading } =
    trpc.alerts.summary.useQuery({});
  const { data: statusSummary, isLoading: statusLoading } =
    trpc.tracking.statusSummary.useQuery();
  const { data: monthlySummary, isLoading: monthlyLoading } =
    trpc.demand.monthlySummary.useQuery({});

  // Calculate totals for OrderStatusCard
  const poTotal =
    statusSummary?.purchaseOrders.reduce((sum, s) => sum + s.count, 0) ?? 0;
  const retailTotal =
    statusSummary?.retailOrders.reduce((sum, s) => sum + s.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          <h1 className="text-3xl font-bold tracking-tight">CEO Overview</h1>
        </div>
        <p className="text-muted-foreground">
          Executive snapshot — {format(new Date(), "MMMM d, yyyy")}
        </p>
      </div>

      {/* Alerts Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Alerts Overview</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Shortage Alerts */}
          <Card
            className={
              alertsSummary && alertsSummary.totalShortageSkus > 0
                ? "border-red-200 bg-red-50"
                : "border-green-200 bg-green-50"
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle
                  className={
                    alertsSummary && alertsSummary.totalShortageSkus > 0
                      ? "h-5 w-5 text-red-600"
                      : "h-5 w-5 text-green-600"
                  }
                />
                Shortage Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="h-20 animate-pulse rounded bg-muted" />
              ) : alertsSummary && alertsSummary.totalShortageSkus > 0 ? (
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-red-700">
                    {alertsSummary.totalShortageSkus} SKUs
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {alertsSummary.totalShortageUnits.toLocaleString()} units short
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-green-700">
                    All Clear
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Excess Alerts */}
          <Card
            className={
              alertsSummary && alertsSummary.totalExcessSkus > 0
                ? "border-amber-200 bg-amber-50"
                : "border-green-200 bg-green-50"
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp
                  className={
                    alertsSummary && alertsSummary.totalExcessSkus > 0
                      ? "h-5 w-5 text-amber-600"
                      : "h-5 w-5 text-green-600"
                  }
                />
                Excess Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="h-20 animate-pulse rounded bg-muted" />
              ) : alertsSummary && alertsSummary.totalExcessSkus > 0 ? (
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-amber-700">
                    {alertsSummary.totalExcessSkus} SKUs
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {alertsSummary.totalExcessUnits.toLocaleString()} units excess
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-green-700">
                    All Clear
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Pipeline */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Order Pipeline</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {statusLoading ? (
            <>
              <div className="h-32 animate-pulse rounded bg-muted" />
              <div className="h-32 animate-pulse rounded bg-muted" />
            </>
          ) : (
            <>
              <OrderStatusCard
                title="Purchase Orders"
                counts={statusSummary?.purchaseOrders ?? []}
                total={poTotal}
              />
              <OrderStatusCard
                title="Retail Orders"
                counts={statusSummary?.retailOrders ?? []}
                total={retailTotal}
              />
            </>
          )}
        </div>
      </div>

      {/* Demand Health */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Demand Health</h2>
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
                No monthly data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Links</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Link
            href="/demand"
            className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Demand Summary</div>
                <div className="text-xs text-muted-foreground">
                  View all alerts and demand health
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/tracking/supplier-orders"
            className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Supplier Orders</div>
                <div className="text-xs text-muted-foreground">
                  Track purchase order status
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/tracking/retail-orders"
            className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Retail Orders</div>
                <div className="text-xs text-muted-foreground">
                  Track retailer order status
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/executive"
            className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Executive Summary</div>
                <div className="text-xs text-muted-foreground">
                  Detailed full-screen overview
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
}
