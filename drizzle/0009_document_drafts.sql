CREATE TABLE IF NOT EXISTS crm_document_drafts (
  lead_id TEXT PRIMARY KEY REFERENCES crm_leads(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
