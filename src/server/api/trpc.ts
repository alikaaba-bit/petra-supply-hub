import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { sql } from "drizzle-orm";
import superjson from "superjson";

interface CreateContextOptions {
  headers: Headers;
}

export async function createTRPCContext(opts: CreateContextOptions) {
  const session = await auth();

  return {
    db,
    session,
    ...opts,
  };
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createCallerFactory = t.createCallerFactory;
export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async (opts) => {
  const { ctx } = opts;

  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Set PostgreSQL session variable for audit triggers
  await ctx.db.execute(
    sql`SELECT set_config('app.current_user_id', ${ctx.session.user.id}, false)`
  );

  return opts.next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const adminProcedure = protectedProcedure.use((opts) => {
  const { ctx } = opts;

  if (ctx.session.user.role !== "ceo" && ctx.session.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return opts.next({ ctx });
});
