import type { LayoutServerLoad } from './$types';
import { db, schema, eq, and, gt, desc, sql } from '$lib/server/db.ts';
import { loadFeedPage } from '$lib/marketFeed.ts';
import { getSessionUser } from '$lib/server/admin';
// Note: likes summary is now loaded client-side by LikeButton

export const load: LayoutServerLoad = async ({ url, cookies }) => {
	const session_token = cookies.get('session_token') || null;
	let username: string | null = null;
	let balance: number | null = null;
    let correct_bets_count: number | null = null;
    let pending_bets_count: number | null = null;
    let incorrect_bets_count: number | null = null;
    let userId: string | null = null;

    if (session_token) {
        try {
            const rows = await db
                .select({
                    username: schema.users.username,
                    x_username: schema.users.xUsername,
                    balance_credits: schema.users.balanceCredits,
                    correct_bets_count: schema.users.correctBetsCount,
                    pending_bets_count: schema.users.pendingBetsCount,
                    incorrect_bets_count: schema.users.incorrectBetsCount,
                })
                .from(schema.sessions)
                .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
                .where(and(eq(schema.sessions.token, session_token), gt(schema.sessions.expiresAt, new Date())))
                .limit(1);
            const user = rows?.[0];
            if (user) {
                username = user.username ?? user.x_username ?? null;
                balance = user.balance_credits != null ? Number(user.balance_credits) : null;
                correct_bets_count = user.correct_bets_count ?? null;
                pending_bets_count = user.pending_bets_count ?? null;
                incorrect_bets_count = user.incorrect_bets_count ?? null;
            }
        } catch {
            // Swallow layout-level DB errors to avoid taking down the whole page
        }
    }

    // Resolve session user id (for personalized feed) — tolerate failure
    try {
        const sess = await getSessionUser(cookies).catch(() => null);
        userId = sess?.id ?? null;
    } catch {
        userId = null;
    }

    // Recent transactions with non-empty comments (simple, time-filtered)
    let recent_transactions: any[] = [];
    try {
        const rows = await db
            .select({
                id: schema.transactions.id,
                created_at: schema.transactions.createdAt,
                market_id: schema.transactions.marketId,
                outcome_id: schema.transactions.outcomeId,
                amount_credits: schema.transactions.amountCredits,
                comment_id: schema.transactions.commentId,
                comment_content: schema.comments.content,
                // Number of replies on the top-level trade comment
                reply_count: sql<number>`(SELECT COUNT(1) FROM ${schema.comments} rc WHERE rc.parent_id = ${schema.comments.id})`,
                user_id: schema.users.id,
                username: schema.users.username,
                x_username: schema.users.xUsername,
                avatar_url: schema.users.xAvatarUrl,
                x_avatar_url: schema.users.xAvatarUrl,
                // KD stats for Username.svelte tooltip
                correct_bets_count: schema.users.correctBetsCount,
                pending_bets_count: schema.users.pendingBetsCount,
                incorrect_bets_count: schema.users.incorrectBetsCount,
                outcome_name: schema.outcomes.name,
                outcome_color_hex: schema.outcomes.colorHex,
                outcome_index_id: schema.outcomes.indexId,
            })
            .from(schema.transactions)
            .innerJoin(schema.comments, eq(schema.transactions.commentId, schema.comments.id))
            .innerJoin(schema.users, eq(schema.transactions.userId, schema.users.id))
            .leftJoin(schema.outcomes, eq(schema.transactions.outcomeId, schema.outcomes.id))
            .where(
                and(
                    // Non-empty comment
                    sql`(${schema.comments.content} is not null AND length(trim(${schema.comments.content})) > 0)`,
                    // Recent: last 14 days
                    sql`${schema.transactions.createdAt} > now() - interval '14 days'`
                )
            )
            .orderBy(desc(schema.transactions.createdAt))
            .limit(10);
        recent_transactions = rows;
    } catch {
        recent_transactions = [];
    }

    // Stream the feed so the page can render instantly
    const cursor = url.searchParams.get('cursor') || undefined;
    const forYouPromise = loadFeedPage(12, cursor, userId, { excludeTradedByUser: true });
    const recentPromise = loadFeedPage(12, undefined, userId, { excludeTradedByUser: false });

    return {
        session: session_token ? { user: { username } } : null,
        balance_credits: balance,
        username,
        correct_bets_count,
        pending_bets_count,
        incorrect_bets_count,
        recent_transactions,
        streamed: {
            forYou: forYouPromise.then((r) => r.items),
            nextCursor: forYouPromise.then((r) => r.nextCursor),
            recent: recentPromise.then((r) => r.items),
            recentNextCursor: recentPromise.then((r) => r.nextCursor)
        }
    };
};
