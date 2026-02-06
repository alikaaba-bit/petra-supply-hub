"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { ValidationError } from "@/server/services/validators/forecast-validator";

interface ValidationWarning {
  row: number;
  message: string;
  sheet?: string;
}

interface ValidationResultsProps {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  validCount: number;
  format?: string;
  onContinue: () => void;
  onCancel: () => void;
}

export function ValidationResults({
  errors,
  warnings,
  validCount,
  format,
  onContinue,
  onCancel,
}: ValidationResultsProps) {
  const hasErrors = errors.length > 0;
  const totalRows = validCount + errors.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Validation Results</h2>
          <p className="text-muted-foreground">Review the validation results before importing</p>
        </div>
        {format && (
          <Badge variant="outline" className="text-sm">
            Format: {format === "RTL_FORECAST" ? "RTL Forecast" : format === "HOP_FORECAST" ? "HOP Forecast" : "Retail Sales"}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Valid Rows</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{validCount}</p>
            <p className="text-sm text-muted-foreground">out of {totalRows} total rows</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg">Warnings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{warnings.length}</p>
            <p className="text-sm text-muted-foreground">non-blocking issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-lg">Errors</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{errors.length}</p>
            <p className="text-sm text-muted-foreground">must be fixed</p>
          </CardContent>
        </Card>
      </div>

      {errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Errors ({errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {errors.map((error, idx) => (
                  <div key={idx} className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-900 dark:text-red-100">
                          Row {error.row} {error.sheet && `(${error.sheet})`}
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {error.field}: {error.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="mt-4 text-sm text-muted-foreground">
              Please fix these errors in your Excel file and upload again.
            </p>
          </CardContent>
        </Card>
      )}

      {warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              Warnings ({warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {warnings.map((warning, idx) => (
                  <div key={idx} className="rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                      Row {warning.row} {warning.sheet && `(${warning.sheet})`}
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {warning.message}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="mt-4 text-sm text-muted-foreground">
              These warnings will not prevent the import.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onContinue} disabled={hasErrors}>
          {hasErrors ? "Fix Errors to Continue" : "Continue to Preview"}
        </Button>
      </div>
    </div>
  );
}
