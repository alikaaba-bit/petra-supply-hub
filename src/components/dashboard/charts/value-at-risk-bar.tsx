"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ageBucketColors: Record<string, string> = {
  "<30": "#9CA3AF",
  "30-59": "#F59E0B",
  "60-89": "#D97706",
  "90-119": "#EA580C",
  "120+": "#DC2626",
};

interface ValueAtRiskBarProps {
  data: Array<{
    skuCode: string;
    skuName: string;
    brandName: string;
    valueAtRisk: number;
    ageBucket: string;
  }>;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);

export function ValueAtRiskBar({ data }: ValueAtRiskBarProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.skuCode.length > 20 ? d.skuCode.slice(0, 20) + "..." : d.skuCode,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top 10 SKUs by Value at Risk</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            No SKUs at risk
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
                dataKey="label"
                width={110}
                fontSize={11}
                tick={{ fill: "#6B7280" }}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Value at Risk"]}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item
                    ? `${item.skuName} (${item.brandName})`
                    : String(label);
                }}
              />
              <Bar dataKey="valueAtRisk" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={ageBucketColors[entry.ageBucket] ?? "#9CA3AF"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
