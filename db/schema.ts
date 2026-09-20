import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const restaurants = sqliteTable("restaurants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  tagline: text("tagline").notNull(),
  location: text("location").notNull(),
  logoUrl: text("logo_url").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  label: text("label").notNull(),
  icon: text("icon").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active").notNull().default(1),
});

export const dishes = sqliteTable("dishes", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  categoryId: text("category_id").notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  videoUrl: text("video_url"),
  imageUrl: text("image_url").notNull(),
  posterUrl: text("poster_url"),
  emoji: text("emoji").notNull(),
  accent: text("accent").notNull(),
  ingredientsJson: text("ingredients_json").notNull().default("[]"),
  tagsJson: text("tags_json").notNull().default("[]"),
  sortOrder: integer("sort_order").notNull().default(0),
  available: integer("available").notNull().default(1),
});

export const candidates = sqliteTable("candidates", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  estimatedPrice: integer("estimated_price").notNull(),
  wouldOrderPct: integer("would_order_pct").notNull(),
  seedVotes: integer("seed_votes").notNull().default(0),
  seedNotifyCount: integer("seed_notify_count").notNull().default(0),
  avgAttention: text("avg_attention").notNull(),
  videoUrl: text("video_url"),
  posterUrl: text("poster_url"),
  emoji: text("emoji").notNull(),
  accent: text("accent").notNull(),
  status: text("status").notNull(),
  ingredientsJson: text("ingredients_json").notNull().default("[]"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active").notNull().default(1),
});

export const votes = sqliteTable(
  "votes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    candidateId: text("candidate_id").notNull(),
    voterToken: text("voter_token").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    candidateVoterUnique: uniqueIndex("votes_candidate_voter_unique").on(table.candidateId, table.voterToken),
  }),
);

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    candidateId: text("candidate_id").notNull(),
    email: text("email").notNull(),
    consentAt: text("consent_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    candidateEmailUnique: uniqueIndex("subscriptions_candidate_email_unique").on(table.candidateId, table.email),
  }),
);

export const videoJobs = sqliteTable("video_jobs", {
  id: text("id").primaryKey(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull().default("pending"),
  externalId: text("external_id"),
  requestPayloadJson: text("request_payload_json").notNull().default("{}"),
  resultVideoUrl: text("result_video_url"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
