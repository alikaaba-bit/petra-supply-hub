import { router } from "./trpc";
import { brandsRouter } from "./routers/brands";
import { skusRouter } from "./routers/skus";
import { retailersRouter } from "./routers/retailers";
import { auditRouter } from "./routers/audit";
import { importRouter } from "./routers/import";
import { ordersRouter } from "./routers/orders";

export const appRouter = router({
  brands: brandsRouter,
  skus: skusRouter,
  retailers: retailersRouter,
  audit: auditRouter,
  import: importRouter,
  orders: ordersRouter,
});

export type AppRouter = typeof appRouter;
