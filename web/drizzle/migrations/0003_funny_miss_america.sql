CREATE TYPE "public"."os_type" AS ENUM('ios', 'android', 'macos', 'windows', 'linux');--> statement-breakpoint
CREATE TABLE "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT false,
	"user_id" text NOT NULL,
	"os_type" "os_type",
	"last_seen_at" timestamp,
	"license_key" text NOT NULL,
	"device_token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;