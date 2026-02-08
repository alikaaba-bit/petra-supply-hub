CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255),
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" text NOT NULL,
	"action" varchar(20) NOT NULL,
	"user_id" text,
	"changed_data" text,
	"previous_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_retailers" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"retailer_id" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brand_retailer_unique" UNIQUE("brand_id","retailer_id")
);
--> statement-breakpoint
CREATE TABLE "brand_scorecards" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"month" date NOT NULL,
	"revenue_target" numeric(12, 2) NOT NULL,
	"units_target" integer,
	"channel" varchar(50) DEFAULT 'all' NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brand_month_channel_unique" UNIQUE("brand_id","month","channel")
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"lead_time_days" integer DEFAULT 30 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "forecasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku_id" integer NOT NULL,
	"retailer_id" integer NOT NULL,
	"month" date NOT NULL,
	"forecasted_units" integer DEFAULT 0 NOT NULL,
	"ordered_units" integer DEFAULT 0,
	"source" varchar(50) DEFAULT 'manual',
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sku_retailer_month_unique" UNIQUE("sku_id","retailer_id","month")
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku_id" integer NOT NULL,
	"quantity_on_hand" integer DEFAULT 0 NOT NULL,
	"quantity_allocated" integer DEFAULT 0,
	"quantity_in_transit" integer DEFAULT 0,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"source" varchar(50) DEFAULT 'manual',
	"notes" text,
	"updated_by" text,
	CONSTRAINT "inventory_sku_id_unique" UNIQUE("sku_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_order_id" integer,
	"retail_order_id" integer,
	"type" varchar(50) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD',
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"due_date" date,
	"paid_date" date,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "po_line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_order_id" integer NOT NULL,
	"sku_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_cost" numeric(10, 2),
	"total_cost" numeric(12, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"po_number" varchar(100) NOT NULL,
	"brand_id" integer NOT NULL,
	"supplier" varchar(255),
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"order_date" date,
	"expected_arrival" date,
	"actual_arrival" date,
	"total_amount" numeric(12, 2),
	"currency" varchar(10) DEFAULT 'USD',
	"deposit_amount" numeric(12, 2),
	"deposit_paid" boolean DEFAULT false,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_orders_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
CREATE TABLE "retail_order_line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"retail_order_id" integer NOT NULL,
	"sku_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2),
	"total_price" numeric(12, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retail_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"retailer_id" integer NOT NULL,
	"retailer_po_number" varchar(100),
	"brand_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'received' NOT NULL,
	"order_date" date,
	"ship_by_date" date,
	"total_amount" numeric(12, 2),
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retail_sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku_id" integer NOT NULL,
	"retailer_id" integer NOT NULL,
	"month" date NOT NULL,
	"units_sold" integer DEFAULT 0 NOT NULL,
	"revenue" numeric(12, 2),
	"source" varchar(50) DEFAULT 'manual',
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "retail_sales_sku_retailer_month_unique" UNIQUE("sku_id","retailer_id","month")
);
--> statement-breakpoint
CREATE TABLE "retailers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"parent_group" varchar(255),
	"channel" varchar(100),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "retailers_name_unique" UNIQUE("name"),
	CONSTRAINT "retailers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sellercloud_id_map" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"sellercloud_id" varchar(100) NOT NULL,
	"local_table_name" varchar(100) NOT NULL,
	"local_id" integer NOT NULL,
	"raw_data" text,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sc_id_map_entity_sc_id_unique" UNIQUE("entity_type","sellercloud_id")
);
--> statement-breakpoint
CREATE TABLE "sellercloud_sync_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"sync_started_at" timestamp DEFAULT now() NOT NULL,
	"sync_completed_at" timestamp,
	"status" varchar(20) DEFAULT 'running' NOT NULL,
	"records_processed" integer DEFAULT 0,
	"records_created" integer DEFAULT 0,
	"records_updated" integer DEFAULT 0,
	"error_message" text,
	"triggered_by" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skus" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"sku" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"unit_cost" numeric(10, 2),
	"unit_price" numeric(10, 2),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skus_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"password_hash" text NOT NULL,
	"role" varchar(50) DEFAULT 'viewer' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_retailers" ADD CONSTRAINT "brand_retailers_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_retailers" ADD CONSTRAINT "brand_retailers_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_scorecards" ADD CONSTRAINT "brand_scorecards_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_scorecards" ADD CONSTRAINT "brand_scorecards_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_retail_order_id_retail_orders_id_fk" FOREIGN KEY ("retail_order_id") REFERENCES "public"."retail_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_line_items" ADD CONSTRAINT "po_line_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_line_items" ADD CONSTRAINT "po_line_items_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_order_line_items" ADD CONSTRAINT "retail_order_line_items_retail_order_id_retail_orders_id_fk" FOREIGN KEY ("retail_order_id") REFERENCES "public"."retail_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_order_line_items" ADD CONSTRAINT "retail_order_line_items_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_orders" ADD CONSTRAINT "retail_orders_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_orders" ADD CONSTRAINT "retail_orders_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_orders" ADD CONSTRAINT "retail_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_sales" ADD CONSTRAINT "retail_sales_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_sales" ADD CONSTRAINT "retail_sales_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_sales" ADD CONSTRAINT "retail_sales_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sellercloud_sync_log" ADD CONSTRAINT "sellercloud_sync_log_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skus" ADD CONSTRAINT "skus_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_table_record_idx" ON "audit_log" USING btree ("table_name","record_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "brand_retailers_brand_id_idx" ON "brand_retailers" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "brand_retailers_retailer_id_idx" ON "brand_retailers" USING btree ("retailer_id");--> statement-breakpoint
CREATE INDEX "brand_scorecards_brand_id_idx" ON "brand_scorecards" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "brand_scorecards_month_idx" ON "brand_scorecards" USING btree ("month");--> statement-breakpoint
CREATE INDEX "brands_name_idx" ON "brands" USING btree ("name");--> statement-breakpoint
CREATE INDEX "forecasts_sku_id_idx" ON "forecasts" USING btree ("sku_id");--> statement-breakpoint
CREATE INDEX "forecasts_retailer_id_idx" ON "forecasts" USING btree ("retailer_id");--> statement-breakpoint
CREATE INDEX "forecasts_month_idx" ON "forecasts" USING btree ("month");--> statement-breakpoint
CREATE INDEX "inventory_sku_id_idx" ON "inventory" USING btree ("sku_id");--> statement-breakpoint
CREATE INDEX "payments_purchase_order_id_idx" ON "payments" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "payments_retail_order_id_idx" ON "payments" USING btree ("retail_order_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "po_line_items_purchase_order_id_idx" ON "po_line_items" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "po_line_items_sku_id_idx" ON "po_line_items" USING btree ("sku_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_brand_id_idx" ON "purchase_orders" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "purchase_orders_po_number_idx" ON "purchase_orders" USING btree ("po_number");--> statement-breakpoint
CREATE INDEX "retail_order_line_items_retail_order_id_idx" ON "retail_order_line_items" USING btree ("retail_order_id");--> statement-breakpoint
CREATE INDEX "retail_order_line_items_sku_id_idx" ON "retail_order_line_items" USING btree ("sku_id");--> statement-breakpoint
CREATE INDEX "retail_orders_retailer_id_idx" ON "retail_orders" USING btree ("retailer_id");--> statement-breakpoint
CREATE INDEX "retail_orders_brand_id_idx" ON "retail_orders" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "retail_orders_status_idx" ON "retail_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "retail_sales_sku_id_idx" ON "retail_sales" USING btree ("sku_id");--> statement-breakpoint
CREATE INDEX "retail_sales_retailer_id_idx" ON "retail_sales" USING btree ("retailer_id");--> statement-breakpoint
CREATE INDEX "retail_sales_month_idx" ON "retail_sales" USING btree ("month");--> statement-breakpoint
CREATE INDEX "retailers_name_idx" ON "retailers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "retailers_code_idx" ON "retailers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "sc_id_map_local_table_id_idx" ON "sellercloud_id_map" USING btree ("local_table_name","local_id");--> statement-breakpoint
CREATE INDEX "sc_sync_log_entity_started_idx" ON "sellercloud_sync_log" USING btree ("entity_type","sync_started_at");--> statement-breakpoint
CREATE INDEX "skus_brand_id_idx" ON "skus" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "skus_sku_idx" ON "skus" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");