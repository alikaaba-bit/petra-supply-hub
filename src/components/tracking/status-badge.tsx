"use client";

import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();

  // Map statuses to badge variants and custom classes
  switch (normalizedStatus) {
    // Draft/inactive states - secondary
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;

    // In-progress states - default
    case "ordered":
      return <Badge variant="default">Ordered</Badge>;
    case "confirmed":
      return <Badge variant="default">Confirmed</Badge>;
    case "in_production":
      return <Badge variant="default">In Production</Badge>;
    case "shipped":
      return <Badge variant="default">Shipped</Badge>;
    case "in_transit":
      return <Badge variant="default">In Transit</Badge>;

    // Retail in-progress states - default
    case "received":
      return <Badge variant="default">Received</Badge>;
    case "processing":
      return <Badge variant="default">Processing</Badge>;
    case "allocated":
      return <Badge variant="default">Allocated</Badge>;

    // Terminal positive states - success (green)
    case "arrived":
      return (
        <Badge
          variant="secondary"
          className="bg-green-100 text-green-800 hover:bg-green-100/80"
        >
          Arrived
        </Badge>
      );
    case "delivered":
      return (
        <Badge
          variant="secondary"
          className="bg-green-100 text-green-800 hover:bg-green-100/80"
        >
          Delivered
        </Badge>
      );

    // Cancelled - destructive
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;

    // Unknown status - secondary with raw status text
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}
