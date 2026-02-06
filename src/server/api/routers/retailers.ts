import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { retailers } from "@/server/db/schema";
import { eq, desc, count } from "drizzle-orm";

export const retailersRouter = router({
  count: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.select({ count: count() }).from(retailers);
    return result[0]?.count ?? 0;
  }),

  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.retailers.findMany({
      orderBy: [desc(retailers.createdAt)],
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.retailers.findFirst({
        where: eq(retailers.id, input.id),
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        parentGroup: z.string().optional(),
        channel: z.string().optional(),
        active: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [retailer] = await ctx.db
        .insert(retailers)
        .values({
          name: input.name,
          code: input.code,
          parentGroup: input.parentGroup,
          channel: input.channel,
          active: input.active,
        })
        .returning();

      return retailer;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        code: z.string().min(1).optional(),
        parentGroup: z.string().optional(),
        channel: z.string().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [retailer] = await ctx.db
        .update(retailers)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(retailers.id, id))
        .returning();

      return retailer;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(retailers).where(eq(retailers.id, input.id));
      return { success: true };
    }),
});
