import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { commentsGetForMarketPaginated } from '$lib/server/sql/functions.ts';
import { ensureUuid, toNumberOr } from '$lib/server/input';
import { getSessionUser } from '$lib/server/admin';

export const GET: RequestHandler = async ({ params, url, cookies }) => {
	const id = ensureUuid('id', params.id);
	const limit = toNumberOr('limit', url.searchParams.get('limit'), 20);
	const cursor = url.searchParams.get('cursor'); // format: created_at (ISO string)
	const sess = await getSessionUser(cookies).catch(() => null);
	const userId = sess?.id ?? null;
    const items = await commentsGetForMarketPaginated(id, limit, cursor, userId);
	let nextCursor: string | null = null;
	if (items && items.length > 0) {
		const last = items[items.length - 1];
		nextCursor = last?.created_at ? new Date(last.created_at).toISOString() : null;
	}
	return json({ items, nextCursor });
};
