"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const statusConfig = {
  ON_TRACK: { label: "On Track", bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
  AT_RISK: { label: "At Risk", bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
  SHORTFALL: { label: "Shortfall", bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
  EXCEEDED: { label: "Exceeded", bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
  NO_TARGET: { label: "No Target", bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-300" },
} as const;

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);

interface ScorecardProgressProps {
  monthLabel: string;
  revenueTarget: number;
  revenueActual: number;
  progressPct: number;
  inventoryOnHand: number;
  inventoryInTransit: number;
  poOrderedUnits: number;
  totalSupplyPipeline: number;
  revenuePotential: number;
  revenueGap: number;
  status: keyof typeof statusConfig;
  onSetTarget?: () => void;
}

export function ScorecardProgress({
  monthLabel,
  revenueTarget,
  revenueActual,
  progressPct,
  inventoryOnHand,
  inventoryInTransit,
  poOrderedUnits,
  totalSupplyPipeline,
  revenuePotential,
  revenueGap,
  status,
  onSetTarget,
}: ScorecardProgressProps) {
  const config = statusConfig[status];

  if (status === "NO_TARGET") {
    return (
      <div className={`rounded-lg border ${config.border} ${config.bg} p-4 space-y-2`}>
        <div className="font-medium text-sm">{monthLabel}</div>
        <div className="text-sm text-muted-foreground">No target set</div>
        {onSetTarget && (
          <button
            onClick={onSetTarget}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Set Revenue Target
          </button>
        )}
        <div className="text-xs space-y-1 pt-1 border-t">
          <div className="flex justify-between">
            <span className="text-muted-foreground">On Hand:</span>
            <span>{inventoryOnHand.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">In Transit:</span>
            <span>{inventoryInTransit.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">On Order:</span>
            <span>{poOrderedUnits.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${config.border} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="font-medium text-sm">{monthLabel}</div>
        <Badge className={`${config.bg} ${config.text} border-0 text-xs`}>
          {config.label}
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Target:</span>
          <span className="font-medium">{formatCurrency(revenueTarget)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Actual:</span>
          <span className="font-medium">{formatCurrency(revenueActual)}</span>
        </div>
        <Progress value={Math.min(progressPct, 100)} className="h-2" />
        <div className="text-xs text-right text-muted-foreground">
          {progressPct}%
        </div>
      </div>

      <div className="text-xs space-y-1 pt-2 border-t">
        <div className="font-medium text-muted-foreground uppercase tracking-wide">
          Supply Check
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">On Hand:</span>
          <span>{inventoryOnHand.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">In Transit:</span>
          <span>{inventoryInTransit.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">On Order:</span>
          <span>{poOrderedUnits.toLocaleString()}</span>
        </div>
        <div className="flex justify-between border-t pt-1 font-medium">
          <span>Pipeline:</span>
          <span>{formatCurrency(revenuePotential)}</span>
        </div>
      </div>

      {revenueGap > 0 && (
        <div className="text-xs font-medium text-red-600 pt-1 border-t">
          Gap: {formatCurrency(revenueGap)}
        </div>
      )}
    </div>
  );
}
