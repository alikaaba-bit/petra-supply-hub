"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

const severityConfig = {
  critical: {
    icon: AlertCircle,
    border: "border-l-red-500",
    bg: "bg-red-50",
    badge: "bg-red-100 text-red-800",
    label: "Critical",
    dot: "bg-red-500",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-l-amber-500",
    bg: "bg-amber-50",
    badge: "bg-amber-100 text-amber-800",
    label: "Warning",
    dot: "bg-amber-500",
  },
  info: {
    icon: Info,
    border: "border-l-blue-500",
    bg: "bg-blue-50",
    badge: "bg-blue-100 text-blue-800",
    label: "Info",
    dot: "bg-blue-500",
  },
} as const;

interface ActionItem {
  type: string;
  severity: "critical" | "warning" | "info";
  brandName: string;
  title: string;
  detail: string;
}

interface ActionCenterProps {
  data: ActionItem[];
  isLoading?: boolean;
}

export function ActionCenter({ data, isLoading }: ActionCenterProps) {
  const criticalCount = data.filter((d) => d.severity === "critical").length;
  const warningCount = data.filter((d) => d.severity === "warning").length;
  const infoCount = data.filter((d) => d.severity === "info").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Action Center</CardTitle>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-red-100 text-red-800 border-0">
                {criticalCount} critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-amber-100 text-amber-800 border-0">
                {warningCount} warning
              </Badge>
            )}
            {infoCount > 0 && (
              <Badge className="bg-blue-100 text-blue-800 border-0">
                {infoCount} info
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <div className="text-lg font-medium mb-1">All clear</div>
            <div className="text-sm">No urgent actions required</div>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((item, i) => {
              const config = severityConfig[item.severity];
              const SevIcon = config.icon;
              return (
                <div
                  key={`${item.type}-${item.brandName}-${i}`}
                  className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${config.border} ${config.bg}`}
                >
                  <div className="relative mt-0.5">
                    <SevIcon className="h-4 w-4 text-muted-foreground" />
                    {item.severity === "critical" && (
                      <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${config.dot} animate-pulse`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.title}</span>
                      <Badge
                        variant="outline"
                        className="text-xs flex-shrink-0"
                      >
                        {item.brandName}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.detail}
                    </div>
                  </div>
                  <Badge className={`${config.badge} border-0 text-xs flex-shrink-0`}>
                    {item.type.replace(/_/g, " ")}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
