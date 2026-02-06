"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const retailOrderSchema = z.object({
  retailerId: z.number({ message: "Retailer is required" }),
  brandId: z.number({ message: "Brand is required" }),
  retailerPoNumber: z.string().optional(),
  status: z.string(),
  orderDate: z.string().optional(),
  shipByDate: z.string().optional(),
  totalAmount: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(
    z.object({
      skuId: z.number({ message: "SKU is required" }),
      quantity: z.number().int().positive("Quantity must be positive"),
      unitPrice: z.string().optional(),
    })
  ).min(1, "At least one line item is required"),
});

type RetailOrderFormData = z.input<typeof retailOrderSchema>;

export default function NewRetailOrderPage() {
  const router = useRouter();
  const [selectedBrand, setSelectedBrand] = React.useState<number | undefined>();

  const { data: retailers } = trpc.retailers.list.useQuery();
  const { data: brands } = trpc.brands.list.useQuery();
  const { data: skus } = trpc.skus.list.useQuery(
    selectedBrand ? { brandId: selectedBrand } : undefined
  );

  const createMutation = trpc.orders.retailOrders.create.useMutation({
    onSuccess: (data) => {
      toast.success("Retail order created successfully");
      router.push(`/orders/retail-orders/${data.id}`);
    },
    onError: (error) => {
      toast.error(`Failed to create retail order: ${error.message}`);
    },
  });

  const form = useForm<RetailOrderFormData>({
    resolver: zodResolver(retailOrderSchema),
    defaultValues: {
      status: "received",
      lineItems: [{ skuId: 0, quantity: 1, unitPrice: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const watchBrandId = form.watch("brandId");
  const watchLineItems = form.watch("lineItems");

  React.useEffect(() => {
    if (watchBrandId) {
      setSelectedBrand(watchBrandId);
    }
  }, [watchBrandId]);

  const calculateTotal = () => {
    return watchLineItems.reduce((sum, item) => {
      const unitPrice = parseFloat(item.unitPrice || "0");
      return sum + unitPrice * item.quantity;
    }, 0).toFixed(2);
  };

  const onSubmit = (data: RetailOrderFormData) => {
    createMutation.mutate({
      ...data,
      orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
      shipByDate: data.shipByDate ? new Date(data.shipByDate) : undefined,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Retail Order</h1>
        <p className="text-muted-foreground">
          Create a new retail order from a partner
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="retailerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retailer</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select retailer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {retailers?.map((retailer) => (
                            <SelectItem key={retailer.id} value={retailer.id.toString()}>
                              {retailer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brandId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brands?.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id.toString()}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="retailerPoNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retailer PO Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter PO number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="received">Received</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="in_production">In Production</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="orderDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shipByDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ship By Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Additional notes..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Line Items</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ skuId: 0, quantity: 1, unitPrice: "" })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-4 items-start">
                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.skuId`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>SKU</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select SKU" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {skus?.map((sku) => (
                              <SelectItem key={sku.id} value={sku.id.toString()}>
                                {sku.sku} - {sku.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="w-32">
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem className="w-32">
                        <FormLabel>Unit Price</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} placeholder="0.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-8"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex justify-end pt-4 border-t">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">${calculateTotal()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Retail Order"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
