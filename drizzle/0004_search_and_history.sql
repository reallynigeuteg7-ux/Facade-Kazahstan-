ALTER TABLE crm_leads ADD COLUMN search_text TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
DROP TRIGGER crm_lead_updated;
--> statement-breakpoint
CREATE TRIGGER crm_lead_updated AFTER UPDATE OF name,phone,product,size,quantity,finish,drawing,city,deadline,stage,amount,next_action,due_date,drawing_spec ON crm_leads BEGIN INSERT INTO crm_events(lead_id,kind,snapshot) VALUES(NEW.id,'updated',json_object('product',NEW.product,'size',NEW.size,'quantity',NEW.quantity,'finish',NEW.finish,'drawing',NEW.drawing,'drawing_spec',NEW.drawing_spec,'stage',NEW.stage,'amount',NEW.amount,'version',NEW.version)); END;
--> statement-breakpoint
INSERT INTO crm_events(lead_id,kind,snapshot) SELECT id,'baseline',json_object('product',product,'size',size,'quantity',quantity,'finish',finish,'drawing',drawing,'drawing_spec',drawing_spec,'stage',stage,'amount',amount,'version',version) FROM crm_leads WHERE NOT EXISTS(SELECT 1 FROM crm_events WHERE lead_id=crm_leads.id);
