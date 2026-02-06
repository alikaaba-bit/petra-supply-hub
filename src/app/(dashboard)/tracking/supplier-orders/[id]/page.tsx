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
import { LeadTimeBadge } from "@/components/tracking/lead-time-badge";
import { POTimeline } from "@/components/tracking/po-timeline";
import { calculateOrderByDate } from "@/lib/lead-time";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function SupplierOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);

  const { data: po, isLoading } = trpc.tracking.supplierOrderDetail.useQuery({
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

  if (!po) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/tracking/supplier-orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Supplier Orders
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">Purchase order not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const orderByDate =
    po.expectedArrival && po.brand.leadTimeDays
      ? calculateOrderByDate(po.expectedArrival, po.brand.leadTimeDays)
      : null;

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link href="/tracking/supplier-orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Supplier Orders
          </Button>
        </Link>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{po.poNumber}</h1>
        <p className="text-muted-foreground">Supplier Purchase Order Details</p>
      </div>

      {/* PO Header Info - 2 columns */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Order Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Brand:</span>
              <span className="text-sm font-medium">{po.brand.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Supplier:</span>
              <span className="text-sm font-medium">{po.supplier || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <StatusBadge status={po.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Order Date:</span>
              <span className="text-sm font-medium">
                {po.orderDate ? format(po.orderDate, "MMM dd, yyyy") : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Dates & Lead Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Expected Arrival:
              </span>
              <span className="text-sm font-medium">
                {po.expectedArrival
                  ? format(po.expectedArrival, "MMM dd, yyyy")
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Actual Arrival:
              </span>
              <span className="text-sm font-medium">
                {po.actualArrival
                  ? format(po.actualArrival, "MMM dd, yyyy")
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Lead Time:</span>
              <LeadTimeBadge orderByDate={orderByDate} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Financial Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Amount:</span>
            <span className="text-sm font-medium">
              {po.totalAmount
                ? `${po.currency || "USD"} ${po.totalAmount}`
                : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              Deposit Amount:
            </span>
            <span className="text-sm font-medium">
              {po.depositAmount
                ? `${po.currency || "USD"} ${po.depositAmount}`
                : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Deposit Paid:</span>
            <span className="text-sm font-medium">
              {po.depositPaid ? "Yes" : "No"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* PO Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Order Lifecycle</CardTitle>
        </CardHeader>
        <CardContent>
          <POTimeline
            currentStatus={po.status}
            orderDate={po.orderDate}
            expectedArrival={po.expectedArrival}
            actualArrival={po.actualArrival}
          />
        </CardContent>
      </Card>

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
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.lineItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No line items
                  </TableCell>
                </TableRow>
              ) : (
                po.lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.sku.sku}</TableCell>
                    <TableCell>{item.sku.name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {po.currency || "USD"} {item.unitCost}
                    </TableCell>
                    <TableCell className="text-right">
                      {po.currency || "USD"} {item.totalCost}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payments */}
      {po.payments.length > 0 && (
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
                {po.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="capitalize">
                      {payment.type}
                    </TableCell>
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
      {po.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{po.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
