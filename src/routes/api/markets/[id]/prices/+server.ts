import { json } from '@sveltejs/kit';
import { db, schema, eq, asc } from '$lib/server/db.ts';
import { marketPricePointSelect } from '$lib/server/selects';
import { ensureUuid } from '$lib/server/input';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const id = ensureUuid('id', params.id);

    const rows = await db
        .select(marketPricePointSelect)
        .from(schema.marketOutcomePrices)
        .where(eq(schema.marketOutcomePrices.marketId, id))
        .orderBy(asc(schema.marketOutcomePrices.createdAt))
        .limit(1000);

    const out = rows.map((r) => ({
        outcome_id: r.outcome_id,
        price: Number(r.price as unknown as string),
        created_at: r.created_at as unknown as string
    }));

	return json({ price_history: out });
};
