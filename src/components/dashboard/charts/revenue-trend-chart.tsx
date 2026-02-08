"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { format } from "date-fns";

const BRAND_COLORS: Record<string, string> = {
  "House of Party": "#FF6B35",
  Roofus: "#4ECDC4",
  Fomin: "#45B7D1",
  "Luna Naturals": "#DDA0DD",
  EveryMood: "#98D8C8",
  "Craft Hero": "#F7DC6F",
};

interface RevenueTrendChartProps {
  data: Array<{
    brandName: string;
    month: Date;
    monthLabel: string;
    revenue: number;
    units: number;
  }>;
  isLoading?: boolean;
}

export function RevenueTrendChart({ data, isLoading }: RevenueTrendChartProps) {
  // Transform long format to wide format for Recharts stacking
  const monthMap = new Map<string, Record<string, number | string>>();
  const brandNames = new Set<string>();

  for (const row of data) {
    brandNames.add(row.brandName);
    if (!monthMap.has(row.monthLabel)) {
      monthMap.set(row.monthLabel, { month: row.monthLabel });
    }
    const monthData = monthMap.get(row.monthLabel)!;
    monthData[row.brandName] = row.revenue;
  }

  const chartData = Array.from(monthMap.values()).map((entry) => {
    for (const brand of brandNames) {
      if (!(brand in entry)) entry[brand] = 0;
    }
    return entry;
  });

  const chartConfig = Object.fromEntries(
    Array.from(brandNames).map((name) => [
      name,
      { label: name, color: BRAND_COLORS[name] ?? "#8884d8" },
    ])
  ) satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Trend (Last 12 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] animate-pulse rounded bg-muted" />
        ) : chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No revenue data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} tickLine={false} />
              <YAxis
                fontSize={12}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      `$${Number(value).toLocaleString()}`
                    }
                  />
                }
              />
              {Array.from(brandNames).map((brand) => (
                <Area
                  key={brand}
                  type="monotone"
                  dataKey={brand}
                  stackId="revenue"
                  fill={BRAND_COLORS[brand] ?? "#8884d8"}
                  stroke={BRAND_COLORS[brand] ?? "#8884d8"}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
