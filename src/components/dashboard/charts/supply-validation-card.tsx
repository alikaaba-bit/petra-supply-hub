"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const statusConfig = {
  CONFIDENT: {
    label: "Confident",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-300",
    barColor: "bg-green-500",
    emoji: "",
  },
  THIN: {
    label: "Thin",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-300",
    barColor: "bg-yellow-500",
    emoji: "",
  },
  AT_RISK: {
    label: "At Risk",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-300",
    barColor: "bg-orange-500",
    emoji: "",
  },
  SHORTFALL: {
    label: "Shortfall",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-300",
    barColor: "bg-red-500",
    emoji: "",
  },
  NO_TARGET: {
    label: "No Target",
    bg: "bg-gray-50",
    text: "text-gray-500",
    border: "border-gray-200",
    barColor: "bg-gray-400",
    emoji: "",
  },
} as const;

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);

const formatPct = (val: number) => `${val}%`;

interface VelocityBreakdownItem {
  tier: string;
  label: string;
  skuCount: number;
  totalValue: number;
  pctOfRaw: number;
}

interface Top3Sku {
  sku: string;
  name: string;
  potential: number;
  pctOfTotal: number;
}

interface TopGapSku {
  sku: string;
  name: string;
  velocityTier: string;
  effectiveSupply: number;
  forecastedDemand: number;
  coverageRatio: number;
  unitsNeeded: number;
  revenueAtRisk: number;
}

interface SupplyValidationCardProps {
  monthLabel: string;
  revenueTarget: number;
  revenueActual: number;
  progressPct: number;
  rawInventoryValue: number;
  rawCoverage: number;
  effectiveRevenuePotential: number;
  adjustedCoverage: number;
  concentrationPenalty: number;
  inventoryQualityGap: number;
  qualityGapPct: number;
  channelThreshold: number;
  bufferNeeded: number;
  bufferGap: number;
  velocityBreakdown: VelocityBreakdownItem[];
  totalSkus: number;
  deadStockValue: number;
  staleStockValue: number;
  top3Share: number;
  top3Skus: Top3Sku[];
  topGapSkus: TopGapSku[];
  status: keyof typeof statusConfig;
}

export function SupplyValidationCard({
  monthLabel,
  revenueTarget,
  revenueActual,
  progressPct,
  rawInventoryValue,
  rawCoverage,
  effectiveRevenuePotential,
  adjustedCoverage,
  concentrationPenalty,
  inventoryQualityGap,
  qualityGapPct,
  channelThreshold,
  bufferNeeded,
  bufferGap,
  velocityBreakdown,
  totalSkus,
  deadStockValue,
  staleStockValue,
  top3Share,
  top3Skus,
  topGapSkus,
  status,
}: SupplyValidationCardProps) {
  const config = statusConfig[status];
  const [showDetails, setShowDetails] = useState(false);

  if (status === "NO_TARGET") {
    return (
      <div className={`rounded-lg border ${config.border} ${config.bg} p-4 space-y-2`}>
        <div className="font-medium text-sm">{monthLabel}</div>
        <div className="text-sm text-muted-foreground">No target set</div>
        <div className="text-xs text-muted-foreground">
          Set revenue targets on the Data Import page
        </div>
      </div>
    );
  }

  const rawBarWidth = Math.min(rawCoverage / 2, 1) * 100;
  const effectiveBarWidth = Math.min(adjustedCoverage / 2, 1) * 100;

  return (
    <div className={`rounded-lg border ${config.border} p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">{monthLabel}</div>
        <Badge className={`${config.bg} ${config.text} border-0 text-xs font-medium`}>
          {config.label}
        </Badge>
      </div>

      {/* Target vs Actual */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            Target: <span className="font-medium text-foreground">{formatCurrency(revenueTarget)}</span>
          </span>
          <span className="text-muted-foreground">
            Actual: <span className="font-medium text-foreground">{formatCurrency(revenueActual)}</span>{" "}
            ({progressPct}%)
          </span>
        </div>
        <Progress value={Math.min(progressPct, 100)} className="h-1.5" />
      </div>

      {/* Dual Bar: Raw vs Effective Coverage */}
      <div className="space-y-2 pt-2 border-t">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Raw vs Effective Coverage
        </div>

        {/* Raw Coverage */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Raw Inventory:</span>
            <span className="font-medium">
              {formatCurrency(rawInventoryValue)} — {rawCoverage.toFixed(2)}x
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gray-400 transition-all"
              style={{ width: `${rawBarWidth}%` }}
            />
          </div>
        </div>

        {/* Effective Coverage */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Effective (4-Layer):</span>
            <span className={`font-semibold ${config.text}`}>
              {formatCurrency(effectiveRevenuePotential)} — {adjustedCoverage.toFixed(2)}x
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full ${config.barColor} transition-all`}
              style={{ width: `${effectiveBarWidth}%` }}
            />
          </div>
        </div>

        {/* Quality gap callout */}
        {inventoryQualityGap > 0 && (
          <div className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">
            {formatCurrency(inventoryQualityGap)} ({qualityGapPct}%) is dead stock, slow movers, or unreliable pipeline
          </div>
        )}
      </div>

      {/* Collapsible details */}
      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center pt-1">
          <span>{showDetails ? "Hide" : "Show"} details</span>
          <ChevronDown
            className={`h-3 w-3 transition-transform ${showDetails ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          {/* Inventory Quality Breakdown */}
          <div className="space-y-1.5 border-t pt-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Inventory Quality
            </div>
            {velocityBreakdown.map((tier) => (
              <div key={tier.tier} className="flex items-center gap-2 text-xs">
                <span className="w-16 font-medium text-muted-foreground">
                  {tier.tier} {tier.label}
                </span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      tier.tier === "A"
                        ? "bg-green-500"
                        : tier.tier === "B"
                          ? "bg-blue-500"
                          : tier.tier === "C"
                            ? "bg-yellow-500"
                            : tier.tier === "D"
                              ? "bg-orange-500"
                              : tier.tier === "F"
                                ? "bg-red-500"
                                : "bg-purple-500"
                    }`}
                    style={{ width: `${tier.pctOfRaw}%` }}
                  />
                </div>
                <span className="w-20 text-right tabular-nums">
                  {formatCurrency(tier.totalValue)}
                </span>
                <span className="w-10 text-right text-muted-foreground tabular-nums">
                  {tier.pctOfRaw}%
                </span>
              </div>
            ))}
          </div>

          {/* Concentration */}
          <div className="border-t pt-2 text-xs space-y-1">
            <div className="font-medium text-muted-foreground uppercase tracking-wide">
              Concentration
            </div>
            <div className="text-muted-foreground">
              Top 3 SKUs = {top3Share}% of potential
              {concentrationPenalty < 1
                ? ` (penalty: ${concentrationPenalty}x)`
                : " (diversified)"}
            </div>
            {top3Skus.map((s) => (
              <div key={s.sku} className="flex justify-between pl-2">
                <span className="truncate max-w-[60%]">
                  {s.sku}: {s.name}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {s.pctOfTotal}%
                </span>
              </div>
            ))}
          </div>

          {/* Buffer requirement */}
          <div className="border-t pt-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Need {channelThreshold.toFixed(1)}x = {formatCurrency(bufferNeeded)} effective to go GREEN
              </span>
            </div>
            {bufferGap > 0 && (
              <div className="font-medium text-red-600 mt-0.5">
                Gap: -{formatCurrency(bufferGap)}
              </div>
            )}
          </div>

          {/* Top Gaps */}
          {topGapSkus.length > 0 && (
            <div className="border-t pt-2 text-xs space-y-1">
              <div className="font-medium text-muted-foreground uppercase tracking-wide">
                Top Gaps (fast movers short)
              </div>
              {topGapSkus.map((s) => (
                <div key={s.sku} className="flex justify-between">
                  <span className="truncate max-w-[55%]">
                    {s.sku}: {s.coverageRatio.toFixed(2)}x
                  </span>
                  <span className="text-red-600 tabular-nums">
                    need {s.unitsNeeded.toLocaleString()} units ({formatCurrency(s.revenueAtRisk)} at risk)
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Dead Stock */}
          {deadStockValue > 0 && (
            <div className="border-t pt-2 text-xs text-red-600">
              Dead Stock: {formatCurrency(deadStockValue)} — consider liquidation
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
