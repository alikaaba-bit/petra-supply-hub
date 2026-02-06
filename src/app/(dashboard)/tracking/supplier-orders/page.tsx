"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/dashboard/data-table";
import { columns } from "./columns";
import { OrderStatusCard } from "@/components/tracking/order-status-card";

export default function SupplierOrdersPage() {
  const [selectedBrand, setSelectedBrand] = React.useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] = React.useState<string | undefined>();

  const { data: supplierOrders, isLoading } = trpc.tracking.supplierOrders.useQuery({
    brandId: selectedBrand,
    status: selectedStatus,
  });

  const { data: brands } = trpc.brands.list.useQuery();
  const { data: statusSummary } = trpc.tracking.statusSummary.useQuery();

  // Calculate total and status counts for OrderStatusCard
  const poStatusCounts = statusSummary?.purchaseOrders ?? [];
  const totalPOs = poStatusCounts.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier PO Tracking</h1>
          <p className="text-muted-foreground">
            Track purchase orders from suppliers with lead time visibility
          </p>
        </div>
      </div>

      {/* Status Summary Card */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <OrderStatusCard
          title="Purchase Orders"
          counts={poStatusCounts}
          total={totalPOs}
        />
      </div>

      {/* Filters */}
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
          value={selectedStatus ?? ""}
          onChange={(e) => setSelectedStatus(e.target.value || undefined)}
          className="flex h-10 w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="ordered">Ordered</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_production">In Production</option>
          <option value="shipped">Shipped</option>
          <option value="in_transit">In Transit</option>
          <option value="arrived">Arrived</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={supplierOrders ?? []}
        searchKey="poNumber"
        searchPlaceholder="Search supplier orders..."
        isLoading={isLoading}
      />
    </div>
  );
}
