"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const TABLE_OPTIONS = [
  { value: "", label: "All Tables" },
  { value: "brands", label: "Brands" },
  { value: "skus", label: "SKUs" },
  { value: "retailers", label: "Retailers" },
  { value: "users", label: "Users" },
  { value: "purchase_orders", label: "Purchase Orders" },
  { value: "retail_orders", label: "Retail Orders" },
  { value: "inventory", label: "Inventory" },
  { value: "forecasts", label: "Forecasts" },
  { value: "payments", label: "Payments" },
];

function formatDate(date: Date): string {
  return format(new Date(date), "MMM d, yyyy HH:mm:ss");
}

function parseChanges(previousData: string | null, changedData: string | null): string {
  if (!previousData && changedData) {
    return "Record created";
  }
  if (previousData && !changedData) {
    return "Record deleted";
  }
  if (previousData && changedData) {
    try {
      const oldData = JSON.parse(previousData);
      const newData = JSON.parse(changedData);
      const changes: string[] = [];
      const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

      allKeys.forEach((key) => {
        if (key === "updatedAt" || key === "createdAt") return;
        if (oldData[key] !== newData[key]) {
          changes.push(`${key}: ${oldData[key]} → ${newData[key]}`);
        }
      });

      return changes.length > 0 ? changes.join(", ") : "No changes detected";
    } catch {
      return "Unable to parse changes";
    }
  }
  return "Unknown change";
}

export default function AuditPage() {
  const [selectedTable, setSelectedTable] = React.useState<string>("");

  const { data: auditLogs, isLoading } = trpc.audit.list.useQuery({
    tableName: selectedTable || undefined,
    limit: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">
            Track all data changes across the system
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <select
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
          className="flex h-10 w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {TABLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Record ID</TableHead>
              <TableHead>Changes</TableHead>
              <TableHead>User ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(10)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : auditLogs && auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-mono text-xs">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.tableName}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.action === "INSERT"
                          ? "default"
                          : log.action === "UPDATE"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.recordId}</TableCell>
                  <TableCell className="max-w-md truncate text-sm text-muted-foreground">
                    {parseChanges(log.previousData, log.changedData)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.userId || "—"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No audit logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
