"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Box, ShoppingCart, ShoppingBag, AlertTriangle, TrendingUp, ArrowRight, FileUp, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import Link from "next/link";

export default function ExecutiveSummaryPage() {
  const { data: brandsCount, isLoading: brandsLoading } = trpc.brands.count.useQuery();
  const { data: skusCount, isLoading: skusLoading } = trpc.skus.count.useQuery();
  const { data: purchaseOrdersCount, isLoading: poLoading } = trpc.orders.purchaseOrders.count.useQuery();
  const { data: retailOrdersCount, isLoading: roLoading } = trpc.orders.retailOrders.count.useQuery();
  const { data: alertsSummary, isLoading: alertsLoading } = trpc.alerts.summary.useQuery({});
  const { data: monthlySummary, isLoading: monthlyLoading } = trpc.demand.monthlySummary.useQuery({});
  const { data: forecastsCount } = trpc.import.forecasts.count.useQuery();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Executive Summary</h1>
        <p className="text-muted-foreground">
          One-screen health check — {format(new Date(), "MMMM d, yyyy")}
        </p>
      </div>

      {/* Key Numbers */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Key Numbers</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Brands"
            value={brandsCount ?? 0}
            icon={Package}
            loading={brandsLoading}
          />
          <StatCard
            title="Total SKUs"
            value={skusCount ?? 0}
            icon={Box}
            loading={skusLoading}
          />
          <StatCard
            title="Active POs"
            value={purchaseOrdersCount ?? 0}
            icon={ShoppingCart}
            loading={poLoading}
          />
          <StatCard
            title="Active Retail Orders"
            value={retailOrdersCount ?? 0}
            icon={ShoppingBag}
            loading={roLoading}
          />
        </div>
      </div>

      {/* Alert Summary */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Alerts</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Shortage Alerts */}
          <Card className={alertsSummary && alertsSummary.totalShortageSkus > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className={alertsSummary && alertsSummary.totalShortageSkus > 0 ? "h-5 w-5 text-red-600" : "h-5 w-5 text-green-600"} />
                Shortage Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="h-20 animate-pulse rounded bg-muted" />
              ) : alertsSummary && alertsSummary.totalShortageSkus > 0 ? (
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-red-700">{alertsSummary.totalShortageSkus} SKUs</div>
                  <p className="text-sm text-muted-foreground">Total shortage: {alertsSummary.totalShortageUnits.toLocaleString()} units</p>
                  {alertsSummary.topShortages.length > 0 && (
                    <div className="space-y-1 border-t pt-2">
                      <p className="text-xs font-medium">Top 3 shortages:</p>
                      {alertsSummary.topShortages.map((item) => (
                        <div key={item.sku} className="text-xs">
                          <span className="font-medium">{item.sku}</span> — {item.skuName} ({item.brandName}) — {item.shortage.toLocaleString()} units
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-green-700">All Clear</div>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">No shortages</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Excess Alerts */}
          <Card className={alertsSummary && alertsSummary.totalExcessSkus > 0 ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className={alertsSummary && alertsSummary.totalExcessSkus > 0 ? "h-5 w-5 text-amber-600" : "h-5 w-5 text-green-600"} />
                Excess Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="h-20 animate-pulse rounded bg-muted" />
              ) : alertsSummary && alertsSummary.totalExcessSkus > 0 ? (
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-amber-700">{alertsSummary.totalExcessSkus} SKUs</div>
                  <p className="text-sm text-muted-foreground">Total excess: {alertsSummary.totalExcessUnits.toLocaleString()} units</p>
                  {alertsSummary.topExcesses.length > 0 && (
                    <div className="space-y-1 border-t pt-2">
                      <p className="text-xs font-medium">Top 3 excesses:</p>
                      {alertsSummary.topExcesses.map((item) => (
                        <div key={item.sku} className="text-xs">
                          <span className="font-medium">{item.sku}</span> — {item.skuName} ({item.brandName}) — {item.excess.toLocaleString()} units
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-green-700">All Clear</div>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">No excess</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Monthly Trend */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Monthly Trend</h2>
        <Card>
          <CardContent className="pt-6">
            {monthlyLoading ? (
              <div className="h-24 animate-pulse rounded bg-muted" />
            ) : monthlySummary && monthlySummary.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-4">
                {monthlySummary.map((monthData) => {
                  const balance = monthData.orderedUnits + monthData.availableUnits - monthData.forecastedUnits;
                  const isPositive = balance >= 0;
                  return (
                    <div
                      key={monthData.month.toISOString()}
                      className={`rounded-lg border p-4 ${isPositive ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
                    >
                      <div className="text-sm font-medium mb-2">{format(monthData.month, "MMM yyyy")}</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Forecasted:</span>
                          <span className="font-medium">{monthData.forecastedUnits.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ordered:</span>
                          <span className="font-medium">{monthData.orderedUnits.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Available:</span>
                          <span className="font-medium">{monthData.availableUnits.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1">
                          <span className="font-medium">Balance:</span>
                          <span className={`font-bold ${isPositive ? "text-green-700" : "text-red-700"}`}>
                            {isPositive ? "+" : ""}{balance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">No monthly data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Action Items</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {alertsSummary && alertsSummary.totalShortageSkus > 0 && (
                <Link
                  href="/demand/by-sku"
                  className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="font-medium">Review {alertsSummary.totalShortageSkus} SKUs with inventory shortages</div>
                      <div className="text-xs text-muted-foreground">Identify SKUs needing urgent reorder</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}

              {alertsSummary && alertsSummary.totalExcessSkus > 0 && (
                <Link
                  href="/demand/by-sku"
                  className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-amber-600" />
                    <div>
                      <div className="font-medium">Review {alertsSummary.totalExcessSkus} SKUs with excess inventory</div>
                      <div className="text-xs text-muted-foreground">Optimize stock levels and prevent overstock</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}

              {(forecastsCount === undefined || forecastsCount === 0) && (
                <Link
                  href="/import"
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileUp className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Import forecast data</div>
                      <div className="text-xs text-muted-foreground">Upload Excel files to populate demand forecasts</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}

              <Link
                href="/sync"
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Sync SellerCloud data for latest inventory</div>
                    <div className="text-xs text-muted-foreground">Update purchase orders and inventory levels</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              {alertsSummary && alertsSummary.totalShortageSkus === 0 && alertsSummary.totalExcessSkus === 0 && forecastsCount && forecastsCount > 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-lg font-medium mb-2">All systems operational</div>
                  <div className="text-sm">No urgent actions required at this time</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
