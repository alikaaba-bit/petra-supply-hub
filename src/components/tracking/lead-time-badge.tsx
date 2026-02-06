"use client";

import { Badge } from "@/components/ui/badge";
import { differenceInDays, isPast } from "date-fns";

interface LeadTimeBadgeProps {
  orderByDate: Date | null | undefined;
}

export function LeadTimeBadge({ orderByDate }: LeadTimeBadgeProps) {
  // Handle null or undefined orderByDate
  if (!orderByDate) {
    return <Badge variant="secondary">N/A</Badge>;
  }

  const daysUntil = differenceInDays(orderByDate, new Date());
  const isOverdue = isPast(orderByDate) && daysUntil < 0;

  // Overdue (past date)
  if (isOverdue) {
    const daysOverdue = Math.abs(daysUntil);
    return (
      <Badge variant="destructive">Overdue by {daysOverdue} days</Badge>
    );
  }

  // Urgent (7 days or less)
  if (daysUntil <= 7) {
    return (
      <Badge
        variant="secondary"
        className="bg-amber-100 text-amber-800 hover:bg-amber-100/80"
      >
        Order in {daysUntil} days
      </Badge>
    );
  }

  // Normal (more than 7 days)
  return <Badge variant="secondary">Order by in {daysUntil} days</Badge>;
}
