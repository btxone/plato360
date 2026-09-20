CREATE TABLE `candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`estimated_price` integer NOT NULL,
	`would_order_pct` integer NOT NULL,
	`seed_votes` integer DEFAULT 0 NOT NULL,
	`seed_notify_count` integer DEFAULT 0 NOT NULL,
	`avg_attention` text NOT NULL,
	`video_url` text,
	`poster_url` text,
	`emoji` text NOT NULL,
	`accent` text NOT NULL,
	`status` text NOT NULL,
	`ingredients_json` text DEFAULT '[]' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`label` text NOT NULL,
	`icon` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dishes` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`category_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`price` integer NOT NULL,
	`video_url` text,
	`image_url` text NOT NULL,
	`poster_url` text,
	`emoji` text NOT NULL,
	`accent` text NOT NULL,
	`ingredients_json` text DEFAULT '[]' NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`available` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`tagline` text NOT NULL,
	`location` text NOT NULL,
	`logo_url` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`candidate_id` text NOT NULL,
	`email` text NOT NULL,
	`consent_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_candidate_email_unique` ON `subscriptions` (`candidate_id`,`email`);--> statement-breakpoint
CREATE TABLE `video_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`provider` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`external_id` text,
	`request_payload_json` text DEFAULT '{}' NOT NULL,
	`result_video_url` text,
	`error_message` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`candidate_id` text NOT NULL,
	`voter_token` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `votes_candidate_voter_unique` ON `votes` (`candidate_id`,`voter_token`);