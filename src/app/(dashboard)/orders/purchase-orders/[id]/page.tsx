"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Pencil } from "lucide-react";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  ordered: "default",
  confirmed: "default",
  in_transit: "outline",
  arrived: "default",
  cancelled: "destructive",
};

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const id = parseInt(params.id as string);

  const { data: po, isLoading } = trpc.orders.purchaseOrders.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/orders/purchase-orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Loading...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/orders/purchase-orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Purchase order not found</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/orders/purchase-orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{po.poNumber}</h1>
            <p className="text-muted-foreground">Purchase Order Details</p>
          </div>
        </div>
        <Link href={`/orders/purchase-orders/${po.id}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">PO Number</p>
              <p className="font-medium">{po.poNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={statusColors[po.status] || "default"}>
                {po.status.replace("_", " ").toUpperCase()}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Brand</p>
              <p className="font-medium">{po.brand.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Supplier</p>
              <p className="font-medium">{po.supplier || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order Date</p>
              <p className="font-medium">
                {po.orderDate ? format(new Date(po.orderDate), "MMM dd, yyyy") : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expected Arrival</p>
              <p className="font-medium">
                {po.expectedArrival ? format(new Date(po.expectedArrival), "MMM dd, yyyy") : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-medium text-lg">
                {po.totalAmount ? `${po.currency} ${po.totalAmount}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Deposit Amount</p>
              <p className="font-medium">
                {po.depositAmount ? `${po.currency} ${po.depositAmount}` : "—"}
              </p>
            </div>
          </div>

          {po.notes && (
            <div>
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="font-medium">{po.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.sku.sku}</TableCell>
                  <TableCell>{item.sku.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {item.unitCost ? `${po.currency} ${item.unitCost}` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.totalCost ? `${po.currency} ${item.totalCost}` : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {po.lineItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No line items
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {po.payments && po.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Paid Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.type}</TableCell>
                    <TableCell>{payment.currency} {payment.amount}</TableCell>
                    <TableCell>
                      <Badge variant={payment.status === "paid" ? "default" : "secondary"}>
                        {payment.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.dueDate ? format(new Date(payment.dueDate), "MMM dd, yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      {payment.paidDate ? format(new Date(payment.paidDate), "MMM dd, yyyy") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
