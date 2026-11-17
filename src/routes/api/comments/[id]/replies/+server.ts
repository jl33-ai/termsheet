import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { db, schema, inArray, eq } from '$lib/server/db.ts';
import { ensureUuid } from '$lib/server/input';
import { userPublicSelect, userBalanceSelect } from '$lib/server/selects';
import { commentsGetReplies } from '$lib/server/sql/functions.ts';
import { getSessionUser } from '$lib/server/admin';

export const GET: RequestHandler = async ({ params, cookies }) => {
	const id = ensureUuid('id', params.id);

	// Primary: use RPC for enriched replies
    let replies = [] as Awaited<ReturnType<typeof commentsGetReplies>>;
    try {
        replies = await commentsGetReplies(id);
    } catch (e: any) {
        console.error('RPC comments_get_replies failed, falling back:', e?.message || e);
    }

	// Fallback: direct select if RPC failed or returned empty but client expects children
	if (!replies || replies.length === 0) {
		try {
			const rows = await db
				.select({
					id: schema.comments.id,
					content: schema.comments.content,
					created_at: schema.comments.createdAt,
					user_id: schema.comments.userId,
					parent_id: schema.comments.parentId
				})
				.from(schema.comments)
				.where(eq(schema.comments.parentId, id))
				.orderBy(schema.comments.createdAt);
			// Attach username + avatar
            const uids = Array.from(new Set(rows.map((r) => r.user_id))).filter(Boolean) as string[];
            let byUser = new Map<string, { id: string; username: string | null; x_avatar_url: string | null }>();
			if (uids.length > 0) {
				const users = await db
					.select(userPublicSelect)
					.from(schema.users)
					.where(inArray(schema.users.id, uids));
                byUser = new Map(users.map((u) => [u.id, u]));
			}
            replies = rows.map((r) => {
                const u = byUser.get(r.user_id);
                return {
                    ...r,
                    username: u?.username ?? null,
                    avatar_url: u?.x_avatar_url ?? null,
                    shares: null,
                    outcome_id: null,
                    outcome_name: null,
                    amount_credits: null,
                    reply_count: 0,
                    transaction_id: null
                };
            });
		} catch (e) {
			console.error('Fallback select replies failed:', e);
		}
	}
    if (replies.length === 0) return json([]);
    // Likes are loaded client-side by LikeButton; return raw replies
    let enriched = replies.map((r) => ({ ...r, likes_count: 0, liked: false }));
	// Fetch balances for reply authors
	try {
        const uids = Array.from(new Set(enriched.map((r) => r.user_id))).filter(Boolean);
		if (uids.length > 0) {
			const users = await db
				.select(userBalanceSelect)
				.from(schema.users)
				.where(inArray(schema.users.id, uids as string[]));
            const byId = new Map<string, number | null>();
            (users ?? []).forEach((u) =>
                byId.set(u.id, u.balance_credits != null ? Number(u.balance_credits) : null)
            );
            enriched = enriched.map((r) => ({ ...r, balance_credits: byId.get(r.user_id) ?? null }));
		}
	} catch {}
    return json(enriched);
};
