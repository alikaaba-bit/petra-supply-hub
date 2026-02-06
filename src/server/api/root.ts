import { router } from "./trpc";
import { brandsRouter } from "./routers/brands";
import { skusRouter } from "./routers/skus";
import { retailersRouter } from "./routers/retailers";
import { auditRouter } from "./routers/audit";

export const appRouter = router({
  brands: brandsRouter,
  skus: skusRouter,
  retailers: retailersRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
