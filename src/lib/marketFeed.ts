import { db, schema, inArray, asc, desc, lt, gt, and, or, sql } from '$lib/server/db.ts';
import { isNull } from 'drizzle-orm';
import { commentsGetForMarket, tradesCountsForMarkets } from '$lib/server/sql/functions.ts';
import { marketSummaryString } from '$lib/market/subtitle';
import type {
	MarketRow,
	OutcomeRow,
	PoolBalanceRow,
	FeedComment,
	FeedItem,
	FeedPage
} from '$lib/types';
import { outcomeRowSelectFull, poolBalanceRowSelect, userBalanceSelect } from '$lib/server/selects';

async function buildItemsForMarkets(marketList: MarketRow[]): Promise<FeedItem[]> {
	if (marketList.length === 0) return [];

	const ids = marketList.map((m) => m.id);

	const [outs, balsRaw] = await Promise.all([
		db
			.select(outcomeRowSelectFull)
			.from(schema.outcomes)
			.where(inArray(schema.outcomes.marketId, ids))
			.orderBy(asc(schema.outcomes.indexId)),
		db
			.select(poolBalanceRowSelect)
			.from(schema.poolBalances)
			.where(inArray(schema.poolBalances.marketId, ids))
	]);

	const outcomesByMarket = new Map<string, OutcomeRow[]>();
	(outs as OutcomeRow[]).forEach((o) => {
		const market_id = o.market_id;
		const arr = outcomesByMarket.get(market_id) ?? [];
		arr.push(o);
		outcomesByMarket.set(market_id, arr);
	});
	const balancesByMarket = new Map<string, PoolBalanceRow[]>();
	(balsRaw as Array<{ market_id: string; outcome_id: string; balance: unknown }>).forEach((b) => {
		const market_id = b.market_id;
		const outcome_id = b.outcome_id;
		const arr = balancesByMarket.get(market_id) ?? [];
		arr.push({ market_id, outcome_id, balance: Number(b.balance) });
		balancesByMarket.set(market_id, arr);
	});

	// Compute summaries and fetch comments (top 3) per market
	const items: FeedItem[] = [];
	for (const m of marketList) {
		const mOuts = outcomesByMarket.get(m.id) ?? [];
		const mBals = balancesByMarket.get(m.id) ?? [];

    const summary = marketSummaryString(m, mOuts, mBals);

        let top3: FeedComment[] = [];
        try {
            const comm = (await commentsGetForMarket(m.id)) as any[];
            top3 = comm.slice(0, 3).map((c) => ({
                id: c.id,
                content: c.content,
                created_at: c.created_at,
                user_id: c.user_id,
                username: c.username,
                avatar_url: c.avatar_url ?? null,
                // Pass through KD stats so Username.svelte has full user fields
                correct_bets_count: c.correct_bets_count ?? null,
                pending_bets_count: c.pending_bets_count ?? null,
                incorrect_bets_count: c.incorrect_bets_count ?? null,
                shares: c.shares ?? null,
                outcome_name: c.outcome_name ?? null,
                amount_credits: c.amount_credits != null ? Number(c.amount_credits) : null
            })) as FeedComment[];
        } catch {
			items.push({ market: m, summary, comments: [] });
			continue;
		}

		// Fetch commenters' balances for tooltip display
		try {
			const ids = Array.from(new Set(top3.map((c) => c.user_id))).filter(Boolean);
			if (ids.length > 0) {
            const users = await db
                .select(userBalanceSelect)
                .from(schema.users)
                .where(inArray(schema.users.id, ids));
            const byId = new Map<string, number | null>();
            (users ?? []).forEach((u) => {
                const val = (u as { id: string; balance_credits: unknown }).balance_credits;
                byId.set((u as { id: string }).id, val != null ? Number(val) : null);
            });
				top3 = top3.map((c) => ({ ...c, balance_credits: byId.get(c.user_id) ?? null }));
			}
		} catch {}

		items.push({ market: m, summary, comments: top3 });
	}

	return items;
}

type LoadFeedOpts = {
    excludeTradedByUser?: boolean;
};

export async function loadFeedPage(
    limit = 12,
    cursor?: string,
    userId?: string | null,
    opts: LoadFeedOpts = { excludeTradedByUser: true }
): Promise<FeedPage> {
	const now = new Date();

	const excludeTraded = Boolean(userId) && (opts.excludeTradedByUser ?? true);

	let rows = await db
		.select({
			id: schema.markets.id,
			question: schema.markets.question,
			created_at: schema.markets.createdAt,
			market_type: schema.markets.marketType,
			expires_at: schema.markets.expiresAt,
			thumbnail_url: schema.markets.thumbnailUrl,
			heat_score: schema.markets.heatScore
		})
		.from(schema.markets)
		.where(
			and(
				isNull(schema.markets.closedAt),
				isNull(schema.markets.resolutionOutcomeId),
				or(isNull(schema.markets.expiresAt), gt(schema.markets.expiresAt, now)),
				// Optionally exclude markets the current user has already traded on (any transaction)
				excludeTraded ? sql`NOT EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = ${userId}::uuid AND t.market_id = ${schema.markets.id})` : sql`true`
			)
		)
		.orderBy(desc(schema.markets.createdAt))
		.limit(limit + 1);

	if (cursor) {
		const cursorDate = new Date(cursor);
		rows = await db
			.select({
				id: schema.markets.id,
				question: schema.markets.question,
				created_at: schema.markets.createdAt,
				market_type: schema.markets.marketType,
				closed_at: schema.markets.closedAt,
				resolution_outcome_id: schema.markets.resolutionOutcomeId,
				expires_at: schema.markets.expiresAt,
				thumbnail_url: schema.markets.thumbnailUrl,
				heat_score: schema.markets.heatScore
			})
			.from(schema.markets)
			.where(
				and(
					lt(schema.markets.createdAt, cursorDate),
					isNull(schema.markets.closedAt),
					isNull(schema.markets.resolutionOutcomeId),
					or(isNull(schema.markets.expiresAt), gt(schema.markets.expiresAt, now)),
					excludeTraded ? sql`NOT EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = ${userId}::uuid AND t.market_id = ${schema.markets.id})` : sql`true`
				)
			)
			.orderBy(desc(schema.markets.createdAt))
			.limit(limit + 1);
	}

    const list = (rows ?? []) as MarketRow[];
	const hasMore = list.length > limit;
	let pageMarkets = hasMore ? list.slice(0, limit) : list;
	const nextCursor = hasMore ? (pageMarkets[pageMarkets.length - 1]?.created_at ?? null) : null;

	// Compute a very simple heat score (1-5) for sorting within the page
	try {
		const ids = pageMarkets.map((m) => m.id);
		const counts = await tradesCountsForMarkets(ids, 7);
		const countsMap = new Map<string, number>();
        (counts ?? []).forEach((r) => countsMap.set((r as any).market_id, Number((r as any).trades_count || 0)));

		function clampHeat(h: number | null | undefined) {
			if (h == null) return null;
			const n = Math.max(1, Math.min(5, Math.floor(Number(h))));
			return n;
		}

        function computeHeat(m: MarketRow): number {
            const createdAt = new Date(m.created_at);
            const ageHrs = Math.max(0, (now.getTime() - createdAt.getTime()) / 36e5);
            const isRecent = ageHrs <= 72 ? 1 : 0;
            let expiresSoon = 0;
            if (m.expires_at) {
                const exp = new Date(m.expires_at);
                const toExpHrs = Math.max(0, (exp.getTime() - now.getTime()) / 36e5);
                expiresSoon = toExpHrs <= 72 ? 1 : 0;
            }
            const trades = countsMap.get(m.id) ?? 0;
            const base = Math.min(trades, 10) + (expiresSoon ? 2 : 0) + (isRecent ? 1 : 0);
            let computed: number;
            if (base >= 10) computed = 5;
            else if (base >= 7) computed = 4;
            else if (base >= 4) computed = 3;
            else if (base >= 2) computed = 2;
            else computed = 1;

            const manual = clampHeat(m.heat_score ?? null);
            // Factor in manual curation by treating it as a lower bound.
            // This keeps curated items hot while still rewarding activity.
            return manual != null ? Math.max(manual, computed) : computed;
        }

		pageMarkets = [...pageMarkets].sort((a, b) => {
			const ha = computeHeat(a);
			const hb = computeHeat(b);
			if (hb !== ha) return hb - ha;
			return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
		});
	} catch {
		// If anything fails, fall back to created_at ordering already applied
	}

	const items = await buildItemsForMarkets(pageMarkets);
	return { items, nextCursor };
}
