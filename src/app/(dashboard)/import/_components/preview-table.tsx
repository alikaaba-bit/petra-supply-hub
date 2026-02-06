"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface PreviewTableProps {
  data: any[];
  totalRows: number;
  importType: 'forecast' | 'sales';
  onConfirm: () => void;
  onCancel: () => void;
}

export function PreviewTable({ data, totalRows, importType, onConfirm, onCancel }: PreviewTableProps) {
  const showingRows = Math.min(data.length, 100);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Preview Data</h2>
        <p className="text-muted-foreground">
          Review the first {showingRows} rows before importing
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Showing {showingRows} of {totalRows} rows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {importType === 'forecast' ? (
                    <>
                      <th className="px-4 py-3 text-left font-medium">SKU</th>
                      <th className="px-4 py-3 text-left font-medium">Retailer</th>
                      <th className="px-4 py-3 text-left font-medium">Month</th>
                      <th className="px-4 py-3 text-right font-medium">Forecasted Units</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-left font-medium">SKU</th>
                      <th className="px-4 py-3 text-left font-medium">Retailer</th>
                      <th className="px-4 py-3 text-left font-medium">Month</th>
                      <th className="px-4 py-3 text-right font-medium">Units Sold</th>
                      <th className="px-4 py-3 text-right font-medium">Revenue</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="px-4 py-3">{row.sku}</td>
                    <td className="px-4 py-3">{row.retailer}</td>
                    <td className="px-4 py-3">{format(new Date(row.month), 'MMM yyyy')}</td>
                    {importType === 'forecast' ? (
                      <td className="px-4 py-3 text-right">{row.forecastedUnits.toLocaleString()}</td>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-right">{row.unitsSold.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          {row.revenue !== null ? `$${row.revenue.toLocaleString()}` : '-'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onConfirm}>
          Confirm Import ({totalRows} rows)
        </Button>
      </div>
    </div>
  );
}
