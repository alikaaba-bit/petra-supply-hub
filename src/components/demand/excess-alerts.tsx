"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

interface ExcessAlert {
  sku: string;
  skuName: string;
  brandName: string;
  excess: number;
  forecastedUnits: number;
  supply: number;
  ratio: number;
}

interface ExcessAlertsProps {
  alerts: ExcessAlert[];
}

export function ExcessAlerts({ alerts }: ExcessAlertsProps) {
  if (alerts.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <TrendingUp className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900">No Excess Inventory</AlertTitle>
        <AlertDescription className="text-green-700">
          All SKUs have healthy inventory levels relative to forecasted demand.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Excess Alerts</h3>
        <Badge className="bg-amber-500 hover:bg-amber-600">{alerts.length} SKUs</Badge>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {alerts.slice(0, 10).map((alert, index) => (
          <Alert key={index} className="border-amber-200 bg-amber-50">
            <TrendingUp className="h-4 w-4 text-amber-600" />
            <AlertTitle className="flex items-center gap-2 text-amber-900">
              <span className="font-mono text-xs">{alert.sku}</span>
              <Badge className="bg-amber-500">
                {alert.excess.toLocaleString()} excess units
              </Badge>
            </AlertTitle>
            <AlertDescription>
              <div className="text-xs space-y-1 mt-1 text-amber-900">
                <div className="font-medium">{alert.skuName}</div>
                <div className="text-amber-700">
                  {alert.brandName}
                </div>
                <div className="flex gap-4 pt-1">
                  <span>
                    Forecasted: <strong>{alert.forecastedUnits.toLocaleString()}</strong>
                  </span>
                  <span>
                    Supply: <strong>{alert.supply.toLocaleString()}</strong>
                  </span>
                  <span className="text-amber-700">
                    {alert.ratio.toFixed(1)}x forecasted
                  </span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        ))}
        {alerts.length > 10 && (
          <p className="text-xs text-muted-foreground text-center">
            Showing top 10 of {alerts.length} excess inventory items
          </p>
        )}
      </div>
    </div>
  );
}
