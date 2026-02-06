"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface SKUFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sku?: {
    id: number;
    brandId: number;
    sku: string;
    name: string;
    description: string | null;
    category: string | null;
    unitCost: string | null;
    unitPrice: string | null;
    active: boolean;
  };
}

export function SKUFormDialog({ open, onOpenChange, sku }: SKUFormDialogProps) {
  const [brandId, setBrandId] = React.useState(sku?.brandId ?? 0);
  const [skuCode, setSkuCode] = React.useState(sku?.sku ?? "");
  const [name, setName] = React.useState(sku?.name ?? "");
  const [description, setDescription] = React.useState(sku?.description ?? "");
  const [category, setCategory] = React.useState(sku?.category ?? "");
  const [unitCost, setUnitCost] = React.useState(sku?.unitCost ?? "");
  const [unitPrice, setUnitPrice] = React.useState(sku?.unitPrice ?? "");
  const [active, setActive] = React.useState(sku?.active ?? true);

  const { data: brands } = trpc.brands.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.skus.create.useMutation({
    onSuccess: () => {
      toast.success("SKU created successfully");
      utils.skus.list.invalidate();
      utils.skus.count.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create SKU: ${error.message}`);
    },
  });

  const updateMutation = trpc.skus.update.useMutation({
    onSuccess: () => {
      toast.success("SKU updated successfully");
      utils.skus.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to update SKU: ${error.message}`);
    },
  });

  const resetForm = () => {
    setBrandId(0);
    setSkuCode("");
    setName("");
    setDescription("");
    setCategory("");
    setUnitCost("");
    setUnitPrice("");
    setActive(true);
  };

  React.useEffect(() => {
    if (sku) {
      setBrandId(sku.brandId);
      setSkuCode(sku.sku);
      setName(sku.name);
      setDescription(sku.description ?? "");
      setCategory(sku.category ?? "");
      setUnitCost(sku.unitCost ?? "");
      setUnitPrice(sku.unitPrice ?? "");
      setActive(sku.active);
    }
  }, [sku]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sku) {
      updateMutation.mutate({
        id: sku.id,
        brandId,
        sku: skuCode,
        name,
        description: description || undefined,
        category: category || undefined,
        unitCost: unitCost || undefined,
        unitPrice: unitPrice || undefined,
        active,
      });
    } else {
      createMutation.mutate({
        brandId,
        sku: skuCode,
        name,
        description: description || undefined,
        category: category || undefined,
        unitCost: unitCost || undefined,
        unitPrice: unitPrice || undefined,
        active,
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{sku ? "Edit SKU" : "Add SKU"}</DialogTitle>
            <DialogDescription>
              {sku ? "Update the SKU details below." : "Add a new SKU to the system."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="brandId">Brand *</Label>
              <select
                id="brandId"
                value={brandId}
                onChange={(e) => setBrandId(parseInt(e.target.value))}
                required
                disabled={isLoading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value={0}>Select a brand</option>
                {brands?.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="skuCode">SKU Code *</Label>
              <Input
                id="skuCode"
                value={skuCode}
                onChange={(e) => setSkuCode(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unitCost">Unit Cost</Label>
                <Input
                  id="unitCost"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="0.00"
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitPrice">Unit Price</Label>
                <Input
                  id="unitPrice"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0.00"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4"
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : sku ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
