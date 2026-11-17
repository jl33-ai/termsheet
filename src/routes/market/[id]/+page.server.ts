import { db, schema, eq, ne, and, asc, desc } from '$lib/server/db.ts';
import { commentsGetForMarketPaginated } from '$lib/server/sql/functions.ts';
import { getSessionUser } from '$lib/server/admin';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { marketDetailSelect, outcomeRowSelectFull, poolBalanceRowSelect, marketIdQuestionSelect, positionBasicSelect } from '$lib/server/selects';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const { id } = params;

    const marketRows = await db
        .select(marketDetailSelect)
		.from(schema.markets)
		.where(eq(schema.markets.id, id))
		.limit(1);
    const market = marketRows?.[0];
	if (!market) {
		throw error(404, 'Market not found');
	}

	// If this market is linked to a company, fetch minimal company info for linking
	let company: { id: string; slug: string; name: string; logo_url?: string | null } | null = null;
	if (market.company_id) {
		const comp = await db
			.select({
				id: schema.companies.id,
				slug: schema.companies.slug,
				name: schema.companies.name,
				logo_url: schema.companies.logoUrl
			})
			.from(schema.companies)
			.where(eq(schema.companies.id, market.company_id))
			.limit(1);
        company = comp?.[0] ?? null;
	}

	const outcomes = await db
		.select(outcomeRowSelectFull)
		.from(schema.outcomes)
		.where(eq(schema.outcomes.marketId, id))
		.orderBy(asc(schema.outcomes.indexId));

	const pool_balances = await db
		.select(poolBalanceRowSelect)
		.from(schema.poolBalances)
		.where(eq(schema.poolBalances.marketId, id));

	// Session-based user lookup
	const sess = await getSessionUser(cookies);
    let user: { id: string; avatar_url?: string | null } | null = null;
    let positions = [] as Array<{ outcome_id: string; shares: string | number | null }>;
	if (sess?.id) {
        user = { id: sess.id, avatar_url: sess.x_avatar_url ?? null };
        positions = await db
            .select(positionBasicSelect)
            .from(schema.positions)
            .where(and(eq(schema.positions.marketId, id), eq(schema.positions.userId, sess.id)));
	}

	// fetch first page of comments (paginated)
	const PAGE_SIZE = 20;
    let comments_with_likes: Array<{
        id: string;
        content: string | null;
        created_at: string | Date;
        user_id: string;
        username: string | null;
        avatar_url: string | null;
        outcome_id: string | null;
        outcome_name: string | null;
        amount_credits: string | number | null;
        transaction_id: string | null;
        parent_id: string | null;
        reply_count: number;
        likes_count: number;
        liked: boolean;
    }> = [];
	let next_cursor: string | null = null;
	try {
        const rows = (await commentsGetForMarketPaginated(
            id,
            PAGE_SIZE,
            null,
            user?.id ?? null
        ));
        comments_with_likes = rows ?? [];
		if (comments_with_likes.length > 0) {
			const last = comments_with_likes[comments_with_likes.length - 1];
			next_cursor = last?.created_at ? new Date(last.created_at).toISOString() : null;
		}
	} catch (e) {
		console.error('Could not fetch comments:', (e as any)?.message);
	}

	// Comments already include user info from the function

	// Related markets: same company, exclude current, limit 3
	let related_markets: { id: string; question: string }[] = [];
	if (market.company_id) {
		const rel = await db
			.select(marketIdQuestionSelect)
			.from(schema.markets)
			.where(and(eq(schema.markets.companyId, market.company_id), ne(schema.markets.id, market.id)))
			.orderBy(desc(schema.markets.createdAt))
			.limit(3);
        if (rel) related_markets = rel;
	}

	return {
		market,
		outcomes,
		pool_balances,
		positions: positions ?? [],
		comments: comments_with_likes ?? [],
		comments_next_cursor: next_cursor,
		user: user,
		company,
		related_markets
		// posts removed in favor of comments with optional transaction_id
	};
};
