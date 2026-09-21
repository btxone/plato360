import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "mozo"]);
export const userStatus = pgEnum("user_status", ["active", "suspended"]);
export const authSubjectType = pgEnum("auth_subject_type", ["user", "superadmin"]);
export const contentStatus = pgEnum("content_status", ["draft", "scheduled", "published", "retired"]);
export const mediaKind = pgEnum("media_kind", ["image", "video"]);
export const mediaStorageState = pgEnum("media_storage_state", ["temporary", "final"]);
export const menuSurface = pgEnum("menu_surface", ["visual", "traditional"]);
export const qrKind = pgEnum("qr_kind", ["fixed", "dynamic"]);
export const qrStatus = pgEnum("qr_status", ["active", "revoked"]);
export const orderStatus = pgEnum("order_status", ["pending", "confirmed", "cancelled"]);
export const orderHistoryAction = pgEnum("order_history_action", ["created", "updated", "confirmed", "cancelled"]);
export const pushDeliveryStatus = pgEnum("push_delivery_status", ["pending", "sent", "failed"]);

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    tagline: varchar("tagline", { length: 240 }),
    address: varchar("address", { length: 240 }),
    phone: varchar("phone", { length: 40 }),
    timezone: varchar("timezone", { length: 64 }).notNull().default("America/Montevideo"),
    logoUrl: text("logo_url"),
    openingHours: jsonb("opening_hours").$type<Record<string, unknown>>(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("locations_slug_unique").on(table.slug),
    check("locations_slug_not_empty", sql`length(trim(${table.slug})) > 0`),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
    username: varchar("username", { length: 120 }).notNull(),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    role: userRole("role").notNull(),
    status: userStatus("status").notNull().default("active"),
    passwordHash: text("password_hash").notNull(),
    forcePasswordChange: boolean("force_password_change").notNull().default(true),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("users_location_username_unique").on(table.locationId, table.username),
    index("users_location_role_idx").on(table.locationId, table.role),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenDigest: text("token_digest").notNull(),
    subjectType: authSubjectType("subject_type").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    principalLabel: varchar("principal_label", { length: 160 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("auth_sessions_token_digest_unique").on(table.tokenDigest),
    index("auth_sessions_subject_idx").on(table.userId, table.subjectType),
    index("auth_sessions_expiry_idx").on(table.expiresAt),
    check("auth_sessions_subject_consistency", sql`(${table.subjectType} = 'user' AND ${table.userId} IS NOT NULL) OR (${table.subjectType} = 'superadmin' AND ${table.userId} IS NULL)`),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorPrincipal: varchar("actor_principal", { length: 160 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_location_created_idx").on(table.locationId, table.createdAt),
    index("audit_logs_actor_created_idx").on(table.actorUserId, table.createdAt),
  ],
);

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    featureKey: varchar("feature_key", { length: 80 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    ...timestamps(),
  },
  (table) => [uniqueIndex("feature_flags_location_key_unique").on(table.locationId, table.featureKey)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("categories_location_slug_unique").on(table.locationId, table.slug),
    index("categories_location_order_idx").on(table.locationId, table.sortOrder),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    description: text("description").notNull().default(""),
    priceCents: integer("price_cents").notNull(),
    status: contentStatus("status").notNull().default("draft"),
    isAvailable: boolean("is_available").notNull().default(true),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("products_location_slug_unique").on(table.locationId, table.slug),
    index("products_location_status_idx").on(table.locationId, table.status, table.isAvailable),
    check("products_price_non_negative", sql`${table.priceCents} >= 0`),
  ],
);

export const ingredients = pgTable(
  "ingredients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    allergens: jsonb("allergens").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    ...timestamps(),
  },
  (table) => [uniqueIndex("ingredients_location_name_unique").on(table.locationId, table.name)],
);

export const productIngredients = pgTable(
  "product_ingredients",
  {
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.productId, table.ingredientId] })],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    kind: mediaKind("kind").notNull(),
    storageState: mediaStorageState("storage_state").notNull().default("temporary"),
    storageKey: text("storage_key").notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    durationMs: integer("duration_ms"),
    checksum: varchar("checksum", { length: 128 }),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("media_assets_storage_key_unique").on(table.storageKey),
    index("media_assets_location_kind_idx").on(table.locationId, table.kind, table.storageState),
    check("media_assets_size_positive", sql`${table.sizeBytes} > 0`),
  ],
);

export const productMedia = pgTable(
  "product_media",
  {
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id").notNull().references(() => mediaAssets.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.mediaId] }),
    index("product_media_product_order_idx").on(table.productId, table.sortOrder),
  ],
);

export const menuEntries = pgTable(
  "menu_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
    surface: menuSurface("surface").notNull(),
    status: contentStatus("status").notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("menu_entries_location_product_surface_unique").on(table.locationId, table.productId, table.surface),
    index("menu_entries_publication_idx").on(table.locationId, table.surface, table.status, table.sortOrder),
  ],
);

export const candidateCampaigns = pgTable(
  "candidate_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    description: text("description").notNull().default(""),
    status: contentStatus("status").notNull().default("draft"),
    finalPriceCents: integer("final_price_cents"),
    promotedProductId: uuid("promoted_product_id").references(() => products.id, { onDelete: "set null" }),
    promotedAt: timestamp("promoted_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("candidate_campaigns_location_slug_unique").on(table.locationId, table.slug),
    index("candidate_campaigns_publication_idx").on(table.locationId, table.status, table.publishedAt),
    check("candidate_campaigns_price_non_negative", sql`${table.finalPriceCents} IS NULL OR ${table.finalPriceCents} >= 0`),
  ],
);

export const publicationSchedules = pgTable(
  "publication_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id").references(() => candidateCampaigns.id, { onDelete: "cascade" }),
    publishAt: timestamp("publish_at", { withTimezone: true }).notNull(),
    retireAt: timestamp("retire_at", { withTimezone: true }),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    index("publication_schedules_pending_idx").on(table.locationId, table.publishAt, table.executedAt),
    check("publication_schedules_one_target", sql`(${table.productId} IS NOT NULL) <> (${table.candidateId} IS NOT NULL)`),
    check("publication_schedules_ordered_dates", sql`${table.retireAt} IS NULL OR ${table.retireAt} > ${table.publishAt}`),
  ],
);

export const qrCodes = pgTable(
  "qr_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    kind: qrKind("kind").notNull(),
    status: qrStatus("status").notNull().default("active"),
    tableLabel: varchar("table_label", { length: 80 }).notNull(),
    publicId: varchar("public_id", { length: 120 }).notNull(),
    tokenDigest: text("token_digest").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("qr_codes_public_id_unique").on(table.publicId),
    uniqueIndex("qr_codes_token_digest_unique").on(table.tokenDigest),
    index("qr_codes_location_table_idx").on(table.locationId, table.tableLabel, table.kind),
    check("qr_codes_expiry_by_kind", sql`(${table.kind} = 'fixed' AND ${table.expiresAt} IS NULL) OR (${table.kind} = 'dynamic' AND ${table.expiresAt} IS NOT NULL)`),
  ],
);

export const dinerSessions = pgTable(
  "diner_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    qrCodeId: uuid("qr_code_id").notNull().references(() => qrCodes.id, { onDelete: "restrict" }),
    anonymousId: uuid("anonymous_id").defaultRandom().notNull(),
    tokenDigest: text("token_digest").notNull(),
    tableLabel: varchar("table_label", { length: 80 }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("diner_sessions_token_digest_unique").on(table.tokenDigest),
    index("diner_sessions_location_table_idx").on(table.locationId, table.tableLabel, table.createdAt),
  ],
);

export const candidateVotes = pgTable(
  "candidate_votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    candidateId: uuid("candidate_id").notNull().references(() => candidateCampaigns.id, { onDelete: "cascade" }),
    dinerSessionId: uuid("diner_session_id").notNull().references(() => dinerSessions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("candidate_votes_candidate_session_unique").on(table.candidateId, table.dinerSessionId),
    index("candidate_votes_candidate_idx").on(table.candidateId, table.createdAt),
  ],
);

export const candidateInterests = pgTable(
  "candidate_interests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    candidateId: uuid("candidate_id").notNull().references(() => candidateCampaigns.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 320 }).notNull(),
    emailNormalized: varchar("email_normalized", { length: 320 }).notNull(),
    acceptedNotification: boolean("accepted_notification").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("candidate_interests_candidate_email_unique").on(table.candidateId, table.emailNormalized),
    index("candidate_interests_candidate_created_idx").on(table.candidateId, table.createdAt),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
    qrCodeId: uuid("qr_code_id").references(() => qrCodes.id, { onDelete: "set null" }),
    dinerSessionId: uuid("diner_session_id").notNull().references(() => dinerSessions.id, { onDelete: "restrict" }),
    tableLabel: varchar("table_label", { length: 80 }).notNull(),
    status: orderStatus("status").notNull().default("pending"),
    totalCents: integer("total_cents").notNull().default(0),
    notes: text("notes").notNull().default(""),
    version: integer("version").notNull().default(1),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    index("orders_location_status_created_idx").on(table.locationId, table.status, table.createdAt),
    index("orders_location_table_status_idx").on(table.locationId, table.tableLabel, table.status),
    check("orders_total_non_negative", sql`${table.totalCents} >= 0`),
    check("orders_version_positive", sql`${table.version} > 0`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    nameSnapshot: varchar("name_snapshot", { length: 180 }).notNull(),
    priceCentsSnapshot: integer("price_cents_snapshot").notNull(),
    quantity: integer("quantity").notNull(),
    notes: text("notes").notNull().default(""),
    lineTotalCents: integer("line_total_cents").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("order_items_order_idx").on(table.orderId),
    check("order_items_price_non_negative", sql`${table.priceCentsSnapshot} >= 0`),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
    check("order_items_line_total_non_negative", sql`${table.lineTotalCents} >= 0`),
  ],
);

export const orderHistory = pgTable(
  "order_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    action: orderHistoryAction("action").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorPrincipal: varchar("actor_principal", { length: 160 }).notNull(),
    previousStatus: orderStatus("previous_status"),
    nextStatus: orderStatus("next_status").notNull(),
    previousPayload: jsonb("previous_payload").$type<Record<string, unknown> | null>(),
    nextPayload: jsonb("next_payload").$type<Record<string, unknown>>().notNull(),
    orderVersion: integer("order_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("order_history_order_created_idx").on(table.orderId, table.createdAt),
    check("order_history_version_positive", sql`${table.orderVersion} > 0`),
  ],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgentFamily: varchar("user_agent_family", { length: 80 }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("push_subscriptions_endpoint_unique").on(table.endpoint),
    index("push_subscriptions_user_idx").on(table.userId),
  ],
);

export const pushOutbox = pgTable(
  "push_outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: pushDeliveryStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).defaultNow().notNull(),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [index("push_outbox_pending_idx").on(table.status, table.nextAttemptAt)],
);

export const telemetryEvents = pgTable(
  "telemetry_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    anonymousId: uuid("anonymous_id").notNull(),
    dinerSessionId: uuid("diner_session_id").references(() => dinerSessions.id, { onDelete: "set null" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    candidateId: uuid("candidate_id").references(() => candidateCampaigns.id, { onDelete: "set null" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  },
  (table) => [
    uniqueIndex("telemetry_events_idempotency_unique").on(table.idempotencyKey),
    index("telemetry_events_location_occurred_idx").on(table.locationId, table.occurredAt),
    index("telemetry_events_product_occurred_idx").on(table.productId, table.occurredAt),
  ],
);

export const telemetryDailyAggregates = pgTable(
  "telemetry_daily_aggregates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    day: timestamp("day", { withTimezone: true }).notNull(),
    impressions: integer("impressions").notNull().default(0),
    detailOpens: integer("detail_opens").notNull().default(0),
    adds: integer("adds").notNull().default(0),
    orders: integer("orders").notNull().default(0),
    confirmations: integer("confirmations").notNull().default(0),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("telemetry_daily_location_product_day_unique").on(table.locationId, table.productId, table.day),
    index("telemetry_daily_location_day_idx").on(table.locationId, table.day),
  ],
);
