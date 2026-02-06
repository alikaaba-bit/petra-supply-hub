"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/dashboard/data-table";
import { createColumns, Retailer } from "./columns";
import { RetailerFormDialog } from "@/components/dashboard/retailer-form-dialog";
import { toast } from "sonner";

export default function RetailersPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedRetailer, setSelectedRetailer] = React.useState<Retailer | undefined>();

  const { data: retailers, isLoading } = trpc.retailers.list.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.retailers.delete.useMutation({
    onSuccess: () => {
      toast.success("Retailer deleted successfully");
      utils.retailers.list.invalidate();
      utils.retailers.count.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete retailer: ${error.message}`);
    },
  });

  const handleEdit = (retailer: Retailer) => {
    setSelectedRetailer(retailer);
    setDialogOpen(true);
  };

  const handleDelete = (retailer: Retailer) => {
    if (confirm(`Are you sure you want to delete "${retailer.name}"?`)) {
      deleteMutation.mutate({ id: retailer.id });
    }
  };

  const handleAddNew = () => {
    setSelectedRetailer(undefined);
    setDialogOpen(true);
  };

  const columns = createColumns({ onEdit: handleEdit, onDelete: handleDelete });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retailers</h1>
          <p className="text-muted-foreground">
            Manage your retail customers and sales channels
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Retailer
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={retailers ?? []}
        searchKey="name"
        searchPlaceholder="Search retailers..."
        isLoading={isLoading}
      />

      <RetailerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        retailer={selectedRetailer}
      />
    </div>
  );
}
