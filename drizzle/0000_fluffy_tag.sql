CREATE TYPE "public"."auth_subject_type" AS ENUM('user', 'superadmin');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'scheduled', 'published', 'retired');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TYPE "public"."media_storage_state" AS ENUM('temporary', 'final');--> statement-breakpoint
CREATE TYPE "public"."menu_surface" AS ENUM('visual', 'traditional');--> statement-breakpoint
CREATE TYPE "public"."order_history_action" AS ENUM('created', 'updated', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."push_delivery_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."qr_kind" AS ENUM('fixed', 'dynamic');--> statement-breakpoint
CREATE TYPE "public"."qr_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'mozo');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid,
	"actor_user_id" uuid,
	"actor_principal" varchar(160) NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100),
	"entity_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_digest" text NOT NULL,
	"subject_type" "auth_subject_type" NOT NULL,
	"user_id" uuid,
	"principal_label" varchar(160) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_subject_consistency" CHECK (("auth_sessions"."subject_type" = 'user' AND "auth_sessions"."user_id" IS NOT NULL) OR ("auth_sessions"."subject_type" = 'superadmin' AND "auth_sessions"."user_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "candidate_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"category_id" uuid,
	"slug" varchar(120) NOT NULL,
	"name" varchar(180) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"final_price_cents" integer,
	"promoted_product_id" uuid,
	"promoted_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_campaigns_price_non_negative" CHECK ("candidate_campaigns"."final_price_cents" IS NULL OR "candidate_campaigns"."final_price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "candidate_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"email_normalized" varchar(320) NOT NULL,
	"accepted_notification" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"diner_session_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(120) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diner_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"qr_code_id" uuid NOT NULL,
	"anonymous_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"token_digest" text NOT NULL,
	"table_label" varchar(80) NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"feature_key" varchar(80) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"allergens" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(160) NOT NULL,
	"tagline" varchar(240),
	"address" varchar(240),
	"phone" varchar(40),
	"timezone" varchar(64) DEFAULT 'America/Montevideo' NOT NULL,
	"logo_url" text,
	"opening_hours" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_slug_not_empty" CHECK (length(trim("locations"."slug")) > 0)
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"kind" "media_kind" NOT NULL,
	"storage_state" "media_storage_state" DEFAULT 'temporary' NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"duration_ms" integer,
	"checksum" varchar(128),
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_size_positive" CHECK ("media_assets"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "menu_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"surface" "menu_surface" NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"action" "order_history_action" NOT NULL,
	"actor_user_id" uuid,
	"actor_principal" varchar(160) NOT NULL,
	"previous_status" "order_status",
	"next_status" "order_status" NOT NULL,
	"previous_payload" jsonb,
	"next_payload" jsonb NOT NULL,
	"order_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_history_version_positive" CHECK ("order_history"."order_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"name_snapshot" varchar(180) NOT NULL,
	"price_cents_snapshot" integer NOT NULL,
	"quantity" integer NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"line_total_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_price_non_negative" CHECK ("order_items"."price_cents_snapshot" >= 0),
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_line_total_non_negative" CHECK ("order_items"."line_total_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"qr_code_id" uuid,
	"diner_session_id" uuid NOT NULL,
	"table_label" varchar(80) NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_total_non_negative" CHECK ("orders"."total_cents" >= 0),
	CONSTRAINT "orders_version_positive" CHECK ("orders"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "product_ingredients" (
	"product_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_ingredients_product_id_ingredient_id_pk" PRIMARY KEY("product_id","ingredient_id")
);
--> statement-breakpoint
CREATE TABLE "product_media" (
	"product_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "product_media_product_id_media_id_pk" PRIMARY KEY("product_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(180) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_cents" integer NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"published_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_non_negative" CHECK ("products"."price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "publication_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"product_id" uuid,
	"candidate_id" uuid,
	"publish_at" timestamp with time zone NOT NULL,
	"retire_at" timestamp with time zone,
	"executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publication_schedules_one_target" CHECK (("publication_schedules"."product_id" IS NOT NULL) <> ("publication_schedules"."candidate_id" IS NOT NULL)),
	CONSTRAINT "publication_schedules_ordered_dates" CHECK ("publication_schedules"."retire_at" IS NULL OR "publication_schedules"."retire_at" > "publication_schedules"."publish_at")
);
--> statement-breakpoint
CREATE TABLE "push_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "push_delivery_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent_family" varchar(80),
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qr_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"kind" "qr_kind" NOT NULL,
	"status" "qr_status" DEFAULT 'active' NOT NULL,
	"table_label" varchar(80) NOT NULL,
	"public_id" varchar(120) NOT NULL,
	"token_digest" text NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qr_codes_expiry_by_kind" CHECK (("qr_codes"."kind" = 'fixed' AND "qr_codes"."expires_at" IS NULL) OR ("qr_codes"."kind" = 'dynamic' AND "qr_codes"."expires_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "telemetry_daily_aggregates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"product_id" uuid,
	"day" timestamp with time zone NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"detail_opens" integer DEFAULT 0 NOT NULL,
	"adds" integer DEFAULT 0 NOT NULL,
	"orders" integer DEFAULT 0 NOT NULL,
	"confirmations" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"anonymous_id" uuid NOT NULL,
	"diner_session_id" uuid,
	"product_id" uuid,
	"candidate_id" uuid,
	"order_id" uuid,
	"event_type" varchar(100) NOT NULL,
	"idempotency_key" varchar(160) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"username" varchar(120) NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"role" "user_role" NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"password_hash" text NOT NULL,
	"force_password_change" boolean DEFAULT true NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_campaigns" ADD CONSTRAINT "candidate_campaigns_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_campaigns" ADD CONSTRAINT "candidate_campaigns_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_campaigns" ADD CONSTRAINT "candidate_campaigns_promoted_product_id_products_id_fk" FOREIGN KEY ("promoted_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_interests" ADD CONSTRAINT "candidate_interests_candidate_id_candidate_campaigns_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_votes" ADD CONSTRAINT "candidate_votes_candidate_id_candidate_campaigns_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_votes" ADD CONSTRAINT "candidate_votes_diner_session_id_diner_sessions_id_fk" FOREIGN KEY ("diner_session_id") REFERENCES "public"."diner_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diner_sessions" ADD CONSTRAINT "diner_sessions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diner_sessions" ADD CONSTRAINT "diner_sessions_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "public"."qr_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_entries" ADD CONSTRAINT "menu_entries_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_entries" ADD CONSTRAINT "menu_entries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_entries" ADD CONSTRAINT "menu_entries_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_history" ADD CONSTRAINT "order_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_history" ADD CONSTRAINT "order_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "public"."qr_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_diner_session_id_diner_sessions_id_fk" FOREIGN KEY ("diner_session_id") REFERENCES "public"."diner_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_schedules" ADD CONSTRAINT "publication_schedules_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_schedules" ADD CONSTRAINT "publication_schedules_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_schedules" ADD CONSTRAINT "publication_schedules_candidate_id_candidate_campaigns_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_outbox" ADD CONSTRAINT "push_outbox_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_daily_aggregates" ADD CONSTRAINT "telemetry_daily_aggregates_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_daily_aggregates" ADD CONSTRAINT "telemetry_daily_aggregates_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_diner_session_id_diner_sessions_id_fk" FOREIGN KEY ("diner_session_id") REFERENCES "public"."diner_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_candidate_id_candidate_campaigns_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_location_created_idx" ON "audit_logs" USING btree ("location_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_token_digest_unique" ON "auth_sessions" USING btree ("token_digest");--> statement-breakpoint
CREATE INDEX "auth_sessions_subject_idx" ON "auth_sessions" USING btree ("user_id","subject_type");--> statement-breakpoint
CREATE INDEX "auth_sessions_expiry_idx" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_campaigns_location_slug_unique" ON "candidate_campaigns" USING btree ("location_id","slug");--> statement-breakpoint
CREATE INDEX "candidate_campaigns_publication_idx" ON "candidate_campaigns" USING btree ("location_id","status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_interests_candidate_email_unique" ON "candidate_interests" USING btree ("candidate_id","email_normalized");--> statement-breakpoint
CREATE INDEX "candidate_interests_candidate_created_idx" ON "candidate_interests" USING btree ("candidate_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_votes_candidate_session_unique" ON "candidate_votes" USING btree ("candidate_id","diner_session_id");--> statement-breakpoint
CREATE INDEX "candidate_votes_candidate_idx" ON "candidate_votes" USING btree ("candidate_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_location_slug_unique" ON "categories" USING btree ("location_id","slug");--> statement-breakpoint
CREATE INDEX "categories_location_order_idx" ON "categories" USING btree ("location_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "diner_sessions_token_digest_unique" ON "diner_sessions" USING btree ("token_digest");--> statement-breakpoint
CREATE INDEX "diner_sessions_location_table_idx" ON "diner_sessions" USING btree ("location_id","table_label","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flags_location_key_unique" ON "feature_flags" USING btree ("location_id","feature_key");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_location_name_unique" ON "ingredients" USING btree ("location_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_slug_unique" ON "locations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_storage_key_unique" ON "media_assets" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "media_assets_location_kind_idx" ON "media_assets" USING btree ("location_id","kind","storage_state");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_entries_location_product_surface_unique" ON "menu_entries" USING btree ("location_id","product_id","surface");--> statement-breakpoint
CREATE INDEX "menu_entries_publication_idx" ON "menu_entries" USING btree ("location_id","surface","status","sort_order");--> statement-breakpoint
CREATE INDEX "order_history_order_created_idx" ON "order_history" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_location_status_created_idx" ON "orders" USING btree ("location_id","status","created_at");--> statement-breakpoint
CREATE INDEX "orders_location_table_status_idx" ON "orders" USING btree ("location_id","table_label","status");--> statement-breakpoint
CREATE INDEX "product_media_product_order_idx" ON "product_media" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "products_location_slug_unique" ON "products" USING btree ("location_id","slug");--> statement-breakpoint
CREATE INDEX "products_location_status_idx" ON "products" USING btree ("location_id","status","is_available");--> statement-breakpoint
CREATE INDEX "publication_schedules_pending_idx" ON "publication_schedules" USING btree ("location_id","publish_at","executed_at");--> statement-breakpoint
CREATE INDEX "push_outbox_pending_idx" ON "push_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_unique" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qr_codes_public_id_unique" ON "qr_codes" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qr_codes_token_digest_unique" ON "qr_codes" USING btree ("token_digest");--> statement-breakpoint
CREATE INDEX "qr_codes_location_table_idx" ON "qr_codes" USING btree ("location_id","table_label","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "telemetry_daily_location_product_day_unique" ON "telemetry_daily_aggregates" USING btree ("location_id","product_id","day");--> statement-breakpoint
CREATE INDEX "telemetry_daily_location_day_idx" ON "telemetry_daily_aggregates" USING btree ("location_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "telemetry_events_idempotency_unique" ON "telemetry_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "telemetry_events_location_occurred_idx" ON "telemetry_events" USING btree ("location_id","occurred_at");--> statement-breakpoint
CREATE INDEX "telemetry_events_product_occurred_idx" ON "telemetry_events" USING btree ("product_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_location_username_unique" ON "users" USING btree ("location_id","username");--> statement-breakpoint
CREATE INDEX "users_location_role_idx" ON "users" USING btree ("location_id","role");