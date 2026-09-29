CREATE TABLE "candidate_media" (
	"candidate_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "candidate_media_candidate_id_media_id_pk" PRIMARY KEY("candidate_id","media_id")
);
--> statement-breakpoint
ALTER TABLE "candidate_media" ADD CONSTRAINT "candidate_media_candidate_id_candidate_campaigns_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_media" ADD CONSTRAINT "candidate_media_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidate_media_candidate_order_idx" ON "candidate_media" USING btree ("candidate_id","sort_order");