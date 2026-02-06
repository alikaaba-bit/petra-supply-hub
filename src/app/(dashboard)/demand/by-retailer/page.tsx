"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import { BrandSelector } from "@/components/demand/brand-selector";
import { DataTable } from "@/components/dashboard/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { startOfMonth, subMonths, format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type RetailerRow = {
  retailerId: number;
  retailerName: string;
  brandId: number;
  brandName: string;
  forecastedUnits: number;
  orderedUnits: number;
};

const columns: ColumnDef<RetailerRow>[] = [
  {
    accessorKey: "retailerName",
    header: "Retailer",
  },
  {
    accessorKey: "brandName",
    header: "Brand",
  },
  {
    accessorKey: "forecastedUnits",
    header: "Forecasted Units",
    cell: ({ row }) => row.getValue<number>("forecastedUnits").toLocaleString(),
  },
  {
    accessorKey: "orderedUnits",
    header: "Ordered Units",
    cell: ({ row }) => row.getValue<number>("orderedUnits").toLocaleString(),
  },
  {
    id: "gap",
    header: "Gap",
    cell: ({ row }) => {
      const gap = row.original.forecastedUnits - row.original.orderedUnits;
      return (
        <span className={gap > 0 ? "text-red-600 font-semibold" : ""}>
          {gap > 0 ? "+" : ""}
          {gap.toLocaleString()}
        </span>
      );
    },
  },
];

export default function RetailerBreakdownPage() {
  const [selectedBrandId, setSelectedBrandId] = React.useState<number | undefined>(undefined);
  const currentMonth = startOfMonth(new Date());
  const [selectedMonth, setSelectedMonth] = React.useState<Date>(currentMonth);

  // Generate month options (current month + past 3 months)
  const monthOptions = React.useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => subMonths(currentMonth, i));
  }, [currentMonth]);

  const { data: retailerData, isLoading } = trpc.demand.retailerBreakdown.useQuery({
    month: selectedMonth,
    brandId: selectedBrandId,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retailer Breakdown</h1>
          <p className="text-muted-foreground">
            Demand per retailer across all brands
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedMonth.toISOString()}
            onValueChange={(value) => setSelectedMonth(new Date(value))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((month) => (
                <SelectItem key={month.toISOString()} value={month.toISOString()}>
                  {format(month, "MMM yyyy")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <BrandSelector selectedBrandId={selectedBrandId} onBrandChange={setSelectedBrandId} />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[500px]" />
      ) : retailerData && retailerData.length > 0 ? (
        <DataTable
          columns={columns}
          data={retailerData}
          searchKey="retailerName"
          searchPlaceholder="Search retailers..."
        />
      ) : (
        <div className="rounded-md border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            No retailer forecast data available for the selected period.
          </p>
        </div>
      )}
    </div>
  );
}
