import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db, schema, eq } from '$lib/server/db.ts';
import { marketDetailSelect } from '$lib/server/selects';

export const GET: RequestHandler = async ({ params }) => {
  const id = params.id;
  if (!id) throw error(400, 'id is required');

  const rows = await db
    .select(marketDetailSelect)
    .from(schema.markets)
    .where(eq(schema.markets.id, id))
    .limit(1);

  const market = rows?.[0] ?? null;
  if (!market) throw error(404, 'Market not found');

  return json(market);
};

