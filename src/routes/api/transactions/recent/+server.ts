import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { toNumberOr } from '$lib/server/input';
import { getSessionUser } from '$lib/server/admin';
import { recentTradesWithCommentsPaginated } from '$lib/server/sql/functions.ts';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const raw = toNumberOr('limit', url.searchParams.get('limit'), 12);
  const limit = Math.max(1, Math.min(50, raw));
  const cursor = url.searchParams.get('cursor');
  const sess = await getSessionUser(cookies).catch(() => null);
  const userId = sess?.id ?? null;
  const rows = await recentTradesWithCommentsPaginated(limit + 1, cursor, userId);
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1] || null;
  const nextCursor = last ? `${new Date(last.created_at).toISOString()}|${last.id}` : null;
  return json({ items, nextCursor });
};

