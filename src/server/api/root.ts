import { router } from "./trpc";
import { brandsRouter } from "./routers/brands";
import { skusRouter } from "./routers/skus";
import { retailersRouter } from "./routers/retailers";
import { auditRouter } from "./routers/audit";
import { importRouter } from "./routers/import";
import { ordersRouter } from "./routers/orders";
import { sellercloudRouter } from "./routers/sellercloud";
import { demandRouter } from "./routers/demand";
import { alertsRouter } from "./routers/alerts";
import { trackingRouter } from "./routers/tracking";
import { dashboardRouter } from "./routers/dashboard";

export const appRouter = router({
  brands: brandsRouter,
  skus: skusRouter,
  retailers: retailersRouter,
  audit: auditRouter,
  import: importRouter,
  orders: ordersRouter,
  sellercloud: sellercloudRouter,
  demand: demandRouter,
  alerts: alertsRouter,
  tracking: trackingRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
