import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { skus } from "@/server/db/schema";
import { eq, desc, count } from "drizzle-orm";

export const skusRouter = router({
  count: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.select({ count: count() }).from(skus);
    return result[0]?.count ?? 0;
  }),

  list: publicProcedure
    .input(
      z
        .object({
          brandId: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.skus.findMany({
        where: input?.brandId ? eq(skus.brandId, input.brandId) : undefined,
        orderBy: [desc(skus.createdAt)],
        with: {
          brand: true,
        },
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.skus.findFirst({
        where: eq(skus.id, input.id),
        with: {
          brand: true,
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        brandId: z.number(),
        sku: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        unitCost: z.string().optional(),
        unitPrice: z.string().optional(),
        active: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [sku] = await ctx.db
        .insert(skus)
        .values({
          brandId: input.brandId,
          sku: input.sku,
          name: input.name,
          description: input.description,
          category: input.category,
          unitCost: input.unitCost,
          unitPrice: input.unitPrice,
          active: input.active,
        })
        .returning();

      return sku;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        brandId: z.number().optional(),
        sku: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        unitCost: z.string().optional(),
        unitPrice: z.string().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [sku] = await ctx.db
        .update(skus)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(skus.id, id))
        .returning();

      return sku;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(skus).where(eq(skus.id, input.id));
      return { success: true };
    }),
});
