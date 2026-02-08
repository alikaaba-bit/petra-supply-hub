"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";

interface RetailerMixChartProps {
  data: Record<string, number | string>[];
  isLoading?: boolean;
}

const chartConfig = {
  Fomin: {
    label: "Fomin",
    color: "hsl(var(--chart-1))",
  },
  "Luna Naturals": {
    label: "Luna Naturals",
    color: "hsl(var(--chart-2))",
  },
  EveryMood: {
    label: "EveryMood",
    color: "hsl(var(--chart-3))",
  },
  Roofus: {
    label: "Roofus",
    color: "hsl(var(--chart-4))",
  },
  "House of Party": {
    label: "House of Party",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

export function RetailerMixChart({ data, isLoading }: RetailerMixChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Retailer Revenue Mix</CardTitle>
        <p className="text-sm text-muted-foreground">
          Revenue by retailer with brand breakdown
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[400px] w-full animate-pulse rounded bg-muted" />
        ) : data.length === 0 ? (
          <div className="flex h-[400px] w-full items-center justify-center text-muted-foreground">
            No retailer data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="retailerName"
                width={120}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {Object.keys(chartConfig).map((brand) => (
                <Bar
                  key={brand}
                  dataKey={brand}
                  stackId="revenue"
                  fill={chartConfig[brand as keyof typeof chartConfig].color}
                />
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
