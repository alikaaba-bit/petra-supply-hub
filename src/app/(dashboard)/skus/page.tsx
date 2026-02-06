"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/dashboard/data-table";
import { createColumns, SKU } from "./columns";
import { SKUFormDialog } from "@/components/dashboard/sku-form-dialog";
import { toast } from "sonner";

export default function SKUsPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedSKU, setSelectedSKU] = React.useState<SKU | undefined>();
  const [selectedBrand, setSelectedBrand] = React.useState<number | undefined>();

  const { data: skus, isLoading } = trpc.skus.list.useQuery(
    selectedBrand ? { brandId: selectedBrand } : undefined
  );
  const { data: brands } = trpc.brands.list.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.skus.delete.useMutation({
    onSuccess: () => {
      toast.success("SKU deleted successfully");
      utils.skus.list.invalidate();
      utils.skus.count.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete SKU: ${error.message}`);
    },
  });

  const handleEdit = (sku: SKU) => {
    setSelectedSKU(sku);
    setDialogOpen(true);
  };

  const handleDelete = (sku: SKU) => {
    if (confirm(`Are you sure you want to delete "${sku.name}"?`)) {
      deleteMutation.mutate({ id: sku.id });
    }
  };

  const handleAddNew = () => {
    setSelectedSKU(undefined);
    setDialogOpen(true);
  };

  const columns = createColumns({ onEdit: handleEdit, onDelete: handleDelete });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SKUs</h1>
          <p className="text-muted-foreground">
            Manage your product SKUs and inventory items
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add SKU
        </Button>
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
      </div>

      <DataTable
        columns={columns}
        data={skus ?? []}
        searchKey="name"
        searchPlaceholder="Search SKUs..."
        isLoading={isLoading}
      />

      <SKUFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sku={selectedSKU}
      />
    </div>
  );
}
