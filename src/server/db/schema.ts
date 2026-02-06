import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  date,
  primaryKey,
  unique,
  index,
} from "drizzle-orm/pg-core";

// ============================================================================
// AUTH.JS TABLES (required for Auth.js DrizzleAdapter)
// ============================================================================

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 50 }).notNull().default("viewer"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
  })
);

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", {
      length: 255,
    }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  })
);

// ============================================================================
// MASTER DATA TABLES
// ============================================================================

export const brands = pgTable(
  "brands",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    description: text("description"),
    leadTimeDays: integer("lead_time_days").notNull().default(30),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    nameIdx: index("brands_name_idx").on(table.name),
  })
);

export const skus = pgTable(
  "skus",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id")
      .notNull()
      .references(() => brands.id),
    sku: varchar("sku", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 100 }),
    unitCost: numeric("unit_cost", { precision: 10, scale: 2 }),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    brandIdIdx: index("skus_brand_id_idx").on(table.brandId),
    skuIdx: index("skus_sku_idx").on(table.sku),
  })
);

export const retailers = pgTable(
  "retailers",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    parentGroup: varchar("parent_group", { length: 255 }),
    channel: varchar("channel", { length: 100 }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    nameIdx: index("retailers_name_idx").on(table.name),
    codeIdx: index("retailers_code_idx").on(table.code),
  })
);

export const brandRetailers = pgTable(
  "brand_retailers",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id")
      .notNull()
      .references(() => brands.id),
    retailerId: integer("retailer_id")
      .notNull()
      .references(() => retailers.id),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    brandRetailerUnique: unique("brand_retailer_unique").on(
      table.brandId,
      table.retailerId
    ),
    brandIdIdx: index("brand_retailers_brand_id_idx").on(table.brandId),
    retailerIdIdx: index("brand_retailers_retailer_id_idx").on(
      table.retailerId
    ),
  })
);

// ============================================================================
// FORECASTS
// ============================================================================

export const forecasts = pgTable(
  "forecasts",
  {
    id: serial("id").primaryKey(),
    skuId: integer("sku_id")
      .notNull()
      .references(() => skus.id),
    retailerId: integer("retailer_id")
      .notNull()
      .references(() => retailers.id),
    month: date("month", { mode: "date" }).notNull(),
    forecastedUnits: integer("forecasted_units").notNull().default(0),
    orderedUnits: integer("ordered_units").default(0),
    source: varchar("source", { length: 50 }).default("manual"),
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    skuRetailerMonthUnique: unique("sku_retailer_month_unique").on(
      table.skuId,
      table.retailerId,
      table.month
    ),
    skuIdIdx: index("forecasts_sku_id_idx").on(table.skuId),
    retailerIdIdx: index("forecasts_retailer_id_idx").on(table.retailerId),
    monthIdx: index("forecasts_month_idx").on(table.month),
  })
);

// ============================================================================
// RETAIL SALES
// ============================================================================

export const retailSales = pgTable(
  "retail_sales",
  {
    id: serial("id").primaryKey(),
    skuId: integer("sku_id")
      .notNull()
      .references(() => skus.id),
    retailerId: integer("retailer_id")
      .notNull()
      .references(() => retailers.id),
    month: date("month", { mode: "date" }).notNull(),
    unitsSold: integer("units_sold").notNull().default(0),
    revenue: numeric("revenue", { precision: 12, scale: 2 }),
    source: varchar("source", { length: 50 }).default("manual"),
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    skuRetailerMonthUnique: unique("retail_sales_sku_retailer_month_unique").on(
      table.skuId,
      table.retailerId,
      table.month
    ),
    skuIdIdx: index("retail_sales_sku_id_idx").on(table.skuId),
    retailerIdIdx: index("retail_sales_retailer_id_idx").on(table.retailerId),
    monthIdx: index("retail_sales_month_idx").on(table.month),
  })
);

// ============================================================================
// PURCHASE ORDERS
// ============================================================================

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: serial("id").primaryKey(),
    poNumber: varchar("po_number", { length: 100 }).notNull().unique(),
    brandId: integer("brand_id")
      .notNull()
      .references(() => brands.id),
    supplier: varchar("supplier", { length: 255 }),
    status: varchar("status", { length: 50 }).notNull().default("draft"),
    orderDate: date("order_date", { mode: "date" }),
    expectedArrival: date("expected_arrival", { mode: "date" }),
    actualArrival: date("actual_arrival", { mode: "date" }),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
    currency: varchar("currency", { length: 10 }).default("USD"),
    depositAmount: numeric("deposit_amount", { precision: 12, scale: 2 }),
    depositPaid: boolean("deposit_paid").default(false),
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    brandIdIdx: index("purchase_orders_brand_id_idx").on(table.brandId),
    statusIdx: index("purchase_orders_status_idx").on(table.status),
    poNumberIdx: index("purchase_orders_po_number_idx").on(table.poNumber),
  })
);

export const poLineItems = pgTable(
  "po_line_items",
  {
    id: serial("id").primaryKey(),
    purchaseOrderId: integer("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    skuId: integer("sku_id")
      .notNull()
      .references(() => skus.id),
    quantity: integer("quantity").notNull(),
    unitCost: numeric("unit_cost", { precision: 10, scale: 2 }),
    totalCost: numeric("total_cost", { precision: 12, scale: 2 }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    purchaseOrderIdIdx: index("po_line_items_purchase_order_id_idx").on(
      table.purchaseOrderId
    ),
    skuIdIdx: index("po_line_items_sku_id_idx").on(table.skuId),
  })
);

// ============================================================================
// INVENTORY
// ============================================================================

export const inventory = pgTable(
  "inventory",
  {
    id: serial("id").primaryKey(),
    skuId: integer("sku_id")
      .notNull()
      .unique()
      .references(() => skus.id),
    quantityOnHand: integer("quantity_on_hand").notNull().default(0),
    quantityAllocated: integer("quantity_allocated").default(0),
    quantityInTransit: integer("quantity_in_transit").default(0),
    lastUpdated: timestamp("last_updated", { mode: "date" })
      .notNull()
      .defaultNow(),
    source: varchar("source", { length: 50 }).default("manual"),
    notes: text("notes"),
    updatedBy: text("updated_by").references(() => users.id),
  },
  (table) => ({
    skuIdIdx: index("inventory_sku_id_idx").on(table.skuId),
  })
);

// ============================================================================
// RETAIL ORDERS
// ============================================================================

export const retailOrders = pgTable(
  "retail_orders",
  {
    id: serial("id").primaryKey(),
    retailerId: integer("retailer_id")
      .notNull()
      .references(() => retailers.id),
    retailerPoNumber: varchar("retailer_po_number", { length: 100 }),
    brandId: integer("brand_id")
      .notNull()
      .references(() => brands.id),
    status: varchar("status", { length: 50 }).notNull().default("received"),
    orderDate: date("order_date", { mode: "date" }),
    shipByDate: date("ship_by_date", { mode: "date" }),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    retailerIdIdx: index("retail_orders_retailer_id_idx").on(table.retailerId),
    brandIdIdx: index("retail_orders_brand_id_idx").on(table.brandId),
    statusIdx: index("retail_orders_status_idx").on(table.status),
  })
);

export const retailOrderLineItems = pgTable(
  "retail_order_line_items",
  {
    id: serial("id").primaryKey(),
    retailOrderId: integer("retail_order_id")
      .notNull()
      .references(() => retailOrders.id, { onDelete: "cascade" }),
    skuId: integer("sku_id")
      .notNull()
      .references(() => skus.id),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }),
    totalPrice: numeric("total_price", { precision: 12, scale: 2 }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    retailOrderIdIdx: index("retail_order_line_items_retail_order_id_idx").on(
      table.retailOrderId
    ),
    skuIdIdx: index("retail_order_line_items_sku_id_idx").on(table.skuId),
  })
);

// ============================================================================
// PAYMENTS
// ============================================================================

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    purchaseOrderId: integer("purchase_order_id").references(
      () => purchaseOrders.id
    ),
    retailOrderId: integer("retail_order_id").references(() => retailOrders.id),
    type: varchar("type", { length: 50 }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("USD"),
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    dueDate: date("due_date", { mode: "date" }),
    paidDate: date("paid_date", { mode: "date" }),
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    purchaseOrderIdIdx: index("payments_purchase_order_id_idx").on(
      table.purchaseOrderId
    ),
    retailOrderIdIdx: index("payments_retail_order_id_idx").on(
      table.retailOrderId
    ),
    statusIdx: index("payments_status_idx").on(table.status),
  })
);

// ============================================================================
// AUDIT LOG
// ============================================================================

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    tableName: varchar("table_name", { length: 100 }).notNull(),
    recordId: text("record_id").notNull(),
    action: varchar("action", { length: 20 }).notNull(),
    userId: text("user_id"),
    changedData: text("changed_data"),
    previousData: text("previous_data"),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tableRecordIdx: index("audit_log_table_record_idx").on(
      table.tableName,
      table.recordId
    ),
    createdAtIdx: index("audit_log_created_at_idx").on(table.createdAt),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  skus: many(skus),
  brandRetailers: many(brandRetailers),
  purchaseOrders: many(purchaseOrders),
  retailOrders: many(retailOrders),
}));

export const skusRelations = relations(skus, ({ one, many }) => ({
  brand: one(brands, {
    fields: [skus.brandId],
    references: [brands.id],
  }),
  forecasts: many(forecasts),
  retailSales: many(retailSales),
  poLineItems: many(poLineItems),
  inventory: one(inventory),
  retailOrderLineItems: many(retailOrderLineItems),
}));

export const retailersRelations = relations(retailers, ({ many }) => ({
  brandRetailers: many(brandRetailers),
  forecasts: many(forecasts),
  retailSales: many(retailSales),
  retailOrders: many(retailOrders),
}));

export const brandRetailersRelations = relations(
  brandRetailers,
  ({ one }) => ({
    brand: one(brands, {
      fields: [brandRetailers.brandId],
      references: [brands.id],
    }),
    retailer: one(retailers, {
      fields: [brandRetailers.retailerId],
      references: [retailers.id],
    }),
  })
);

export const forecastsRelations = relations(forecasts, ({ one }) => ({
  sku: one(skus, {
    fields: [forecasts.skuId],
    references: [skus.id],
  }),
  retailer: one(retailers, {
    fields: [forecasts.retailerId],
    references: [retailers.id],
  }),
  createdByUser: one(users, {
    fields: [forecasts.createdBy],
    references: [users.id],
  }),
}));

export const retailSalesRelations = relations(retailSales, ({ one }) => ({
  sku: one(skus, {
    fields: [retailSales.skuId],
    references: [skus.id],
  }),
  retailer: one(retailers, {
    fields: [retailSales.retailerId],
    references: [retailers.id],
  }),
  createdByUser: one(users, {
    fields: [retailSales.createdBy],
    references: [users.id],
  }),
}));

export const purchaseOrdersRelations = relations(
  purchaseOrders,
  ({ one, many }) => ({
    brand: one(brands, {
      fields: [purchaseOrders.brandId],
      references: [brands.id],
    }),
    lineItems: many(poLineItems),
    payments: many(payments),
    createdByUser: one(users, {
      fields: [purchaseOrders.createdBy],
      references: [users.id],
    }),
  })
);

export const poLineItemsRelations = relations(poLineItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [poLineItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  sku: one(skus, {
    fields: [poLineItems.skuId],
    references: [skus.id],
  }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  sku: one(skus, {
    fields: [inventory.skuId],
    references: [skus.id],
  }),
  updatedByUser: one(users, {
    fields: [inventory.updatedBy],
    references: [users.id],
  }),
}));

export const retailOrdersRelations = relations(
  retailOrders,
  ({ one, many }) => ({
    retailer: one(retailers, {
      fields: [retailOrders.retailerId],
      references: [retailers.id],
    }),
    brand: one(brands, {
      fields: [retailOrders.brandId],
      references: [brands.id],
    }),
    lineItems: many(retailOrderLineItems),
    payments: many(payments),
    createdByUser: one(users, {
      fields: [retailOrders.createdBy],
      references: [users.id],
    }),
  })
);

export const retailOrderLineItemsRelations = relations(
  retailOrderLineItems,
  ({ one }) => ({
    retailOrder: one(retailOrders, {
      fields: [retailOrderLineItems.retailOrderId],
      references: [retailOrders.id],
    }),
    sku: one(skus, {
      fields: [retailOrderLineItems.skuId],
      references: [skus.id],
    }),
  })
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [payments.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  retailOrder: one(retailOrders, {
    fields: [payments.retailOrderId],
    references: [retailOrders.id],
  }),
  createdByUser: one(users, {
    fields: [payments.createdBy],
    references: [users.id],
  }),
}));
