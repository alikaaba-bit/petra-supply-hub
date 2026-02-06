"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface CommitResultProps {
  imported: number;
  updated: number;
  importType: 'forecast' | 'sales';
  onReset: () => void;
}

export function CommitResult({ imported, updated, importType, onReset }: CommitResultProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <Card className="border-green-500">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">Import Complete</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Imported</p>
              <p className="text-3xl font-bold">{imported}</p>
              <p className="text-sm text-muted-foreground">new records</p>
            </div>
            {updated > 0 && (
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Updated</p>
                <p className="text-3xl font-bold">{updated}</p>
                <p className="text-sm text-muted-foreground">existing records</p>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm">
              Your {importType === 'forecast' ? 'forecast' : 'sales'} data has been successfully imported.
              {updated > 0 ? ` ${updated} existing records were updated with the new data.` : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onReset}>
          Import Another File
        </Button>
        <Button onClick={() => router.push('/dashboard')}>
          View Dashboard
        </Button>
      </div>
    </div>
  );
}
