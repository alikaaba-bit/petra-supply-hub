# Project Research Summary

**Project:** Petra Supply Hub
**Domain:** Internal Supply Chain Dashboard for Consumer Packaged Goods (CPG)
**Researched:** 2026-02-06
**Confidence:** HIGH

## Executive Summary

Petra Brands needs a custom supply chain dashboard to replace Excel spreadsheets for managing 160 SKUs across 5 brands and 12 retailers. Research shows this is best built as a modern web application with a layered architecture: Next.js 16 frontend with shadcn/ui components, tRPC for type-safe API calls, Hono backend, Drizzle ORM with PostgreSQL, and ExcelJS for parsing forecast files. The system should integrate with SellerCloud via REST API polling and maintain Excel import as the primary forecast input method.

The recommended approach follows proven internal tool patterns: start with a monolithic architecture optimized for fast development, build role-based dashboards for 4 user types (CEO, sales, purchasing, warehouse), and prioritize demand vs supply gap visualization as the core value proposition. The critical path is Excel parser → SellerCloud integration → demand/supply calculations → role-based views. Total time to MVP: 6-8 weeks. Monthly operating cost: $50-70.

Key risks center on change management, not technology. With 50-70% of supply chain projects failing due to poor adoption, the biggest threat is building a dashboard the team doesn't use. Research shows only 28% of users adopt dashboards when usability is ignored. Prevention requires user-centered design from day one, parallel Excel usage during transition, and treating this as business transformation rather than software installation. The second major risk is data quality: nearly 90% of spreadsheets contain errors, so comprehensive data cleaning must precede any development.

## Key Findings

### Recommended Stack

The modern stack for internal supply chain dashboards in 2026 prioritizes developer velocity, type safety, and operational simplicity. Next.js 16 with React 19 provides industry-standard frontend infrastructure with excellent documentation. For UI, shadcn/ui offers component ownership (copy-paste, not dependencies) while maintaining professional polish. TanStack Table handles 160+ SKUs with smooth performance, and Recharts provides React-native charting ideal for demand forecasts and cash flow visualization.

**Core technologies:**

- **Next.js 16 (App Router)**: Frontend framework — Industry standard with SSR, API routes, and React 19 support. Best documentation and ecosystem for dashboards.
- **shadcn/ui + Tailwind CSS**: UI components — Copy-paste ownership model gives full customization without fighting opinionated design systems. Fastest growing UI library in 2026.
- **TanStack Table v8**: Data tables — Headless architecture for complete UI control, handles 10,000+ rows smoothly, perfect for SKU/PO/inventory tables.
- **Recharts v2**: Charts — React-native charting library for demand forecasts, cash flow, and inventory trends. Best DX for React developers.
- **Hono v4**: Backend framework — 3x faster than Express, edge-ready, tiny bundle. Modern alternative with excellent TypeScript support.
- **tRPC v11**: API layer — End-to-end type safety eliminates entire class of bugs. No REST boilerplate or Swagger docs needed.
- **Drizzle ORM v1.0**: Database ORM — 2-3x faster than Prisma, 85% smaller bundle, 10x faster cold starts. Code-first schema with excellent type inference.
- **PostgreSQL 16+**: Database — Best for relational supply chain data (brands → SKUs → POs → inventory). JSONB for flexibility, superior indexing, ACID compliance for financial data.
- **ExcelJS v4**: Excel parsing — Actively maintained, streaming support for large files, safer than SheetJS. Handles 6 different brand forecast formats.
- **Auth.js v5 (NextAuth)**: Authentication — Free forever, no vendor lock-in, designed for Next.js App Router. Supports role-based access.
- **Vercel + Railway**: Deployment — Vercel for Next.js frontend (zero-config), Railway for backend + PostgreSQL (usage-based pricing). Total: ~$50-70/month.

**Confidence:** HIGH — All choices are battle-tested for this use case with strong 2026 adoption.

### Expected Features

Research reveals a clear hierarchy of features for supply chain dashboards at this scale. Commercial tools like Cin7 ($299/month) and NetSuite offer 100+ features, but only 10-15 matter for Petra's needs. The must-have features center on visibility and decision support, not workflow automation or advanced forecasting.

**Must have (table stakes):**

- **Real-time inventory visibility** — Current stock levels across locations, SKU-level tracking for 160+ SKUs, low stock alerts below reorder point.
- **Demand vs supply gap tracking** — Visual indicators showing deficit/surplus per SKU, "stockout value" calculations, items below zero (understocked) vs near stockout.
- **Order management and tracking** — Order status across 12 retailers, PO tracking, backorder visibility, order fulfillment rates.
- **Basic financial visibility** — Total inventory value (capital tied up), current cash position, cash inflows/outflows, revenue by brand/retailer.
- **Excel import/export** — Migration path from current spreadsheets, Excel export as psychological safety net, CSV bulk operations.
- **Role-based access** — 4 user types (CEO, sales, purchasing, warehouse) with appropriate views and permissions.
- **Mobile responsive design** — Sales reps need access on the go, executives checking status outside office hours.

**Should have (competitive advantage):**

- **Brand-centric dashboards** — Separate views for each of 5 brands, brand performance comparison, brand managers "own" their view.
- **Retailer-specific intelligence** — Compliance tracking (TJX, Walmart, CVS have different requirements), retailer pricing, delivery performance, fill rate tracking.
- **Cash flow forecasting** — Projected cash position based on open orders, days inventory outstanding, working capital tied up, payment terms tracking.
- **Automated alerts** — Email/SMS when critical SKUs hit reorder point, weekly digest of demand vs supply gaps, unusual order pattern detection.
- **Quick wins dashboard** — Top 10 SKUs at risk of stockout, top 10 with excess inventory, this week's cash burn rate, 30-second executive summary.

**Defer (v2+):**

- **AI/ML forecasting** — Start with simple historical averages; companies at $1.5M/quarter don't need neural networks, they need visibility.
- **Custom report builder** — Users will ask for this; provide 5-10 pre-built reports instead to avoid scope creep.
- **Advanced 3PL integration** — Only build if they actually use 3PLs extensively.
- **Workflow automation** — Approval systems, collaboration features (@mentions), complex user permissions.
- **Real-time auto-refresh** — Every 5 minutes is sufficient; real-time is premature optimization.

**Critical migration features:**

- **Grid-based data entry** — Interface feels like Excel to leverage muscle memory.
- **Copy/paste support** — Support pasting from Excel to reduce friction.
- **Bulk edit capabilities** — Don't force clicking through multiple screens for what was one Excel row.
- **Historical data import** — Import last 24 months from spreadsheets for forecasting baseline.

### Architecture Approach

The optimal architecture follows a layered ETL pattern: Excel Parser + SellerCloud API Client → Data Processing Layer → PostgreSQL with materialized views → REST API with tRPC → Next.js role-based frontend. This structure supports multiple data sources (Excel uploads, SellerCloud polling), handles data normalization from 6 different brand formats, and enables efficient querying through pre-computed aggregations.

**Major components:**

1. **Data Ingestion Layer** — Excel parser service (handles 6 brand formats with metadata-driven configuration) + SellerCloud API client (OAuth authentication, incremental sync with last_modified filters, rate limiting with exponential backoff retry logic).

2. **Data Processing Layer** — ETL pipeline with Extract (Excel + SellerCloud), Transform (normalize brand-specific formats → unified schema, calculate demand vs supply gaps, aggregate by retailer/brand/SKU), Load (write to PostgreSQL with staging tables for validation).

3. **Data Storage Layer** — PostgreSQL 16+ with normalized schema (Brand, SKU, Retailer, Forecast, PurchaseOrder, Inventory, Shipment, Payment) + staging tables for raw imports + audit tables for lineage + materialized views for demand_supply_gaps (refreshed on data updates).

4. **API Layer** — Hono backend with tRPC for type safety, JWT authentication with role claims, endpoints organized by domain (/forecasts, /pos, /inventory, /cash-flow), query result cache with 24-hour TTL.

5. **Frontend Layer** — Next.js 16 with shadcn/ui components, TanStack Table for data grids, Recharts for visualizations, role-based views (CEO: executive summary + cash flow; Sales: retailer performance + forecast accuracy; Purchasing: supply gaps + PO tracking; Warehouse: inbound shipments + inventory levels).

**Key architectural decisions:**

- **Monolith vs microservices:** Start with modular monolith for faster development, can split later if needed. For ~10K records/year, monolith handles load easily.
- **Database choice:** PostgreSQL over NoSQL because supply chain data is highly relational. Need ACID transactions for financial data.
- **Real-time updates:** Start with HTTP polling (30-60s), add WebSockets later if needed. Simpler to debug for internal tool.
- **Excel vs direct input:** Keep Excel imports as primary forecast method. Don't force workflow change; brands already have Excel templates.
- **SellerCloud polling:** 15 minutes for POs (time-sensitive), 1 hour for inventory (slower changes). Balance freshness vs rate limits.

**Data flow patterns:**

- **Excel import:** Upload → Parse → Validate → Staging table → Reconcile → Production tables → Refresh materialized views → Invalidate cache → Notify users.
- **SellerCloud sync:** Scheduled job → OAuth → Fetch incremental (last_modified filter) → Transform → Upsert → Update last_sync → Push updates via WebSocket.
- **Dashboard query:** Check permissions → Check cache → Query database (with materialized views) → Cache result → Return JSON → Render charts/tables.

### Critical Pitfalls

Research shows 50-70% of supply chain projects fail, with the most common causes being poor planning, resistance to change, and data quality issues. Technology problems are rare; organizational problems are endemic.

1. **Over-reliance on dashboards without process change** — Better data alone doesn't guarantee better outcomes. Teams keep adding dashboards and AI pilots, yet risks won't be visible on the dashboards. **Prevention:** Define clear workflows and decision points BEFORE building features. Map how each dashboard metric triggers specific actions. If dashboard shows data but doesn't drive decisions, it's failed. **Phase:** Discovery & Planning.

2. **Resistance to change and user adoption failure** — Only 28% of intended users accessed a dashboard even once when usability wasn't considered. Many employees resist new systems. **Prevention:** Involve users in every design decision. Build features that feel familiar to Excel users. Plan gradual transition with parallel Excel usage for 1-2 months, not cold turkey. Identify internal champion who will advocate for adoption. **Phase:** Throughout — user testing in Phase 1, parallel usage in Phase 2, gradual cutover in Phase 3.

3. **Data quality crisis during migration** — Nearly 90% of spreadsheets contain errors. For 160 SKUs across multiple channels, errors become systemic risks. Global losses of $800 billion/year attributed to inventory distortions (52% out-of-stocks, 44% overstocks). **Prevention:** Audit Excel data quality BEFORE any development. Create data cleaning scripts. Build validation into every data entry point. Test with sample data containing edge cases (date format variations, decimal handling, special characters). **Phase:** Phase 0 — Data audit and cleaning before development starts.

4. **Poor planning and undefined objectives** — Fundamental flaw is absence of clear, well-defined objectives. Without specific goals, dashboards become collections of irrelevant metrics. **Prevention:** Run extensive discovery phase with dozens of questions. Document specific decisions each team member needs to make daily/weekly. Stakeholders should describe problems to solve, not features they want. Create decision.md documenting every stakeholder need. **Phase:** Discovery before any code.

5. **Data migration underestimation** — Organizations think moving data from legacy systems is technical when it's actually a business exercise exposing decades of inconsistencies. SKU variations (SKU-123 vs SKU123 vs sku-123), duplicate entries, outdated product codes, formulas broken when sheets copy/pasted. **Prevention:** Allocate 2-3x expected time for data cleaning. Plan for reconciliation phase where both systems run parallel. Create rollback plan if migration fails. **Phase:** Between Phase 0 and Phase 1.

**Common technical pitfalls:**

- **SellerCloud integration challenges** — REST API requires exact Read/Write permissions, webhook URLs must match exactly, Custom Columns needed (Channel_SKU, Channel_Shop_ID), rate limits must be respected. **Prevention:** Build isolated service with retry logic, comprehensive error logging, test with production data volume, design for eventual consistency.

- **Excel import complexity** — 6 different brand formats, file format variations (.xlsx, .xls, .csv), schema mapping complexity, partial import failures creating inconsistent state. **Prevention:** Metadata-driven parser configuration, column mapping UI, import preview before commit, all-or-nothing transactions, backup before import.

- **Information overload and cluttered interfaces** — Showing all 160 SKUs on one screen, using technical jargon, 50+ metrics nobody reads. For non-technical Petra team, avoid jargon, limit to 2-3 charts per page, use familiar metaphors (traffic lights not statistical thresholds). **Prevention:** Design for mobile-first simplicity, role-based views, progressive disclosure (summary → details on click).

## Implications for Roadmap

Based on combined research, the recommended build order follows dependency chains and risk mitigation priorities. Critical path: Foundation (database + auth) → Excel parsing (enables historical data) → SellerCloud integration (enables current state) → Demand vs Supply calculations (core value) → Role-based views (multi-user support).

### Phase 0: Discovery & Data Audit (Week 0, before development)

**Rationale:** Address the #1 cause of failure (poor planning) and #3 risk (data quality) before writing code. 50-70% of projects fail due to unclear objectives; 90% of spreadsheets contain errors.

**Delivers:**
- Clean master SKU list with canonical names
- Documentation of current workflows and pain points
- Data cleaning requirements and validation rules
- Success criteria and adoption metrics

**Activities:**
1. Export all Excel files currently in use
2. Identify duplicates, inconsistencies, missing data (SKU variations, date format differences, broken formulas)
3. Audit SellerCloud Custom Columns and API permissions
4. Map current workflows (who does what, when, why)
5. Define decision points dashboard should support
6. Create discovery.md with clarifying questions
7. Identify internal champion for adoption

**Addresses:** Pitfall #2 (poor planning), Pitfall #4 (data quality)

**Research flag:** Standard discovery process, no additional research needed.

---

### Phase 1: Foundation & Core Integration (Week 1-2)

**Rationale:** Establish technical foundation and validate SellerCloud integration early. Database schema and API connectivity must work before building features on top.

**Delivers:**
- PostgreSQL schema with Brand, SKU, Retailer, Forecast, PurchaseOrder, Inventory entities
- SellerCloud API client with OAuth, retry logic, rate limiting
- Excel parser prototype for 1 brand format
- Basic Next.js dashboard showing raw data
- JWT authentication with role claims

**Features:**
- Database setup with proper validation and audit logging
- SellerCloud integration (PO sync, inventory sync)
- Excel upload for 1 brand (with preview before import)
- Simple table view of forecasts and inventory
- Login with role selection

**Stack elements:**
- PostgreSQL 16+ (Neon or Railway managed)
- Drizzle ORM for schema definition and migrations
- Hono backend with tRPC setup
- Next.js 16 with shadcn/ui scaffolding
- Auth.js v5 for authentication

**Avoids:** Pitfall #8 (SellerCloud integration challenges) by building and testing early, Pitfall #5 (treating as software purchase) by involving users from day one.

**Validation:** Can upload Excel file → see data in UI. SellerCloud PO data visible in dashboard.

**Research flag:** May need API research for SellerCloud webhook configuration and Custom Column requirements. Otherwise standard CRUD patterns.

---

### Phase 2: Demand vs Supply Gap Visualization (Week 3-4)

**Rationale:** This is the core value proposition. Everything else supports this feature. Build it early to validate adoption before investing in advanced features.

**Delivers:**
- Demand vs supply gap calculation engine
- Brand-centric dashboard views
- Visual indicators (traffic lights, bar charts showing deficit/surplus)
- Excel parser extended to all 6 brand formats
- Low stock alerts

**Features:**
- Materialized view for demand_supply_gaps (refreshed on data updates)
- Recharts visualizations: demand vs supply bars, trend lines, stockout value
- Brand filter and comparison view
- Forecast vs actual comparison
- Email alerts when critical SKUs hit reorder point

**Implements:** Architecture component #2 (Data Processing Layer) and materialized views for performance.

**Addresses:** Features: demand vs supply gap (table stakes), brand-centric views (differentiator).

**Avoids:** Pitfall #9 (dashboards that don't answer real questions) by focusing on the one question that matters: "What needs to be ordered?"

**Validation:** CEO can see demand vs supply gaps across all 5 brands. Sales can identify stockout risks.

**Research flag:** Standard data aggregation patterns, no additional research needed.

---

### Phase 3: Order Tracking & Financial Visibility (Week 5-6)

**Rationale:** With demand visibility established, add supply visibility (PO tracking) and financial context (cash flow). Builds on SellerCloud integration from Phase 1.

**Delivers:**
- Purchase order tracking dashboard
- Cash flow summary and projections
- Retailer performance views
- Payment tracking integration
- Shipment status visibility

**Features:**
- PO list view with status workflow (pending → confirmed → shipped → delivered)
- Open orders vs fulfilled orders metrics
- Revenue by brand/retailer charts
- Cash tied up in inventory calculation
- Payment terms tracking (when will Walmart pay?)
- Days inventory outstanding (DIO)

**Uses:** SellerCloud Payment and Shipment APIs (extend Phase 1 integration).

**Addresses:** Features: order management (table stakes), cash flow forecasting (differentiator), retailer intelligence (differentiator).

**Avoids:** Pitfall #10 (over-customization) by providing pre-built reports, not custom report builder.

**Validation:** Purchasing team can track all POs. CEO can see cash flow forecast for next 90 days.

**Research flag:** Standard dashboard patterns, no additional research needed.

---

### Phase 4: Role-Based Views & Advanced Features (Week 7-8)

**Rationale:** With core functionality validated, add personalization and advanced features based on early usage feedback.

**Delivers:**
- Role-specific dashboards (CEO, sales, purchasing, warehouse)
- Automated weekly digest emails
- Forecast accuracy tracking
- Scenario planning (basic "what if" models)
- Historical data import tools

**Features:**
- CEO view: executive summary, cash flow, high-level gaps, quick wins dashboard
- Sales view: retailer performance, forecast accuracy, order status
- Purchasing view: supply gaps, PO tracking, vendor status
- Warehouse view: inbound shipments, inventory levels
- Weekly email digest with top alerts
- Forecast vs actual reporting (track accuracy over time)

**Addresses:** Features: automated alerts (differentiator), quick wins dashboard (differentiator), role-based access (table stakes).

**Avoids:** Pitfall #7 (information overload) by designing role-specific views showing only relevant data.

**Validation:** Each user role reports dashboard answers their daily questions. Excel usage declining.

**Research flag:** Email notification patterns are standard. No additional research needed.

---

### Phase 5: Polish & Production Readiness (Week 9-10)

**Rationale:** Before full rollout, optimize performance, add monitoring, and prepare for production scale.

**Delivers:**
- Query result caching (24-hour TTL)
- Error monitoring and alerting
- Usage analytics (which features used vs ignored)
- Mobile responsive optimization
- Training materials and onboarding flow

**Features:**
- Redis caching layer
- Sentry error tracking
- Vercel Analytics integration
- Mobile-first UI refinement
- In-app onboarding walkthrough
- Role-specific training videos
- Data reconciliation reports (SellerCloud vs dashboard)

**Implements:** Architecture components: caching strategy, monitoring, background job queue.

**Avoids:** Pitfall #11 (lack of user training) by building onboarding into app, creating role-specific walkthroughs.

**Validation:** System runs reliably for 1 week without manual intervention. Load time < 2 seconds. Mobile experience excellent.

**Research flag:** Standard DevOps patterns. May need performance research if data volume exceeds estimates.

---

### Phase Ordering Rationale

**Dependency-driven sequencing:**
- Database schema must exist before any features (Phase 1)
- SellerCloud integration needed before PO tracking (Phase 1 enables Phase 3)
- Excel parsing needed for historical data (Phase 1 enables Phase 2 forecasting)
- Core demand/supply calculation needed before advanced features (Phase 2 enables Phase 4)

**Risk mitigation prioritization:**
- Data audit in Phase 0 prevents migration failures (Pitfall #4)
- User involvement from Phase 1 prevents adoption failure (Pitfall #2)
- Early validation of core value (Phase 2) before building advanced features prevents wasted effort (Pitfall #3)

**Incremental value delivery:**
- Phase 1: Data visibility (better than Excel)
- Phase 2: Decision support (demand vs supply gaps)
- Phase 3: Financial context (cash flow impact)
- Phase 4: Personalization (role-specific workflows)
- Phase 5: Production quality (performance and reliability)

**Change management alignment:**
- Parallel Excel usage during Phase 1-3 (don't force cutover)
- Phase 4 role-based views enable gradual adoption by team
- Phase 5 training materials support full rollout

### Research Flags

**Phases needing deeper research during planning:**

- **Phase 1 (SellerCloud API):** May need API documentation research for webhook configuration, Custom Column setup, rate limit specifics, and OAuth flow details. SellerCloud docs are comprehensive but integration requires careful attention to exact permission requirements.

- **Phase 5 (Performance optimization):** If data volume grows beyond 160 SKUs or query patterns differ from assumptions, may need database performance research (indexing strategies, query optimization, caching architectures).

**Phases with standard patterns (skip research-phase):**

- **Phase 2 (Demand vs Supply):** Well-documented calculation patterns. Materialized views are standard PostgreSQL feature.
- **Phase 3 (PO Tracking & Cash Flow):** Standard dashboard patterns. Recharts documentation covers all needed visualizations.
- **Phase 4 (Role-Based Views):** RBAC middleware patterns well-established in Express/Hono. Auth.js documentation comprehensive.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies are battle-tested for this use case in 2026. Next.js, PostgreSQL, Recharts, TanStack Table are industry standards with extensive documentation. |
| Features | HIGH | Research draws from commercial tools (Cin7, NetSuite, GMDH), practitioner articles, and supply chain best practices. Feature hierarchy validated across multiple sources. |
| Architecture | HIGH | Layered ETL → Database → API → Frontend pattern is proven for internal tools. SellerCloud integration patterns documented in official API docs. |
| Pitfalls | HIGH | Failure statistics from multiple consulting firms (Gartner, Panorama, ECI). 50-70% failure rate well-documented. User adoption challenges backed by empirical studies (28% adoption when usability ignored). |

**Overall confidence:** HIGH

All recommendations are based on 2026 best practices with extensive source validation. The stack choices reflect current industry consensus. Feature priorities align with commercial tool offerings. Architecture follows established patterns for supply chain dashboards. Pitfall research draws from comprehensive failure analysis across multiple industries.

### Gaps to Address

**SellerCloud API specifics:** While REST API documentation exists, actual integration behavior (rate limit thresholds, webhook reliability, Custom Column edge cases) may require testing during Phase 1. Plan for 1-2 week integration validation period.

**Excel format variations:** Research shows 6 different brand formats exist, but exact schema variations unknown. During Phase 1, audit actual Excel files to document format differences. May need iterative parser development.

**Forecast accuracy requirements:** Research suggests starting with simple historical averages, but actual business requirements for forecast precision need validation. During discovery, define acceptable accuracy thresholds and when manual overrides are appropriate.

**Change management timeline:** Research shows parallel Excel usage is critical, but optimal transition timeline (1 month? 3 months?) depends on team comfort. Plan for flexibility in Phase 3-4 rollout based on adoption metrics.

**Mobile usage patterns:** Assumption that mobile access is important for executives/sales, but actual usage patterns need validation. Track mobile vs desktop usage in Phase 1-2 to inform Phase 5 optimization priorities.

## Sources

### Primary (HIGH confidence)

**Stack Research:**
- Next.js official documentation — Framework capabilities, App Router patterns, SSR/ISR
- shadcn/ui GitHub (104k stars, 560k weekly downloads) — Component library adoption metrics
- TanStack Table documentation — Performance benchmarks (10,000+ rows)
- Drizzle vs Prisma comparison (BetterStack, Medium) — 2-3x performance advantage, 85% smaller bundle
- Hono benchmarks — 3x faster than Express, 40% less memory
- PostgreSQL satisfaction surveys — 65% satisfaction in 2026, most admired database

**Features Research:**
- GoodData: 7 Key Supply Chain Dashboard Examples — Feature hierarchy for dashboards
- Flieber: 4 Best Demand Planning Dashboards — Good vs bad examples
- Cin7 Core product documentation — Commercial tool feature comparison
- Microsoft Dynamics 365: Inventory Dashboards — Enterprise dashboard patterns
- How to Migrate from Excel to Retail Planning Platform (Toolio) — Migration feature requirements

**Architecture Research:**
- SellerCloud API official documentation — REST services, OAuth, webhook configuration
- Retool: Supply Chain Management Dashboard — Architecture patterns for internal tools
- GoodData: Supply Chain Dashboard Examples — Component architecture for visibility tools
- ETL Best Practices (Skyvia, Integrate.io) — Pipeline design patterns for 2026
- Multi-Tenant Architecture guides — Role-based access patterns

**Pitfalls Research:**
- Panorama Consulting: Supply Chain Implementation Failures — 50-70% failure rate statistics
- Why Most Data Visualization Dashboards Fail (Grow.com) — 28% adoption when usability ignored
- ERP Implementation Failure Reasons (ECI Solutions) — 55-75% ERP failure rate
- 7 Reasons Data Migrations Fail (Definian) — 90% of spreadsheets contain errors
- The Problem With Excel (Anvyl) — $800 billion inventory distortion losses

### Secondary (MEDIUM confidence)

- React Frameworks in 2026 comparison (Medium, DEV Community) — Next.js vs Remix vs React Router 7
- Fastify vs Express vs Hono benchmarks (Medium) — Performance comparisons
- Best React Chart Libraries 2025 (LogRocket, Embeddable) — Recharts vs ApexCharts vs Chart.js
- Railway vs Render 2026 comparison (TheSoftwareScout) — Deployment platform evaluation
- NextAuth vs Clerk vs Auth.js (Medium) — Authentication comparison for Next.js

### Tertiary (LOW confidence)

- Demand planning algorithm types (Microsoft Dynamics) — Advanced forecasting methods (defer to v2+)
- AI-driven demand planning (GMDH Streamline) — ML forecasting complexity (not needed for MVP)
- Scenario planning features (RELEX Solutions) — Enterprise-scale features (Phase 3+ consideration)

---

**Research completed:** 2026-02-06
**Ready for roadmap:** Yes

**Next steps:** Proceed to requirements definition. Roadmapper should use phase structure above as starting point, with flexibility to adjust based on stakeholder priorities. Schedule discovery session to validate assumptions and define success criteria before Phase 1 development begins.
