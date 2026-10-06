CREATE TABLE crm_email_notifications (
 lead_id TEXT PRIMARY KEY REFERENCES crm_leads(id),
 state TEXT NOT NULL DEFAULT 'pending',
 attempts INTEGER NOT NULL DEFAULT 0,
 retry_at INTEGER NOT NULL DEFAULT 0,
 sent_at TEXT,
 last_error TEXT NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE TRIGGER crm_email_new_lead AFTER INSERT ON crm_leads
BEGIN
 INSERT INTO crm_email_notifications(lead_id) VALUES(NEW.id);
END;
