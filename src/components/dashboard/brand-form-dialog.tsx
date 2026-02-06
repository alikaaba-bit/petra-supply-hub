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

interface BrandFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand?: {
    id: number;
    name: string;
    description: string | null;
    leadTimeDays: number;
    active: boolean;
  };
}

export function BrandFormDialog({ open, onOpenChange, brand }: BrandFormDialogProps) {
  const [name, setName] = React.useState(brand?.name ?? "");
  const [description, setDescription] = React.useState(brand?.description ?? "");
  const [leadTimeDays, setLeadTimeDays] = React.useState(brand?.leadTimeDays ?? 30);
  const [active, setActive] = React.useState(brand?.active ?? true);

  const utils = trpc.useUtils();

  const createMutation = trpc.brands.create.useMutation({
    onSuccess: () => {
      toast.success("Brand created successfully");
      utils.brands.list.invalidate();
      utils.brands.count.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create brand: ${error.message}`);
    },
  });

  const updateMutation = trpc.brands.update.useMutation({
    onSuccess: () => {
      toast.success("Brand updated successfully");
      utils.brands.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to update brand: ${error.message}`);
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setLeadTimeDays(30);
    setActive(true);
  };

  React.useEffect(() => {
    if (brand) {
      setName(brand.name);
      setDescription(brand.description ?? "");
      setLeadTimeDays(brand.leadTimeDays);
      setActive(brand.active);
    }
  }, [brand]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (brand) {
      updateMutation.mutate({
        id: brand.id,
        name,
        description: description || undefined,
        leadTimeDays,
        active,
      });
    } else {
      createMutation.mutate({
        name,
        description: description || undefined,
        leadTimeDays,
        active,
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{brand ? "Edit Brand" : "Add Brand"}</DialogTitle>
            <DialogDescription>
              {brand
                ? "Update the brand details below."
                : "Add a new brand to the system."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leadTimeDays">Lead Time (days) *</Label>
              <Input
                id="leadTimeDays"
                type="number"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(parseInt(e.target.value))}
                required
                min={1}
                disabled={isLoading}
              />
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
              {isLoading ? "Saving..." : brand ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
