import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createClient} from '@libsql/client';
import {validateBackup,backupTables} from './lib/crm/backup.mjs';
process.loadEnvFile('.env.local');
const db=createClient({url:process.env.TURSO_DATABASE_URL||process.env.DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
const snapshot={schemaVersion:2,exportedAt:new Date().toISOString()};
for(const table of backupTables){const result=await db.execute('SELECT * FROM '+table);snapshot[table]=result.rows.map(r=>Object.fromEntries(result.columns.map(c=>[c,r[c]])));}
assert.equal(validateBackup(snapshot).crm_document_drafts.length,1);
const older=structuredClone(snapshot);delete older.crm_document_drafts;assert.deepEqual(validateBackup(older).crm_document_drafts,[]);
await fs.writeFile('D:/Codex/2026-09-05/new-chat/work/quote-documents/backup.json',JSON.stringify(snapshot));
console.log('PASS: saved document drafts in backup and compatibility with older backups.');
