"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import { DollarSign, Package, AlertTriangle, ShoppingCart } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

export function KpiStrip() {
  const { data: kpis, isLoading } = trpc.dashboard.kpiSummary.useQuery();

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-semibold">KPI Summary</h2>
        <span className="text-sm text-muted-foreground">
          ({format(new Date(), "MMM yyyy")} MTD)
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenue MTD"
          value={
            kpis
              ? kpis.revenueMTD.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                })
              : "$0"
          }
          icon={DollarSign}
          loading={isLoading}
        />
        <StatCard
          title="Units Shipped MTD"
          value={kpis?.unitsShippedMTD.toLocaleString() ?? 0}
          icon={Package}
          loading={isLoading}
        />
        <StatCard
          title="Open Alerts"
          value={kpis?.openAlerts ?? 0}
          icon={AlertTriangle}
          loading={isLoading}
        />
        <StatCard
          title="Active POs"
          value={kpis?.activePOs ?? 0}
          icon={ShoppingCart}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
