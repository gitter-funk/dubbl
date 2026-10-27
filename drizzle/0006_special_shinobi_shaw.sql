ALTER TABLE "organization" ADD COLUMN "enabled_locales" text[] DEFAULT '{"en","fr","fr-CA"}' NOT NULL;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "preferred_locale" text;--> statement-breakpoint
ALTER TABLE "payroll_employee" ADD COLUMN "preferred_locale" text;