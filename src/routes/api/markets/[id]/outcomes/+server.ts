import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db, schema, eq, asc } from '$lib/server/db.ts';
import { ensureUuid } from '$lib/server/input';
import { outcomeRowSelectList } from '$lib/server/selects';

export const GET: RequestHandler = async ({ params }) => {
	const id = ensureUuid('id', params.id);
    const rows = await db
        .select(outcomeRowSelectList)
        .from(schema.outcomes)
        .where(eq(schema.outcomes.marketId, id))
        .orderBy(asc(schema.outcomes.indexId));
    return json({ outcomes: rows });
};
