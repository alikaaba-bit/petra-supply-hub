"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/dashboard/data-table";
import { createColumns, Brand } from "./columns";
import { BrandFormDialog } from "@/components/dashboard/brand-form-dialog";
import { toast } from "sonner";

export default function BrandsPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedBrand, setSelectedBrand] = React.useState<Brand | undefined>();

  const { data: brands, isLoading } = trpc.brands.list.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.brands.delete.useMutation({
    onSuccess: () => {
      toast.success("Brand deleted successfully");
      utils.brands.list.invalidate();
      utils.brands.count.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete brand: ${error.message}`);
    },
  });

  const handleEdit = (brand: Brand) => {
    setSelectedBrand(brand);
    setDialogOpen(true);
  };

  const handleDelete = (brand: Brand) => {
    if (confirm(`Are you sure you want to delete "${brand.name}"?`)) {
      deleteMutation.mutate({ id: brand.id });
    }
  };

  const handleAddNew = () => {
    setSelectedBrand(undefined);
    setDialogOpen(true);
  };

  const columns = createColumns({ onEdit: handleEdit, onDelete: handleDelete });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brands</h1>
          <p className="text-muted-foreground">
            Manage your product brands and their settings
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Brand
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={brands ?? []}
        searchKey="name"
        searchPlaceholder="Search brands..."
        isLoading={isLoading}
      />

      <BrandFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        brand={selectedBrand}
      />
    </div>
  );
}
