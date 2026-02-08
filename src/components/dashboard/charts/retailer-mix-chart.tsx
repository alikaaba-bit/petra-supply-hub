"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const BRAND_COLORS: Record<string, string> = {
  "House of Party": "#FF6B35",
  Roofus: "#4ECDC4",
  Fomin: "#45B7D1",
  "Luna Naturals": "#DDA0DD",
  EveryMood: "#98D8C8",
  "Craft Hero": "#F7DC6F",
};

interface RetailerMixChartProps {
  data: Array<{
    retailerName: string;
    brandName: string;
    revenue: number;
    units: number;
  }>;
  isLoading?: boolean;
}

export function RetailerMixChart({ data, isLoading }: RetailerMixChartProps) {
  // Transform to wide format: retailer as row, brands as columns
  const retailerMap = new Map<string, Record<string, number | string>>();
  const brandNames = new Set<string>();

  for (const row of data) {
    brandNames.add(row.brandName);
    if (!retailerMap.has(row.retailerName)) {
      retailerMap.set(row.retailerName, {
        retailerName: row.retailerName,
        _total: 0,
      });
    }
    const entry = retailerMap.get(row.retailerName)!;
    entry[row.brandName] = row.revenue;
    (entry._total as number) += row.revenue;
  }

  const chartData = Array.from(retailerMap.values())
    .sort((a, b) => (b._total as number) - (a._total as number))
    .slice(0, 10)
    .map(({ _total, ...rest }) => rest);

  const chartConfig = Object.fromEntries(
    Array.from(brandNames).map((name) => [
      name,
      { label: name, color: BRAND_COLORS[name] ?? "#8884d8" },
    ])
  ) satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retailer Mix (Last 3 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[350px] animate-pulse rounded bg-muted" />
        ) : chartData.length === 0 ? (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            No retailer data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                fontSize={12}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="retailerName"
                width={130}
                fontSize={11}
                tickLine={false}
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
                <Bar
                  key={brand}
                  dataKey={brand}
                  stackId="revenue"
                  fill={BRAND_COLORS[brand] ?? "#8884d8"}
                  radius={0}
                />
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
