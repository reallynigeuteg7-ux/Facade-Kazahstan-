CREATE TABLE crm_materials (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 unit TEXT NOT NULL CHECK(unit IN ('кг','м²','м','лист','шт','л')),
 balance INTEGER NOT NULL DEFAULT 0 CHECK(balance >= 0 AND balance <= 1000000000000),
 minimum INTEGER NOT NULL DEFAULT 0 CHECK(minimum >= 0 AND minimum <= 1000000000000),
 created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE crm_stock_movements (
 id TEXT PRIMARY KEY,
 material_id TEXT NOT NULL REFERENCES crm_materials(id),
 kind TEXT NOT NULL CHECK(kind IN ('opening','receive','consume','return','adjustment')),
 delta INTEGER NOT NULL,
 balance_after INTEGER NOT NULL CHECK(balance_after >= 0),
 note TEXT NOT NULL,
 lead_id TEXT REFERENCES crm_leads(id),
 payload TEXT NOT NULL,
 created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX crm_stock_material_date ON crm_stock_movements(material_id,created_at);
--> statement-breakpoint
CREATE INDEX crm_stock_lead ON crm_stock_movements(lead_id);
