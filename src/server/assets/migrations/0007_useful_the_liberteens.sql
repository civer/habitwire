ALTER TABLE "checkins" ALTER COLUMN "value" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "habits" ALTER COLUMN "target_value" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "habits" ALTER COLUMN "default_increment" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "prompt_for_notes" boolean DEFAULT false;