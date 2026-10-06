import { createClient, type Client, type InValue } from '@libsql/client';
import { cookies } from 'next/headers';
import { validSession } from './session';
let connection: Client | undefined;
export function client() {
  if (!connection) {
    const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
    if (!url) throw new Error('База CRM ещё не подключена.');
    connection = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  return connection;
}
export function db() {
  return {
    prepare(sql: string) {
      let args: InValue[] = [];
      return {
        bind(...values: InValue[]) {
          args = values;
          return this;
        },
        async first<T = Record<string, unknown>>() {
          const result = await client().execute({ sql, args });
          return result.rows.length
            ? (Object.fromEntries(
                result.columns.map((c) => [c, result.rows[0][c]]),
              ) as T)
            : null;
        },
        async all() {
          const result = await client().execute({ sql, args });
          return {
            results: result.rows.map((row) =>
              Object.fromEntries(result.columns.map((c) => [c, row[c]])),
            ),
          };
        },
        async run() {
          const result = await client().execute({ sql, args });
          return { meta: { changes: result.rowsAffected } };
        },
      };
    },
  };
}
export async function atomic(statements: { sql: string; args: InValue[] }[]) {
  return client().batch(statements, 'write');
}
export async function backupSnapshot() {
  const transaction = await client().transaction('read');
  try {
    const snapshot: Record<string, unknown> = {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
    };
    for (const table of [
      'crm_leads',
      'crm_notes',
      'crm_events',
      'crm_drawing_approvals',
      'crm_materials',
      'crm_stock_movements',
      'crm_document_drafts',
    ]) {
      const result = await transaction.execute('SELECT * FROM ' + table);
      snapshot[table] = result.rows.map((r) =>
        Object.fromEntries(result.columns.map((c) => [c, r[c]])),
      );
    }
    await transaction.commit();
    return snapshot;
  } finally {
    transaction.close();
  }
}
export async function isAdmin() {
  return validSession((await cookies()).get('facade_admin')?.value);
}
export function noStore(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, private', Vary: 'Cookie' },
  });
}
export function sameOrigin(request: Request) {
  const raw = request.headers.get('origin');
  if (!raw) return false;
  const target = new URL(request.url);
  if (raw === target.origin) return true;
  if (process.env.NODE_ENV !== 'development' || process.env.VERCEL)
    return false;
  try {
    const origin = new URL(raw),
      loopback = ['localhost', '127.0.0.1', '[::1]'];
    return (
      loopback.includes(origin.hostname) &&
      loopback.includes(target.hostname) &&
      origin.port === target.port &&
      origin.protocol === target.protocol
    );
  } catch {
    return false;
  }
}
