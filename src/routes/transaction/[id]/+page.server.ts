import type { PageServerLoad } from './$types';
import { db, schema, eq, and } from '$lib/server/db.ts';
import { error } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/admin';
import { commentsLikesSummary } from '$lib/server/sql/functions.ts';
import { userProfileSelect, outcomeRowSelectLite, marketMinimalSelect, poolBalanceRowSelect, positionBasicSelect } from '$lib/server/selects';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const { id } = params;
	if (!id) throw error(404, 'Transaction not found');

	// Fetch transaction with author + market/outcome context
	const txRows = await db
		.select({
			id: schema.transactions.id,
			user_id: schema.transactions.userId,
			market_id: schema.transactions.marketId,
			outcome_id: schema.transactions.outcomeId,
			type: schema.transactions.type,
			amount_credits: schema.transactions.amountCredits,
			shares_change: schema.transactions.sharesChange,
			created_at: schema.transactions.createdAt,
			comment_id: schema.transactions.commentId,
			username: schema.users.username,
			avatar_url: schema.users.xAvatarUrl,
			outcome_name: schema.outcomes.name,
			outcome_color_hex: schema.outcomes.colorHex
		})
		.from(schema.transactions)
		.innerJoin(schema.users, eq(schema.transactions.userId, schema.users.id))
		.leftJoin(schema.outcomes, eq(schema.transactions.outcomeId, schema.outcomes.id))
		.where(eq(schema.transactions.id, id))
		.limit(1);

    const trade = txRows?.[0];
	if (!trade) throw error(404, 'Transaction not found');

	// Author profile for the user card in right panel
    let author: { id: string; username: string | null; x_username: string | null; x_name: string | null; x_avatar_url: string | null; created_at: Date | string | null; correct_bets_count: number | null; pending_bets_count: number | null; incorrect_bets_count: number | null } | null = null;
	try {
		const rows = await db
			.select(userProfileSelect)
			.from(schema.users)
			.where(eq(schema.users.id, trade.user_id))
			.limit(1);
		author = rows?.[0] ?? null;
	} catch {}

	// Minimal market info for header + right pane card
    const marketRows = await db
        .select(marketMinimalSelect)
		.from(schema.markets)
		.where(eq(schema.markets.id, trade.market_id))
		.limit(1);
    const market = marketRows?.[0] ?? null;

	// Outcomes for this market to ensure consistent coloring
    let outcomes: Array<{ id: string; name: string; short_code: string; color_hex: string | null } > = [];
	if (market) {
		outcomes = await db
			.select(outcomeRowSelectLite)
			.from(schema.outcomes)
			.where(eq(schema.outcomes.marketId, market.id));
	}

	// Associated top-level comment (optional)
    let comment: ({ id: string; content: string | null; created_at: string | Date; user_id: string; market_id: string; parent_id: string | null; transaction_id: string | null; username: string | null; avatar_url: string | null; correct_bets_count?: number | null; pending_bets_count?: number | null; incorrect_bets_count?: number | null } & { likes_count?: number; liked?: boolean }) | null = null;
	if (trade.comment_id) {
        const rows = await db
            .select({
                id: schema.comments.id,
                content: schema.comments.content,
                created_at: schema.comments.createdAt,
                user_id: schema.comments.userId,
                market_id: schema.comments.marketId,
                parent_id: schema.comments.parentId,
                transaction_id: schema.comments.transactionId,
                username: schema.users.username,
                avatar_url: schema.users.xAvatarUrl,
                correct_bets_count: schema.users.correctBetsCount,
                pending_bets_count: schema.users.pendingBetsCount,
                incorrect_bets_count: schema.users.incorrectBetsCount,
            })
            .from(schema.comments)
            .innerJoin(schema.users, eq(schema.comments.userId, schema.users.id))
            .where(eq(schema.comments.id, trade.comment_id))
            .limit(1);
		comment = rows?.[0] ?? null;
	}

	// Session user (optional)
	const sess = await getSessionUser(cookies).catch(() => null);
	const user = sess ? { id: sess.id, avatar_url: sess.x_avatar_url ?? null } : null;

	// Pool balances for this market (needed by TransactionWidget)
    let pool_balances: { outcome_id: string; balance: number | string }[] = [];
	if (market) {
		pool_balances = await db
			.select(poolBalanceRowSelect)
			.from(schema.poolBalances)
			.where(eq(schema.poolBalances.marketId, market.id));
	}

	// Current user's positions for this market (if logged in)
    let positions: { outcome_id: string; shares: number | string }[] = [];
	if (sess?.id && market) {
		positions = (
			await db
				.select(positionBasicSelect)
				.from(schema.positions)
				.where(and(eq(schema.positions.marketId, market.id), eq(schema.positions.userId, sess.id)))
		).map((r) => ({ outcome_id: r.outcome_id, shares: Number(r.shares ?? 0) }));
	}

	// Likes summary for the comment if present
	if (comment) {
		try {
            const likes = await commentsLikesSummary([comment.id], user?.id ?? null);
            const L = likes?.[0] ?? null;
            comment = { ...comment, likes_count: L?.likes_count ?? 0, liked: !!L?.liked } as typeof comment & { likes_count: number; liked: boolean };
        } catch {
            comment = { ...comment, likes_count: 0, liked: false };
        }
	}

	return { trade, comment, user, market, outcomes, pool_balances, positions, author };
};
