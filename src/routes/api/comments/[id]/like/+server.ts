import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/http';
import { ensureUuid } from '$lib/server/input';
import { commentsLikeToggle } from '$lib/server/sql/functions.ts';

export const POST: RequestHandler = async ({ params, cookies }) => {
	const id = ensureUuid('id', params.id);

	const { id: userId } = await requireUser(cookies);

	// Use RPC to toggle and get authoritative summary
    const res = await commentsLikeToggle(id, userId);
    const likes_count = Number(res?.likes_count ?? 0);
    // Robust boolean coercion in case the driver returns 't'/'f' or 0/1 strings
    const likedRaw: any = (res as any)?.liked;
    const liked =
      typeof likedRaw === 'boolean'
        ? likedRaw
        : typeof likedRaw === 'number'
          ? likedRaw !== 0
          : typeof likedRaw === 'string'
            ? ['t', 'true', '1'].includes(likedRaw.toLowerCase())
            : !!likedRaw;
    return json({ likes_count, liked });
};
