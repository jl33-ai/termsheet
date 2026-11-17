import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db, schema, eq } from '$lib/server/db.ts';
import { requireAdmin } from '$lib/server/http';

// GET /api/admin/markets/[marketId]/companies
export const GET: RequestHandler = async ({ params, cookies }) => {
  await requireAdmin(cookies);

  const marketId = String(params.marketId || '').trim();
  if (!marketId) throw error(400, 'marketId is required');

  const rows = await db
    .select({ companyId: schema.marketCompanies.companyId })
    .from(schema.marketCompanies)
    .where(eq(schema.marketCompanies.marketId, marketId));

  return json({ companyIds: rows.map((r) => r.companyId) });
};

