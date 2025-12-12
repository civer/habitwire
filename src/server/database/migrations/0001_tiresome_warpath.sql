CREATE TABLE "config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
