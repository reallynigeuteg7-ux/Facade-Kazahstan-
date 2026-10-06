CREATE TABLE `crm_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`product` text NOT NULL,
	`size` text DEFAULT '' NOT NULL,
	`quantity` text DEFAULT '' NOT NULL,
	`finish` text DEFAULT '' NOT NULL,
	`drawing` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`deadline` text DEFAULT '' NOT NULL,
	`stage` text DEFAULT 'new' NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`next_action` text DEFAULT '' NOT NULL,
	`due_date` text DEFAULT '' NOT NULL,
	`source` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm_leads_request_id_unique` ON `crm_leads` (`request_id`);--> statement-breakpoint
CREATE INDEX `crm_leads_created_at` ON `crm_leads` (`created_at`);--> statement-breakpoint
CREATE INDEX `crm_leads_stage` ON `crm_leads` (`stage`);--> statement-breakpoint
CREATE TABLE `crm_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `crm_leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `crm_notes_lead_id` ON `crm_notes` (`lead_id`);