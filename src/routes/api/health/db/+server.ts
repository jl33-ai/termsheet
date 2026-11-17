import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db, sql } from '$lib/server/db.ts';

type HealthResult = {
  ok: boolean;
  checks: {
    ping?: boolean;
    tables?: Record<string, boolean>;
    join?: boolean | { ok: false; error: string };
  };
  error?: string;
};

export const GET: RequestHandler = async () => {
  const result: HealthResult = { ok: false, checks: {} };
  try {
    // Connectivity check
    const ping = await db.execute(sql`select 1 as ok`);
    const rows = (ping as unknown as { rows?: Array<{ ok: number }> })?.rows;
    result.checks.ping = Array.isArray(rows) ? rows[0]?.ok === 1 : true;

    // Tables exist
    const tables = await db.execute(sql`
      select
        exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'users')  as users,
        exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'sessions') as sessions
    `);
    const trows = (tables as unknown as { rows?: Array<Record<string, boolean>> })?.rows;
    const trow = Array.isArray(trows) ? trows[0] : null;
    result.checks.tables = trow ?? {};

    // Join/columns check (will fail if columns missing)
    try {
      await db.execute(sql`select 1 from sessions s inner join users u on s.user_id = u.id limit 1`);
      result.checks.join = true;
    } catch (e: unknown) {
      const err = e as { message?: string };
      result.checks.join = { ok: false, error: err?.message || String(e) };
    }

    result.ok = !!result.checks.ping && !!result.checks.tables;
    return json(result);
  } catch (e: unknown) {
    const err = e as { message?: string };
    result.error = err?.message || String(e);
    return json(result, { status: 500 });
  }
};
