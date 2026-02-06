# Pitfalls Research: Supply Chain Dashboard

## Critical Pitfalls

### 1. **Over-Reliance on Dashboards Without Process Change**
Supply chain optimization fails when leaders over-index on dashboards and underinvest in process design and change management. Better data alone does not guarantee better outcomes. Studies indicate that **between 50% and 70% of supply chain projects fail**. Companies keep adding dashboards and AI pilots, yet the risks that matter won't be visible on the dashboards or in the key performance indicators they trust most.

**Warning Signs:**
- Team continues using Excel after dashboard launch
- Dashboard shows data but doesn't drive decisions
- No clear process for how insights lead to action

**Prevention:** Define clear workflows and decision points BEFORE building features. Map how each dashboard metric will trigger specific actions.

**Phase to Address:** Discovery & Planning - Create decision workflows before writing code

---

### 2. **Poor Planning and Undefined Objectives**
The most common cause of supply chain project failure is poor planning, which includes a lack of clearly defined objectives, unrealistic timelines, and insufficient resource allocation. A fundamental flaw in many dashboards is the absence of clear, well-defined objectives. Without a specific goal in mind, dashboards can become a collection of irrelevant metrics.

**Warning Signs:**
- Stakeholders describe features they want rather than problems to solve
- No agreement on what metrics matter most
- Team can't articulate success criteria beyond "make it look good"

**Prevention:** Run extensive discovery phase with dozens of questions. Document specific decisions each team member needs to make daily/weekly.

**Phase to Address:** Discovery - Create decision.md documenting every stakeholder need

---

### 3. **Resistance to Change and User Adoption Failure**
One study found that **only 28% of intended users accessed a dashboard even once** when usability and user needs weren't considered. Another significant cause of supply chain project failure is resistance to change, as many employees, managers, and stakeholders may resist new systems.

**Warning Signs:**
- Non-technical founding team expresses anxiety about "learning a new system"
- No champion identified within the team who will advocate for adoption
- Training plan is "we'll send them a video"

**Prevention:** Involve users in every design decision. Build features that feel familiar to Excel users. Plan for gradual transition, not cold turkey.

**Phase to Address:** Throughout - User testing in Phase 1, parallel Excel usage in Phase 2, gradual cutover in Phase 3

---

### 4. **Data Quality Crisis During Migration**
Studies show **nearly 90% of spreadsheets contain errors**. For retailers managing thousands of SKUs across multiple channels, those errors become systemic risks. An error in a single cell is very difficult to trace and can lead to millions of dollars lost. Global losses totaling over **$800 billion** in a single year have been attributed to inventory distortions, with 52% due to out-of-stocks and 44% to overstocks.

**Warning Signs:**
- No data audit conducted before migration
- Assumption that "Excel data is clean enough"
- No validation rules defined for new system
- Multiple versions of the same SKU across different sheets

**Prevention:** Audit Excel data quality in Phase 0. Create data cleaning scripts. Build validation into every data entry point.

**Phase to Address:** Phase 0 - Data audit and cleaning BEFORE any development starts

---

### 5. **Treating It Like a Software Purchase Instead of Business Transformation**
According to Gartner, anywhere from **55% to 75% of ERP implementations fail**. The most expensive mistake isn't technical; it's treating ERP like a software purchase instead of a business transformation, with organizations rushing into vendor selection without understanding their own processes.

**Warning Signs:**
- Team jumps straight to feature lists without understanding current workflows
- No process documentation exists
- Assumption that software will "fix" process problems

**Prevention:** Document current state processes. Identify broken workflows. Design improved processes that software will enable.

**Phase to Address:** Discovery - Map current workflows, identify pain points, design future state

---

## Common Mistakes

### Data and Integration

#### **Data Inconsistency and Lack of Standardization**
Excel's flexibility can lead to chaos. Without proper validation and cleansing processes, issues can snowball into a nightmare. If you have multiple spreadsheets to migrate, specific fields and record formats may not be standardized—one user may enter phone numbers in a specific column, while another uses it for email addresses.

**Common Issues:**
- Date formats differ depending on source or region (01-02-03 could be Jan 2, 2003 OR Feb 1, 2003 OR Feb 3, 2001)
- Decimal handling errors might double every financial amount
- String truncation when importing to database
- Character encoding issues (special characters in SKU names)
- Custom columns with inconsistent data types

**Prevention Strategy:**
- Create data dictionary defining format for every field
- Build validation rules that reject malformed data
- Test import process with sample data containing edge cases
- Phase to Address: Phase 0 & Phase 1

---

#### **Over-Reliance on Historical Data**
Over-reliance on historical data while ignoring external factors like market shifts, economic changes, or seasonal anomalies creates significant blind spots that lead to failure in real-world supply chain dynamics. Incomplete data leads to inaccurate inventory forecasts, and inaccurate forecasts can bring down your bottom line by leading to either overstock or stockouts.

**Prevention Strategy:**
- Design system to accept manual overrides for known upcoming changes
- Build fields for notes/context on forecast adjustments
- Track actual vs. forecast to surface patterns
- Phase to Address: Phase 2 (Demand Planning features)

---

#### **Data Migration Underestimation**
Organizations think moving data from legacy systems is a technical exercise when it's actually a business exercise that exposes decades of inconsistent processes, duplicate records, and decisions no one remembers making. Data compatibility problems can arise due to differences in data formats, structures, or naming conventions.

**Prevention Strategy:**
- Allocate 2-3x time for data cleaning than expected
- Plan for data reconciliation phase where both systems run parallel
- Create rollback plan if migration fails
- Phase to Address: Between Phase 0 and Phase 1

---

### Technical Architecture

#### **Legacy System Integration Challenges**
Integrating with legacy systems (like SellerCloud) can be one of the most daunting challenges, as systems may use outdated technologies, lack documentation, or have unique interfaces that require specialized integration efforts. Data integration remains one of the most complex and underestimated challenges in automation projects.

**SellerCloud-Specific Challenges:**
- REST API requires Read/Write permissions configured correctly
- Webhook URLs must match exactly between systems
- Many integrations require unique Custom Columns (Channel_SKU, Channel_Shop_ID)
- Plugin integrations need Custom Company Settings for credentials
- API has rate limits that must be respected

**Prevention Strategy:**
- Build SellerCloud integration as isolated service with retry logic
- Create comprehensive error logging for API failures
- Test with full production data volume to identify rate limit issues
- Design for eventual consistency (data may not sync instantly)
- Phase to Address: Phase 1 (Core Integration)

---

#### **Real-Time Data Integration Failures**
Planning with outdated or static data reduces overall responsiveness. Businesses that cannot leverage live data sources risk falling behind. Lack of real-time visibility into inventory levels is a common CPG challenge, as retailers often have multiple suppliers and distribution centers.

**Prevention Strategy:**
- Define SLA for "real-time" (5 minutes? 1 hour? Daily batch?)
- Design UI to show last-sync timestamps
- Build reconciliation reports to catch sync failures
- Phase to Address: Phase 1 & Phase 2

---

#### **Over-Customization**
The challenge lies in striking the right balance between customization and out-of-the-box functionality. Over-customization can lead to complexity and increased maintenance efforts.

**Warning Signs:**
- Building custom solution for every edge case
- Creating complex configuration systems instead of making opinionated choices
- Feature requests driving architecture instead of core use cases

**Prevention Strategy:**
- Prioritize ruthlessly - build for 80% use case first
- Use feature flags to enable advanced options only when needed
- Document why features were deferred
- Phase to Address: Throughout - Resist scope creep

---

### User Experience

#### **Information Overload and Cluttered Interfaces**
Data density can make users run for the hills if not appropriate for those outside of the role of "data scientist" or "data analyst". Overly complex visualizations or a cluttered interface can deter users, especially those with less technical expertise.

**For Non-Technical Petra Team:**
- Avoid showing all 160 SKUs on one screen
- Don't use technical jargon (API, sync, database)
- Limit charts to 2-3 per page maximum
- Use familiar metaphors (traffic lights, not statistical thresholds)

**Prevention Strategy:**
- Design for mobile-first simplicity
- Create role-based views (what does each person need to see?)
- Use progressive disclosure (show summary, click for details)
- Phase to Address: Phase 1 UI design

---

#### **Misaligned Design - Dashboards That Don't Answer Real Questions**
Dashboards built without UX might look impressive, but they often fail in practice. Executives stop using them because they're too hard to interpret. Teams revert to spreadsheets because the visuals don't answer their real questions.

**Prevention Strategy:**
- For each metric, identify the question it answers
- Test early prototypes with actual users doing real tasks
- Track which features get used vs. ignored
- Phase to Address: Discovery (identify questions) + Phase 1 (validate with prototypes)

---

#### **Complex Interfaces, Technical Jargon, and Confusing Navigation**
Complex interfaces, technical jargon, and confusing navigation can hinder adoption and diminish the dashboard's value. This is especially critical for Petra's non-technical founding team.

**Prevention Strategy:**
- Use plain language everywhere
- Provide contextual help without requiring documentation
- Design navigation that matches mental models (by brand? by SKU? by retailer?)
- Test with least technical team member first
- Phase to Address: Phase 1 (MVP UI) - Get feedback BEFORE building more features

---

#### **Lack of User Training and Change Management**
Training is where success happens or fails. Role-based training tied to actual workflows should be used rather than just teaching mechanics. A common pitfall is "recreating Excel" inside the new platform instead of defining streamlined, standardized processes.

**For Petra:**
- Don't just replicate Excel workflows - improve them
- Plan specific training for how team will use dashboard daily
- Identify workflow changes (e.g., no more emailing spreadsheets)

**Prevention Strategy:**
- Create role-specific walkthrough videos
- Build onboarding flow into the app itself
- Schedule working sessions during Phase 2 rollout
- Phase to Address: Between Phase 1 and Phase 2

---

### Process and Organization

#### **Inadequate Resource Allocation**
Many organizations fail at integrating systems because senior management doesn't commit their best talent to the implementation. Projects are chronically under-resourced from day one, with executives gutting internal staffing based on the assumption that existing employees will absorb project work on top of their day jobs.

**For Petra:**
- Founding team needs to allocate time for testing, feedback, data entry
- Someone must own data quality and reconciliation
- Plan for team time during migration, not just developer time

**Prevention Strategy:**
- Define time commitment from Petra team each week
- Identify internal champion who will drive adoption
- Phase to Address: Planning - Get commitment before starting

---

#### **Lack of Cross-Functional Communication**
A lack of communication and consensus among cross-functional stakeholders can lead to siloed demand planning. The interdependence of suppliers, manufacturers, brands, retailers, and logistics providers is not possible with Excel.

**Prevention Strategy:**
- Weekly check-ins during development
- Shared definition of success metrics
- Collaborative decision-making on tradeoffs
- Phase to Address: Throughout

---

#### **Siloed Technology and System Fragmentation**
As businesses expand globally, they become multi-modal, and not all technology supports every mode. The biggest issue isn't that companies don't have tools; it's that the information needed either gets stuck, shows up late, or comes in such a messy form that it's almost useless.

**For Petra:**
- Current state: SellerCloud + Excel + email attachments
- Risk: Building another silo instead of central hub
- Need: Single source of truth that pulls from SellerCloud

**Prevention Strategy:**
- Design integration architecture that can add data sources later
- Avoid locking into single vendor or proprietary format
- Phase to Address: Phase 1 (Architecture decisions)

---

## Data Quality Pitfalls

### **Data Integrity Issues**
Excel sheets are prone to human error, duplication, and inconsistency. Using Excel to manage master data leads to messy entries, invalidated data, and over time, more master data errors.

**Common Excel Issues at Petra:**
- SKU variations (SKU-123 vs SKU123 vs sku-123)
- Duplicate entries for same product
- Outdated product codes no longer manufactured
- Data for retailers no longer working with
- Critical data missing from some spreadsheets
- Formulas broken when sheets are copy/pasted
- Multiple versions of "truth" across different team members' files

**Prevention Strategy:**
- Audit existing Excel files for duplicates and inconsistencies
- Create master SKU list with canonical names
- Build validation that rejects non-standard SKU formats
- Phase to Address: Phase 0 - Before any import

---

### **Lack of Data Structure and Schema**
Spreadsheets don't have a schema, which means they have loose rules regulating how and where users input data. Excel's flexibility can lead to chaos, and without strict data structure enforcement, it's easy for errors to creep in unnoticed.

**Prevention Strategy:**
- Define database schema with proper data types
- Create data dictionary accessible to team
- Build import validation that flags schema violations
- Phase to Address: Phase 1 (Database design)

---

### **Data Corruption During Import**
A decimal handling error might double every financial amount in your database. Dates might all default to 01/01/1970 because of format mismatches. Common culprits include string truncation, incompatible data types between source and target platforms, and character encoding issues.

**Prevention Strategy:**
- Test import with real data subset
- Create before/after comparison reports
- Build rollback mechanism for failed imports
- Validate totals match (sum of inventory before = sum after)
- Phase to Address: Phase 1 (Import tooling)

---

### **Inaccurate Demand Forecasting**
Without accurate predictions, retailers may end up with excess inventory or stockouts, both of which can be costly. Not all demand planning tools are created equal—if your forecasting solution doesn't account for all the factors that impact your business, you may find you are forecasting off incomplete information.

**For Petra's 5 Brands and China Manufacturing:**
- 30-60 day lead times mean forecasting errors are expensive
- Seasonal variations differ by brand and retailer
- Promotions/holidays require manual overrides
- Historical data may not capture market shifts

**Prevention Strategy:**
- Start simple - don't over-engineer forecasting in Phase 1
- Build system to track forecast accuracy over time
- Allow manual adjustments with notes explaining why
- Phase to Address: Phase 2 (Demand Planning features)

---

### **Data Access and Permission Issues**
While CPG brands recognize that real-time inventory visibility is critical, they face obstacles in accessing the required data. If data isn't accurate or updated in real time, visibility is only as good as guesswork.

**Prevention Strategy:**
- Define who can edit vs. view each data type
- Build audit log for data changes
- Create reconciliation process for SellerCloud vs. dashboard discrepancies
- Phase to Address: Phase 1 (Auth system) & Phase 2 (Data sync)

---

### **Waste Tracking Problems**
65% of CPG manufacturers rank waste reduction as highly important to supply chain performance, but 18% still use manual methods to track this metric and 8% have no formal tracking at all.

**For Petra:**
- No formal waste tracking currently
- Opportunity to build this into system from start
- Track reasons for waste (damaged, expired, overproduction)

**Prevention Strategy:**
- Include waste tracking in data model from Phase 1
- Simple interface for logging waste incidents
- Phase to Address: Phase 2 or Phase 3

---

## UX Pitfalls

### **Dashboards That Look Impressive But Fail in Practice**
Misaligned design leads to executives stopping use because dashboards are too hard to interpret. Teams revert to spreadsheets because visuals don't answer their real questions.

**Warning Signs:**
- Beautiful charts that don't help make decisions
- Metrics that sound important but nobody acts on
- Users asking "how do I export this to Excel?"

**Prevention Strategy:**
- Design around decisions, not data
- Test with real scenarios: "Show me which SKUs to reorder this week"
- Measure success by Excel usage going DOWN
- Phase to Address: Phase 1 (MVP) - Validate before building more

---

### **Only 28% User Adoption When Usability Ignored**
One study found that only 28% of intended users accessed a dashboard even once when usability and user needs weren't considered.

**For Petra's Non-Technical Team:**
- Risk is especially high with non-technical founding team
- Can't assume they'll "figure it out"
- Must design for least technical user first

**Prevention Strategy:**
- User testing in Phase 1 with actual team members
- Onboarding flow built into app
- Contextual help on every screen
- Phase to Address: Phase 1 & Phase 2

---

### **Lack of Mobile Optimization**
For busy executives and team members, not having mobile access limits dashboard utility.

**For Petra:**
- Founding team likely checks status on phones
- May need visibility while traveling or at retailer meetings
- Mobile-first design ensures simplicity on desktop too

**Prevention Strategy:**
- Design for mobile screen sizes from start
- Prioritize key metrics for small screens
- Phase to Address: Phase 1 (UI framework choice)

---

### **No Clear Visual Hierarchy**
Information overload happens when everything looks equally important.

**Prevention Strategy:**
- Use size, color, position to indicate priority
- Put most critical alerts at top
- Hide advanced features behind progressive disclosure
- Phase to Address: Phase 1 (UI design)

---

### **Technical Jargon and Unclear Labels**
Using developer language instead of business language kills adoption.

**Bad Examples:**
- "Last Sync Timestamp" → "Last Updated"
- "API Connection Status" → "Connected to SellerCloud"
- "Query Failed" → "Couldn't load this data"

**Prevention Strategy:**
- Review all labels with non-technical team member
- Use business terms from Excel sheets they already use
- Write error messages in plain English with next steps
- Phase to Address: Phase 1 (Throughout UI development)

---

### **No Personalization or Role-Based Views**
Showing everyone everything creates cognitive overload.

**For Petra:**
- Different team members care about different things
- Not everyone needs to see all 5 brands
- Some need SKU-level detail, others need brand-level summary

**Prevention Strategy:**
- Phase 1: Build for single view first (don't over-engineer)
- Phase 2: Add filters and saved views
- Phase 3: Consider role-based personalization
- Phase to Address: Phase 2

---

## Integration Pitfalls

### **SellerCloud API Challenges**

#### **Authentication and Permission Issues**
REST API keys must be created with Read/Write permissions. Connection troubles occur even after creating credentials.

**Prevention Strategy:**
- Document exact permission requirements
- Test API access before building features on top
- Build error handling for auth failures
- Phase to Address: Phase 1 (First week)

---

#### **Webhook URL Mismatches**
Webhook URL in SellerCloud must match URL in dashboard settings exactly.

**Prevention Strategy:**
- Use environment variables for webhook URLs
- Test webhooks in development before production
- Build UI to verify webhook connectivity
- Phase to Address: Phase 1 (Integration setup)

---

#### **Custom Column Requirements**
Many integrations require unique Custom Columns (Channel_SKU, Channel_Shop_ID) that must be added for products, orders, purchase orders, and customers.

**Prevention Strategy:**
- Audit which Custom Columns Petra already uses
- Document required Custom Columns for integration
- Phase to Address: Phase 0 (Discovery)

---

#### **API Rate Limits**
SellerCloud API includes rate limits to ensure stable performance.

**Prevention Strategy:**
- Design sync logic to batch requests
- Implement exponential backoff for retries
- Show sync queue status in dashboard
- Phase to Address: Phase 1 (API client implementation)

---

#### **Data Sync Timing and Eventual Consistency**
Real-time sync is not always possible. Data may take minutes to propagate.

**Prevention Strategy:**
- Show "Last Synced" timestamp on every view
- Design for eventual consistency (data may be slightly stale)
- Build manual refresh button for urgent updates
- Phase to Address: Phase 1 (Sync architecture)

---

### **Excel Import Challenges**

#### **File Format Variations**
Users may upload .xlsx, .xls, .csv, or even copy/paste from Excel.

**Prevention Strategy:**
- Support multiple formats with robust parsing
- Show preview before import to catch format issues
- Provide import template with exact format required
- Phase to Address: Phase 2 (Excel import feature)

---

#### **Schema Mapping Complexity**
Excel columns may not match database fields exactly.

**Prevention Strategy:**
- Build column mapping UI for first import
- Save mapping profiles for recurring imports
- Validate all required fields present before allowing import
- Phase to Address: Phase 2

---

#### **Import Rollback and Error Recovery**
Partial imports that fail halfway create inconsistent state.

**Prevention Strategy:**
- All-or-nothing import transactions
- Create backup before import
- Build UI to review and fix errors without losing progress
- Phase to Address: Phase 2

---

### **Data Reconciliation**

#### **SellerCloud as Source of Truth**
When dashboard data conflicts with SellerCloud, which is correct?

**Prevention Strategy:**
- Define SellerCloud as authoritative source
- Build reconciliation reports showing discrepancies
- Allow manual overrides only with audit log
- Phase to Address: Phase 1 (Architecture decision)

---

#### **Handling Manual Overrides**
Users need to adjust forecasts or inventory for known upcoming changes.

**Prevention Strategy:**
- Track manual changes separately from synced data
- Show which values were manually adjusted
- Build expiration for temporary overrides
- Phase to Address: Phase 2

---

## Prevention Strategies

### Phase 0: Pre-Development (Discovery & Data Audit)

**Critical Activities:**
1. **Data Quality Audit**
   - Export all Excel files currently in use
   - Identify duplicates, inconsistencies, missing data
   - Create master SKU list with canonical names
   - Document data cleaning requirements

2. **SellerCloud Discovery**
   - Audit existing Custom Columns in SellerCloud
   - Test API access and permissions
   - Identify rate limits and webhook requirements
   - Document which data lives in SellerCloud vs. Excel

3. **Process Documentation**
   - Map current workflows (who does what, when, why)
   - Identify pain points and inefficiencies
   - Define decision points that dashboard should support
   - Create discovery.md with dozens of clarifying questions

4. **Success Criteria Definition**
   - What decisions should be faster/better?
   - What errors should be eliminated?
   - When can team stop using Excel?
   - How will adoption be measured?

**Warning Signs to Catch:**
- Multiple versions of same SKU
- Inconsistent date formats
- Missing critical data fields
- Broken formulas in Excel
- No clear owner for data quality

---

### Phase 1: Core Integration & MVP Dashboard

**Critical Activities:**
1. **Build Robust Integration Layer**
   - SellerCloud API client with retry logic
   - Error logging and alerting
   - Sync queue with status visibility
   - Rate limit handling

2. **Design for Data Quality**
   - Database schema with proper validation
   - Import validation that rejects malformed data
   - Reconciliation reports (SellerCloud vs. dashboard)
   - Audit log for all data changes

3. **UX for Non-Technical Users**
   - User testing with actual Petra team
   - Plain language everywhere (no jargon)
   - Mobile-first responsive design
   - Onboarding flow built into app

4. **Start Simple**
   - Build for 80% use case first
   - Defer advanced features to Phase 2/3
   - Focus on core decisions team makes daily

**Warning Signs to Catch:**
- Team saying "this looks confusing"
- API failures not being caught gracefully
- Import errors with no clear fix
- Sync delays not communicated to users
- Building features nobody asked for

---

### Phase 2: Demand Planning & Advanced Features

**Critical Activities:**
1. **Forecast Accuracy Tracking**
   - Track forecast vs. actual over time
   - Surface patterns in forecast errors
   - Allow manual adjustments with notes

2. **Excel Import for Historical Data**
   - Column mapping UI
   - Import validation and preview
   - Rollback mechanism for failed imports

3. **Role-Based Views**
   - Filters and saved views
   - Personalization without over-engineering

4. **Change Management**
   - Role-specific training
   - Working sessions with team
   - Parallel operation with Excel before cutover

**Warning Signs to Catch:**
- Forecasts wildly inaccurate with no explanation why
- Team still preferring Excel over dashboard
- Import errors requiring developer intervention
- Features built but not used

---

### Phase 3: Optimization & Scale

**Critical Activities:**
1. **Usage Analytics**
   - Track which features are used vs. ignored
   - Identify where users get stuck
   - Measure time savings vs. Excel

2. **Performance Optimization**
   - Handle 160+ SKUs across 5 brands efficiently
   - Optimize for China timezone (30-60 day lead times)

3. **Advanced Features Based on Real Usage**
   - Only build what data shows is needed
   - Deprecate features that aren't used

**Warning Signs to Catch:**
- Slow load times
- Feature bloat
- Team requesting return to Excel

---

### Ongoing: Maintenance & Adoption

**Critical Activities:**
1. **Data Quality Monitoring**
   - Weekly reconciliation reports
   - Alert on sync failures
   - Regular data cleaning

2. **User Feedback Loop**
   - Monthly check-ins on what's working/not working
   - Fast iteration on UX issues
   - Celebrate wins (decisions made faster, errors avoided)

3. **Documentation**
   - Keep process docs updated
   - Video walkthroughs for new team members
   - Troubleshooting guides

**Warning Signs to Catch:**
- Declining usage over time
- Team working around system instead of with it
- Data quality degrading
- Requests to "export to Excel" increasing

---

## Key Success Factors

### 1. Leadership Commitment
- Founding team must champion adoption, not just delegate
- Allocate time for testing, feedback, data quality ownership
- Treat as business transformation, not IT project

### 2. Clean Data Foundation
- Invest 2-3x expected time in data cleaning before migration
- Build validation into every data entry point
- Continuous data quality monitoring

### 3. User-Centered Design
- Design around decisions, not data
- Test with least technical user first
- Plain language, no jargon
- Mobile-first simplicity

### 4. Phased Rollout
- Start with MVP that solves 1-2 core problems well
- Validate adoption before building more features
- Allow parallel Excel usage during transition
- Measure success by Excel usage decreasing

### 5. Integration Resilience
- Design for eventual consistency
- Graceful error handling with clear messages
- Show system status (last synced, connection health)
- Reconciliation process for discrepancies

### 6. Change Management
- Role-specific training tied to workflows
- Internal champion driving adoption
- Weekly check-ins during rollout
- Celebrate small wins

---

## Sources

- [8 Common Supply Chain Management Mistakes](https://www.logisticsbureau.com/supply-chain-mistakes/)
- [Supply Chain Projects: Why They Often Fail | OPSdesign](https://opsdesign.com/supply-chain-projects/)
- [Supply Chain Optimization Mistakes That Data Alone Won't Solve](https://www.panorama-consulting.com/supply-chain-optimization-mistakes-that-data-alone-cant-solve/)
- [Common Reasons For Supply Chain Technology Implementation Failures](https://www.panorama-consulting.com/supply-chain-implementation-failure/)
- [Three Hidden Risk Signals That Will Shape Supply Chain Security in 2026](https://www.supplychainbrain.com/articles/43266-three-hidden-risk-signals-that-will-shape-supply-chain-security-in-2026)
- [ERP Integration Challenges Explained](https://www.dckap.com/blog/erp-integration-challenges/)
- [ERP Implementation Failure Reasons: Avoid Costly Mistakes](https://www.ecisolutions.com/blog/the-2-million-mistake-why-70-of-erp-implementations-fail/)
- [ERP Failures in 2025: Same Problems, New Excuses](https://medium.com/@RaphSav/erp-failures-in-2025-same-problems-new-excuses-4e6eaca8f1d3)
- [ERP System Integration Challenges: Overcoming the Obstacles](https://blog.nbs-us.com/erp-system-integration-challenges-overcoming-the-obstacles)
- [Avoiding Common Pitfalls in Excel to Database Migration Projects](https://excelhunters.com/blog-post/avoiding-common-pitfalls-in-excel-to-database-migration-projects/)
- [Common Excel to Cloud Database Mistakes](https://www.caspio.com/blog/excel-to-cloud-database-mistakes/)
- [Data Migration Risks And The Checklist You Need To Avoid Them](https://www.montecarlodata.com/blog-data-migration-risks-checklist/)
- [7 Reasons Data Migrations Fail](https://www.definian.com/articles/7-reasons-data-migrations-fail)
- [Why Most Data Visualization Dashboards Fail](https://medium.com/@grow.com/why-most-data-visualization-dashboards-fail-and-how-to-make-yours-succeed-313d6cbf46f7)
- [Bad Dashboard Examples: 10 Common Dashboard Design Mistakes to Avoid](https://databox.com/bad-dashboard-examples)
- [Dashboard UX: Best Practices and Design Tips](https://www.designrush.com/agency/ui-ux-design/dashboard/trends/dashboard-ux)
- [How Can a UX Designer Help Improve Dashboard Usability](https://www.zigpoll.com/content/how-can-a-ux-designer-help-improve-the-usability-of-our-dashboard-for-less-techsavvy-users)
- [Top 5 Demand Planning Mistakes](https://clarkstonconsulting.com/insights/demand-planning-mistakes/)
- [4 Ways Automated Demand Planning Can Go Wrong](https://www.flieber.com/blog/automated-demand-planning-challenges)
- [Ineffective Demand Planning: 5 Warning Signs](https://throughput.world/blog/ineffective-demand-planning/)
- [The 5 Biggest Demand Forecasting Challenges](https://www.spscommerce.com/blog/5-biggest-demand-forecasting-challenges/)
- [Sellercloud API & Webservices Overview](https://help.sellercloud.com/omnichannel-ecommerce/seller-cloud-api-webservices-overview/)
- [Channel Plug-in Integrations through Scheduled Tasks](https://help.sellercloud.com/omnichannel-ecommerce/configuring-a-plugin-based-integration-through-scheduled-tasks/)
- [Supply Chain Visibility Challenges & Solutions](https://www.qimaone.com/resource-hub/article/common-supply-chain-challenges)
- [Why a Lack of Supply Chain Visibility is Costing Your Business](https://www.supplychain247.com/article/why_a_lack_of_supply_chain_visibility_is_costing_your_business)
- [Supply Chain Visibility for CPG Retail: Navigating Inventory Management](https://oboloo.com/supply-chain-visibility-for-cpg-retail-navigating-inventory-management/)
- [The Problem With Excel: 6 Reasons to Avoid it for Supply Chain](https://anvyl.com/blog/6-reasons-to-avoid-excel-for-supply-chain/)
- [Top Excel Challenges in Logistics and Supply Chain](https://adexin.com/blog/microsoft-excel-challenges/)
- [Supply Chain Planning In Excel: A Perilous Path](https://www.logility.com/blog/supply-chain-planning-in-excel-a-perilous-path/)
- [How to Migrate from Excel to an Integrated Retail Planning Platform](https://www.toolio.com/post/how-to-migrate-from-excel-to-an-integrated-retail-planning-platform)
