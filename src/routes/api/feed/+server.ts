import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { loadFeedPage } from '$lib/marketFeed';
import { toNumberOr } from '$lib/server/input';
import { getSessionUser } from '$lib/server/admin';

export const GET: RequestHandler = async ({ url, cookies }) => {
    const cursor = url.searchParams.get('cursor') ?? undefined;
    const raw = toNumberOr('limit', url.searchParams.get('limit'), 10);
    const limit = Math.max(1, Math.min(30, raw));
    const mode = url.searchParams.get('mode'); // 'forYou' | 'recent'
    const sess = await getSessionUser(cookies).catch(() => null);
    const userId = sess?.id ?? null;
    const excludeTradedByUser = mode === 'recent' ? false : true;
    const { items, nextCursor } = await loadFeedPage(limit, cursor, userId, { excludeTradedByUser });
    return json({ items, nextCursor });
};
