"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import { Package, Box, Store, ShoppingCart, ShoppingBag, TrendingUp, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function DashboardPage() {
  const { data: brandsCount, isLoading: brandsLoading } = trpc.brands.count.useQuery();
  const { data: skusCount, isLoading: skusLoading } = trpc.skus.count.useQuery();
  const { data: retailersCount, isLoading: retailersLoading } = trpc.retailers.count.useQuery();
  const { data: purchaseOrdersCount, isLoading: poLoading } = trpc.orders.purchaseOrders.count.useQuery();
  const { data: retailOrdersCount, isLoading: roLoading } = trpc.orders.retailOrders.count.useQuery();
  const { data: forecastsCount, isLoading: forecastsLoading } = trpc.import.forecasts.count.useQuery();
  const { data: alertsSummary, isLoading: alertsLoading } = trpc.alerts.summary.useQuery({});
  const { data: monthlySummary, isLoading: monthlyLoading } = trpc.demand.monthlySummary.useQuery({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your supply chain operations
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
          title="Total Retailers"
          value={retailersCount ?? 0}
          icon={Store}
          loading={retailersLoading}
        />
        <StatCard
          title="Purchase Orders"
          value={purchaseOrdersCount ?? 0}
          icon={ShoppingCart}
          loading={poLoading}
        />
        <StatCard
          title="Retail Orders"
          value={retailOrdersCount ?? 0}
          icon={ShoppingBag}
          loading={roLoading}
        />
        <StatCard
          title="Forecasts"
          value={forecastsCount ?? 0}
          icon={TrendingUp}
          loading={forecastsLoading}
        />
      </div>

      {/* Demand Health Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Demand Health</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Shortage SKUs"
            value={alertsSummary?.totalShortageSkus ?? 0}
            icon={AlertTriangle}
            loading={alertsLoading}
          />
          <StatCard
            title="Excess SKUs"
            value={alertsSummary?.totalExcessSkus ?? 0}
            icon={TrendingUp}
            loading={alertsLoading}
          />
          <StatCard
            title="Total Forecasted (Current Month)"
            value={
              monthlySummary && monthlySummary.length > 0
                ? monthlySummary[0].forecastedUnits.toLocaleString()
                : 0
            }
            icon={TrendingUp}
            loading={monthlyLoading}
          />
        </div>
      </div>
    </div>
  );
}
