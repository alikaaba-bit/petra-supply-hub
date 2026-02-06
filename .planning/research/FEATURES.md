# Features Research: Supply Chain Dashboard

## Table Stakes (must have or users leave)

### Real-Time Inventory Visibility
- Current stock levels across all warehouses/locations
- Low stock alerts and near-stockout warnings
- Real-time sync when inventory moves
- SKU-level tracking (essential for 160+ SKUs)
- Multi-location visibility (if Petra has multiple warehouses)

### Demand vs Supply Gap Tracking
- Visual indicators showing supply deficit/surplus per SKU
- "Stockout value" - units needed to fulfill demand
- Bars/charts showing items below zero (understocked) vs above zero (near stockout)
- Historical demand patterns vs current inventory

### Order Management & Tracking
- Order status visibility across all 12 retailers
- Order fulfillment rates
- Backorder tracking
- Purchase order generation
- Order history and search

### Basic Financial Visibility
- Total inventory value (capital tied up in stock)
- Current cash position at-a-glance
- Cash inflows/outflows tracking
- Revenue by brand/retailer

### Data Import/Export
- Excel import (migration path from current spreadsheets)
- Excel export (users will want this as safety net)
- CSV import/export for bulk operations
- Integration with existing systems (QuickBooks, etc.)

### User Management
- Role-based access (executive view vs operations view)
- Multi-user support (5 brands = likely 5+ users)
- Audit trail for who changed what

### Mobile Access
- Responsive design for tablets/phones
- Sales reps need access on the go
- Executives checking status outside office hours

## Differentiators (competitive advantage for internal tool)

### Excel Replacement Features
- Familiar spreadsheet-like interface for data entry
- Ability to paste from Excel (reduce friction)
- Formulas/calculations that were manual in Excel now automated
- Exception reporting that flags issues automatically
- No more emailing spreadsheets around

### Brand-Centric Views
- Dashboard per brand (Petra has 5 brands)
- Brand performance comparison
- Brand-specific demand forecasts
- Brand managers can "own" their view

### Retailer-Specific Intelligence
- Retailer compliance tracking (TJX, Walmart, CVS each have different requirements)
- Retailer-specific pricing (wholesale price lists)
- Delivery performance by retailer
- Fill rate tracking per retailer

### Cash Flow Forecasting
- Projected cash position based on open orders
- Days inventory outstanding (DIO)
- Working capital tied up in inventory
- Payment terms tracking per retailer
- Forecast future cash movements based on order pipeline

### Automated Alerts & Notifications
- Email/SMS when critical SKUs hit reorder point
- Weekly digest of demand vs supply gaps
- Unusual order pattern detection
- Overstock warnings

### Scenario Planning
- "What if" modeling - if we increase production by X%
- Compare forecast scenarios side-by-side
- Test impact of new retailer relationships
- Model seasonal demand changes

### Quick Wins Dashboard
- Top 10 SKUs at risk of stockout
- Top 10 SKUs with excess inventory
- This week's cash burn rate
- Executive summary that takes 30 seconds to read

## Anti-Features (things to deliberately NOT build)

### Over-Engineering Traps
- **AI/ML forecasting** - Start with simple historical averages and seasonal patterns. Companies at $1.5M/quarter don't need neural networks, they need visibility.
- **Blockchain integration** - Zero value for internal tool at this scale
- **Complex manufacturing/BOM tracking** - Petra sells finished goods, not manufacturing them
- **Advanced 3PL integration** - Only build if they actually use 3PLs
- **Multi-currency support** - US retailers only, USD only for now
- **Warehouse management system features** - Barcode scanning, pick/pack/ship workflows. Unless Petra runs their own warehouse, avoid this.
- **Custom reports builder** - Users will ask for this. Say no. Provide 5-10 pre-built reports instead.

### Excel Replacement Traps
- Don't try to replicate every Excel formula
- Don't build a spreadsheet editor
- Don't allow users to create their own custom fields (scope creep nightmare)

### Enterprise Software Bloat
- Don't build admin UI for configuring every metric
- Don't create workflow approval systems
- Don't add collaboration features (comments, @mentions, etc.)
- Don't build a mobile app - responsive web is enough

### Premature Optimization
- Don't build for 1000+ SKUs when they have 160
- Don't build for 100+ retailers when they have 12
- Don't build real-time dashboard auto-refresh (every 5 minutes is fine)
- Don't build advanced user permission matrices (3 roles max)

## Feature Categories

### Demand Planning
**Simple (build first):**
- Manual demand forecast entry per SKU/brand
- Historical sales data view (last 12 months)
- Simple seasonal pattern indicators
- Forecast vs actual comparison
- Reorder point calculation (lead time × avg daily demand)

**Medium complexity:**
- Automated forecast suggestions based on historical averages
- Seasonal adjustment factors
- Promotional demand planning (retailer promotions)
- Brand-level demand aggregation
- SKU lifecycle tracking (new/growth/mature/declining)

**Complex (defer or skip):**
- Machine learning forecast models
- External data integration (weather, economic indicators)
- Collaborative forecasting with retailers
- Advanced statistical methods (exponential smoothing, etc.)

### Inventory Management
**Simple (build first):**
- Current inventory by SKU, brand, location
- Inventory value calculations
- Low stock alerts (below reorder point)
- Overstock alerts (above max stock level)
- Inventory turnover ratio
- Days on hand calculation

**Medium complexity:**
- Multi-location inventory tracking
- Inventory transfer between locations
- Safety stock recommendations
- ABC analysis (classify SKUs by importance)
- Slow-moving inventory identification
- Committed vs available inventory

**Complex (defer or skip):**
- Lot/batch tracking
- Expiration date management
- Inventory optimization algorithms
- Multi-echelon inventory planning

### Order Tracking
**Simple (build first):**
- Order list view (all orders, filterable)
- Order detail view (SKUs, quantities, status)
- Order status workflow (pending/confirmed/shipped/delivered)
- Order search by PO number, retailer, date
- Orders by retailer dashboard
- Open orders vs fulfilled orders

**Medium complexity:**
- Purchase order generation from demand forecasts
- Backorder tracking and allocation
- Partial shipment tracking
- Order fulfillment rate metrics
- Lead time tracking per supplier
- Order timeline view (visual pipeline)

**Complex (defer or skip):**
- EDI integration with retailers
- Automated PO sending to suppliers
- Advanced shipping notices (ASN)
- Real-time carrier tracking integration

### Cash Flow / Financial
**Simple (build first):**
- Total inventory value by brand
- Cash tied up in inventory
- Revenue by brand (monthly/quarterly)
- Revenue by retailer
- Simple cash flow summary (in vs out this month)
- Payment terms tracking (when will Walmart pay?)

**Medium complexity:**
- Cash flow forecast (next 90 days)
- Working capital metrics
- Days sales outstanding (DSO)
- Days inventory outstanding (DIO)
- Cash conversion cycle
- Budget vs actual tracking
- Gross margin by brand/SKU

**Complex (defer or skip):**
- Full accounting system integration
- Accounts receivable aging
- Invoice generation and tracking
- Multi-entity consolidation
- Advanced financial modeling

### Reporting & Alerts
**Simple (build first):**
- Demand vs supply gap report
- Low stock report
- Overstock report
- Sales by brand/retailer
- Inventory value summary
- Email alerts for critical stockouts

**Medium complexity:**
- Weekly executive summary email
- Customizable alert thresholds
- Exception reports (automated issue flagging)
- Performance trends (week-over-week, month-over-month)
- Top movers report (best/worst sellers)
- Forecast accuracy report

**Complex (defer or skip):**
- Custom report builder
- Scheduled report delivery
- Interactive dashboards with drill-down
- Real-time alert rules engine
- Advanced analytics and BI tools

### Data Import/Export
**Simple (build first):**
- CSV import for inventory updates
- CSV import for order data
- Excel template downloads
- CSV export for all major reports
- Bulk SKU data upload

**Medium complexity:**
- Excel file import (xlsx parsing)
- Data validation on import
- Import error handling and reporting
- Automated daily data sync (if API available)
- Historical data migration from old spreadsheets

**Complex (defer or skip):**
- Real-time API integrations
- EDI integration
- Webhook support
- Custom data transformation rules
- Two-way sync with ERP systems

## Complexity Notes

### Quick Wins (Build Week 1-2)
- Basic inventory list view
- Manual inventory updates
- Simple low stock alerts (threshold-based)
- Order list view
- Basic cash flow summary

### Core Value (Build Week 3-6)
- Demand vs supply gap visualization
- Brand-level dashboards
- Retailer performance tracking
- Order tracking workflow
- Forecast vs actual reporting
- Excel import/export

### High Value Features (Build Week 7-12)
- Automated demand forecasting (simple historical average)
- Cash flow forecasting
- Reorder point automation
- Safety stock calculations
- Alert system (email notifications)
- Multi-user support with roles

### Nice-to-Haves (Build Later or Never)
- Mobile app (responsive web first)
- Advanced forecasting models
- Custom report builder
- Real-time integrations
- Workflow automation

### Complexity Comparison

**Low Complexity (1-2 days per feature):**
- CRUD operations for SKUs, orders, inventory
- Basic calculations (totals, averages, percentages)
- Simple filtering and sorting
- Static reports
- CSV import/export

**Medium Complexity (3-5 days per feature):**
- Multi-level data relationships (brand → SKU → inventory → orders)
- Time-series visualizations
- Alert logic and notification system
- Excel file parsing
- User authentication and roles
- Automated calculations (forecasts, reorder points)

**High Complexity (1-2 weeks per feature):**
- Real-time data sync
- Advanced forecasting algorithms
- Multi-warehouse allocation logic
- Interactive dashboards with drill-down
- API integrations with external systems
- Complex financial calculations

## Dependencies Between Features

### Foundation (Build First)
1. **Data model & database** - Everything depends on this
2. **SKU master data** - Required for all features
3. **Brand structure** - Organizing principle for entire system
4. **User authentication** - Security foundation

### Core Building Blocks (Build Second)
5. **Inventory tracking** - Enables demand vs supply
6. **Order management** - Enables cash flow tracking
7. **Historical data import** - Needed for forecasting

### Dependent Features (Build Third)
8. **Demand forecasting** - Depends on historical sales data + inventory
9. **Demand vs supply gap** - Depends on forecasting + inventory tracking
10. **Reorder point automation** - Depends on demand forecasting + lead times
11. **Cash flow tracking** - Depends on order data + inventory value

### Advanced Features (Build Last)
12. **Alerts & notifications** - Depends on all core metrics being calculated
13. **Executive dashboards** - Depends on all data sources being available
14. **Scenario planning** - Depends on forecasting engine
15. **Reports** - Depends on stable data model

### Critical Path for MVP
```
Week 1-2: Database + SKU/Brand data + Basic inventory CRUD
Week 3-4: Order tracking + Inventory views by brand
Week 5-6: Demand vs supply gap calculation + Simple forecasting
Week 7-8: Cash flow tracking + Alerts
Week 9-10: Reports + Excel import/export
Week 11-12: Polish, testing, user training
```

### Integration Dependencies
- **Excel import** should be built early (migration path)
- **Cash flow** needs order data + inventory data
- **Forecasting** needs 12+ months historical data
- **Alerts** need all core metrics defined first
- **Reports** should be last (requires stable calculations)

### Data Flow Dependencies
```
SKU Master Data
    ↓
Inventory Levels → Demand Forecasts → Demand vs Supply Gap
    ↓                    ↓
Orders → Revenue → Cash Flow → Alerts
    ↓
Retailer Performance Reports
```

## Migration Considerations from Excel

### What Users Currently Do in Excel
- Enter demand forecasts manually per SKU
- Track inventory across multiple tabs
- Calculate reorder points with formulas
- Track open orders from retailers
- Calculate cash position based on receivables
- Share files via email with brand managers

### Migration Pain Points to Address
1. **Data entry muscle memory** - Make interface similar to Excel
2. **Formula dependencies** - Document their current Excel formulas, replicate logic
3. **Copy/paste workflows** - Support pasting from Excel
4. **Export safety net** - Let them export to Excel anytime (psychological safety)
5. **Historical data** - Import last 24 months from spreadsheets
6. **Parallel running** - They'll want to run both systems for 1-2 months

### Features That Reduce Excel Dependency
- Grid-based data entry (feels like spreadsheet)
- Bulk edit capabilities
- Quick calculations visible on screen
- Keyboard shortcuts for power users
- Undo/redo functionality
- Copy/paste support

### Red Flags to Avoid
- Don't force them to click through multiple screens for what was one Excel row
- Don't make reporting slower than Excel pivot tables
- Don't remove flexibility they currently have
- Don't make them learn complex UI when Excel was simple

## Benchmark: What Commercial Tools Offer

### Cin7 Core ($299/month)
- Multi-channel inventory and order management
- 700+ integrations (overkill for Petra)
- Multi-warehouse support
- Bill of Materials (not needed)
- Barcode scanning (not needed unless they warehouse)
- Real-time inventory across channels

**Takeaway:** Petra doesn't need 95% of these features. Focus on the 5% that matters.

### NetSuite ($$$$, requires customization)
- Comprehensive ERP system
- Heavy customization required
- Long implementation timeline
- Designed for companies 10x Petra's size

**Takeaway:** Total overkill. Custom tool will be faster and cheaper.

### GMDH Streamline
- AI-driven demand planning
- Automated forecasting
- Safety stock calculations
- ERP integration

**Takeaway:** Good inspiration for forecasting features, but don't need AI complexity.

### RELEX Solutions
- Unified planning platform
- Advanced analytics
- Scenario planning
- Enterprise-scale

**Takeaway:** Scenario planning is good idea for Phase 2+.

### What Petra Actually Needs vs Commercial Tools
- Commercial tools: 100+ features, 95% unused
- Petra needs: 10-15 core features, all heavily used
- Commercial tools: $299-$5000/month per user
- Custom tool: One-time dev cost, no per-user fees
- Commercial tools: 3-6 month implementation
- Custom tool: 6-12 week MVP

## Key Insights from Research

### What Makes Supply Chain Dashboards Successful
1. **Real-time visibility** - Users cited this as #1 requirement
2. **Exception reporting** - Flag issues automatically vs hunting for problems
3. **Role-based views** - Executives need different info than brand managers
4. **Mobile access** - Decisions happen outside the office
5. **Simple but accurate forecasting** - Historical averages beat no forecast
6. **Cash flow integration** - Inventory IS cash; show the connection

### Common Failure Patterns
1. **Too much data, not enough insight** - Dashboards with 50 metrics nobody reads
2. **Slow performance** - If it takes 30 seconds to load, users go back to Excel
3. **Poor mobile experience** - Pinch-zooming desktop UI on phone
4. **Ignoring existing workflows** - Building "better" process users won't adopt
5. **No clear action items** - Pretty charts that don't tell you what to do

### Specific to Petra's Scale ($1.5M/quarter, 160 SKUs)
- Don't need real-time (5-minute refresh is plenty)
- Don't need complex forecasting (seasonal patterns + growth rate = 80% accuracy)
- Don't need warehouse features (likely use 3PL)
- DO need retailer-specific views (each retailer = different rules)
- DO need brand isolation (brand managers are territorial)
- DO need Excel bridge (current state = Excel, can't go cold turkey)

### What to Build vs Buy
**Build custom:**
- Demand vs supply gap tracking (Petra-specific workflow)
- Brand-centric dashboards (5 brands = core organizing principle)
- Retailer compliance tracking (TJX/Walmart/CVS all different)
- Cash flow forecasting tied to inventory (their specific financial model)

**Integrate/use existing:**
- Accounting (keep QuickBooks or whatever they use)
- Email (don't build notification system, just send emails)
- Spreadsheets (Excel import/export, don't replace Excel entirely)

## Sources

- [SPS Commerce 2026 Demand Report](https://www.spscommerce.com/sps-innovation-drop/jan-2026/)
- [SupplyChainBrain: Retail Supply Chain Trends 2026](https://www.supplychainbrain.com/blogs/1-think-tank/post/43044-the-trends-that-will-define-retail-supply-chains-in-2026)
- [Power BI Supply Chain Dashboards](https://thesunflowerlab.com/power-bi-supply-chain-dashboards/)
- [7 Best Demand Planning Software 2026](https://datup.ai/en/compare/best-demand-planning-software)
- [Best Demand Planning Software 2026 - Prediko](https://www.prediko.io/forecasting-demand-planning/best-demand-planning-software)
- [RELEX Solutions: Demand Planning Features](https://www.relexsolutions.com/resources/demand-planning/)
- [Top 8 Demand Planning Tools - Coefficient](https://coefficient.io/finance-automation/demand-planning-tools)
- [Cin7 Core Inventory Management](https://www.cin7.com/solutions/core/)
- [Cin7 vs NetSuite Comparison - Stackupp](https://stackupp.com/inventory-management/compare/cin7-vs-netsuite)
- [QuickBooks Commerce (TradeGecko) Product Tour](https://www.tradegecko.com/product-tour/wholesale)
- [Seven Key Features of Effective Supply Chain Dashboards](https://supplychaindigital.com/logistics/seven-key-features-effective-supply-chain-dashboards-take-supply-chain)
- [GoodData: 7 Key Supply Chain Dashboard Examples](https://www.gooddata.com/blog/supply-chain-dashboard-examples/)
- [Microsoft Dynamics 365: Inventory Dashboards](https://learn.microsoft.com/en-us/dynamics365/intelligent-order-management/inventory-dashboards)
- [Inventory Visibility Dashboard - Dynamics 365](https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/inventory-visibility-dashboard)
- [4 Best Demand Planning Dashboards - Flieber](https://www.flieber.com/blog/demand-planning-dashboards)
- [Best Wholesale Inventory Management Software 2025](https://theretailexec.com/tools/best-wholesale-inventory-management-software/)
- [Cash Flow Tracking Dashboard for CFO - HighRadius](https://www.highradius.com/resources/Blog/cash-flow-tracking-dashboard/)
- [How to Build a Cash Flow Tracking Dashboard](https://www.phoenixstrategy.group/blog/how-to-build-a-cash-flow-tracking-dashboard)
- [Cash Flow Visibility Explained - Nilus](https://www.nilus.com/post/how-to-improve-cash-flow-visibility-best-practices-every-finance-leader-should-know)
- [Excel in Logistics and Supply Chain - Adexin](https://adexin.com/blog/excel-for-supply-chain/)
- [How to Migrate from Excel to Retail Planning Platform - Toolio](https://www.toolio.com/post/how-to-migrate-from-excel-to-an-integrated-retail-planning-platform)
