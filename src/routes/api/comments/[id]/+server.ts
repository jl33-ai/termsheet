import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db, schema, eq } from '$lib/server/db.ts';
import { ensureUuid } from '$lib/server/input';

export const GET: RequestHandler = async ({ params }) => {
  const id = ensureUuid('id', params.id);

  const rows = await db
    .select({
      id: schema.comments.id,
      transaction_id: schema.comments.transactionId,
      market_id: schema.comments.marketId,
    })
    .from(schema.comments)
    .where(eq(schema.comments.id, id))
    .limit(1);

  const row = rows?.[0] ?? null;
  if (!row) return json({ error: 'Not found' }, { status: 404 });

  return json(row);
};
