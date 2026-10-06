import { createHash, randomUUID } from 'node:crypto';
import { put, get, list } from '@vercel/blob';
export const backupTables = [
  'crm_leads',
  'crm_notes',
  'crm_events',
  'crm_drawing_approvals',
  'crm_materials',
  'crm_stock_movements',
  'crm_document_drafts',
];
export const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex');
export function validateBackup(data) {
  // Older version-2 backups predate document generation.
  if (data.schemaVersion === 2 && data.crm_document_drafts === undefined)
    data.crm_document_drafts = [];
  if (
    data.schemaVersion !== 2 ||
    !Number.isFinite(Date.parse(data.exportedAt)) ||
    backupTables.some((t) => !Array.isArray(data[t]))
  )
    throw Error('Invalid backup format');
  const leads = new Set(data.crm_leads.map((r) => r.id)),
    materials = new Set(data.crm_materials.map((r) => r.id));
  if (
    leads.size !== data.crm_leads.length ||
    materials.size !== data.crm_materials.length
  )
    throw Error('Duplicate backup records');
  for (const t of [
    'crm_notes',
    'crm_events',
    'crm_drawing_approvals',
    'crm_document_drafts',
  ])
    if (data[t].some((r) => !leads.has(r.lead_id)))
      throw Error('Broken lead relationship');
  const totals = new Map();
  for (const row of data.crm_stock_movements) {
    if (
      !materials.has(row.material_id) ||
      (row.lead_id && !leads.has(row.lead_id)) ||
      !Number.isSafeInteger(row.delta)
    )
      throw Error('Invalid stock relationship');
    totals.set(row.material_id, (totals.get(row.material_id) || 0) + row.delta);
  }
  for (const row of data.crm_materials)
    if (
      !Number.isSafeInteger(row.balance) ||
      row.balance < 0 ||
      (totals.get(row.id) || 0) !== row.balance
    )
      throw Error('Stock balance mismatch');
  return data;
}
const storage = { put, get, list };
async function readPrivate(path, store = storage) {
  const result = await store.get(path, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) throw Error('Backup not readable');
  return new Response(result.stream).text();
}
export async function createBackup(snapshot, store = storage) {
  validateBackup(snapshot);
  const text = JSON.stringify(snapshot),
    hash = sha256(text),
    id = new Date().toISOString().replaceAll(':', '-') + '-' + randomUUID();
  const pathname = 'crm-backups/data/' + id + '.json';
  await store.put(pathname, text, {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: 'application/json',
  });
  const downloaded = await readPrivate(pathname, store);
  if (sha256(downloaded) !== hash) throw Error('Backup checksum mismatch');
  validateBackup(JSON.parse(downloaded));
  const manifest = {
    pathname,
    sha256: hash,
    exportedAt: snapshot.exportedAt,
    verifiedAt: new Date().toISOString(),
    bytes: Buffer.byteLength(text),
    counts: Object.fromEntries(
      backupTables.map((t) => [t, snapshot[t].length]),
    ),
  };
  // Publish completion only after reading and verifying the stored snapshot.
  await store.put(
    'crm-backups/verified/' + id + '.json',
    JSON.stringify(manifest),
    {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: 'application/json',
    },
  );
  return manifest;
}
export async function latestBackup(store = storage) {
  let cursor, latest;
  do {
    const page = await store.list({
      prefix: 'crm-backups/verified/',
      limit: 1000,
      ...(cursor ? { cursor } : {}),
    });
    for (const blob of page.blobs)
      if (!latest || blob.pathname > latest.pathname) latest = blob;
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  if (!latest) return null;
  return JSON.parse(await readPrivate(latest.pathname, store));
}
export async function downloadLatestBackup() {
  const manifest = await latestBackup();
  if (!manifest) throw Error('No backup');
  if (!/^crm-backups\/data\/[\w.-]+\.json$/.test(manifest.pathname))
    throw Error('Invalid backup path');
  const text = await readPrivate(manifest.pathname);
  if (sha256(text) !== manifest.sha256) throw Error('Backup checksum mismatch');
  validateBackup(JSON.parse(text));
  return text;
}
