import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { auditLog } from "@/server/db/schema";
import { eq, desc, and } from "drizzle-orm";

export const auditRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          tableName: z.string().optional(),
          recordId: z.string().optional(),
          limit: z.number().int().positive().default(100),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit || 100;
      const conditions = [];

      if (input?.tableName) {
        conditions.push(eq(auditLog.tableName, input.tableName));
      }

      if (input?.recordId) {
        conditions.push(eq(auditLog.recordId, input.recordId));
      }

      return await ctx.db.query.auditLog.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(auditLog.createdAt)],
        limit,
      });
    }),

  getByRecord: protectedProcedure
    .input(
      z.object({
        tableName: z.string(),
        recordId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.auditLog.findMany({
        where: and(
          eq(auditLog.tableName, input.tableName),
          eq(auditLog.recordId, input.recordId)
        ),
        orderBy: [desc(auditLog.createdAt)],
      });
    }),
});
