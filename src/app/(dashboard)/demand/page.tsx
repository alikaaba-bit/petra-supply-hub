"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import { BrandSelector } from "@/components/demand/brand-selector";
import { ShortageAlerts } from "@/components/demand/shortage-alerts";
import { ExcessAlerts } from "@/components/demand/excess-alerts";
import { DemandSummaryCard } from "@/components/demand/demand-summary-card";
import { DataTable } from "@/components/dashboard/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfMonth, addMonths, format } from "date-fns";

type CrossBrandRow = {
  brandId: number;
  brandName: string;
  month: Date;
  forecastedUnits: number;
  orderedUnits: number;
  onHandUnits: number;
  inTransitUnits: number;
  allocatedUnits: number;
  availableUnits: number;
  balance: number;
};

const columns: ColumnDef<CrossBrandRow>[] = [
  {
    accessorKey: "brandName",
    header: "Brand",
  },
  {
    accessorKey: "month",
    header: "Month",
    cell: ({ row }) => format(new Date(row.getValue("month")), "MMM yyyy"),
  },
  {
    accessorKey: "forecastedUnits",
    header: "Forecasted",
    cell: ({ row }) => row.getValue<number>("forecastedUnits").toLocaleString(),
  },
  {
    accessorKey: "orderedUnits",
    header: "Ordered",
    cell: ({ row }) => row.getValue<number>("orderedUnits").toLocaleString(),
  },
  {
    accessorKey: "onHandUnits",
    header: "On Hand",
    cell: ({ row }) => row.getValue<number>("onHandUnits").toLocaleString(),
  },
  {
    accessorKey: "inTransitUnits",
    header: "In Transit",
    cell: ({ row }) => row.getValue<number>("inTransitUnits").toLocaleString(),
  },
  {
    accessorKey: "availableUnits",
    header: "Available",
    cell: ({ row }) => row.getValue<number>("availableUnits").toLocaleString(),
  },
  {
    accessorKey: "balance",
    header: "Balance",
    cell: ({ row }) => {
      const balance = row.getValue<number>("balance");
      return (
        <Badge variant={balance >= 0 ? "default" : "destructive"}>
          {balance >= 0 ? "+" : ""}
          {balance.toLocaleString()}
        </Badge>
      );
    },
  },
];

export default function DemandSummaryPage() {
  const [selectedBrandId, setSelectedBrandId] = React.useState<number | undefined>(undefined);
  const monthStart = startOfMonth(new Date());
  const monthEnd = addMonths(monthStart, 3);

  const { data: crossBrandData, isLoading: summaryLoading } = trpc.demand.crossBrandSummary.useQuery({
    monthStart,
    monthEnd,
    brandId: selectedBrandId,
  });

  const { data: shortageAlerts, isLoading: shortagesLoading } = trpc.alerts.shortages.useQuery({
    brandId: selectedBrandId,
    limit: 5,
  });

  const { data: excessAlerts, isLoading: excessLoading } = trpc.alerts.excesses.useQuery({
    brandId: selectedBrandId,
    limit: 5,
  });

  // Calculate summary cards for selected brand(s)
  const summaryCards = React.useMemo(() => {
    if (!crossBrandData || crossBrandData.length === 0) return [];

    const groupedByBrand = crossBrandData.reduce((acc, row) => {
      if (!acc[row.brandId]) {
        acc[row.brandId] = {
          brandName: row.brandName,
          forecastedUnits: 0,
          orderedUnits: 0,
          availableUnits: 0,
          balance: 0,
        };
      }
      acc[row.brandId].forecastedUnits += row.forecastedUnits;
      acc[row.brandId].orderedUnits += row.orderedUnits;
      acc[row.brandId].availableUnits += row.availableUnits;
      acc[row.brandId].balance += row.balance;
      return acc;
    }, {} as Record<number, { brandName: string; forecastedUnits: number; orderedUnits: number; availableUnits: number; balance: number }>);

    return Object.values(groupedByBrand);
  }, [crossBrandData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Demand Summary</h1>
          <p className="text-muted-foreground">
            Forecasted vs ordered vs available inventory across all brands
          </p>
        </div>
        <BrandSelector selectedBrandId={selectedBrandId} onBrandChange={setSelectedBrandId} />
      </div>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[180px]" />
          ))}
        </div>
      ) : summaryCards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {summaryCards.map((card, index) => (
            <DemandSummaryCard
              key={index}
              title={card.brandName}
              forecastedUnits={card.forecastedUnits}
              orderedUnits={card.orderedUnits}
              availableUnits={card.availableUnits}
              balance={card.balance}
            />
          ))}
        </div>
      ) : null}

      {/* Alert Panels */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          {shortagesLoading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <ShortageAlerts alerts={shortageAlerts ?? []} />
          )}
        </div>
        <div>
          {excessLoading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <ExcessAlerts alerts={excessAlerts ?? []} />
          )}
        </div>
      </div>

      {/* Main Table */}
      {summaryLoading ? (
        <Skeleton className="h-[400px]" />
      ) : crossBrandData && crossBrandData.length > 0 ? (
        <DataTable
          columns={columns}
          data={crossBrandData}
          searchKey="brandName"
          searchPlaceholder="Search brands..."
        />
      ) : (
        <div className="rounded-md border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            No forecast data available. Import forecasts via the Import page.
          </p>
        </div>
      )}
    </div>
  );
}
