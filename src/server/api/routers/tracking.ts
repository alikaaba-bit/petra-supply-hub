import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  purchaseOrders,
  poLineItems,
  retailOrders,
  retailOrderLineItems,
  brands,
  retailers,
  skus,
  payments,
} from "@/server/db/schema";
import { eq, desc, sql, and, ne, or } from "drizzle-orm";
import { calculateOrderByDate } from "@/lib/lead-time";
import { differenceInDays } from "date-fns";

export const trackingRouter = router({
  // Supplier (Purchase) Orders with brand data
  supplierOrders: protectedProcedure
    .input(
      z.object({
        brandId: z.number().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.brandId) {
        conditions.push(eq(purchaseOrders.brandId, input.brandId));
      }

      if (input.status) {
        conditions.push(eq(purchaseOrders.status, input.status));
      }

      const query = ctx.db
        .select({
          id: purchaseOrders.id,
          poNumber: purchaseOrders.poNumber,
          supplier: purchaseOrders.supplier,
          status: purchaseOrders.status,
          orderDate: purchaseOrders.orderDate,
          expectedArrival: purchaseOrders.expectedArrival,
          actualArrival: purchaseOrders.actualArrival,
          totalAmount: purchaseOrders.totalAmount,
          currency: purchaseOrders.currency,
          depositAmount: purchaseOrders.depositAmount,
          depositPaid: purchaseOrders.depositPaid,
          createdAt: purchaseOrders.createdAt,
          brand: {
            id: brands.id,
            name: brands.name,
            leadTimeDays: brands.leadTimeDays,
          },
        })
        .from(purchaseOrders)
        .innerJoin(brands, eq(purchaseOrders.brandId, brands.id))
        .orderBy(desc(purchaseOrders.orderDate));

      if (conditions.length > 0) {
        return await query.where(and(...conditions));
      }

      return await query;
    }),

  // Supplier Order Detail with line items and payments
  supplierOrderDetail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      // Get PO with brand
      const po = await ctx.db
        .select({
          id: purchaseOrders.id,
          poNumber: purchaseOrders.poNumber,
          supplier: purchaseOrders.supplier,
          status: purchaseOrders.status,
          orderDate: purchaseOrders.orderDate,
          expectedArrival: purchaseOrders.expectedArrival,
          actualArrival: purchaseOrders.actualArrival,
          totalAmount: purchaseOrders.totalAmount,
          currency: purchaseOrders.currency,
          depositAmount: purchaseOrders.depositAmount,
          depositPaid: purchaseOrders.depositPaid,
          notes: purchaseOrders.notes,
          createdAt: purchaseOrders.createdAt,
          updatedAt: purchaseOrders.updatedAt,
          brand: {
            id: brands.id,
            name: brands.name,
            leadTimeDays: brands.leadTimeDays,
          },
        })
        .from(purchaseOrders)
        .innerJoin(brands, eq(purchaseOrders.brandId, brands.id))
        .where(eq(purchaseOrders.id, input.id))
        .limit(1);

      if (po.length === 0) {
        return null;
      }

      // Get line items with SKU details
      const lineItems = await ctx.db
        .select({
          id: poLineItems.id,
          quantity: poLineItems.quantity,
          unitCost: poLineItems.unitCost,
          totalCost: poLineItems.totalCost,
          sku: {
            id: skus.id,
            sku: skus.sku,
            name: skus.name,
          },
        })
        .from(poLineItems)
        .innerJoin(skus, eq(poLineItems.skuId, skus.id))
        .where(eq(poLineItems.purchaseOrderId, input.id));

      // Get payments
      const poPayments = await ctx.db
        .select()
        .from(payments)
        .where(eq(payments.purchaseOrderId, input.id));

      return {
        ...po[0],
        lineItems,
        payments: poPayments,
      };
    }),

  // Retail Orders with brand and retailer data
  retailOrders: protectedProcedure
    .input(
      z.object({
        brandId: z.number().optional(),
        retailerId: z.number().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.brandId) {
        conditions.push(eq(retailOrders.brandId, input.brandId));
      }

      if (input.retailerId) {
        conditions.push(eq(retailOrders.retailerId, input.retailerId));
      }

      if (input.status) {
        conditions.push(eq(retailOrders.status, input.status));
      }

      const query = ctx.db
        .select({
          id: retailOrders.id,
          retailerPoNumber: retailOrders.retailerPoNumber,
          status: retailOrders.status,
          orderDate: retailOrders.orderDate,
          shipByDate: retailOrders.shipByDate,
          totalAmount: retailOrders.totalAmount,
          createdAt: retailOrders.createdAt,
          brand: {
            id: brands.id,
            name: brands.name,
          },
          retailer: {
            id: retailers.id,
            name: retailers.name,
          },
        })
        .from(retailOrders)
        .innerJoin(brands, eq(retailOrders.brandId, brands.id))
        .innerJoin(retailers, eq(retailOrders.retailerId, retailers.id))
        .orderBy(desc(retailOrders.orderDate));

      if (conditions.length > 0) {
        return await query.where(and(...conditions));
      }

      return await query;
    }),

  // Retail Order Detail with line items and payments
  retailOrderDetail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      // Get order with brand and retailer
      const order = await ctx.db
        .select({
          id: retailOrders.id,
          retailerPoNumber: retailOrders.retailerPoNumber,
          status: retailOrders.status,
          orderDate: retailOrders.orderDate,
          shipByDate: retailOrders.shipByDate,
          totalAmount: retailOrders.totalAmount,
          notes: retailOrders.notes,
          createdAt: retailOrders.createdAt,
          updatedAt: retailOrders.updatedAt,
          brand: {
            id: brands.id,
            name: brands.name,
          },
          retailer: {
            id: retailers.id,
            name: retailers.name,
          },
        })
        .from(retailOrders)
        .innerJoin(brands, eq(retailOrders.brandId, brands.id))
        .innerJoin(retailers, eq(retailOrders.retailerId, retailers.id))
        .where(eq(retailOrders.id, input.id))
        .limit(1);

      if (order.length === 0) {
        return null;
      }

      // Get line items with SKU details
      const lineItems = await ctx.db
        .select({
          id: retailOrderLineItems.id,
          quantity: retailOrderLineItems.quantity,
          unitPrice: retailOrderLineItems.unitPrice,
          totalPrice: retailOrderLineItems.totalPrice,
          sku: {
            id: skus.id,
            sku: skus.sku,
            name: skus.name,
          },
        })
        .from(retailOrderLineItems)
        .innerJoin(skus, eq(retailOrderLineItems.skuId, skus.id))
        .where(eq(retailOrderLineItems.retailOrderId, input.id));

      // Get payments
      const orderPayments = await ctx.db
        .select()
        .from(payments)
        .where(eq(payments.retailOrderId, input.id));

      return {
        ...order[0],
        lineItems,
        payments: orderPayments,
      };
    }),

  // Lead Time Overview - active POs with calculated order-by dates
  leadTimeOverview: protectedProcedure
    .input(
      z.object({
        brandId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        ne(purchaseOrders.status, "arrived"),
        ne(purchaseOrders.status, "cancelled"),
      ];

      if (input.brandId) {
        conditions.push(eq(purchaseOrders.brandId, input.brandId));
      }

      const activePOs = await ctx.db
        .select({
          id: purchaseOrders.id,
          poNumber: purchaseOrders.poNumber,
          supplier: purchaseOrders.supplier,
          status: purchaseOrders.status,
          orderDate: purchaseOrders.orderDate,
          expectedArrival: purchaseOrders.expectedArrival,
          totalAmount: purchaseOrders.totalAmount,
          currency: purchaseOrders.currency,
          brand: {
            id: brands.id,
            name: brands.name,
            leadTimeDays: brands.leadTimeDays,
          },
        })
        .from(purchaseOrders)
        .innerJoin(brands, eq(purchaseOrders.brandId, brands.id))
        .where(and(...conditions))
        .orderBy(purchaseOrders.expectedArrival);

      // Calculate order-by dates and days until order-by for each PO
      const result = activePOs.map((po) => {
        if (!po.expectedArrival || !po.brand.leadTimeDays) {
          return {
            ...po,
            orderByDate: null,
            daysUntilOrderBy: null,
          };
        }

        const orderByDate = calculateOrderByDate(
          po.expectedArrival,
          po.brand.leadTimeDays
        );
        const daysUntilOrderBy = differenceInDays(orderByDate, new Date());

        return {
          ...po,
          orderByDate,
          daysUntilOrderBy,
        };
      });

      return result;
    }),

  // Status Summary - counts of POs and retail orders by status
  statusSummary: protectedProcedure.query(async ({ ctx }) => {
    // Get PO status counts
    const poStatusCounts = await ctx.db
      .select({
        status: purchaseOrders.status,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(purchaseOrders)
      .groupBy(purchaseOrders.status);

    // Get retail order status counts
    const retailOrderStatusCounts = await ctx.db
      .select({
        status: retailOrders.status,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(retailOrders)
      .groupBy(retailOrders.status);

    return {
      purchaseOrders: poStatusCounts,
      retailOrders: retailOrderStatusCounts,
    };
  }),
});
