"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DemandSummaryCardProps {
  title: string;
  forecastedUnits: number;
  orderedUnits: number;
  availableUnits: number;
  balance: number;
}

export function DemandSummaryCard({
  title,
  forecastedUnits,
  orderedUnits,
  availableUnits,
  balance,
}: DemandSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Forecasted</span>
          <span className="text-sm font-semibold">
            {forecastedUnits.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Ordered</span>
          <span className="text-sm font-semibold">
            {orderedUnits.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Available</span>
          <span className="text-sm font-semibold">
            {availableUnits.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm font-medium">Balance</span>
          <span
            className={`text-sm font-bold ${
              balance >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {balance >= 0 ? "+" : ""}
            {balance.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
