"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/dashboard/data-table";
import { createColumns, PurchaseOrder } from "./columns";
import { toast } from "sonner";

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [selectedBrand, setSelectedBrand] = React.useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] = React.useState<string | undefined>();

  const { data: purchaseOrders, isLoading } = trpc.orders.purchaseOrders.list.useQuery({
    brandId: selectedBrand,
    status: selectedStatus,
  });
  const { data: brands } = trpc.brands.list.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.orders.purchaseOrders.delete.useMutation({
    onSuccess: () => {
      toast.success("Purchase order deleted successfully");
      utils.orders.purchaseOrders.list.invalidate();
      utils.orders.purchaseOrders.count.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete purchase order: ${error.message}`);
    },
  });

  const handleView = (po: PurchaseOrder) => {
    router.push(`/orders/purchase-orders/${po.id}`);
  };

  const handleEdit = (po: PurchaseOrder) => {
    router.push(`/orders/purchase-orders/${po.id}/edit`);
  };

  const handleDelete = (po: PurchaseOrder) => {
    if (confirm(`Are you sure you want to delete purchase order "${po.poNumber}"?`)) {
      deleteMutation.mutate({ id: po.id });
    }
  };

  const columns = createColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground">
            Manage purchase orders from suppliers
          </p>
        </div>
        <Link href="/orders/purchase-orders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        </Link>
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
          value={selectedStatus ?? ""}
          onChange={(e) => setSelectedStatus(e.target.value || undefined)}
          className="flex h-10 w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="ordered">Ordered</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_transit">In Transit</option>
          <option value="arrived">Arrived</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={purchaseOrders ?? []}
        searchKey="poNumber"
        searchPlaceholder="Search purchase orders..."
        isLoading={isLoading}
      />
    </div>
  );
}
