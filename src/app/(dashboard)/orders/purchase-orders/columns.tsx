"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash, Eye } from "lucide-react";
import { format } from "date-fns";

export type PurchaseOrder = {
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
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  brand: {
    id: number;
    name: string;
  };
};

interface ColumnsProps {
  onView: (po: PurchaseOrder) => void;
  onEdit: (po: PurchaseOrder) => void;
  onDelete: (po: PurchaseOrder) => void;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  ordered: "default",
  confirmed: "default",
  in_transit: "outline",
  arrived: "default",
  cancelled: "destructive",
};

export const createColumns = ({ onView, onEdit, onDelete }: ColumnsProps): ColumnDef<PurchaseOrder>[] => [
  {
    accessorKey: "poNumber",
    header: "PO Number",
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
      return (
        <Badge variant={statusColors[status] || "default"}>
          {status.replace("_", " ").toUpperCase()}
        </Badge>
      );
    },
  },
  {
    accessorKey: "orderDate",
    header: "Order Date",
    cell: ({ row }) => {
      const date = row.getValue("orderDate") as Date | null;
      return <span className="text-muted-foreground">{date ? format(date, "MMM dd, yyyy") : "—"}</span>;
    },
  },
  {
    accessorKey: "expectedArrival",
    header: "Expected Arrival",
    cell: ({ row }) => {
      const date = row.getValue("expectedArrival") as Date | null;
      return <span className="text-muted-foreground">{date ? format(date, "MMM dd, yyyy") : "—"}</span>;
    },
  },
  {
    accessorKey: "totalAmount",
    header: "Total Amount",
    cell: ({ row }) => {
      const amount = row.getValue("totalAmount") as string | null;
      const currency = row.original.currency || "USD";
      return <span className="text-muted-foreground">{amount ? `${currency} ${amount}` : "—"}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const po = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onView(po)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(po)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(po)}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
