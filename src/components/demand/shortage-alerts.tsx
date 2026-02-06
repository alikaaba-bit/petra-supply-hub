"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface ShortageAlert {
  sku: string;
  skuName: string;
  brandName: string;
  shortage: number;
  forecastedUnits: number;
  availableUnits: number;
}

interface ShortageAlertsProps {
  alerts: ShortageAlert[];
}

export function ShortageAlerts({ alerts }: ShortageAlertsProps) {
  if (alerts.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <AlertTriangle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900">No Shortages</AlertTitle>
        <AlertDescription className="text-green-700">
          All SKUs have sufficient inventory to meet forecasted demand.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Shortage Alerts</h3>
        <Badge variant="destructive">{alerts.length} SKUs</Badge>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {alerts.slice(0, 10).map((alert, index) => (
          <Alert key={index} variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              <span className="font-mono text-xs">{alert.sku}</span>
              <Badge variant="destructive">
                {alert.shortage.toLocaleString()} units short
              </Badge>
            </AlertTitle>
            <AlertDescription>
              <div className="text-xs space-y-1 mt-1">
                <div className="font-medium">{alert.skuName}</div>
                <div className="text-muted-foreground">
                  {alert.brandName}
                </div>
                <div className="flex gap-4 pt-1">
                  <span>
                    Forecasted: <strong>{alert.forecastedUnits.toLocaleString()}</strong>
                  </span>
                  <span>
                    Available: <strong>{alert.availableUnits.toLocaleString()}</strong>
                  </span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        ))}
        {alerts.length > 10 && (
          <p className="text-xs text-muted-foreground text-center">
            Showing top 10 of {alerts.length} shortages
          </p>
        )}
      </div>
    </div>
  );
}
