"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import { Package, Box, Store } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function DashboardPage() {
  const { data: brandsCount, isLoading: brandsLoading } = trpc.brands.count.useQuery();
  const { data: skusCount, isLoading: skusLoading } = trpc.skus.count.useQuery();
  const { data: retailersCount, isLoading: retailersLoading } = trpc.retailers.count.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your supply chain master data
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
      </div>
    </div>
  );
}
