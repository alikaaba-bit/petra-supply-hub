"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";

interface StatusCount {
  status: string;
  count: number;
}

interface OrderStatusCardProps {
  title: string;
  counts: StatusCount[];
  total: number;
}

export function OrderStatusCard({
  title,
  counts,
  total,
}: OrderStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Total count prominently displayed */}
        <div className="mb-4 text-2xl font-bold">{total}</div>

        {/* Status breakdown */}
        <div className="space-y-2">
          {counts.map((item) => (
            <div
              key={item.status}
              className="flex items-center justify-between"
            >
              <StatusBadge status={item.status} />
              <span className="text-sm font-medium text-muted-foreground">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
