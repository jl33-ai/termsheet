import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db, schema, eq, and, gt, desc, asc, inArray, sql } from '$lib/server/db.ts';
import { userProfileSelect, userViewerSelect, positionWithMarketSelect, pinnedTradeRowSelect } from '$lib/server/selects';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const handle = params.username;

	// Find the profile user by username or x_username
    const byUsername = await db
        .select(userProfileSelect)
        .from(schema.users)
        .where(eq(schema.users.username, handle))
        .limit(1);

    let profile = byUsername?.[0] ?? null;
    if (!profile) {
        const byX = await db
            .select(userProfileSelect)
            .from(schema.users)
            .where(eq(schema.users.xUsername, handle))
            .limit(1);
        profile = byX?.[0] ?? null;
    }

	if (!profile) throw error(404, 'User not found');

	// Current viewer session (to determine owner-only UI)
	const token = cookies.get('session_token') || '';
	let viewer: { id: string; username: string | null } | null = null;
    if (token) {
        const rows = await db
            .select(userViewerSelect)
            .from(schema.sessions)
            .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
            .where(and(eq(schema.sessions.token, token), gt(schema.sessions.expiresAt, new Date())))
            .limit(1);
        const u = rows?.[0];
        if (u) {
            viewer = {
                id: u.id,
                username: u.username ?? u.x_username ?? null,
            };
        }
    }

	const isOwner = viewer?.id === profile.id;

    // (positions removed — profile shows Trades instead)

    // Pinned trades for this profile
    const pinnedRows = await db
        .select(pinnedTradeRowSelect)
        .from(schema.pinnedTransactions)
        .innerJoin(schema.transactions, eq(schema.pinnedTransactions.transactionId, schema.transactions.id))
        .leftJoin(schema.comments, eq(schema.transactions.commentId, schema.comments.id))
        .innerJoin(schema.markets, eq(schema.transactions.marketId, schema.markets.id))
        .leftJoin(schema.outcomes, eq(schema.transactions.outcomeId, schema.outcomes.id))
        .where(eq(schema.pinnedTransactions.userId, profile.id))
        .orderBy(desc(schema.pinnedTransactions.createdAt));

    // All trades for this user (most recent first)
    const trades = await db
        .select({
            id: schema.transactions.id,
            created_at: schema.transactions.createdAt,
            amount_credits: schema.transactions.amountCredits,
            shares_change: schema.transactions.sharesChange,
            market_id: schema.transactions.marketId,
            market_question: schema.markets.question,
            market_closed_at: schema.markets.closedAt,
            market_resolution_outcome_id: schema.markets.resolutionOutcomeId,
            outcome_id: schema.transactions.outcomeId,
            outcome_name: schema.outcomes.name,
            outcome_color_hex: schema.outcomes.colorHex,
            outcome_index_id: schema.outcomes.indexId,
            comment_id: schema.transactions.commentId,
            comment_content: schema.comments.content,
        })
        .from(schema.transactions)
        .innerJoin(schema.markets, eq(schema.transactions.marketId, schema.markets.id))
        .leftJoin(schema.outcomes, eq(schema.transactions.outcomeId, schema.outcomes.id))
        .leftJoin(schema.comments, eq(schema.transactions.commentId, schema.comments.id))
        .where(eq(schema.transactions.userId, profile.id))
        .orderBy(desc(schema.transactions.createdAt));

    const trades_open = trades.filter((t) => !t.market_resolution_outcome_id && !t.market_closed_at);
    const trades_resolved = trades.filter((t) => !!t.market_resolution_outcome_id);
    const trades_closed = trades.filter((t) => !!t.market_closed_at && !t.market_resolution_outcome_id);

	return {
		profile,
		isOwner,
		viewer,
        pinned: pinnedRows,
        pinned_ids: pinnedRows.map((p) => p.transaction_id),
        trades_open,
        trades_closed,
        trades_resolved,
    };
};
