ALTER TABLE "candidate_campaigns" ADD COLUMN "emoji" varchar(16) DEFAULT '✨' NOT NULL;--> statement-breakpoint
ALTER TABLE "candidate_campaigns" ADD COLUMN "accent" varchar(16) DEFAULT '#8b5e45' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "emoji" varchar(16) DEFAULT '🍽️' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "accent" varchar(16) DEFAULT '#8b5e45' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;