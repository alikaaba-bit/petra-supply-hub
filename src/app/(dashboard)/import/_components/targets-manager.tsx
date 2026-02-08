"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);

interface TargetsManagerProps {
  onBack: () => void;
}

export function TargetsManager({ onBack }: TargetsManagerProps) {
  const utils = trpc.useUtils();
  const { data: targets, isLoading } = trpc.dashboard.targets.list.useQuery({});
  const { data: brands } = trpc.brands.list.useQuery();

  const upsertMutation = trpc.dashboard.targets.upsert.useMutation({
    onSuccess: () => utils.dashboard.targets.list.invalidate(),
  });
  const deleteMutation = trpc.dashboard.targets.delete.useMutation({
    onSuccess: () => utils.dashboard.targets.list.invalidate(),
  });

  const [newTarget, setNewTarget] = React.useState({
    brandId: "",
    month: "",
    revenueTarget: "",
    channel: "all",
  });

  const handleAdd = () => {
    if (!newTarget.brandId || !newTarget.month || !newTarget.revenueTarget) return;
    upsertMutation.mutate({
      brandId: Number(newTarget.brandId),
      month: new Date(newTarget.month + "-01"),
      revenueTarget: newTarget.revenueTarget,
      channel: newTarget.channel,
    });
    setNewTarget({ brandId: "", month: "", revenueTarget: "", channel: "all" });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
  };

  // Inline edit state
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editValue, setEditValue] = React.useState("");

  const handleSaveEdit = (id: number, brandId: number, month: Date, channel: string) => {
    if (!editValue) return;
    upsertMutation.mutate(
      {
        brandId,
        month,
        revenueTarget: editValue,
        channel,
      },
      {
        onSuccess: () => setEditingId(null),
      }
    );
  };

  // Group targets by month for display
  const allChannelTargets = (targets ?? []).filter((t) => t.channel === "all");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue Targets</h1>
          <p className="text-muted-foreground">
            Manage monthly revenue targets per brand from the master scorecard
          </p>
        </div>
      </div>

      {/* Add new target */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Target</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Brand</label>
              <Select
                value={newTarget.brandId}
                onValueChange={(v) => setNewTarget({ ...newTarget, brandId: v })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {(brands ?? []).map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Month</label>
              <Input
                type="month"
                className="w-[160px]"
                value={newTarget.month}
                onChange={(e) => setNewTarget({ ...newTarget, month: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Revenue Target ($)</label>
              <Input
                type="number"
                className="w-[160px]"
                placeholder="500000"
                value={newTarget.revenueTarget}
                onChange={(e) => setNewTarget({ ...newTarget, revenueTarget: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Channel</label>
              <Select
                value={newTarget.channel}
                onValueChange={(v) => setNewTarget({ ...newTarget, channel: v })}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="amazon">Amazon</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={upsertMutation.isPending}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing targets table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Current Targets
            {allChannelTargets.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({allChannelTargets.length} targets)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (targets ?? []).length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No targets set. Add targets above or import from Excel.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">Brand</th>
                    <th className="text-left py-2 px-2 font-medium">Month</th>
                    <th className="text-left py-2 px-2 font-medium">Channel</th>
                    <th className="text-right py-2 px-2 font-medium">Revenue Target</th>
                    <th className="text-right py-2 px-2 font-medium w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(targets ?? []).map((t) => (
                    <tr key={t.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2">{t.brandName}</td>
                      <td className="py-2 px-2">{format(t.month, "MMM yyyy")}</td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-xs">
                          {t.channel}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right">
                        {editingId === t.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Input
                              type="number"
                              className="w-32 h-7 text-sm text-right"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveEdit(t.id, t.brandId, t.month, t.channel);
                                }
                                if (e.key === "Escape") {
                                  setEditingId(null);
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleSaveEdit(t.id, t.brandId, t.month, t.channel)}
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span
                            className="cursor-pointer hover:underline tabular-nums"
                            onClick={() => {
                              setEditingId(t.id);
                              setEditValue(String(t.revenueTarget));
                            }}
                          >
                            {formatCurrency(Number(t.revenueTarget))}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
