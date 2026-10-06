CREATE TABLE crm_rate_limits (id TEXT PRIMARY KEY, window_start INTEGER NOT NULL, hits INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE crm_events (id INTEGER PRIMARY KEY AUTOINCREMENT,lead_id TEXT NOT NULL,kind TEXT NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
--> statement-breakpoint
CREATE INDEX crm_events_lead ON crm_events(lead_id,id);
--> statement-breakpoint
CREATE TRIGGER crm_lead_created AFTER INSERT ON crm_leads BEGIN INSERT INTO crm_events(lead_id,kind,snapshot) VALUES(NEW.id,'created',json_object('product',NEW.product,'size',NEW.size,'quantity',NEW.quantity,'finish',NEW.finish,'drawing',NEW.drawing,'drawing_spec',NEW.drawing_spec,'stage',NEW.stage,'amount',NEW.amount,'version',NEW.version)); END;
--> statement-breakpoint
CREATE TRIGGER crm_lead_updated AFTER UPDATE ON crm_leads BEGIN INSERT INTO crm_events(lead_id,kind,snapshot) VALUES(NEW.id,'updated',json_object('product',NEW.product,'size',NEW.size,'quantity',NEW.quantity,'finish',NEW.finish,'drawing',NEW.drawing,'drawing_spec',NEW.drawing_spec,'stage',NEW.stage,'amount',NEW.amount,'version',NEW.version)); END;
--> statement-breakpoint
CREATE TABLE crm_drawing_approvals (lead_id TEXT PRIMARY KEY REFERENCES crm_leads(id), fingerprint TEXT NOT NULL,approved_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE crm_ai_events (id TEXT PRIMARY KEY,kind TEXT NOT NULL,status TEXT NOT NULL,duration_ms INTEGER NOT NULL,created_at TEXT NOT NULL);
