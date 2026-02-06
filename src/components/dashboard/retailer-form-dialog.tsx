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

interface RetailerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  retailer?: {
    id: number;
    name: string;
    code: string;
    parentGroup: string | null;
    channel: string | null;
    active: boolean;
  };
}

export function RetailerFormDialog({ open, onOpenChange, retailer }: RetailerFormDialogProps) {
  const [name, setName] = React.useState(retailer?.name ?? "");
  const [code, setCode] = React.useState(retailer?.code ?? "");
  const [parentGroup, setParentGroup] = React.useState(retailer?.parentGroup ?? "");
  const [channel, setChannel] = React.useState(retailer?.channel ?? "");
  const [active, setActive] = React.useState(retailer?.active ?? true);

  const utils = trpc.useUtils();

  const createMutation = trpc.retailers.create.useMutation({
    onSuccess: () => {
      toast.success("Retailer created successfully");
      utils.retailers.list.invalidate();
      utils.retailers.count.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create retailer: ${error.message}`);
    },
  });

  const updateMutation = trpc.retailers.update.useMutation({
    onSuccess: () => {
      toast.success("Retailer updated successfully");
      utils.retailers.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to update retailer: ${error.message}`);
    },
  });

  const resetForm = () => {
    setName("");
    setCode("");
    setParentGroup("");
    setChannel("");
    setActive(true);
  };

  React.useEffect(() => {
    if (retailer) {
      setName(retailer.name);
      setCode(retailer.code);
      setParentGroup(retailer.parentGroup ?? "");
      setChannel(retailer.channel ?? "");
      setActive(retailer.active);
    }
  }, [retailer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (retailer) {
      updateMutation.mutate({
        id: retailer.id,
        name,
        code,
        parentGroup: parentGroup || undefined,
        channel: channel || undefined,
        active,
      });
    } else {
      createMutation.mutate({
        name,
        code,
        parentGroup: parentGroup || undefined,
        channel: channel || undefined,
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
            <DialogTitle>{retailer ? "Edit Retailer" : "Add Retailer"}</DialogTitle>
            <DialogDescription>
              {retailer
                ? "Update the retailer details below."
                : "Add a new retailer to the system."}
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
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="parentGroup">Parent Group</Label>
              <Input
                id="parentGroup"
                value={parentGroup}
                onChange={(e) => setParentGroup(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="channel">Channel</Label>
              <Input
                id="channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
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
              {isLoading ? "Saving..." : retailer ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
