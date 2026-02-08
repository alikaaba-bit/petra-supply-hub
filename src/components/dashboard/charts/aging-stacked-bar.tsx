"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const bucketColors: Record<string, string> = {
  "<30": "#9CA3AF",
  "30-59": "#F59E0B",
  "60-89": "#D97706",
  "90-119": "#EA580C",
  "120+": "#DC2626",
};

interface AgingStackedBarProps {
  data: Array<{
    brandName: string;
    ageBucket: string;
    totalValue: number;
  }>;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);

export function AgingStackedBar({ data }: AgingStackedBarProps) {
  // Pivot: one row per brand, columns for each bucket
  const brandMap = new Map<string, Record<string, number>>();
  for (const d of data) {
    if (!brandMap.has(d.brandName)) {
      brandMap.set(d.brandName, {});
    }
    brandMap.get(d.brandName)![d.ageBucket] = d.totalValue;
  }

  const chartData = Array.from(brandMap.entries()).map(
    ([brandName, buckets]) => ({
      brandName,
      ...buckets,
    })
  );

  // Sort by total value descending
  chartData.sort((a, b) => {
    const aTotal = Object.entries(a)
      .filter(([k]) => k !== "brandName")
      .reduce((s, [, v]) => s + (Number(v) || 0), 0);
    const bTotal = Object.entries(b)
      .filter(([k]) => k !== "brandName")
      .reduce((s, [, v]) => s + (Number(v) || 0), 0);
    return bTotal - aTotal;
  });

  const buckets = ["<30", "30-59", "60-89", "90-119", "120+"];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Aging by Brand</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            No inventory data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
            >
              <XAxis
                type="number"
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                fontSize={12}
              />
              <YAxis
                type="category"
                dataKey="brandName"
                width={100}
                fontSize={12}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  `${name} days`,
                ]}
              />
              <Legend />
              {buckets.map((bucket) => (
                <Bar
                  key={bucket}
                  dataKey={bucket}
                  stackId="a"
                  fill={bucketColors[bucket]}
                  name={bucket}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
