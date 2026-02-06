"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import { BrandSelector } from "@/components/demand/brand-selector";
import { DataTable } from "@/components/dashboard/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { startOfMonth, subMonths, format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type SkuRow = {
  skuId: number;
  sku: string;
  skuName: string;
  brandName: string;
  forecastedUnits: number;
  orderedUnits: number;
  onHandUnits: number;
  inTransitUnits: number;
  allocatedUnits: number;
  availableUnits: number;
  shortage: number;
  excess: number;
};

const columns: ColumnDef<SkuRow>[] = [
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue("sku")}</span>
    ),
  },
  {
    accessorKey: "skuName",
    header: "SKU Name",
  },
  {
    accessorKey: "brandName",
    header: "Brand",
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
    accessorKey: "allocatedUnits",
    header: "Allocated",
    cell: ({ row }) => row.getValue<number>("allocatedUnits").toLocaleString(),
  },
  {
    accessorKey: "availableUnits",
    header: "Available",
    cell: ({ row }) => row.getValue<number>("availableUnits").toLocaleString(),
  },
  {
    accessorKey: "shortage",
    header: "Shortage",
    cell: ({ row }) => {
      const shortage = row.getValue<number>("shortage");
      if (shortage <= 0) return null;
      return (
        <Badge variant="destructive">
          {shortage.toLocaleString()} short
        </Badge>
      );
    },
  },
  {
    accessorKey: "excess",
    header: "Excess",
    cell: ({ row }) => {
      const excess = row.getValue<number>("excess");
      if (excess <= 0) return null;
      return (
        <Badge className="bg-amber-500">
          {excess.toLocaleString()} excess
        </Badge>
      );
    },
  },
];

export default function SkuDrillDownPage() {
  const [selectedBrandId, setSelectedBrandId] = React.useState<number | undefined>(undefined);
  const currentMonth = startOfMonth(new Date());
  const [selectedMonth, setSelectedMonth] = React.useState<Date>(currentMonth);
  const [page, setPage] = React.useState(0);
  const limit = 50;

  // Generate month options (current month + past 3 months)
  const monthOptions = React.useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => subMonths(currentMonth, i));
  }, [currentMonth]);

  const { data: skuData, isLoading } = trpc.demand.skuDrillDown.useQuery({
    month: selectedMonth,
    brandId: selectedBrandId,
    limit,
    offset: page * limit,
  });

  const totalPages = skuData ? Math.ceil(skuData.totalCount / limit) : 0;
  const hasNextPage = page < totalPages - 1;
  const hasPrevPage = page > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SKU Drill-Down</h1>
          <p className="text-muted-foreground">
            Complete balance sheet per SKU with shortage and excess indicators
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedMonth.toISOString()}
            onValueChange={(value) => {
              setSelectedMonth(new Date(value));
              setPage(0); // Reset pagination on month change
            }}
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
          <BrandSelector
            selectedBrandId={selectedBrandId}
            onBrandChange={(brandId) => {
              setSelectedBrandId(brandId);
              setPage(0); // Reset pagination on brand change
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[600px]" />
      ) : skuData && skuData.items.length > 0 ? (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={skuData.items}
            searchKey="skuName"
            searchPlaceholder="Search SKUs..."
          />

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, skuData.totalCount)} of{" "}
              {skuData.totalCount.toLocaleString()} SKUs
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={!hasPrevPage}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="text-sm font-medium">
                Page {page + 1} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={!hasNextPage}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            No SKU forecast data available for the selected period.
          </p>
        </div>
      )}
    </div>
  );
}
