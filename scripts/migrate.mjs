import { createClient } from '@libsql/client';
import { readFileSync, readdirSync } from 'node:fs';
try {
  process.loadEnvFile('.env.local');
} catch {}
const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
if (!url) throw Error('Database URL is required');
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
await client.execute(
  'CREATE TABLE IF NOT EXISTS facade_migrations (name TEXT PRIMARY KEY,applied_at TEXT NOT NULL)',
);
for (const name of readdirSync('drizzle')
  .filter((n) => n.endsWith('.sql'))
  .sort()) {
  const existing = await client.execute({
    sql: 'SELECT name FROM facade_migrations WHERE name=?',
    args: [name],
  });
  if (existing.rows.length) continue;
  const sql = readFileSync('drizzle/' + name, 'utf8');
  const statements = sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
  await client.batch(
    [
      ...statements,
      {
        sql: 'INSERT INTO facade_migrations (name,applied_at) VALUES (?,?)',
        args: [name, new Date().toISOString()],
      },
    ],
    'write',
  );
  console.log('Applied migration:', name);
}
const existingLeads = await client.execute(
  "SELECT id,name,phone,product,city FROM crm_leads WHERE search_text=''",
);
for (const lead of existingLeads.rows) {
  const text = (value) =>
    typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const search = [
    lead.name,
    lead.phone,
    lead.product,
    lead.city,
    text(lead.phone).replace(/\D/g, ''),
  ]
    .map(text)
    .join(' ')
    .normalize('NFC')
    .toLowerCase();
  await client.execute({
    sql: 'UPDATE crm_leads SET search_text=? WHERE id=?',
    args: [search, lead.id],
  });
}
client.close();
