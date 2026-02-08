import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, ArrowUp, ArrowDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  loading?: boolean;
  trend?: number;
  subtitle?: string;
  borderColor?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  trend,
  subtitle,
  borderColor,
  onClick,
}: StatCardProps) {
  return (
    <Card
      className={`${borderColor ? `border-l-4 ${borderColor}` : ""} ${onClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-16 animate-pulse rounded bg-muted" />
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{value}</div>
              {trend !== undefined && trend !== 0 && (
                <span
                  className={`flex items-center text-xs font-medium ${trend > 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {trend > 0 ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
