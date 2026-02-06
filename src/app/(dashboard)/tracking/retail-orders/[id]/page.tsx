"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { StatusBadge } from "@/components/tracking/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function RetailOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);

  const { data: order, isLoading } = trpc.tracking.retailOrderDetail.useQuery({
    id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/tracking/retail-orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Retail Orders
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">Retail order not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link href="/tracking/retail-orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Retail Orders
          </Button>
        </Link>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {order.retailerPoNumber}
        </h1>
        <p className="text-muted-foreground">Retail Order Details</p>
      </div>

      {/* Order Header Info - 2 columns */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Order Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Retailer:</span>
              <span className="text-sm font-medium">{order.retailer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Brand:</span>
              <span className="text-sm font-medium">{order.brand.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <StatusBadge status={order.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Order Date:</span>
              <span className="text-sm font-medium">
                {order.orderDate ? format(order.orderDate, "MMM dd, yyyy") : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Fulfillment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Ship By:</span>
              <span className="text-sm font-medium">
                {order.shipByDate
                  ? format(order.shipByDate, "MMM dd, yyyy")
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Total Amount:
              </span>
              <span className="text-sm font-medium">
                {order.totalAmount ? `USD ${order.totalAmount}` : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.lineItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    No line items
                  </TableCell>
                </TableRow>
              ) : (
                order.lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.sku.sku}</TableCell>
                    <TableCell>{item.sku.name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      USD {item.unitPrice}
                    </TableCell>
                    <TableCell className="text-right">
                      USD {item.totalPrice}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payments */}
      {order.payments.length > 0 && (
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
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="capitalize">{payment.type}</TableCell>
                    <TableCell>
                      {payment.currency || "USD"} {payment.amount}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell>
                      {payment.paidDate
                        ? format(payment.paidDate, "MMM dd, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {payment.dueDate
                        ? format(payment.dueDate, "MMM dd, yyyy")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
