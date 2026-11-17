import { json } from '@sveltejs/kit';
import { db, schema, eq } from '$lib/server/db.ts';
import { ensureUuid } from '$lib/server/input';
import type { RequestHandler } from './$types';
import { poolBalanceRowSelect } from '$lib/server/selects';

export const GET: RequestHandler = async ({ params }) => {
  const id = ensureUuid('id', params.id);
  const rows = await db
    .select(poolBalanceRowSelect)
    .from(schema.poolBalances)
    .where(eq(schema.poolBalances.marketId, id));

  // Normalize numeric to number for client
  const out = (rows || []).map((r) => ({
    market_id: r.market_id,
    outcome_id: r.outcome_id,
    balance: Number(r.balance as unknown as string),
  }));
  return json({ pool_balances: out });
};
