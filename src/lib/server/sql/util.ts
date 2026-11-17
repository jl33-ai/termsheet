// Shared helpers for working with db.execute() results and small SQL building utilities
import { sql } from '$lib/server/db';

export function rowsOf<T = any>(res: any): T[] {
  if (!res) return [] as T[];
  if (Array.isArray(res)) return res as T[];
  const rows = (res as any).rows;
  return Array.isArray(rows) ? (rows as T[]) : ([] as T[]);
}

export function unwrapSingleColumn<T = any>(row: any): T | null {
  if (!row || typeof row !== 'object') return null;
  const keys = Object.keys(row);
  if (keys.length !== 1) return row as T;
  return (row as any)[keys[0]] as T;
}

// Build a Postgres uuid[] literal from JS strings in a parameter-safe way
export function pgUuidArray(values: string[]) {
  const parts = (values || []).map((v) => sql`${v}::uuid`);
  return sql`ARRAY[${sql.join(parts)}]::uuid[]`;
}
