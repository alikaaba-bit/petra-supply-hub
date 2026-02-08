"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ShoppingCart, Target } from "lucide-react";

interface ImportTypeSelectorProps {
  onSelect: (type: 'forecast' | 'sales' | 'targets') => void;
}

export function ImportTypeSelector({ onSelect }: ImportTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground">
          Select the type of data you want to import
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card
          className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
          onClick={() => onSelect('forecast')}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Forecast Import</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Upload RTL FORECAST_MASTER or HOP product-centric Excel files. The system will automatically detect the format.
            </CardDescription>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
          onClick={() => onSelect('sales')}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Retail Sales Import</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Upload retail sales performance data by SKU. Track units sold and revenue across retailers.
            </CardDescription>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
          onClick={() => onSelect('targets')}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                <Target className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle>Revenue Targets</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Manage monthly revenue targets per brand. Import from scorecard Excel or edit inline.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
