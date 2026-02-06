# Stack Research: Supply Chain Dashboard

## Recommended Stack

### Frontend Framework: **Next.js 16** (App Router)
**Version:** Latest (16.x with React 19 support)
**Rationale:** Next.js dominates for enterprise-grade apps in 2026. Despite Remix and Vite being strong alternatives, Next.js offers the best balance of stability, ecosystem maturity, and built-in features (SSR, ISR, API routes). The App Router is now production-ready and provides superior data handling. For a team shipping FAST with non-technical users, the extensive documentation and community support are critical.

### UI Component Library: **shadcn/ui** + **Tailwind CSS**
**Versions:** shadcn/ui (latest), Tailwind CSS 4.x
**Rationale:** shadcn/ui is the fastest-growing UI library in 2026 (104k+ GitHub stars, 560k weekly downloads). Unlike MUI or Ant Design, it gives you full code ownership - components are copied into your project, not installed as dependencies. This means complete customization without fighting against an opinionated design system. Paired with Tailwind, you get rapid development speed while maintaining flexibility. For a small team shipping fast, this is ideal.

**Alternative for rapid prototyping:** MUI (Material UI) - if you need 50+ pre-built components immediately and are okay with the bundle size (but shadcn/ui is better for long-term maintainability).

### Data Table: **TanStack Table v8**
**Version:** 8.x
**Rationale:** For displaying demand forecasts, PO tracking, and inventory across 160 SKUs, you need a powerful data table. TanStack Table is headless (works perfectly with shadcn/ui), handles 10,000+ rows smoothly, and adds only ~30KB to your bundle. Since you control the UI, you can customize it exactly for your supply chain needs. AG Grid is powerful but requires a paid license for enterprise features and is overkill for 160 SKUs.

### Charting Library: **Recharts v2.x**
**Version:** 2.x
**Rationale:** For demand forecasts, cash flow visualization, and inventory tracking, Recharts is the best fit. It's React-native (built with JSX), works seamlessly with Next.js, and has the best DX for React developers. While ApexCharts has better performance with massive datasets and Chart.js is lighter, Recharts offers the best balance of features, React integration, and ease of customization for dashboards. Your data volume (5 brands, 12 retailers) won't stress it.

### Backend Framework: **Hono v4**
**Version:** 4.x
**Rationale:** Hono crushes Express and Fastify in 2026 benchmarks (3x more requests than Express, 40% less memory). It's tiny (perfect for serverless/edge), works across any JavaScript runtime, and has excellent TypeScript support. Since you need to ship FAST, Hono's simplicity beats Express's legacy baggage while being faster than Fastify. It's also edge-ready if you deploy to Vercel.

**Alternative:** If your team has Express experience and wants familiarity, use **Fastify** (2.3x faster than Express with built-in validation).

### API Layer: **tRPC v11**
**Version:** 11.x
**Rationale:** Since you're building both frontend and backend in TypeScript, tRPC is a no-brainer. You get end-to-end type safety with zero code generation. Define a function on your backend, call it type-safely on the frontend. No REST API boilerplate, no Swagger docs, no sync issues. For a small team shipping fast, this eliminates an entire class of bugs.

### ORM: **Drizzle ORM v1.0+**
**Version:** 1.0.x (stable)
**Rationale:** Drizzle is 2-3x faster than Prisma with 85% smaller bundle size (7.4KB vs 6.5MB). For serverless deployments, it has 10x faster cold starts. It's code-first (define schema in TypeScript), generates optimal SQL, and has excellent TypeScript inference. Prisma is more mature but slower; for a new project in 2026, Drizzle is the clear winner unless you need Prisma's admin UI.

### Database: **PostgreSQL 16+**
**Version:** 16.x or latest
**Rationale:** PostgreSQL is the most admired database in 2026 (65% satisfaction). For a supply chain dashboard with complex relationships (brands → SKUs → POs → retailers → inventory), PostgreSQL's superior support for JSON, CTEs, indexes, and ACID compliance makes it ideal. It handles write-heavy workloads (PO updates, inventory changes) better than MySQL. The pgvector extension also future-proofs for AI features.

**Hosting:** Use a managed service like **Neon** (serverless Postgres), **Supabase**, or **Railway** (built-in PostgreSQL).

### Excel Parsing: **ExcelJS v4.x**
**Version:** 4.x
**Rationale:** For parsing Excel files (demand forecasts, PO data), ExcelJS is the best choice in 2026. It's actively maintained, supports streaming (memory-efficient for large files), handles both reading and writing, and has strong formatting support. SheetJS (xlsx) is more popular but has security vulnerabilities in older versions and heavier memory usage. ExcelJS is safer and more modern.

### Authentication: **Auth.js (NextAuth v5)**
**Version:** 5.x
**Rationale:** For role-based access (CEO, sales, purchasing, warehouse), Auth.js (NextAuth v5) is the open-source winner. It's completely rewritten for Next.js App Router, has zero vendor lock-in, and costs nothing regardless of user count. Clerk is faster to set up but costs scale with users - for a small company, Auth.js makes more sense. Plus, you own your auth data.

**Alternative:** **Clerk** - if you want to ship auth in 30 minutes and don't mind $25/month pricing (free up to 10k MAU).

### Deployment: **Vercel** (Frontend) + **Railway** (Backend/DB)
**Versions:** N/A (platform services)
**Rationale:**
- **Vercel:** Best-in-class for Next.js (they created it). Zero-config deployment, automatic HTTPS, edge functions, and generous free tier. $20/month Pro plan includes 1TB bandwidth.
- **Railway:** Usage-based pricing ($5 hobby, $20 pro + usage). Perfect for Hono backend + PostgreSQL database. Better DX than Render, cheaper than AWS for small teams. Pay only for what you use.

**Alternative:** Deploy everything to **Vercel** (frontend + backend as API routes) if you want simplicity, but Railway gives you more control over the database.

### File Upload: **Uploadthing v7**
**Version:** 7.x
**Rationale:** For uploading Excel files, Uploadthing is purpose-built for Next.js, has generous free tier (2GB storage, 2GB bandwidth), and handles file upload complexity (presigned URLs, progress tracking, validation). It's maintained by the T3 stack team and works seamlessly with App Router.

---

## Frontend

### Framework
- **Next.js 16** (App Router) with React 19
  - App Router for modern data fetching patterns
  - Server Components for reduced client bundle
  - Built-in API routes for backend integration

### UI Components
- **shadcn/ui** - Copy-paste React components (Radix UI + Tailwind)
  - Form components for data entry
  - Dialog/Modal for PO details
  - Select/Combobox for brand/retailer filters
  - Tabs for different dashboard views
- **Tailwind CSS 4.x** - Utility-first styling
  - Responsive by default
  - Dark mode support (optional)

### Data Visualization
- **Recharts 2.x** - Charts for demand forecasts, cash flow
  - Line charts for trends
  - Bar charts for comparisons
  - Composed charts for multi-series data
- **TanStack Table 8.x** - Data tables for POs, inventory
  - Sorting, filtering, pagination
  - Column resizing
  - Row selection
  - Excel-like experience for non-technical users

### State Management
- **React Server Components** (built into Next.js) - for server data
- **Zustand 5.x** - Lightweight client state (if needed)
  - Only for complex UI state (filters, selections)
  - Most state should live in the database

### Forms
- **React Hook Form 7.x** + **Zod** - Type-safe forms with validation
  - Works perfectly with shadcn/ui form components
  - Excellent DX with TypeScript

---

## Backend

### API Framework
- **Hono 4.x** - Ultra-fast web framework
  - Express-like syntax but 3x faster
  - Edge-ready (Vercel, Cloudflare Workers)
  - Built-in TypeScript support
  - Middleware for CORS, logging, auth

### API Layer (Type Safety)
- **tRPC 11.x** - End-to-end type safety
  - No REST boilerplate
  - Automatic type inference
  - Works seamlessly with Next.js and Hono
  - Eliminates API versioning pain

### ORM
- **Drizzle ORM 1.0.x** - TypeScript-first ORM
  - Code-first schema definition
  - Generates optimized SQL
  - Excellent type inference
  - Migration system included
  - Drizzle Studio for database GUI

### Database
- **PostgreSQL 16+** - Production-grade relational database
  - JSONB for flexible data (e.g., Excel import metadata)
  - Row-level security for role-based access
  - Excellent indexing for fast queries
  - ACID compliance for financial data (cash flow, deposits)

### File Parsing
- **ExcelJS 4.x** - Excel file reading/writing
  - Streaming support for large files
  - Read .xlsx files (demand forecasts, PO data)
  - Write Excel exports (reports for warehouse team)
  - Memory-efficient

### File Storage
- **Uploadthing 7.x** - File uploads for Next.js
  - Store uploaded Excel files
  - Automatic file validation
  - Progress tracking
  - Works with App Router

### Background Jobs (Future)
- **BullMQ + Redis** - For SellerCloud API polling
  - Not needed for MVP, but plan for it
  - Use when you need to sync data hourly/daily

---

## Deployment

### Hosting
- **Vercel** - Frontend (Next.js app)
  - Free hobby tier (generous limits)
  - $20/month Pro for production
  - Automatic CI/CD from GitHub
  - Edge functions for fast API routes
  - Analytics built-in

- **Railway** - Backend + Database
  - Hobby: $5/month + usage (CPU, RAM, storage)
  - Pro: $20/month + usage
  - PostgreSQL included (no separate DB service needed)
  - Auto-deploy from GitHub
  - Usage-based pricing (pay for what you use)

**Alternative:** Deploy backend as Next.js API routes on Vercel to keep everything in one place (simpler for MVP).

### CI/CD
- **GitHub Actions** - Automated testing/deployment
  - Free for public repos, 2000 minutes/month for private
  - Run type checks, linting, tests on every PR
  - Vercel/Railway auto-deploy on merge to main

### Monitoring
- **Vercel Analytics** (built-in) - Frontend performance
- **Sentry** (free tier) - Error tracking
- **Better Stack** (optional) - Uptime monitoring ($10/month)

---

## What NOT to Use

### Avoid
1. **Angular/Vue** - React ecosystem is dominant for dashboards in 2026, better library support
2. **Create React App (CRA)** - Deprecated, use Vite or Next.js
3. **Express.js** - Legacy, 3x slower than Hono, not edge-ready
4. **MongoDB** - Your data is relational (brands → SKUs → POs → inventory). PostgreSQL is better.
5. **Prisma ORM** - Slower than Drizzle (3x), larger bundle (6.5MB vs 7.4KB), worse cold starts
6. **SheetJS (xlsx)** - Security issues, memory hogs, use ExcelJS instead
7. **AG Grid** - Overkill for 160 SKUs, requires paid license for enterprise features
8. **MUI/Ant Design** - Heavy bundles, opinionated styling, harder to customize vs shadcn/ui
9. **REST APIs** - Use tRPC for type safety, eliminates entire class of bugs
10. **Docker + Kubernetes** - Over-engineered for a 5-person team, use Vercel/Railway
11. **GraphQL** - Complex, not needed with tRPC's type safety
12. **Firebase/Supabase BaaS** - Limited SQL queries, lock-in risk. Use PostgreSQL + Drizzle.
13. **Clerk Authentication** - Good DX but costs scale with users. Auth.js is free forever.
14. **AWS/GCP raw services** - Too complex for fast shipping, use PaaS (Vercel/Railway)

---

## Confidence Levels

### HIGH Confidence (Battle-tested for this use case)
- ✅ **Next.js 16** - Industry standard for dashboards
- ✅ **PostgreSQL** - Best relational database for complex data
- ✅ **Tailwind CSS** - De facto standard in 2026
- ✅ **TanStack Table** - Best headless table library
- ✅ **Recharts** - Best React-native charting library
- ✅ **tRPC** - Proven for TypeScript full-stack apps
- ✅ **Vercel deployment** - Created by Next.js team, perfect fit

### MEDIUM Confidence (Newer but strong momentum)
- ⚠️ **Hono** - Fast-growing but newer than Express/Fastify. Use if you want bleeding edge performance. Fallback: **Fastify**.
- ⚠️ **Drizzle ORM** - 1.0 just released, strong momentum but less mature than Prisma. Fallback: **Prisma 6**.
- ⚠️ **shadcn/ui** - Massive adoption but paradigm shift from component libraries. Requires writing more UI code. Fallback: **MUI**.
- ⚠️ **Railway** - Solid but smaller than Render/Heroku. Fallback: **Render** or **Vercel for everything**.
- ⚠️ **Uploadthing** - Great for Next.js but newer. Fallback: **AWS S3 + presigned URLs**.

### LOW Confidence (Needs validation for your specific case)
- ⛔ **Auth.js v5** - Major rewrite for App Router, ensure it meets all your RBAC needs. Might need custom role logic.
- ⛔ **ExcelJS** - Better than xlsx but verify it handles your specific Excel formats (complex formulas, pivot tables, etc.)

---

## Quick Start Stack (MVP - Ship in 2 weeks)

For fastest time-to-market:

```bash
# Initialize Next.js with TypeScript
npx create-next-app@latest petra-supply-hub --typescript --tailwind --app

# Add core dependencies
npm install @tanstack/react-table recharts drizzle-orm @hono/node-server
npm install -D drizzle-kit @types/node

# Add shadcn/ui (copies components into your project)
npx shadcn@latest init
npx shadcn@latest add table form select button dialog tabs

# Add tRPC
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next

# Add auth
npm install next-auth@beta @auth/prisma-adapter

# Add Excel parsing
npm install exceljs

# Add validation
npm install zod react-hook-form @hookform/resolvers
```

**Deploy:**
1. Push to GitHub
2. Connect to Vercel (auto-deploy frontend)
3. Connect to Railway (auto-provision PostgreSQL)
4. Set environment variables (DATABASE_URL, NEXTAUTH_SECRET)
5. Ship! 🚀

---

## Final Recommendation

**For shipping FAST with non-technical users:**

| Category | Choice | Why |
|----------|--------|-----|
| Frontend | Next.js 16 + shadcn/ui | Industry standard, great DX |
| Data Table | TanStack Table | Perfect for 160 SKUs, full control |
| Charts | Recharts | React-native, easy customization |
| Backend | Hono + tRPC | Fast, type-safe, modern |
| Database | PostgreSQL (Railway) | Best for relational data |
| ORM | Drizzle | 3x faster, modern |
| Excel | ExcelJS | Secure, maintained, streaming |
| Auth | Auth.js v5 | Free, flexible, no vendor lock-in |
| Deploy | Vercel + Railway | Zero-config, auto-scaling |

**Total Monthly Cost (Production):**
- Vercel Pro: $20/month
- Railway: ~$30-50/month (DB + backend)
- **Total: ~$50-70/month** for unlimited users

**Time to Ship:** 2-3 weeks for MVP (dashboards + Excel import + basic auth)

---

## Research Sources

### Framework Comparisons
- [Comparing Top React Frameworks](https://vibepanda.io/resources/guide/comparing-top-react-frameworks)
- [React Frameworks in 2026: Next.js vs Remix vs React Router 7](https://medium.com/@pallavilodhi08/react-frameworks-in-2026-next-js-vs-remix-vs-react-router-7-b18bcbae5b26)
- [Next.js vs Vite: Choosing the Right Tool in 2026](https://dev.to/shadcndeck_dev/nextjs-vs-vite-choosing-the-right-tool-in-2026-38hp)

### Data Tables
- [TanStack Table vs AG Grid: Complete Comparison (2025)](https://www.simple-table.com/blog/tanstack-table-vs-ag-grid-comparison)
- [Top Free, Open-Source Alternatives to Ag-Grid for React in 2026](https://svar.dev/blog/top-react-alternatives-to-ag-grid/)
- [Build Tables in React: Data Grid Performance Guide](https://strapi.io/blog/table-in-react-performance-guide)

### Charting Libraries
- [Best React chart libraries (2025 update)](https://blog.logrocket.com/best-react-chart-libraries-2025/)
- [Performance Based React Charts Comparison](https://medium.com/@Hashtrust_Technologies/performance-based-react-charts-comparison-apexcharts-v-s-recharts-v-s-highcharts-e7159af14c28)
- [8 Best React Chart Libraries for Visualizing Data in 2025](https://embeddable.com/blog/react-chart-libraries)

### Backend Frameworks
- [Fastify vs Express vs Hono: Choosing the Right Node.js Framework](https://medium.com/@arifdewi/fastify-vs-express-vs-hono-choosing-the-right-node-js-framework-for-your-project-da629adebd4e)
- [Hono vs Fastify](https://betterstack.com/community/guides/scaling-nodejs/hono-vs-fastify/)
- [I Built the Same Backend in Hono, Fastify, and Express](https://medium.com/@sohail_saifii/i-built-the-same-backend-in-hono-fastify-and-express-the-benchmarks-were-shocking-8b23d606e0e4)

### ORMs
- [Drizzle vs Prisma: Choosing the Right TypeScript ORM](https://betterstack.com/community/guides/scaling-nodejs/drizzle-vs-prisma/)
- [Drizzle vs Prisma: Deep Dive (2026)](https://medium.com/@codabu/drizzle-vs-prisma-choosing-the-right-typescript-orm-in-2026-deep-dive-63abb6aa882b)
- [Drizzle ORM: The Performance-First TypeScript ORM](https://kawaldeepsingh.medium.com/drizzle-orm-the-performance-first-typescript-orm-challenging-prismas-dominance-3x-faster-96f6bffa5b1d)

### Excel Parsing
- [NPM + SheetJS XLSX in 2026](https://thelinuxcode.com/npm-sheetjs-xlsx-in-2026-safe-installation-secure-parsing-and-real-world-nodejs-patterns/)
- [Exceljs(Alternate for XLSX package)](https://medium.com/@manishasiram/exceljs-alternate-for-xlsx-package-fc1d36b2e743)

### Databases
- [Postgres vs. MySQL: a Complete Comparison in 2026](https://www.bytebase.com/blog/postgres-vs-mysql/)
- [PostgreSQL vs MySQL: Which is the King of 2026?](https://dev.to/sandipyadav/postgresql-vs-mysql-which-is-the-king-of-2026-4m83)
- [PostgreSQL vs MySQL in 2026: Honest Dev Experience](https://medium.com/write-earn/postgresql-vs-mysql-in-2026-honest-dev-experience-c10467a57117)

### UI Libraries
- [14 Best React UI Component Libraries in 2026](https://www.untitledui.com/blog/react-component-libraries)
- [5 Best React UI Libraries for 2026](https://dev.to/ansonch/5-best-react-ui-libraries-for-2026-and-when-to-use-each-1p4j)
- [React UI libraries in 2025: Comparing shadcn/ui, Radix, Mantine, MUI](https://makersden.io/blog/react-ui-libs-2025-comparing-shadcn-radix-mantine-mui-chakra)

### Deployment
- [Railway vs Render 2026: Best Platform for Deploying Apps](https://thesoftwarescout.com/railway-vs-render-2026-best-platform-for-deploying-apps/)
- [Railway vs. Vercel](https://docs.railway.com/maturity/compare-to-vercel)
- [Deploying Full Stack Apps in 2026](https://www.nucamp.co/blog/deploying-full-stack-apps-in-2026-vercel-netlify-railway-and-cloud-options)

### Authentication
- [NextAuth.js vs Clerk vs Auth.js — Which Is Best (2025)](https://chhimpashubham.medium.com/nextauth-js-vs-clerk-vs-auth-js-which-is-best-for-your-next-js-app-in-2025-fc715c2ccbfd)
- [Clerk vs Supabase Auth vs NextAuth.js: The Production Reality](https://medium.com/better-dev-nextjs-react/clerk-vs-supabase-auth-vs-nextauth-js-the-production-reality-nobody-tells-you-a4b8f0993e1b)
- [User Authentication for Next.js: Top Tools (2025)](https://clerk.com/articles/user-authentication-for-nextjs-top-tools-and-recommendations-for-2025)
