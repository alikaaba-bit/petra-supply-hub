"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/dashboard/data-table";
import { createColumns, RetailOrder } from "./columns";
import { toast } from "sonner";

export default function RetailOrdersPage() {
  const router = useRouter();
  const [selectedRetailer, setSelectedRetailer] = React.useState<number | undefined>();
  const [selectedBrand, setSelectedBrand] = React.useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] = React.useState<string | undefined>();

  const { data: retailOrders, isLoading } = trpc.orders.retailOrders.list.useQuery({
    retailerId: selectedRetailer,
    brandId: selectedBrand,
    status: selectedStatus,
  });
  const { data: retailers } = trpc.retailers.list.useQuery();
  const { data: brands } = trpc.brands.list.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.orders.retailOrders.delete.useMutation({
    onSuccess: () => {
      toast.success("Retail order deleted successfully");
      utils.orders.retailOrders.list.invalidate();
      utils.orders.retailOrders.count.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete retail order: ${error.message}`);
    },
  });

  const handleView = (order: RetailOrder) => {
    router.push(`/orders/retail-orders/${order.id}`);
  };

  const handleEdit = (order: RetailOrder) => {
    router.push(`/orders/retail-orders/${order.id}/edit`);
  };

  const handleDelete = (order: RetailOrder) => {
    const identifier = order.retailerPoNumber || `order #${order.id}`;
    if (confirm(`Are you sure you want to delete retail order "${identifier}"?`)) {
      deleteMutation.mutate({ id: order.id });
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
          <h1 className="text-3xl font-bold tracking-tight">Retail Orders</h1>
          <p className="text-muted-foreground">
            Manage orders from retail partners
          </p>
        </div>
        <Link href="/orders/retail-orders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
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
          <option value="received">Received</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_production">In Production</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={retailOrders ?? []}
        searchKey="retailerPoNumber"
        searchPlaceholder="Search retail orders..."
        isLoading={isLoading}
      />
    </div>
  );
}
