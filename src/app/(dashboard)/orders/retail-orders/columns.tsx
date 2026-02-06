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

export type RetailOrder = {
  id: number;
  retailerPoNumber: string | null;
  status: string;
  orderDate: Date | null;
  shipByDate: Date | null;
  totalAmount: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  retailer: {
    id: number;
    name: string;
  };
  brand: {
    id: number;
    name: string;
  };
};

interface ColumnsProps {
  onView: (order: RetailOrder) => void;
  onEdit: (order: RetailOrder) => void;
  onDelete: (order: RetailOrder) => void;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  received: "secondary",
  confirmed: "default",
  in_production: "outline",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
};

export const createColumns = ({ onView, onEdit, onDelete }: ColumnsProps): ColumnDef<RetailOrder>[] => [
  {
    accessorKey: "retailerPoNumber",
    header: "PO Number",
    cell: ({ row }) => {
      const poNumber = row.getValue("retailerPoNumber") as string | null;
      return <span className="font-medium">{poNumber || "—"}</span>;
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
    accessorKey: "shipByDate",
    header: "Ship By Date",
    cell: ({ row }) => {
      const date = row.getValue("shipByDate") as Date | null;
      return <span className="text-muted-foreground">{date ? format(date, "MMM dd, yyyy") : "—"}</span>;
    },
  },
  {
    accessorKey: "totalAmount",
    header: "Total Amount",
    cell: ({ row }) => {
      const amount = row.getValue("totalAmount") as string | null;
      return <span className="text-muted-foreground">{amount ? `$${amount}` : "—"}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const order = row.original;

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
            <DropdownMenuItem onClick={() => onView(order)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(order)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(order)}
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
