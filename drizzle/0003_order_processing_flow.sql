ALTER TYPE "public"."order_status" ADD VALUE IF NOT EXISTS 'in_process';--> statement-breakpoint
ALTER TYPE "public"."order_history_action" ADD VALUE IF NOT EXISTS 'completed';
