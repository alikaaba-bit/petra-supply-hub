"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { AreaChart, Area, CartesianGrid, XAxis, YAxis } from "recharts";

interface RevenueTrendChartProps {
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

export function RevenueTrendChart({ data, isLoading }: RevenueTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Trend</CardTitle>
        <p className="text-sm text-muted-foreground">
          Last 12 months by brand
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[350px] w-full animate-pulse rounded bg-muted" />
        ) : data.length === 0 ? (
          <div className="flex h-[350px] w-full items-center justify-center text-muted-foreground">
            No revenue data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {Object.keys(chartConfig).map((brand) => (
                <Area
                  key={brand}
                  type="monotone"
                  dataKey={brand}
                  stackId="revenue"
                  stroke={chartConfig[brand as keyof typeof chartConfig].color}
                  fill={chartConfig[brand as keyof typeof chartConfig].color}
                  fillOpacity={0.4}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
