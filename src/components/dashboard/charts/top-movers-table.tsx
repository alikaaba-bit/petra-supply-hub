"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

const BRAND_COLORS: Record<string, string> = {
  "House of Party": "#FF6B35",
  Roofus: "#4ECDC4",
  Fomin: "#45B7D1",
  "Luna Naturals": "#DDA0DD",
  EveryMood: "#98D8C8",
  "Craft Hero": "#F7DC6F",
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);

interface TopMoversTableProps {
  data: Array<{
    skuId: number;
    sku: string;
    skuName: string;
    brandName: string;
    revenue: number;
    units: number;
    trendPct: number;
    signal: "ACCELERATING" | "DECLINING" | "STEADY";
  }>;
  isLoading?: boolean;
}

const signalConfig = {
  ACCELERATING: { label: "Accelerating", icon: ArrowUp, className: "bg-green-100 text-green-800" },
  DECLINING: { label: "Declining", icon: ArrowDown, className: "bg-red-100 text-red-800" },
  STEADY: { label: "Steady", icon: Minus, className: "bg-gray-100 text-gray-700" },
} as const;

export function TopMoversTable({ data, isLoading }: TopMoversTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Movers</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No sales data this month
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((item, i) => {
              const sig = signalConfig[item.signal];
              const SigIcon = sig.icon;
              return (
                <div
                  key={item.skuId}
                  className="flex items-center gap-3 py-2 border-b last:border-0"
                >
                  <span className="text-xs text-muted-foreground w-5 text-right">
                    {i + 1}
                  </span>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: BRAND_COLORS[item.brandName] ?? "#8884d8",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {item.sku}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.brandName}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium">
                      {formatCurrency(item.revenue)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.units.toLocaleString()} units
                    </div>
                  </div>
                  <Badge
                    className={`${sig.className} border-0 text-xs flex-shrink-0 gap-1`}
                  >
                    <SigIcon className="h-3 w-3" />
                    {item.trendPct !== 0
                      ? `${item.trendPct > 0 ? "+" : ""}${item.trendPct}%`
                      : "0%"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
