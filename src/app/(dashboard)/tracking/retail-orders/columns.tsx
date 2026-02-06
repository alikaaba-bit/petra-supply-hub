"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format, differenceInDays } from "date-fns";
import { StatusBadge } from "@/components/tracking/status-badge";
import Link from "next/link";

export type RetailOrder = {
  id: number;
  retailerPoNumber: string | null;
  status: string;
  orderDate: Date | null;
  shipByDate: Date | null;
  totalAmount: string | null;
  createdAt: Date;
  brand: {
    id: number;
    name: string;
  };
  retailer: {
    id: number;
    name: string;
  };
};

export const columns: ColumnDef<RetailOrder>[] = [
  {
    accessorKey: "retailerPoNumber",
    header: "Retailer PO",
    cell: ({ row }) => {
      const order = row.original;
      return (
        <Link
          href={`/tracking/retail-orders/${order.id}`}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {order.retailerPoNumber}
        </Link>
      );
    },
  },
  {
    accessorKey: "retailer",
    header: "Retailer",
    cell: ({ row }) => {
      const retailer = row.original.retailer;
      return <span>{retailer.name}</span>;
    },
  },
  {
    accessorKey: "brand",
    header: "Brand",
    cell: ({ row }) => {
      const brand = row.original.brand;
      return <span>{brand.name}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return <StatusBadge status={status} />;
    },
  },
  {
    accessorKey: "orderDate",
    header: "Order Date",
    cell: ({ row }) => {
      const date = row.getValue("orderDate") as Date | null;
      return (
        <span className="text-muted-foreground">
          {date ? format(date, "MMM dd, yyyy") : "—"}
        </span>
      );
    },
  },
  {
    accessorKey: "shipByDate",
    header: "Ship By",
    cell: ({ row }) => {
      const date = row.getValue("shipByDate") as Date | null;

      if (!date) {
        return <span className="text-muted-foreground">—</span>;
      }

      // Calculate days until ship-by date
      const daysUntil = differenceInDays(date, new Date());
      const isUrgent = daysUntil <= 7 && daysUntil >= 0;

      return (
        <span
          className={`text-muted-foreground ${
            isUrgent ? "text-amber-600 font-medium" : ""
          }`}
        >
          {format(date, "MMM dd, yyyy")}
        </span>
      );
    },
  },
  {
    accessorKey: "totalAmount",
    header: "Total Amount",
    cell: ({ row }) => {
      const amount = row.getValue("totalAmount") as string | null;
      return (
        <span className="text-muted-foreground">
          {amount ? `USD ${amount}` : "—"}
        </span>
      );
    },
  },
];
