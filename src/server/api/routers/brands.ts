import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { brands } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";

export const brandsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.brands.findMany({
      orderBy: [desc(brands.createdAt)],
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.brands.findFirst({
        where: eq(brands.id, input.id),
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        leadTimeDays: z.number().int().positive().default(30),
        active: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [brand] = await ctx.db
        .insert(brands)
        .values({
          name: input.name,
          description: input.description,
          leadTimeDays: input.leadTimeDays,
          active: input.active,
        })
        .returning();

      return brand;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        leadTimeDays: z.number().int().positive().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [brand] = await ctx.db
        .update(brands)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(brands.id, id))
        .returning();

      return brand;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(brands).where(eq(brands.id, input.id));
      return { success: true };
    }),
});
