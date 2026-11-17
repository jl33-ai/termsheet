import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db, schema, eq } from '$lib/server/db.ts';
import { requireAdmin, safeJson } from '$lib/server/http';

// PUT /api/admin/markets/companies
// Body: { market_id: string; company_ids: string[] }
export const PUT: RequestHandler = async ({ request, cookies }) => {
  await requireAdmin(cookies);

  const body = await safeJson<{ market_id?: string; company_ids?: string[] }>(request);
  const marketId = typeof body.market_id === 'string' ? body.market_id.trim() : '';
  const companyIds: string[] = Array.isArray(body.company_ids)
    ? body.company_ids.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim())
    : [];

  if (!marketId) throw error(400, 'market_id is required');

  await db.transaction(async (tx) => {
    await tx.delete(schema.marketCompanies).where(eq(schema.marketCompanies.marketId, marketId));

    if (companyIds.length > 0) {
      await tx
        .insert(schema.marketCompanies)
        .values(companyIds.map((cid) => ({ marketId, companyId: cid })))
        .onConflictDoNothing({
          target: [schema.marketCompanies.marketId, schema.marketCompanies.companyId]
        });
    }
  });

  return json({ success: true });
};

