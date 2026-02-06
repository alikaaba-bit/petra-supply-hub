import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
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
import { eq, desc, count, and } from "drizzle-orm";

export const ordersRouter = router({
  // Purchase Orders
  purchaseOrders: router({
    count: publicProcedure.query(async ({ ctx }) => {
      const result = await ctx.db
        .select({ count: count() })
        .from(purchaseOrders);
      return result[0]?.count ?? 0;
    }),

    list: protectedProcedure
      .input(
        z.object({
          brandId: z.number().optional(),
          status: z.string().optional(),
          limit: z.number().int().positive().max(1000).default(100),
          offset: z.number().int().nonnegative().default(0),
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
            notes: purchaseOrders.notes,
            createdAt: purchaseOrders.createdAt,
            updatedAt: purchaseOrders.updatedAt,
            brand: {
              id: brands.id,
              name: brands.name,
            },
          })
          .from(purchaseOrders)
          .innerJoin(brands, eq(purchaseOrders.brandId, brands.id))
          .orderBy(desc(purchaseOrders.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        if (conditions.length > 0) {
          return await query.where(and(...conditions));
        }

        return await query;
      }),

    getById: protectedProcedure
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

    create: protectedProcedure
      .input(
        z.object({
          poNumber: z.string().min(1),
          brandId: z.number(),
          supplier: z.string().optional(),
          status: z.string().default("draft"),
          orderDate: z.date().optional(),
          expectedArrival: z.date().optional(),
          totalAmount: z.string().optional(),
          currency: z.string().default("USD"),
          depositAmount: z.string().optional(),
          depositPaid: z.boolean().default(false),
          notes: z.string().optional(),
          lineItems: z.array(
            z.object({
              skuId: z.number(),
              quantity: z.number().int().positive(),
              unitCost: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { lineItems: inputLineItems, ...poData } = input;

        return await ctx.db.transaction(async (tx) => {
          // Insert PO
          const [po] = await tx
            .insert(purchaseOrders)
            .values({
              ...poData,
              createdBy: ctx.session.user.id,
            })
            .returning();

          if (!po) {
            throw new Error("Failed to create purchase order");
          }

          // Insert line items
          if (inputLineItems.length > 0) {
            const lineItemRecords = inputLineItems.map((item) => {
              const unitCost = item.unitCost
                ? parseFloat(item.unitCost)
                : null;
              const totalCost =
                unitCost !== null
                  ? (unitCost * item.quantity).toFixed(2)
                  : null;

              return {
                purchaseOrderId: po.id,
                skuId: item.skuId,
                quantity: item.quantity,
                unitCost: item.unitCost,
                totalCost,
              };
            });

            await tx.insert(poLineItems).values(lineItemRecords);
          }

          return po;
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          poNumber: z.string().min(1).optional(),
          supplier: z.string().optional(),
          status: z.string().optional(),
          orderDate: z.date().optional(),
          expectedArrival: z.date().optional(),
          actualArrival: z.date().optional(),
          totalAmount: z.string().optional(),
          currency: z.string().optional(),
          depositAmount: z.string().optional(),
          depositPaid: z.boolean().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;

        const [po] = await ctx.db
          .update(purchaseOrders)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(purchaseOrders.id, id))
          .returning();

        return po;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .delete(purchaseOrders)
          .where(eq(purchaseOrders.id, input.id));
        return { success: true };
      }),
  }),

  // Retail Orders
  retailOrders: router({
    count: publicProcedure.query(async ({ ctx }) => {
      const result = await ctx.db
        .select({ count: count() })
        .from(retailOrders);
      return result[0]?.count ?? 0;
    }),

    list: protectedProcedure
      .input(
        z.object({
          retailerId: z.number().optional(),
          brandId: z.number().optional(),
          status: z.string().optional(),
          limit: z.number().int().positive().max(1000).default(100),
          offset: z.number().int().nonnegative().default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const conditions = [];

        if (input.retailerId) {
          conditions.push(eq(retailOrders.retailerId, input.retailerId));
        }

        if (input.brandId) {
          conditions.push(eq(retailOrders.brandId, input.brandId));
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
            notes: retailOrders.notes,
            createdAt: retailOrders.createdAt,
            updatedAt: retailOrders.updatedAt,
            retailer: {
              id: retailers.id,
              name: retailers.name,
            },
            brand: {
              id: brands.id,
              name: brands.name,
            },
          })
          .from(retailOrders)
          .innerJoin(retailers, eq(retailOrders.retailerId, retailers.id))
          .innerJoin(brands, eq(retailOrders.brandId, brands.id))
          .orderBy(desc(retailOrders.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        if (conditions.length > 0) {
          return await query.where(and(...conditions));
        }

        return await query;
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        // Get order with retailer and brand
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
            retailer: {
              id: retailers.id,
              name: retailers.name,
            },
            brand: {
              id: brands.id,
              name: brands.name,
            },
          })
          .from(retailOrders)
          .innerJoin(retailers, eq(retailOrders.retailerId, retailers.id))
          .innerJoin(brands, eq(retailOrders.brandId, brands.id))
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

        return {
          ...order[0],
          lineItems,
        };
      }),

    create: protectedProcedure
      .input(
        z.object({
          retailerId: z.number(),
          brandId: z.number(),
          retailerPoNumber: z.string().optional(),
          status: z.string().default("received"),
          orderDate: z.date().optional(),
          shipByDate: z.date().optional(),
          totalAmount: z.string().optional(),
          notes: z.string().optional(),
          lineItems: z.array(
            z.object({
              skuId: z.number(),
              quantity: z.number().int().positive(),
              unitPrice: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { lineItems: inputLineItems, ...orderData } = input;

        return await ctx.db.transaction(async (tx) => {
          // Insert order
          const [order] = await tx
            .insert(retailOrders)
            .values({
              ...orderData,
              createdBy: ctx.session.user.id,
            })
            .returning();

          if (!order) {
            throw new Error("Failed to create retail order");
          }

          // Insert line items
          if (inputLineItems.length > 0) {
            const lineItemRecords = inputLineItems.map((item) => {
              const unitPrice = item.unitPrice
                ? parseFloat(item.unitPrice)
                : null;
              const totalPrice =
                unitPrice !== null
                  ? (unitPrice * item.quantity).toFixed(2)
                  : null;

              return {
                retailOrderId: order.id,
                skuId: item.skuId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice,
              };
            });

            await tx.insert(retailOrderLineItems).values(lineItemRecords);
          }

          return order;
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          retailerPoNumber: z.string().optional(),
          status: z.string().optional(),
          orderDate: z.date().optional(),
          shipByDate: z.date().optional(),
          totalAmount: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;

        const [order] = await ctx.db
          .update(retailOrders)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(retailOrders.id, id))
          .returning();

        return order;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .delete(retailOrders)
          .where(eq(retailOrders.id, input.id));
        return { success: true };
      }),
  }),
});
