"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/dashboard/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type Forecast = {
  id: number;
  month: Date;
  forecastedUnits: number;
  orderedUnits: number | null;
  source: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  sku: {
    id: number;
    sku: string;
    name: string;
    brandId: number;
  };
  retailer: {
    id: number;
    name: string;
  };
};

const columns: ColumnDef<Forecast>[] = [
  {
    accessorKey: "sku",
    header: "SKU Code",
    cell: ({ row }) => {
      const sku = row.original.sku;
      return <span className="font-medium">{sku.sku}</span>;
    },
  },
  {
    accessorKey: "sku.name",
    header: "SKU Name",
    cell: ({ row }) => {
      const sku = row.original.sku;
      return <span>{sku.name}</span>;
    },
  },
  {
    accessorKey: "retailer",
    header: "Retailer",
    cell: ({ row }) => {
      const retailer = row.original.retailer;
      return <span>{retailer.name}</span>;
    },
  },
  {
    accessorKey: "month",
    header: "Month",
    cell: ({ row }) => {
      const month = row.getValue("month") as Date;
      return <span>{format(month, "MMM yyyy")}</span>;
    },
  },
  {
    accessorKey: "forecastedUnits",
    header: "Forecasted Units",
    cell: ({ row }) => {
      const units = row.getValue("forecastedUnits") as number;
      return <span className="font-medium">{units.toLocaleString()}</span>;
    },
  },
  {
    accessorKey: "orderedUnits",
    header: "Ordered Units",
    cell: ({ row }) => {
      const units = row.getValue("orderedUnits") as number | null;
      return <span className="text-muted-foreground">{units?.toLocaleString() || "—"}</span>;
    },
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => {
      const source = row.getValue("source") as string | null;
      return (
        <Badge variant={source === "excel" ? "secondary" : "default"}>
          {source?.toUpperCase() || "MANUAL"}
        </Badge>
      );
    },
  },
];

export default function ForecastsPage() {
  const [selectedBrand, setSelectedBrand] = React.useState<number | undefined>();
  const [selectedRetailer, setSelectedRetailer] = React.useState<number | undefined>();

  const { data: forecasts, isLoading } = trpc.import.forecasts.list.useQuery({
    brandId: selectedBrand,
    retailerId: selectedRetailer,
  });
  const { data: brands } = trpc.brands.list.useQuery();
  const { data: retailers } = trpc.retailers.list.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Forecasts</h1>
        <p className="text-muted-foreground">
          View imported forecast data across all brands and retailers
        </p>
      </div>

      <div className="flex items-center gap-4">
        <select
          value={selectedBrand ?? ""}
          onChange={(e) =>
            setSelectedBrand(e.target.value ? parseInt(e.target.value) : undefined)
          }
          className="flex h-10 w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">All Brands</option>
          {brands?.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>

        <select
          value={selectedRetailer ?? ""}
          onChange={(e) =>
            setSelectedRetailer(e.target.value ? parseInt(e.target.value) : undefined)
          }
          className="flex h-10 w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">All Retailers</option>
          {retailers?.map((retailer) => (
            <option key={retailer.id} value={retailer.id}>
              {retailer.name}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={forecasts ?? []}
        searchKey="sku.name"
        searchPlaceholder="Search forecasts..."
        isLoading={isLoading}
      />
    </div>
  );
}
