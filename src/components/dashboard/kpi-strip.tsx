"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import { DollarSign, Package, AlertTriangle, ShoppingCart } from "lucide-react";
import { trpc } from "@/lib/trpc";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);

export function KpiStrip() {
  const { data: kpis, isLoading } = trpc.dashboard.kpiStrip.useQuery();

  return (
    <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
      <StatCard
        title={kpis?.dataMonth ? `Revenue ${kpis.dataMonth}` : "Revenue MTD"}
        value={kpis ? formatCurrency(kpis.revenueMTD) : "$0"}
        icon={DollarSign}
        loading={isLoading}
        trend={kpis?.revenueTrendPct}
        subtitle="vs prior month"
        borderColor={
          kpis
            ? kpis.revenueTrendPct >= 0
              ? "border-l-green-500"
              : "border-l-red-500"
            : undefined
        }
      />
      <StatCard
        title={kpis?.dataMonth ? `Units ${kpis.dataMonth}` : "Units Shipped MTD"}
        value={kpis?.unitsMTD.toLocaleString() ?? "0"}
        icon={Package}
        loading={isLoading}
      />
      <StatCard
        title="SKUs at Risk"
        value={kpis?.skusAtRisk ?? 0}
        icon={AlertTriangle}
        loading={isLoading}
        borderColor={
          kpis && kpis.skusAtRisk > 0 ? "border-l-red-500" : undefined
        }
      />
      <StatCard
        title="Active POs"
        value={kpis?.activePOs ?? 0}
        icon={ShoppingCart}
        loading={isLoading}
        subtitle={
          kpis ? `${formatCurrency(kpis.activePOValue)} value` : undefined
        }
      />
    </div>
  );
}
