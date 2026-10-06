import { readFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createClient } from '@libsql/client';
const [backup, destination] = process.argv.slice(2);
if (!backup || !destination)
  throw Error(
    'Usage: node scripts/restore-backup.mjs BACKUP.json D:/new-database.db',
  );
const target = resolve(destination);
if (!/^D:[\\/]/i.test(target) || existsSync(target))
  throw Error(
    'Destination must be a new database file on drive D. Existing databases are never overwritten.',
  );
const data = JSON.parse(readFileSync(backup, 'utf8'));
if (
  ![1, 2].includes(data.schemaVersion) ||
  !Array.isArray(data.crm_leads) ||
  !Array.isArray(data.crm_notes) ||
  !Array.isArray(data.crm_events) ||
  !Array.isArray(data.crm_drawing_approvals)
)
  throw Error('Unsupported or incomplete backup');
if (
  data.schemaVersion === 2 &&
  (!Array.isArray(data.crm_materials) ||
    !Array.isArray(data.crm_stock_movements))
)
  throw Error('Inventory missing from backup');
data.crm_materials ??= [];
data.crm_stock_movements ??= [];
data.crm_document_drafts ??= [];
if (!Array.isArray(data.crm_document_drafts))
  throw Error('Invalid document drafts');
const ids = new Set(data.crm_leads.map((l) => l.id));
if (
  ids.size !== data.crm_leads.length ||
  data.crm_notes.some((n) => !ids.has(n.lead_id)) ||
  data.crm_events.some((n) => !ids.has(n.lead_id)) ||
  data.crm_drawing_approvals.some((n) => !ids.has(n.lead_id)) ||
  data.crm_document_drafts.some((n) => !ids.has(n.lead_id))
)
  throw Error('Backup has invalid relationships');
const materials = new Set(data.crm_materials.map((m) => m.id));
if (
  materials.size !== data.crm_materials.length ||
  data.crm_stock_movements.some(
    (m) => !materials.has(m.material_id) || (m.lead_id && !ids.has(m.lead_id)),
  )
)
  throw Error('Backup has invalid inventory relationships');
for (const material of data.crm_materials) {
  const total = data.crm_stock_movements
    .filter((m) => m.material_id === material.id)
    .reduce((sum, m) => sum + m.delta, 0);
  if (!Number.isSafeInteger(total) || total !== material.balance || total < 0)
    throw Error('Inventory balance mismatch');
}
mkdirSync(dirname(target), { recursive: true });
const client = createClient({ url: 'file:' + target.replaceAll('\\', '/') });
try {
  await client.execute(
    'CREATE TABLE facade_migrations(name TEXT PRIMARY KEY,applied_at TEXT NOT NULL)',
  );
  const triggers = [];
  for (const name of readdirSync('drizzle')
    .filter((n) => n.endsWith('.sql'))
    .sort()) {
    for (const sql of readFileSync('drizzle/' + name, 'utf8')
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean)) {
      if (sql.startsWith('CREATE TRIGGER')) {
        triggers.push(sql);
        continue;
      }
      if (sql.startsWith('DROP TRIGGER')) {
        const name = sql.match(/DROP TRIGGER (\w+)/)[1];
        for (let i = triggers.length - 1; i >= 0; i--)
          if (triggers[i].startsWith('CREATE TRIGGER ' + name + ' '))
            triggers.splice(i, 1);
        continue;
      }
      await client.execute(sql);
    }
  }
  for (const name of readdirSync('drizzle').filter((n) => n.endsWith('.sql')))
    await client.execute({
      sql: 'INSERT INTO facade_migrations VALUES(?,?)',
      args: [name, new Date().toISOString()],
    });
  const tx = await client.transaction('write');
  try {
    for (const table of [
      'crm_leads',
      'crm_notes',
      'crm_events',
      'crm_drawing_approvals',
      'crm_materials',
      'crm_stock_movements',
      'crm_document_drafts',
    ]) {
      const columns = new Set(
        (await tx.execute('PRAGMA table_info(' + table + ')')).rows.map(
          (c) => c.name,
        ),
      );
      for (const row of data[table]) {
        const keys = Object.keys(row);
        if (keys.some((k) => !columns.has(k)))
          throw Error('Unknown backup column');
        await tx.execute({
          sql:
            'INSERT INTO ' +
            table +
            ' (' +
            keys.join(',') +
            ') VALUES (' +
            keys.map(() => '?').join(',') +
            ')',
          args: keys.map((k) => row[k]),
        });
      }
    }
    for (const sql of triggers) await tx.execute(sql);
    await tx.commit();
  } finally {
    tx.close();
  }
  const integrity = await client.execute('PRAGMA integrity_check');
  if (integrity.rows[0].integrity_check !== 'ok')
    throw Error('Database integrity check failed');
  for (const table of [
    'crm_leads',
    'crm_notes',
    'crm_events',
    'crm_drawing_approvals',
    'crm_materials',
    'crm_stock_movements',
    'crm_document_drafts',
  ]) {
    const r = await client.execute('SELECT COUNT(*) n FROM ' + table);
    if (r.rows[0].n !== data[table].length)
      throw Error('Restore count mismatch: ' + table);
  }
  console.log(
    'Backup restored and verified. Leads: ' +
      data.crm_leads.length +
      '. Destination: ' +
      target,
  );
} finally {
  client.close();
}
