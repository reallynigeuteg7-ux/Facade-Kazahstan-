ALTER TABLE crm_leads ADD COLUMN order_group TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
UPDATE crm_leads SET order_group=request_id WHERE order_group='';
--> statement-breakpoint
CREATE INDEX crm_order_group ON crm_leads(order_group);
