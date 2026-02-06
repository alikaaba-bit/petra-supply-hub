"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Check, X } from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "@/components/tracking/status-badge";
import { LeadTimeBadge } from "@/components/tracking/lead-time-badge";
import { calculateOrderByDate } from "@/lib/lead-time";
import Link from "next/link";

export type SupplierOrder = {
  id: number;
  poNumber: string;
  supplier: string | null;
  status: string;
  orderDate: Date | null;
  expectedArrival: Date | null;
  actualArrival: Date | null;
  totalAmount: string | null;
  currency: string | null;
  depositAmount: string | null;
  depositPaid: boolean | null;
  createdAt: Date;
  brand: {
    id: number;
    name: string;
    leadTimeDays: number | null;
  };
};

export const columns: ColumnDef<SupplierOrder>[] = [
  {
    accessorKey: "poNumber",
    header: "PO Number",
    cell: ({ row }) => {
      const po = row.original;
      return (
        <Link
          href={`/tracking/supplier-orders/${po.id}`}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {po.poNumber}
        </Link>
      );
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
    accessorKey: "supplier",
    header: "Supplier",
    cell: ({ row }) => {
      const supplier = row.getValue("supplier") as string | null;
      return <span className="text-muted-foreground">{supplier || "—"}</span>;
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
    accessorKey: "expectedArrival",
    header: "Expected Arrival",
    cell: ({ row }) => {
      const date = row.getValue("expectedArrival") as Date | null;
      return (
        <span className="text-muted-foreground">
          {date ? format(date, "MMM dd, yyyy") : "—"}
        </span>
      );
    },
  },
  {
    id: "depositStatus",
    header: "Deposit",
    cell: ({ row }) => {
      const depositPaid = row.original.depositPaid;
      if (depositPaid === null) {
        return <span className="text-muted-foreground">—</span>;
      }
      return depositPaid ? (
        <Check className="h-5 w-5 text-green-600" />
      ) : (
        <X className="h-5 w-5 text-red-600" />
      );
    },
  },
  {
    id: "leadTime",
    header: "Lead Time",
    cell: ({ row }) => {
      const po = row.original;
      if (!po.expectedArrival || !po.brand.leadTimeDays) {
        return <span className="text-muted-foreground">—</span>;
      }
      const orderByDate = calculateOrderByDate(
        po.expectedArrival,
        po.brand.leadTimeDays
      );
      return <LeadTimeBadge orderByDate={orderByDate} />;
    },
  },
];
