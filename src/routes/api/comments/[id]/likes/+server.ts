import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { ensureUuid } from '$lib/server/input';
import { commentsLikesSummary } from '$lib/server/sql/functions.ts';
import { getSessionUser } from '$lib/server/admin';

export const GET: RequestHandler = async ({ params, cookies }) => {
  const id = ensureUuid('id', params.id);
  let userId: string | null = null;
  try {
    const sess = await getSessionUser(cookies).catch(() => null);
    userId = sess?.id ?? null;
  } catch {
    userId = null;
  }
  try {
    const rows = await commentsLikesSummary([id], userId);
    const r = rows?.[0] ?? null;
    const likes_count = Number(r?.likes_count ?? 0);
    const liked = Boolean(r?.liked);
    return json({ likes_count, liked });
  } catch {
    return json({ likes_count: 0, liked: false });
  }
};

