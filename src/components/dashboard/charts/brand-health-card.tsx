"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Package, ShoppingCart, Store, Box } from "lucide-react";

const BRAND_COLORS: Record<string, string> = {
  "House of Party": "#FF6B35",
  Roofus: "#4ECDC4",
  Fomin: "#45B7D1",
  "Luna Naturals": "#DDA0DD",
  EveryMood: "#98D8C8",
  "Craft Hero": "#F7DC6F",
};

const inventorySignalConfig = {
  HEALTHY: { label: "Healthy", className: "bg-green-100 text-green-800" },
  WATCH: { label: "Watch", className: "bg-yellow-100 text-yellow-800" },
  LOW: { label: "Low", className: "bg-orange-100 text-orange-800" },
  CRITICAL: { label: "Critical", className: "bg-red-100 text-red-800" },
  OVERSTOCK: { label: "Overstock", className: "bg-purple-100 text-purple-800" },
} as const;

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);

interface BrandHealthCardProps {
  brandName: string;
  revenueMTD: number;
  revenueTrendPct: number;
  topRetailer: string;
  topSku: string;
  daysOfSupply: number;
  inventorySignal: keyof typeof inventorySignalConfig;
  activePOCount: number;
}

export function BrandHealthCard({
  brandName,
  revenueMTD,
  revenueTrendPct,
  topRetailer,
  topSku,
  daysOfSupply,
  inventorySignal,
  activePOCount,
}: BrandHealthCardProps) {
  const color = BRAND_COLORS[brandName] ?? "#8884d8";
  const signalConfig = inventorySignalConfig[inventorySignal];

  return (
    <Card>
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="font-semibold text-sm">{brandName}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{formatCurrency(revenueMTD)}</span>
          {revenueTrendPct !== 0 && (
            <span
              className={`flex items-center text-xs font-medium ${revenueTrendPct > 0 ? "text-green-600" : "text-red-600"}`}
            >
              {revenueTrendPct > 0 ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              {Math.abs(revenueTrendPct)}%
            </span>
          )}
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <Store className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Top:</span>
            <span className="font-medium truncate">{topRetailer}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Box className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">SKU:</span>
            <span className="font-medium truncate">{topSku}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <Badge className={`${signalConfig.className} border-0 text-xs`}>
            {signalConfig.label}
          </Badge>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {daysOfSupply === 999 ? "N/A" : `${daysOfSupply}d`}
            </span>
            <span className="flex items-center gap-1">
              <ShoppingCart className="h-3 w-3" />
              {activePOCount} POs
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
