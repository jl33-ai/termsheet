import { db, sql } from '$lib/server/db.ts';
import { pgUuidArray, rowsOf, unwrapSingleColumn } from './util';

export type MarketsCreateResult = { market_id: string };

export async function marketsCreate(params: {
	question: string;
	market_type: string;
	expires_at: string | null;
	outcomes: Array<{
		name: string;
		short_code: string;
		color_hex?: string | null;
		min_value?: number | null;
		max_value?: number | null;
		rep_value?: number | null;
	}>;
	company_id?: string | null;
	rules?: string | null;
	thumbnail_url?: string | null;
	heat_score?: number | null;
	// Initial liquidity per outcome (credits). Defaults to 50 if not provided.
	initial_liquidity_per_outcome?: number | null;
}): Promise<MarketsCreateResult[]> {
	// prettier-ignore
	const res = await db.execute(sql`
      WITH new_market AS (
      INSERT
      INTO markets (question, market_type, expires_at, company_id, rules, thumbnail_url, heat_score)
      VALUES (
          ${params.question}, ${params.market_type}, ${params.expires_at}::timestamptz, ${params.company_id ?? null}, ${params.rules ?? null}, ${params.thumbnail_url ?? null}, ${params.heat_score ?? null}
          )
          RETURNING id
          ), outcome_inserts AS (
      INSERT
      INTO outcomes (market_id, name, short_code, color_hex, min_value, max_value, rep_value, index_id)
      SELECT
          (SELECT id FROM new_market), (outcome_data->>'name')::text, (outcome_data->>'short_code')::text, (outcome_data->>'color_hex')::text, (outcome_data->>'min_value'):: numeric, (outcome_data->>'max_value'):: numeric, (outcome_data->>'rep_value'):: numeric, ROW_NUMBER() OVER() - 1
      FROM jsonb_array_elements(${JSON.stringify(params.outcomes)}::jsonb) AS outcome_data
          RETURNING id, market_id
          ), pool_balance_inserts AS (
      INSERT
      INTO pool_balances (market_id, outcome_id, balance)
      SELECT market_id, id, ${params.initial_liquidity_per_outcome ?? 50}
      FROM outcome_inserts
          RETURNING market_id
          ), k_constant_calc AS (
      SELECT
          market_id, EXP(SUM (LN(balance))) AS k_constant
      FROM pool_balances
      WHERE market_id = (SELECT id FROM new_market)
      GROUP BY market_id
          ),
          pool_insert AS (
      INSERT
      INTO pools (market_id, k_constant)
      SELECT market_id, k_constant
      FROM k_constant_calc
          RETURNING market_id
          )
      SELECT json_build_object('market_id', (SELECT id FROM new_market)) AS result
	`);
	const rows = rowsOf(res);
	return rows.map((r) => (unwrapSingleColumn(r) ?? r) as MarketsCreateResult);
}

export type CommentWithUserRow = {
	id: string;
	content: string | null;
	created_at: string | Date;
	user_id: string;
	username: string | null;
	avatar_url: string | null;
	transaction_id: string | null;
	parent_id: string | null;
	amount_credits: string | number | null;
	outcome_id: string | null;
	outcome_name: string | null;
};

export async function commentsGetForMarket(marketId: string): Promise<CommentWithUserRow[]> {
	// Simple, direct SQL: top-level trade comments for a market (no likes projection needed here)
	// prettier-ignore
	const res = await db.execute(sql`
      SELECT c.id,
             c.content,
             c.created_at,
             c.user_id,
             u.username,
             u.x_avatar_url AS avatar_url,
             u.correct_bets_count,
             u.pending_bets_count,
             u.incorrect_bets_count,
             c.transaction_id,
             c.parent_id,
             t.amount_credits,
             o_tx.id        AS outcome_id,
             o_tx.name      AS outcome_name
      FROM comments c
               JOIN users u ON u.id = c.user_id
               LEFT JOIN transactions t ON t.id = c.transaction_id
               LEFT JOIN outcomes o_tx ON o_tx.id = t.outcome_id
      WHERE c.market_id = ${marketId}::uuid
      AND c.parent_id IS NULL
      AND c.transaction_id IS NOT NULL
      ORDER BY c.created_at DESC, c.id DESC
          LIMIT 50
	`);
	return rowsOf(res) as CommentWithUserRow[];
}

// Simple markets search (id, question, created_at)
export type MarketSearchRow = { id: string; question: string; created_at: string };

export async function marketsSearch(term: string | null, limit = 10): Promise<MarketSearchRow[]> {
	const lim = Math.max(1, Math.min(50, Math.floor(limit || 10)));
	const q = term?.trim() || '';
	const like = `%${q}%`;
	// prettier-ignore
	const res = await db.execute(sql`
      SELECT m.id, m.question, m.created_at
      FROM markets m
      WHERE ${q ? sql`m
      .
      question
      ILIKE
      ${like}` : sql`TRUE`}
      ORDER BY m.created_at DESC
          LIMIT ${lim}
	`);
	return rowsOf(res) as MarketSearchRow[];
}

// Minimal helper: recent trade counts per market over the last N days
export async function tradesCountsForMarkets(marketIds: string[], days = 7) {
	if (!marketIds || marketIds.length === 0)
		return [] as Array<{ market_id: string; trades_count: number }>;
	const idsArray = pgUuidArray(marketIds);
	// prettier-ignore
	const res = await db.execute(sql`
      SELECT t.market_id, COUNT(*) ::int AS trades_count
      FROM transactions t
      WHERE t.market_id = ANY (${idsArray})
        AND t.created_at >= NOW() - (${days} || ' days')::interval
      GROUP BY t.market_id
	`);
	return rowsOf(res) as Array<{ market_id: string; trades_count: number }>;
}

export type CommentWithLikesRow = CommentWithUserRow & {
	reply_count: number;
	likes_count: number;
	liked: boolean;
};

export async function commentsGetForMarketPaginated(
	marketId: string,
	limit: number,
	cursor: string | null,
	userId: string | null
): Promise<CommentWithLikesRow[]> {
	const lim = Math.max(1, Math.min(100, Math.floor(limit || 20)));
	const cur = cursor ? new Date(cursor).toISOString() : null;
	// prettier-ignore
	const res = await db.execute(sql`
      WITH base AS (SELECT c.id,
                           c.content,
                           c.created_at,
                           c.user_id,
                           u.username,
                           u.x_avatar_url AS avatar_url,
                           u.correct_bets_count,
                           u.pending_bets_count,
                           u.incorrect_bets_count,
                           c.transaction_id,
                           c.parent_id,
                           t.amount_credits,
                           o_tx.id        AS outcome_id,
                           o_tx.name      AS outcome_name
                    FROM comments c
                             JOIN users u ON u.id = c.user_id
                             LEFT JOIN transactions t ON t.id = c.transaction_id
                             LEFT JOIN outcomes o_tx ON o_tx.id = t.outcome_id
                    WHERE c.market_id = ${marketId}
                      AND c.parent_id IS NULL
                      AND c.transaction_id IS NOT NULL
                      AND (${cur}::timestamptz IS NULL OR c.created_at < ${cur}::timestamptz)
                    ORDER BY c.created_at DESC, c.id DESC
          LIMIT ${lim}
          )
         , likes AS (
      SELECT cl.comment_id, COUNT (*):: int AS likes_count
      FROM comment_likes cl
      WHERE cl.comment_id IN (SELECT id FROM base)
      GROUP BY cl.comment_id
          ),
          replies AS (
      SELECT rc.parent_id AS comment_id, COUNT (*):: int AS reply_count
      FROM comments rc
      WHERE rc.parent_id IN (SELECT id FROM base)
      GROUP BY rc.parent_id
          )
      SELECT b.id,
             b.content,
             b.created_at,
             b.user_id,
             b.username,
             b.avatar_url,
             b.correct_bets_count,
             b.pending_bets_count,
             b.incorrect_bets_count,
             b.outcome_id,
             b.outcome_name,
             b.amount_credits,
             b.transaction_id,
             b.parent_id,
             COALESCE(r.reply_count, 0) AS reply_count,
             COALESCE(l.likes_count, 0) AS likes_count,
             CASE
                 WHEN ${userId}::uuid IS NULL THEN false
        ELSE EXISTS (
          SELECT 1 FROM comment_likes cl WHERE cl.comment_id = b.id AND cl.user_id = ${userId}::uuid )
      END
      AS liked
    FROM base b
    LEFT JOIN likes l ON l.comment_id = b.id
    LEFT JOIN replies r ON r.comment_id = b.id
    ORDER BY b.created_at DESC, b.id DESC
	`);
	return rowsOf(res) as CommentWithLikesRow[];
}

// First principles: fetch recent trades for a market.
// Each trade has an associated top-level comment (transactions.comment_id),
// and we return likes_count, liked, and reply_count. Paginated by (created_at,id).
export type TradeWithCommentRow = {
	id: string;
	content: string | null;
	created_at: string | Date;
	user_id: string;
	username: string | null;
	avatar_url: string | null;
	outcome_id: string | null;
	outcome_name: string | null;
	amount_credits: string | number | null;
	transaction_id: string;
	parent_id: string | null;
	reply_count: number;
	likes_count: number;
	liked: boolean;
};

export async function marketTradesWithCommentsPaginated(
	marketId: string,
	limit: number,
	cursor: string | null,
	userId: string | null
): Promise<TradeWithCommentRow[]> {
	const lim = Math.max(1, Math.min(100, Math.floor(limit || 20)));
	let curAt: string | null = null;
	let curId: string | null = null;
	if (cursor) {
		const parts = String(cursor).split('|');
		curAt = parts[0] ? new Date(parts[0]).toISOString() : null;
		curId = parts[1] || null;
	}
	// Prefer RPC if available for stability and observability
	try {
		// prettier-ignore
		const res = await db.execute(sql`
        select *
        from comments_get_for_market_by_trades_paginated(
                p_market_id := ${marketId}::uuid,
                p_limit := ${lim}:: int,
                p_cursor_created_at := ${curAt}::timestamptz,
                p_cursor_tx_id := ${curId}::uuid,
                p_user_id := ${userId}::uuid
             )
		`);
		return rowsOf(res) as TradeWithCommentRow[];
	} catch {
		// Inline fallback mirrors the RPC to avoid outages if the function is missing
	}
	// prettier-ignore
	const res = await db.execute(sql`
      WITH base AS (SELECT t.id           AS transaction_id,
                           t.created_at,
                           t.user_id,
                           t.amount_credits,
                           t.outcome_id,
                           t.comment_id,
                           u.username,
                           u.x_avatar_url AS avatar_url,
                           u.correct_bets_count,
                           u.pending_bets_count,
                           u.incorrect_bets_count
                    FROM transactions t
                             JOIN users u ON u.id = t.user_id
                    WHERE t.market_id = ${marketId}
                      AND (
                        ${curAt}::timestamptz IS NULL OR t.created_at < ${curAt}::timestamptz
          OR (t.created_at = ${curAt}::timestamptz AND ${curId}::uuid IS NOT NULL AND t.id < ${curId}::uuid)
                        )
                    ORDER BY t.created_at DESC, t.id DESC
          LIMIT ${lim}
          )
         , cm AS (
      SELECT c.id, c.content, c.created_at, c.user_id, c.market_id, c.parent_id, c.transaction_id
      FROM comments c
      WHERE c.id IN (SELECT comment_id FROM base WHERE comment_id IS NOT NULL)
          )
          , likes AS (
      SELECT cl.comment_id, COUNT (*):: int AS likes_count
      FROM comment_likes cl
      WHERE cl.comment_id IN (SELECT id FROM cm)
      GROUP BY cl.comment_id
          ),
          replies AS (
      SELECT rc.parent_id AS comment_id, COUNT (*):: int AS reply_count
      FROM comments rc
      WHERE rc.parent_id IN (SELECT id FROM cm)
      GROUP BY rc.parent_id
          )
      SELECT cm.id,
             cm.content,
             b.created_at, -- use trade time for ordering/consistency
             cm.user_id,
             b.username,
             b.avatar_url,
             b.correct_bets_count,
             b.pending_bets_count,
             b.incorrect_bets_count,
             b.outcome_id,
             o.name                     AS outcome_name,
             b.amount_credits,
             cm.transaction_id,
             cm.parent_id,
             COALESCE(r.reply_count, 0) AS reply_count,
             COALESCE(l.likes_count, 0) AS likes_count,
             CASE
                 WHEN ${userId}::uuid IS NULL THEN false
        ELSE EXISTS (
          SELECT 1 FROM comment_likes cl WHERE cl.comment_id = cm.id AND cl.user_id = ${userId}::uuid )
      END
      AS liked
    FROM base b
    INNER JOIN cm ON cm.id = b.comment_id AND b.comment_id IS NOT NULL
    LEFT JOIN likes l ON l.comment_id = cm.id
    LEFT JOIN replies r ON r.comment_id = cm.id
    LEFT JOIN outcomes o ON o.id = b.outcome_id
    ORDER BY b.created_at DESC, b.transaction_id DESC
	`);
	return rowsOf(res) as TradeWithCommentRow[];
}

export type CommentReplyRow = {
	id: string;
	content: string | null;
	created_at: string | Date;
	user_id: string;
	username: string | null;
	avatar_url: string | null;
	shares: string | number | null;
	outcome_id: string | null;
	outcome_name: string | null;
	amount_credits: string | number | null;
	transaction_id: string | null;
	parent_id: string | null;
	reply_count: number;
};

export async function commentsGetReplies(commentId: string): Promise<CommentReplyRow[]> {
	// prettier-ignore
	const res = await db.execute(sql`
      WITH base AS (SELECT c.*
                    FROM comments c
                    WHERE c.parent_id = ${commentId}
          ::uuid
          )
         , market_context AS (
      SELECT market_id
      FROM comments
      WHERE id = ${commentId}::uuid
          )
          , ranked_positions AS (
      SELECT
          pos.user_id, pos.market_id, pos.shares, pos.outcome_id, ROW_NUMBER() OVER(PARTITION BY pos.user_id, pos.market_id ORDER BY pos.shares DESC) as rn
      FROM positions pos
      WHERE pos.market_id = (SELECT market_id FROM market_context)
          )
      SELECT c.id::uuid AS id, c.content::text AS content, c.created_at::timestamptz AS created_at, c.user_id::uuid AS user_id, u.username::text AS username, u.x_avatar_url::text AS avatar_url,
             u.correct_bets_count::int AS correct_bets_count,
             u.pending_bets_count::int AS pending_bets_count,
             u.incorrect_bets_count::int AS incorrect_bets_count,
             rp.shares::numeric AS shares, COALESCE(o_tx.id::uuid, o_rp.id::uuid) AS outcome_id,
             COALESCE(o_tx.name::text, o_rp.name::text) AS outcome_name,
             t.amount_credits::numeric AS amount_credits, c.transaction_id::uuid AS transaction_id, c.parent_id::uuid AS parent_id, (SELECT COUNT(1) ::int
                                                                                                                                     FROM comments rc
                                                                                                                                     WHERE rc.parent_id = c.id) AS reply_count
      FROM base c
               JOIN users u ON c.user_id = u.id
               LEFT JOIN ranked_positions rp
                         ON c.user_id = rp.user_id AND rp.market_id = (SELECT market_id FROM market_context) AND
                            rp.rn = 1
               LEFT JOIN outcomes o_rp ON rp.outcome_id = o_rp.id
               LEFT JOIN transactions t ON c.transaction_id = t.id
               LEFT JOIN outcomes o_tx ON t.outcome_id = o_tx.id
      ORDER BY c.created_at ASC
	`);
	return rowsOf(res) as CommentReplyRow[];
}

export type CommentLikesSummaryRow = { comment_id: string; likes_count: number; liked: boolean };

export async function commentsLikesSummary(
	commentIds: string[],
	userId: string | null
): Promise<CommentLikesSummaryRow[]> {
	const cidArray = pgUuidArray(commentIds);
	// prettier-ignore
	const res = await db.execute(sql`
      SELECT cid                                                                     AS comment_id,
             (SELECT COUNT(*) ::int FROM comment_likes cl WHERE cl.comment_id = cid) AS likes_count,
             CASE
                 WHEN ${userId}::uuid IS NULL THEN false
        ELSE EXISTS (
          SELECT 1 FROM comment_likes cl WHERE cl.comment_id = cid AND cl.user_id = ${userId}::uuid )
      END
      AS liked
    FROM unnest(
      ${cidArray}
      )
      AS
      cid
	`);
	return rowsOf(res) as CommentLikesSummaryRow[];
}

// Recent trades across all markets with non-empty comment, paginated by (created_at, id)
export type RecentTradeWithCommentRow = {
  id: string; // transaction id
  created_at: string | Date;
  market_id: string;
  outcome_id: string | null;
  outcome_name: string | null;
  amount_credits: string | number | null;
  comment_id: string;
  comment_content: string | null;
  reply_count: number;
  likes_count: number;
  liked: boolean;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
};

export async function recentTradesWithCommentsPaginated(
  limit: number,
  cursor: string | null,
  userId: string | null
): Promise<RecentTradeWithCommentRow[]> {
  const lim = Math.max(1, Math.min(100, Math.floor(limit || 20)));
  let curAt: string | null = null;
  let curId: string | null = null;
  if (cursor) {
    const parts = String(cursor).split('|');
    curAt = parts[0] ? new Date(parts[0]).toISOString() : null;
    curId = parts[1] || null;
  }
  // prettier-ignore
  const res = await db.execute(sql`
    WITH base AS (
      SELECT t.id                AS id,
             t.created_at        AS created_at,
             t.market_id         AS market_id,
             t.outcome_id        AS outcome_id,
             t.amount_credits    AS amount_credits,
             t.comment_id        AS comment_id,
             u.id                AS user_id,
             u.username          AS username,
             u.x_avatar_url      AS avatar_url
      FROM transactions t
      JOIN users u ON u.id = t.user_id
      WHERE t.comment_id IS NOT NULL
        AND (
          ${curAt}::timestamptz IS NULL OR t.created_at < ${curAt}::timestamptz
          OR (t.created_at = ${curAt}::timestamptz AND ${curId}::uuid IS NOT NULL AND t.id < ${curId}::uuid)
        )
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT ${lim}
    ), cm AS (
      SELECT c.id, c.content, c.transaction_id
      FROM comments c
      WHERE c.id IN (SELECT comment_id FROM base)
        AND (c.content IS NOT NULL AND length(trim(c.content)) > 0)
    ), likes AS (
      SELECT cl.comment_id, COUNT(*)::int AS likes_count
      FROM comment_likes cl
      WHERE cl.comment_id IN (SELECT id FROM cm)
      GROUP BY cl.comment_id
    ), replies AS (
      SELECT rc.parent_id AS comment_id, COUNT(*)::int AS reply_count
      FROM comments rc
      WHERE rc.parent_id IN (SELECT id FROM cm)
      GROUP BY rc.parent_id
    )
    SELECT b.id,
           b.created_at,
           b.market_id,
           b.outcome_id,
           o.name                     AS outcome_name,
           b.amount_credits,
           b.comment_id,
           cm.content                 AS comment_content,
           COALESCE(r.reply_count, 0) AS reply_count,
           COALESCE(l.likes_count, 0) AS likes_count,
           CASE
             WHEN ${userId}::uuid IS NULL THEN false
             ELSE EXISTS (
               SELECT 1 FROM comment_likes cl WHERE cl.comment_id = cm.id AND cl.user_id = ${userId}::uuid
             )
           END AS liked,
           b.user_id,
           b.username,
           b.avatar_url
    FROM base b
    JOIN cm ON cm.id = b.comment_id
    LEFT JOIN outcomes o ON o.id = b.outcome_id
    LEFT JOIN likes l ON l.comment_id = cm.id
    LEFT JOIN replies r ON r.comment_id = cm.id
    ORDER BY b.created_at DESC, b.id DESC
  `);
  return rowsOf(res) as RecentTradeWithCommentRow[];
}

export async function commentsLikeToggle(
	commentId: string,
	userId: string
): Promise<{ likes_count: number; liked: boolean }> {
	// Always use a single atomic SQL statement to toggle
	// prettier-ignore
	const summary = await db.execute(sql`
      WITH ins AS (
      INSERT
      INTO comment_likes(comment_id, user_id)
      VALUES (${commentId}::uuid, ${userId}::uuid)
      ON CONFLICT (comment_id, user_id) DO NOTHING
          RETURNING 1
          ),
          del AS (
      DELETE
      FROM comment_likes
      WHERE comment_id = ${commentId}::uuid
        AND user_id = ${userId}::uuid
        AND NOT EXISTS (SELECT 1 FROM ins)
          RETURNING 1
          )
      SELECT (SELECT COUNT(*) ::int FROM comment_likes WHERE comment_id = ${commentId}::uuid) AS likes_count,
        -- Prefer the insertion flag when present to avoid any edge snapshotting issues
        CASE 
          WHEN EXISTS (SELECT 1 FROM ins) THEN true
          ELSE EXISTS(
            SELECT 1 FROM comment_likes 
            WHERE comment_id = ${commentId}::uuid AND user_id = ${userId}::uuid )
      END
      AS liked
	`);
	const rows = rowsOf(summary) as Array<{ likes_count: number; liked: boolean }>;
	return rows[0] ?? { likes_count: 0, liked: false };
}

export async function positionsPlaceBet(params: {
	user_id: string;
	market_id: string;
	outcome_id: string;
	amount_credits: number;
	comment?: string | null;
}) {
	// prettier-ignore
	const res = await db.execute(sql`
      WITH m AS (SELECT id, closed_at, expires_at, resolution_outcome_id
                 FROM markets
                 WHERE id = ${params.market_id}
          ::uuid
          )
         , o AS (
      SELECT id
      FROM outcomes
      WHERE id = ${params.outcome_id}::uuid
        AND market_id = (SELECT id FROM m)
          )
          , u AS (
      SELECT id, balance_credits
      FROM users
      WHERE id = ${params.user_id}::uuid
          )
          , p AS (
      SELECT (${params.comment ?? ''})::text AS comment_text, (
              ${params.amount_credits})::numeric AS amt ), validate AS (
      SELECT CASE
          WHEN (SELECT id FROM m) IS NULL THEN jsonb_build_object('error', 'Market not found.')
          WHEN (SELECT id FROM o) IS NULL THEN jsonb_build_object('error', 'Outcome not found for this market.')
          WHEN (SELECT amt FROM p) IS NULL OR (SELECT amt FROM p) <= 0 THEN jsonb_build_object('error', 'Bet amount must be positive.')
          WHEN (SELECT resolution_outcome_id FROM m) IS NOT NULL OR (SELECT closed_at FROM m) IS NOT NULL OR ((SELECT expires_at FROM m) IS NOT NULL AND now() >= (SELECT expires_at FROM m)) THEN jsonb_build_object('error', 'Market is closed for trading.')
          WHEN (SELECT balance_credits FROM u) IS NULL THEN jsonb_build_object('error', 'User not found.')
          WHEN (SELECT balance_credits FROM u) < (SELECT amt FROM p) THEN jsonb_build_object('error', 'Insufficient balance.')
          ELSE NULL END AS error
          ), pool AS (
      SELECT
          COALESCE (SUM (pb.balance), 0) AS total_balance, COALESCE (MAX (pb2.balance), 0) AS outcome_balance
      FROM pool_balances pb
          LEFT JOIN pool_balances pb2
      ON pb2.market_id = ${params.market_id}::uuid AND pb2.outcome_id = ${params.outcome_id}::uuid
      WHERE pb.market_id = ${params.market_id}::uuid
          )
          , price AS (
      SELECT CASE WHEN total_balance > 0 THEN outcome_balance/total_balance ELSE NULL END AS price
      FROM pool
          ), calc AS (
      SELECT (SELECT price FROM price) AS price, CASE WHEN (SELECT price FROM price) IS NULL OR (SELECT price FROM price) <= 0 THEN NULL
          ELSE (SELECT amt FROM p) / (SELECT price FROM price) END AS shares_bought
          ), user_update AS (
      UPDATE users
      SET balance_credits = COALESCE (balance_credits, 0) - (SELECT amt FROM p), updated_at = now()
      WHERE id = ${params.user_id}::uuid
        AND (SELECT error FROM validate) IS NULL
          RETURNING id
          )
          , pos AS (
      INSERT
      INTO positions (user_id, market_id, outcome_id, shares, avg_price, updated_at)
      SELECT ${params.user_id}::uuid,
             ${params.market_id}::uuid,
             ${params.outcome_id}::uuid, (SELECT shares_bought FROM calc), (SELECT price FROM calc), now()
      WHERE (SELECT error FROM validate) IS NULL
      ON CONFLICT (user_id, outcome_id)
          DO UPDATE SET
          shares = COALESCE (positions.shares, 0) + EXCLUDED.shares, avg_price = CASE WHEN (COALESCE (positions.shares, 0) + EXCLUDED.shares) > 0 THEN ((COALESCE (positions.shares, 0) * COALESCE (positions.avg_price, 0)) + (EXCLUDED.shares * EXCLUDED.avg_price)) / (COALESCE (positions.shares, 0) + EXCLUDED.shares) ELSE EXCLUDED.avg_price END, updated_at = now()
          RETURNING user_id
          ), pool_update AS (
          UPDATE pool_balances SET balance = balance + ${params.amount_credits}:: numeric
      WHERE market_id = ${params.market_id}::uuid
        AND outcome_id = ${params.outcome_id}::uuid
        AND (SELECT error FROM validate) IS NULL
        AND EXISTS (SELECT 1 FROM pos)
          RETURNING market_id
          )
          , k_upd AS (
      UPDATE pools
      SET k_constant = (
          SELECT EXP(SUM (LN(balance))) FROM pool_balances WHERE market_id = ${params.market_id}::uuid
          )
      WHERE market_id = ${params.market_id}::uuid
        AND EXISTS (SELECT 1 FROM pool_update)
          RETURNING market_id
          )
          , cmt AS (
      INSERT
      INTO comments (user_id, market_id, content)
      SELECT ${params.user_id}::uuid,
             ${params.market_id}::uuid, CASE WHEN (SELECT comment_text FROM p) IS NOT NULL AND length (trim ((SELECT comment_text FROM p))) > 0
          THEN left (trim ((SELECT comment_text FROM p)), 140)
          ELSE '' END
      WHERE (SELECT error FROM validate) IS NULL
          RETURNING id
          )
          , tx AS (
      INSERT
      INTO transactions (user_id, market_id, type, outcome_id, amount_credits, shares_change, comment_id)
      SELECT ${params.user_id}::uuid,
             ${params.market_id}::uuid, 'BUY',
             ${params.outcome_id}::uuid, (SELECT amt FROM p), (SELECT shares_bought FROM calc), (SELECT id FROM cmt)
      WHERE EXISTS (SELECT 1 FROM pos)
        AND (SELECT error FROM validate) IS NULL
        AND EXISTS (SELECT 1 FROM cmt)
          RETURNING id
          )
          , pending_inc AS (
      UPDATE users
      SET pending_bets_count = COALESCE (pending_bets_count, 0) + 1, updated_at = now()
      WHERE id = ${params.user_id}::uuid
        AND EXISTS (SELECT 1 FROM tx)
          RETURNING id
          )
          , price_hist AS (
      INSERT
      INTO market_outcome_prices (market_id, outcome_id, price)
      SELECT pb.market_id, pb.outcome_id, CASE WHEN totals.total_balance > 0 THEN pb.balance / totals.total_balance ELSE 0 END AS price
      FROM pool_balances pb
          JOIN (
          SELECT market_id, SUM (balance) AS total_balance FROM pool_balances WHERE market_id = ${params.market_id}::uuid GROUP BY market_id
          ) totals
      ON totals.market_id = pb.market_id
      WHERE pb.market_id = ${params.market_id}::uuid
        AND EXISTS (SELECT 1 FROM tx)
          RETURNING market_id
          )
          , link AS (
      UPDATE comments
      SET transaction_id = (SELECT id FROM tx)
      WHERE id = (SELECT id FROM cmt)
        AND EXISTS (SELECT 1 FROM tx) RETURNING id
          )
      SELECT CASE
                 WHEN (SELECT error FROM validate) IS NOT NULL THEN (SELECT error FROM validate)
                 ELSE jsonb_build_object('success', true, 'shares_bought', (SELECT shares_bought FROM calc),
                                         'transaction_id', (SELECT id FROM tx), 'comment_id', (SELECT id FROM cmt))
                 END AS result
	`);
	const rows = rowsOf(res);
	return unwrapSingleColumn(rows[0]) ?? rows[0] ?? null;
}

export async function positionsUndoBet(params: { user_id: string; transaction_id: string }) {
  // prettier-ignore
  const res = await db.execute(sql`
    WITH t AS (
      SELECT id, user_id, market_id, outcome_id, amount_credits, shares_change, created_at
      FROM transactions
      WHERE id = ${params.transaction_id}::uuid
        AND user_id = ${params.user_id}::uuid
        AND type = 'BUY'
        AND refunded_at IS NULL
    ), m AS (
      SELECT id, closed_at, expires_at, resolution_outcome_id
      FROM markets
      WHERE id = (SELECT market_id FROM t)
    ), validate AS (
      SELECT CASE
        WHEN (SELECT id FROM t) IS NULL THEN jsonb_build_object('error', 'Transaction not found or not undoable')
        WHEN (SELECT resolution_outcome_id FROM m) IS NOT NULL OR (SELECT closed_at FROM m) IS NOT NULL OR ((SELECT expires_at FROM m) IS NOT NULL AND now() >= (SELECT expires_at FROM m)) THEN jsonb_build_object('error', 'Market is closed for trading.')
        ELSE NULL
      END AS error
    ), user_update AS (
      UPDATE users
      SET balance_credits = COALESCE(balance_credits,0) + (SELECT amount_credits FROM t),
          pending_bets_count = GREATEST(COALESCE(pending_bets_count,0) - 1, 0),
          updated_at = now()
      WHERE id = ${params.user_id}::uuid
        AND (SELECT error FROM validate) IS NULL
        AND EXISTS (SELECT 1 FROM t)
      RETURNING id
    ), pos AS (
      UPDATE positions
      SET shares = COALESCE(positions.shares,0) - (SELECT shares_change FROM t),
          updated_at = now()
      WHERE user_id = ${params.user_id}::uuid
        AND market_id = (SELECT market_id FROM t)
        AND outcome_id = (SELECT outcome_id FROM t)
        AND (SELECT error FROM validate) IS NULL
      RETURNING user_id
    ), pool_update AS (
      UPDATE pool_balances
      SET balance = COALESCE(balance,0) - (SELECT amount_credits FROM t)
      WHERE market_id = (SELECT market_id FROM t)
        AND outcome_id = (SELECT outcome_id FROM t)
        AND (SELECT error FROM validate) IS NULL
      RETURNING market_id
    ), k_upd AS (
      UPDATE pools
      SET k_constant = (
        SELECT EXP(SUM(LN(balance))) FROM pool_balances WHERE market_id = (SELECT market_id FROM t)
      )
      WHERE market_id = (SELECT market_id FROM t)
        AND (SELECT error FROM validate) IS NULL
      RETURNING market_id
    ), price_hist AS (
      INSERT INTO market_outcome_prices (market_id, outcome_id, price)
      SELECT pb.market_id, pb.outcome_id,
             CASE WHEN totals.total_balance > 0 THEN pb.balance / totals.total_balance ELSE 0 END AS price
      FROM pool_balances pb
      JOIN (
        SELECT market_id, SUM(balance) AS total_balance
        FROM pool_balances
        WHERE market_id = (SELECT market_id FROM t)
        GROUP BY market_id
      ) totals ON totals.market_id = pb.market_id
      WHERE pb.market_id = (SELECT market_id FROM t)
        AND (SELECT error FROM validate) IS NULL
      RETURNING market_id
    ), mark_refund AS (
      UPDATE transactions
      SET refunded_at = now()
      WHERE id = (SELECT id FROM t)
        AND (SELECT error FROM validate) IS NULL
      RETURNING id
    ), refund_comment AS (
      INSERT INTO comments (user_id, market_id, content)
      SELECT user_id, market_id, '' FROM t
      WHERE (SELECT error FROM validate) IS NULL
      RETURNING id
    ), refund_record AS (
      INSERT INTO transactions (user_id, market_id, type, outcome_id, amount_credits, shares_change, original_tx_id, comment_id)
      SELECT t.user_id, t.market_id, 'REFUND', t.outcome_id, t.amount_credits, -t.shares_change, t.id, (SELECT id FROM refund_comment)
      FROM t
      WHERE (SELECT error FROM validate) IS NULL
      RETURNING id
    )
    SELECT CASE
      WHEN (SELECT error FROM validate) IS NOT NULL THEN (SELECT error FROM validate)
      ELSE jsonb_build_object('success', true, 'undone', true, 'transaction_id', (SELECT id FROM t))
    END AS result
  `);
  const rows = rowsOf(res);
  return unwrapSingleColumn(rows[0]) ?? rows[0] ?? null;
}

export async function positionsClaimResolved(userId: string, marketId: string) {
	// prettier-ignore
	const res = await db.execute(sql`
      WITH validation AS (SELECT ${userId}::uuid AS user_id, ${marketId}::uuid AS market_id, CASE
                                                                                                 WHEN ${userId}::uuid IS NULL OR ${marketId}::uuid IS NULL
          THEN
          jsonb_build_object('error'
         , 'user_id and market_id are required')
          ELSE NULL
      END
      AS param_error
    ),
    market_info AS (
      SELECT 
        resolution_outcome_id,
        resolved_total_winning_shares,
        pot_credits,
        CASE 
          WHEN resolution_outcome_id IS NULL THEN jsonb_build_object('error', 'Market is not resolved')
          ELSE NULL
        END AS resolution_error
      FROM markets 
      WHERE id =
      ${marketId}
      :
      :
      uuid
      ),
      user_positions
      AS
      (
      SELECT
      COALESCE
      (
      SUM
      (
      p
      .
      shares
      ),
      0
      )
      AS
      user_winning_shares
      FROM
      positions
      p
      CROSS
      JOIN
      market_info
      mi
      WHERE
      p
      .
      user_id
      =
      ${userId}
      :
      :
      uuid
      AND
      p
      .
      market_id
      =
      ${marketId}
      :
      :
      uuid
      AND
      p
      .
      outcome_id
      =
      mi
      .
      resolution_outcome_id
      ),
      winning_calculation
      AS
      (
      SELECT
      up
      .
      user_winning_shares,
      CASE
      WHEN
      up
      .
      user_winning_shares
      IS
      NULL
      OR
      up
      .
      user_winning_shares
      <=
      0
      THEN
      jsonb_build_object
      (
      'success',
      true,
      'claimed',
      0
      )
      ELSE
      NULL
      END
      AS
      no_shares_result,
      COALESCE
      (
      mi
      .
      resolved_total_winning_shares,
      0
      )
      AS
      total_winning_shares,
      COALESCE
      (
      mi
      .
      pot_credits,
      0
      )
      AS
      total_pot
      FROM
      user_positions
      up
      CROSS
      JOIN
      market_info
      mi
      ),
      fallback_totals
      AS
      (
      SELECT
      wc
      .
      *,
      CASE
      WHEN
      wc
      .
      total_winning_shares
      <=
      0
      THEN
      COALESCE
      (
      (
      SELECT
      SUM
      (
      p
      .
      shares
      )
      FROM
      positions
      p
      CROSS
      JOIN
      market_info
      mi
      WHERE
      p
      .
      market_id
      =
      ${marketId}
      :
      :
      uuid
      AND
      p
      .
      outcome_id
      =
      mi
      .
      resolution_outcome_id
      ),
      0
      )
      ELSE
      wc
      .
      total_winning_shares
      END
      AS
      final_total_winning_shares,
      CASE
      WHEN
      wc
      .
      total_pot
      <
      0
      THEN
      COALESCE
      (
      (
      SELECT
      SUM
      (
      amount_credits
      )
      FROM
      transactions
      WHERE
      market_id
      =
      ${marketId}
      :
      :
      uuid
      AND
      type
      =
      'BUY'
      ),
      0
      )
      ELSE
      wc
      .
      total_pot
      END
      AS
      final_total_pot
      FROM
      winning_calculation
      wc
      ),
      payout_calc
      AS
      (
      SELECT
      ft
      .
      *,
      CASE
      WHEN
      ft
      .
      final_total_winning_shares
      <=
      0
      THEN
      jsonb_build_object
      (
      'error',
      'No outstanding winning shares'
      )
      ELSE
      NULL
      END
      AS
      winning_shares_error,
      (
      ft
      .
      final_total_pot
      *
      ft
      .
      user_winning_shares
      ) /
      NULLIF
      (
      ft
      .
      final_total_winning_shares,
      0
      )
      AS
      payout
      FROM
      fallback_totals
      ft
      ),
      position_clear
      AS
      (
      UPDATE
      positions
      SET
      shares
      =
      0,
      updated_at
      =
      NOW
      (
      )
      WHERE
      user_id
      =
      ${userId}
      :
      :
      uuid
      AND
      market_id
      =
      ${marketId}
      :
      :
      uuid
      AND
      (
      SELECT
      no_shares_result
      FROM
      winning_calculation
      )
      IS
      NULL
      AND
      (
      SELECT
      winning_shares_error
      FROM
      payout_calc
      )
      IS
      NULL
      AND
      COALESCE
      (
      (
      SELECT
      param_error
      FROM
      validation
      ),
      (
      SELECT
      resolution_error
      FROM
      market_info
      )
      )
      IS
      NULL
      RETURNING
      user_id
      ),
      user_balance_update
      AS
      (
      UPDATE
      users
      SET
      balance_credits
      =
      COALESCE
      (
      balance_credits,
      0
      )
      +
      (
      SELECT
      payout
      FROM
      payout_calc
      ),
      updated_at
      =
      NOW
      (
      )
      WHERE
      id
      =
      ${userId}
      :
      :
      uuid
      AND
      EXISTS
      (
      SELECT
      1
      FROM
      position_clear
      )
      RETURNING
      id
      ),
      comment_insert
      AS
      (
      INSERT
      INTO
      comments
      (
      user_id,
      market_id,
      content
      )
      SELECT
      ${userId}
      :
      :
      uuid,
      ${marketId}
      :
      :
      uuid,
      ''
      WHERE
      EXISTS
      (
      SELECT
      1
      FROM
      user_balance_update
      )
      AND
      (
      SELECT
      no_shares_result
      FROM
      winning_calculation
      )
      IS
      NULL
      AND
      (
      SELECT
      winning_shares_error
      FROM
      payout_calc
      )
      IS
      NULL
      AND
      COALESCE
      (
      (
      SELECT
      param_error
      FROM
      validation
      ),
      (
      SELECT
      resolution_error
      FROM
      market_info
      )
      )
      IS
      NULL
      RETURNING
      id
      ),
      transaction_insert
      AS
      (
      INSERT
      INTO
      transactions
      (
      user_id,
      market_id,
      type,
      amount_credits,
      shares_change,
      comment_id
      )
      SELECT
      ${userId}
      :
      :
      uuid,
      ${marketId}
      :
      :
      uuid,
      'CLAIM',
      (
      SELECT
      payout
      FROM
      payout_calc
      ),
      -
      (
      SELECT
      user_winning_shares
      FROM
      payout_calc
      ),
      (
      SELECT
      id
      FROM
      comment_insert
      )
      WHERE
      EXISTS
      (
      SELECT
      1
      FROM
      user_balance_update
      )
      AND
      EXISTS
      (
      SELECT
      1
      FROM
      comment_insert
      )
      RETURNING
      id
      ),
      comment_link
      AS
      (
      UPDATE
      comments
      SET
      transaction_id
      =
      (
      SELECT
      id
      FROM
      transaction_insert
      )
      WHERE
      id
      =
      (
      SELECT
      id
      FROM
      comment_insert
      )
      AND
      EXISTS
      (
      SELECT
      1
      FROM
      transaction_insert
      )
      RETURNING
      id
      )
      SELECT CASE
                 WHEN (SELECT param_error FROM validation) IS NOT NULL THEN (SELECT param_error FROM validation)
                 WHEN (SELECT resolution_error FROM market_info) IS NOT NULL
                     THEN (SELECT resolution_error FROM market_info)
                 WHEN (SELECT no_shares_result FROM winning_calculation) IS NOT NULL
                     THEN (SELECT no_shares_result FROM winning_calculation)
                 WHEN (SELECT winning_shares_error FROM payout_calc) IS NOT NULL
                     THEN (SELECT winning_shares_error FROM payout_calc)
                 ELSE jsonb_build_object(
                         'success', true,
                         'claimed', (SELECT payout FROM payout_calc),
                         'positions_updated', CASE WHEN EXISTS(SELECT 1 FROM position_clear) THEN 1 ELSE 0 END
                      )
                 END AS result
	`);
	const rows = rowsOf(res);
	return unwrapSingleColumn(rows[0]) ?? rows[0] ?? null;
}

export async function walletTransactionsDeposit(params: {
	user_id: string;
	amount: number;
	tx_hash?: string | null;
	chain_id?: number | null;
	from_address?: string | null;
	to_address?: string | null;
}) {
	// prettier-ignore
	const res = await db.execute(sql`
      WITH ins AS (
      INSERT
      INTO wallet_transactions (user_id, type, amount_credits, tx_hash, chain_id, from_address, to_address)
      VALUES (
          ${params.user_id}::uuid, 'DEPOSIT', ${params.amount}:: numeric, ${params.tx_hash ?? null}, ${params.chain_id ?? null}, ${params.from_address ?? null}, ${params.to_address ?? null}
          )
          RETURNING 1
          ), upd AS (
      UPDATE users
      SET balance_credits = COALESCE (balance_credits, 0) + ${params.amount}:: numeric, updated_at = now()
      WHERE id = ${params.user_id}::uuid
        AND EXISTS (SELECT 1 FROM ins)
          RETURNING balance_credits
          )
      SELECT (SELECT balance_credits FROM upd) AS new_balance
	`);
	const rows = rowsOf<{ new_balance: number }>(res);
	return rows[0] ?? null;
}

export async function marketsClose(marketId: string) {
	// prettier-ignore
	const res = await db.execute(sql`
      WITH validation AS (SELECT ${marketId}::uuid AS market_id, CASE
                                                                     WHEN ${marketId}::uuid IS NULL THEN jsonb_build_object('error', 'market_id is required')
          ELSE NULL
      END
      AS param_error
    ),
    market_check AS (
      SELECT 
        EXISTS(SELECT 1 FROM markets WHERE id =
      ${marketId}
      :
      :
      uuid
      )
      AS
      market_exists,
      CASE
      WHEN
      NOT
      EXISTS
      (
      SELECT
      1
      FROM
      markets
      WHERE
      id
      =
      ${marketId}
      :
      :
      uuid
      )
      THEN
      jsonb_build_object
      (
      'error',
      'Market not found'
      )
      ELSE
      NULL
      END
      AS
      market_error
      ),
      market_update
      AS
      (
      UPDATE
      markets
      SET
      closed_at
      =
      NOW
      (
      )
      WHERE
      id
      =
      ${marketId}
      :
      :
      uuid
      AND
      (
      SELECT
      param_error
      FROM
      validation
      )
      IS
      NULL
      AND
      (
      SELECT
      market_error
      FROM
      market_check
      )
      IS
      NULL
      RETURNING
      id
      )
      SELECT CASE
                 WHEN (SELECT param_error FROM validation) IS NOT NULL THEN (SELECT param_error FROM validation)
                 WHEN (SELECT market_error FROM market_check) IS NOT NULL THEN (SELECT market_error FROM market_check)
                 ELSE jsonb_build_object('success', true)
                 END AS result
	`);
	const rows = rowsOf(res);
	return unwrapSingleColumn(rows[0]) ?? rows[0] ?? null;
}

export async function marketsResolve(marketId: string, outcomeId: string) {
	// prettier-ignore
	const res = await db.execute(sql`
      WITH validation AS (SELECT ${marketId}::uuid AS market_id, ${outcomeId}::uuid AS outcome_id, CASE
                                                                                                       WHEN ${marketId}::uuid IS NULL OR ${outcomeId}::uuid IS NULL
          THEN
          jsonb_build_object('error'
         , 'market_id and outcome_id are required')
          ELSE NULL
      END
      AS param_error
    ),
    market_info AS (
      SELECT 
        m.id,
        m.resolution_outcome_id AS prev_resolution,
        CASE 
          WHEN m.id IS NULL THEN jsonb_build_object('error', 'Market not found')
          ELSE NULL
        END AS market_error
      FROM markets m
      WHERE m.id =
      ${marketId}
      :
      :
      uuid
      ),
      outcome_check
      AS
      (
      SELECT
      EXISTS
      (
      SELECT
      1
      FROM
      outcomes
      WHERE
      id
      =
      ${outcomeId}
      :
      :
      uuid
      AND
      market_id
      =
      ${marketId}
      :
      :
      uuid
      )
      AS
      outcome_belongs,
      CASE
      WHEN
      NOT
      EXISTS
      (
      SELECT
      1
      FROM
      outcomes
      WHERE
      id
      =
      ${outcomeId}
      :
      :
      uuid
      AND
      market_id
      =
      ${marketId}
      :
      :
      uuid
      )
      THEN
      jsonb_build_object
      (
      'error',
      'Outcome does not belong to market'
      )
      ELSE
      NULL
      END
      AS
      outcome_error
      ),
      pot_calc
      AS
      (
      SELECT
      COALESCE
      (
      SUM
      (
      amount_credits
      ),
      0
      )
      AS
      pot_credits
      FROM
      transactions
      WHERE
      market_id
      =
      ${marketId}
      :
      :
      uuid
      AND
      type
      =
      'BUY'
      AND
      refunded_at
      IS
      NULL
      ),
      winning_shares_calc
      AS
      (
      SELECT
      COALESCE
      (
      SUM
      (
      shares
      ),
      0
      )
      AS
      total_winning_shares
      FROM
      positions
      WHERE
      market_id
      =
      ${marketId}
      :
      :
      uuid
      AND
      outcome_id
      =
      ${outcomeId}
      :
      :
      uuid
      ),
      market_resolution
      AS
      (
      UPDATE
      markets
      SET
      resolution_outcome_id
      =
      ${outcomeId}
      :
      :
      uuid,
      closed_at
      =
      COALESCE
      (
      closed_at,
      NOW
      (
      )
      ),
      pot_credits
      =
      (
      SELECT
      pot_credits
      FROM
      pot_calc
      ),
      resolved_total_winning_shares
      =
      (
      SELECT
      total_winning_shares
      FROM
      winning_shares_calc
      )
      WHERE
      id
      =
      ${marketId}
      :
      :
      uuid
      AND
      (
      SELECT
      param_error
      FROM
      validation
      )
      IS
      NULL
      AND
      (
      SELECT
      market_error
      FROM
      market_info
      )
      IS
      NULL
      AND
      (
      SELECT
      outcome_error
      FROM
      outcome_check
      )
      IS
      NULL
      RETURNING
      id
      ),
      pending_bets_update
      AS
      (
      UPDATE
      users
      u
      SET
      pending_bets_count
      =
      GREATEST
      (
      0,
      u
      .
      pending_bets_count
      -
      t
      .
      c
      ),
      updated_at
      =
      NOW
      (
      )
      FROM
      (
      SELECT
      user_id,
      COUNT
      (
      *
      )
      :
      :
      int
      AS
      c
      FROM
      transactions
      WHERE
      market_id
      =
      ${marketId}
      :
      :
      uuid
      AND
      type
      =
      'BUY'
      AND
      refunded_at
      IS
      NULL
      GROUP
      BY
      user_id
      )
      t
      WHERE
      u
      .
      id
      =
      t
      .
      user_id
      AND
      EXISTS
      (
      SELECT
      1
      FROM
      market_resolution
      )
      AND
      (
      SELECT
      prev_resolution
      FROM
      market_info
      )
      IS
      NULL
      RETURNING
      u
      .
      id
      ),
      correct_bets_update
      AS
      (
      UPDATE
      users
      u
      SET
      correct_bets_count
      =
      u
      .
      correct_bets_count
      +
      t
      .
      c,
      updated_at
      =
      NOW
      (
      )
      FROM
      (
      SELECT
      user_id,
      COUNT
      (
      *
      )
      :
      :
      int
      AS
      c
      FROM
      transactions
      WHERE
      market_id
      =
      ${marketId}
      :
      :
      uuid
      AND
      type
      =
      'BUY'
      AND
      outcome_id
      =
      ${outcomeId}
      :
      :
      uuid
      AND
      refunded_at
      IS
      NULL
      GROUP
      BY
      user_id
      )
      t
      WHERE
      u
      .
      id
      =
      t
      .
      user_id
      AND
      EXISTS
      (
      SELECT
      1
      FROM
      market_resolution
      )
      AND
      (
      SELECT
      prev_resolution
      FROM
      market_info
      )
      IS
      NULL
      RETURNING
      u
      .
      id
      ),
      incorrect_bets_update
      AS
      (
      UPDATE
      users
      u
      SET
      incorrect_bets_count
      =
      u
      .
      incorrect_bets_count
      +
      t
      .
      c,
      updated_at
      =
      NOW
      (
      )
      FROM
      (
      SELECT
      user_id,
      COUNT
      (
      *
      )
      :
      :
      int
      AS
      c
      FROM
      transactions
      WHERE
      market_id
      =
      ${marketId}
      :
      :
      uuid
      AND
      type
      =
      'BUY'
      AND
      outcome_id
      <>
      ${outcomeId}
      :
      :
      uuid
      AND
      refunded_at
      IS
      NULL
      GROUP
      BY
      user_id
      )
      t
      WHERE
      u
      .
      id
      =
      t
      .
      user_id
      AND
      EXISTS
      (
      SELECT
      1
      FROM
      market_resolution
      )
      AND
      (
      SELECT
      prev_resolution
      FROM
      market_info
      )
      IS
      NULL
      RETURNING
      u
      .
      id
      )
      SELECT CASE
                 WHEN (SELECT param_error FROM validation) IS NOT NULL THEN (SELECT param_error FROM validation)
                 WHEN (SELECT market_error FROM market_info) IS NOT NULL THEN (SELECT market_error FROM market_info)
                 WHEN (SELECT outcome_error FROM outcome_check) IS NOT NULL
                     THEN (SELECT outcome_error FROM outcome_check)
                 ELSE jsonb_build_object(
                         'success', true,
                         'pot_credits', (SELECT pot_credits FROM pot_calc),
                         'total_winning_shares', (SELECT total_winning_shares FROM winning_shares_calc)
                      )
                 END AS result
	`);
	const rows = rowsOf(res);
	return rows[0] ?? null;
}

export async function marketsResolveCutoff(marketId: string, outcomeId: string, cutoff: string) {
	// prettier-ignore
	const res = await db.execute(sql`
      WITH validation
          AS (SELECT ${marketId}::uuid AS market_id, ${outcomeId}::uuid AS outcome_id, ${cutoff}::timestamptz AS cutoff_time, CASE
                                                                                                                                  WHEN ${marketId}::uuid IS NULL OR ${outcomeId}::uuid IS NULL
          THEN
          jsonb_build_object('error'
         , 'market_id and outcome_id are required')
          ELSE NULL
      END
      AS param_error
    ),
    market_info AS (
      SELECT 
        m.id,
        m.resolution_outcome_id AS prev_resolution,
        CASE 
          WHEN m.id IS NULL THEN jsonb_build_object('error', 'Market not found')
          ELSE NULL
        END AS market_error
      FROM markets m
      WHERE m.id =
      ${marketId}
      :
      :
      uuid
      ),
      outcome_check
      AS
      (
      SELECT
      EXISTS
      (
      SELECT
      1
      FROM
      outcomes
      WHERE
      id
      =
      ${outcomeId}
      :
      :
      uuid
      AND
      market_id
      =
      ${marketId}
      :
      :
      uuid
      )
      AS
      outcome_belongs,
      CASE
      WHEN
      NOT
      EXISTS
      (
      SELECT
      1
      FROM
      outcomes
      WHERE
      id
      =
      ${outcomeId}
      :
      :
      uuid
      AND
      market_id
      =
      ${marketId}
      :
      :
      uuid
      )
      THEN
      jsonb_build_object
      (
      'error',
      'Outcome does not belong to market'
      )
      ELSE
      NULL
      END
      AS
      outcome_error
      ),
      market_close
      AS
      (
      UPDATE
      markets
      SET
      closed_at
      =
      COALESCE
      (
      closed_at,
      NOW
      (
      )
      )
      WHERE
      id
      =
      ${marketId}
      :
      :
      uuid
      AND
      (
      SELECT
      param_error
      FROM
      validation
      )
      IS
      NULL
      AND
      (
      SELECT
      market_error
      FROM
      market_info
      )
      IS
      NULL
      AND
      (
      SELECT
      outcome_error
      FROM
      outcome_check
      )
      IS
      NULL
      RETURNING
      id
      ),
      refund_transactions
      AS
      (
      SELECT
      t
      .
      id,
      t
      .
      user_id,
      t
      .
      market_id,
      t
      .
      outcome_id,
      t
      .
      amount_credits,
      t
      .
      shares_change,
      ROW_NUMBER
      (
      )
      OVER
      (
      ORDER
      BY
      t
      .
      created_at
      )
      as
      rn
      FROM
      transactions
      t
      WHERE
      t
      .
      market_id
      =
      ${marketId}
      :
      :
      uuid
      AND
      t
      .
      type
      =
      'BUY'
      AND
      t
      .
      created_at
      >
      ${cutoff}
      :
      :
      timestamptz
      AND
      t
      .
      refunded_at
      IS
      NULL
      AND
      ${cutoff}
      :
      :
      timestamptz
      IS
      NOT
      NULL
      AND
      EXISTS
      (
      SELECT
      1
      FROM
      market_close
      )
      ),
      user_refunds
      AS
      (
      UPDATE
      users
      SET
      balance_credits
      =
      COALESCE
      (
      balance_credits,
      0
      )
      +
      rt
      .
      amount_credits,
      pending_bets_count
      =
      GREATEST
      (
      0,
      pending_bets_count
      -
      1
      ),
      updated_at
      =
      NOW
      (
      )
      FROM
      refund_transactions
      rt
      WHERE
      users
      .
      id
      =
      rt
      .
      user_id
      RETURNING
      users
      .
      id,
      rt
      .
      rn
      ),
      position_adjustments
      AS
      (
      UPDATE
      positions
      SET
      shares
      =
      GREATEST
      (
      0,
      COALESCE
      (
      shares,
      0
      )
      -
      rt
      .
      shares_change
      ),
      updated_at
      =
      NOW
      (
      )
      FROM
      refund_transactions
      rt
      WHERE
      positions
      .
      user_id
      =
      rt
      .
      user_id
      AND
      positions
      .
      market_id
      =
      rt
      .
      market_id
      AND
      positions
      .
      outcome_id
      =
      rt
      .
      outcome_id
      RETURNING
      positions
      .
      user_id,
      rt
      .
      rn
      ),
      pool_adjustments
      AS
      (
      UPDATE
      pool_balances
      SET
      balance
      =
      COALESCE
      (
      balance,
      0
      )
      -
      rt
      .
      amount_credits
      FROM
      refund_transactions
      rt
      WHERE
      pool_balances
      .
      market_id
      =
      rt
      .
      market_id
      AND
      pool_balances
      .
      outcome_id
      =
      rt
      .
      outcome_id
      RETURNING
      pool_balances
      .
      market_id,
      rt
      .
      rn
      ),
      transaction_refunds
      AS
      (
      UPDATE
      transactions
      SET
      refunded_at
      =
      NOW
      (
      )
      WHERE
      id
      IN
      (
      SELECT
      id
      FROM
      refund_transactions
      )
      RETURNING
      id
      ),
      refund_records
      AS
      (
      INSERT
      INTO
      transactions
      (
      user_id,
      market_id,
      type,
      outcome_id,
      amount_credits,
      shares_change,
      original_tx_id
      )
      SELECT
      rt
      .
      user_id,
      rt
      .
      market_id,
      'REFUND',
      rt
      .
      outcome_id,
      rt
      .
      amount_credits,
      -
      rt
      .
      shares_change,
      rt
      .
      id
      FROM
      refund_transactions
      rt
      WHERE
      EXISTS
      (
      SELECT
      1
      FROM
      transaction_refunds
      WHERE
      id
      =
      rt
      .
      id
      )
      RETURNING
      id
      ),
      pool_rebalance
      AS
      (
      UPDATE
      pools
      p
      SET
      k_constant
      =
      sub
      .
      k
      FROM
      (
      SELECT
      market_id,
      EXP
      (
      SUM
      (
      LN
      (
      GREATEST
      (
      balance,
      0.0000001
      )
      )
      )
      )
      AS
      k
      FROM
      pool_balances
      WHERE
      market_id
      =
      ${marketId}
      :
      :
      uuid
      GROUP
      BY
      market_id
      )
      sub
      WHERE
      p
      .
      market_id
      =
      sub
      .
      market_id
      AND
      EXISTS
      (
      SELECT
      1
      FROM
      refund_records
      )
      RETURNING
      p
      .
      market_id
      ),
      pot_calc
      AS
      (
      SELECT
      CASE
      WHEN
      ${cutoff}
      :
      :
      timestamptz
      IS
      NOT
      NULL
      THEN
      COALESCE
      (
      (
      SELECT
      SUM
      (
      amount_credits
      )
      FROM
      transactions
      WHERE
      market_id
      =
      ${marketId}
      :
      :
      uuid
      AND
      type
      =
      'BUY'
      AND
      created_at
      <=
      ${cutoff}
      :
      :
      timestamptz
      AND
      refunded_at
      IS
      NULL
      ),
      0
      )
      ELSE
      COALESCE
      (
      (
      SELECT
      SUM
      (
      amount_credits
      )
      FROM
      transactions
      WHERE
      market_id
      =
      ${marketId}
      :
      :
      uuid
      AND
      type
      =
      'BUY'
      AND
      refunded_at
      IS
      NULL
      ),
      0
      )
      END
      AS
      pot_credits
      ),
      winning_shares_calc
      AS
      (
      SELECT
      COALESCE
      (
      SUM
      (
      shares
      ),
      0
      )
      AS
      total_winning_shares
      FROM
      positions
      WHERE
      market_id
      =
      ${marketId}
      :
      :
      uuid
      AND
      outcome_id
      =
      ${outcomeId}
      :
      :
      uuid
      ),
      market_resolution
      AS
      (
      UPDATE
      markets
      SET
      resolution_outcome_id
      =
      ${outcomeId}
      :
      :
      uuid,
      retro_cutoff_at
      =
      ${cutoff}
      :
      :
      timestamptz,
      pot_credits
      =
      (
      SELECT
      pot_credits
      FROM
      pot_calc
      ),
      resolved_total_winning_shares
      =
      (
      SELECT
      total_winning_shares
      FROM
      winning_shares_calc
      )
      WHERE
      id
      =
      ${marketId}
      :
      :
      uuid
      AND
      (
      SELECT
      param_error
      FROM
      validation
      )
      IS
      NULL
      AND
      (
      SELECT
      market_error
      FROM
      market_info
      )
      IS
      NULL
      AND
      (
      SELECT
      outcome_error
      FROM
      outcome_check
      )
      IS
      NULL
      RETURNING
      id
      ),
      pending_bets_update
      AS
      (
      UPDATE
      users
      u
      SET
      pending_bets_count
      =
      GREATEST
      (
      0,
      u
      .
      pending_bets_count
      -
      t
      .
      c
      ),
      updated_at
      =
      NOW
      (
      )
      FROM
      (
      SELECT
      user_id,
      COUNT
      (
      *
      )
      :
      :
      int
      AS
      c
      FROM
      transactions
      WHERE
      market_id
      =
      ${marketId}
      :
      :
      uuid
      AND
      type
      =
      'BUY'
      AND
      refunded_at
      IS
      NULL
      GROUP
      BY
      user_id
      )
      t
      WHERE
      u
      .
      id
      =
      t
      .
      user_id
      AND
      EXISTS
      (
      SELECT
      1
      FROM
      market_resolution
      )
      AND
      (
      SELECT
      prev_resolution
      FROM
      market_info
      )
      IS
      NULL
      RETURNING
      u
      .
      id
      ),
      correct_bets_update
      AS
      (
      UPDATE
      users
      u
      SET
      correct_bets_count
      =
      u
      .
      correct_bets_count
      +
      t
      .
      c,
      updated_at
      =
      NOW
      (
      )
      FROM
      (
      SELECT
      user_id,
      COUNT
      (
      *
      )
      :
      :
      int
      AS
      c
      FROM
      transactions
      WHERE
      market_id
      =
      ${marketId}
      :
      :
      uuid
      AND
      type
      =
      'BUY'
      AND
      outcome_id
      =
      ${outcomeId}
      :
      :
      uuid
      AND
      refunded_at
      IS
      NULL
      GROUP
      BY
      user_id
      )
      t
      WHERE
      u
      .
      id
      =
      t
      .
      user_id
      AND
      EXISTS
      (
      SELECT
      1
      FROM
      market_resolution
      )
      AND
      (
      SELECT
      prev_resolution
      FROM
      market_info
      )
      IS
      NULL
      RETURNING
      u
      .
      id
      ),
      incorrect_bets_update
      AS
      (
      UPDATE
      users
      u
      SET
      incorrect_bets_count
      =
      u
      .
      incorrect_bets_count
      +
      t
      .
      c,
      updated_at
      =
      NOW
      (
      )
      FROM
      (
      SELECT
      user_id,
      COUNT
      (
      *
      )
      :
      :
      int
      AS
      c
      FROM
      transactions
      WHERE
      market_id
      =
      ${marketId}
      :
      :
      uuid
      AND
      type
      =
      'BUY'
      AND
      outcome_id
      <>
      ${outcomeId}
      :
      :
      uuid
      AND
      refunded_at
      IS
      NULL
      GROUP
      BY
      user_id
      )
      t
      WHERE
      u
      .
      id
      =
      t
      .
      user_id
      AND
      EXISTS
      (
      SELECT
      1
      FROM
      market_resolution
      )
      AND
      (
      SELECT
      prev_resolution
      FROM
      market_info
      )
      IS
      NULL
      RETURNING
      u
      .
      id
      )
      SELECT CASE
                 WHEN (SELECT param_error FROM validation) IS NOT NULL THEN (SELECT param_error FROM validation)
                 WHEN (SELECT market_error FROM market_info) IS NOT NULL THEN (SELECT market_error FROM market_info)
                 WHEN (SELECT outcome_error FROM outcome_check) IS NOT NULL
                     THEN (SELECT outcome_error FROM outcome_check)
                 ELSE jsonb_build_object(
                         'success', true,
                         'refunded', COALESCE((SELECT COUNT(*) FROM refund_transactions), 0),
                         'pot_credits', (SELECT pot_credits FROM pot_calc),
                         'total_winning_shares', (SELECT total_winning_shares FROM winning_shares_calc)
                      )
                 END AS result
	`);
	const rows = rowsOf(res);
	return rows[0] ?? null;
}

// Optional helpers for functions not yet used in app
export async function walletTransactionsWithdraw(params: {
	user_id: string;
	amount: number;
	tx_hash?: string | null;
	chain_id?: number | null;
	from_address?: string | null;
	to_address?: string | null;
}) {
	// prettier-ignore
	const res = await db.execute(sql`
      WITH validation AS (SELECT ${params.user_id}::uuid AS user_id, ${params.amount}::numeric AS amount, CASE
                                                                                                              WHEN ${params.user_id}::uuid IS NULL THEN 'p_user_id is required'
          WHEN ${params.amount}:: numeric IS NULL OR ${params.amount}:: numeric <= 0 THEN 'p_amount must be > 0'
          ELSE NULL
      END
      AS error_msg
    ),
    user_balance_check AS (
      SELECT 
        balance_credits,
        CASE 
          WHEN balance_credits IS NULL THEN 'User not found'
          WHEN balance_credits <
      ${params.amount}
      :
      :
      numeric
      THEN
      'Insufficient balance'
      ELSE
      NULL
      END
      AS
      balance_error
      FROM
      users
      WHERE
      id
      =
      ${params.user_id}
      :
      :
      uuid
      ),
      wallet_insert
      AS
      (
      INSERT
      INTO
      wallet_transactions
      (
      user_id,
      type,
      amount_credits,
      tx_hash,
      chain_id,
      from_address,
      to_address
      )
      SELECT
      ${params.user_id}
      :
      :
      uuid,
      'WITHDRAW',
      ${params.amount}
      :
      :
      numeric,
      ${params.tx_hash ?? null}
      :
      :
      text,
      ${params.chain_id ?? null}
      :
      :
      integer,
      ${params.from_address ?? null}
      :
      :
      text,
      ${params.to_address ?? null}
      :
      :
      text
      WHERE
      (
      SELECT
      error_msg
      FROM
      validation
      )
      IS
      NULL
      AND
      (
      SELECT
      balance_error
      FROM
      user_balance_check
      )
      IS
      NULL
      RETURNING
      id
      ),
      user_update
      AS
      (
      UPDATE
      users
      SET
      balance_credits
      =
      COALESCE
      (
      balance_credits,
      0
      )
      -
      ${params.amount}
      :
      :
      numeric,
      updated_at
      =
      NOW
      (
      )
      WHERE
      id
      =
      ${params.user_id}
      :
      :
      uuid
      AND
      EXISTS
      (
      SELECT
      1
      FROM
      wallet_insert
      )
      RETURNING
      balance_credits
      )
      SELECT CASE
                 WHEN (SELECT error_msg FROM validation) IS NOT NULL THEN
                     NULL::numeric
        WHEN (SELECT balance_error FROM user_balance_check) IS NOT NULL THEN 
          NULL::numeric
        ELSE 
          (SELECT balance_credits FROM user_update)
      END
      AS new_balance
	`);
	const rows = rowsOf<{ new_balance: number }>(res);
	return rows[0] ?? null;
}

export async function usersDepositCredits(userId: string, amount: number) {
	// prettier-ignore
	const res = await db.execute(sql`
      WITH validation AS (SELECT ${userId}::uuid AS user_id, ${amount}::numeric AS amount, CASE
                                                                                               WHEN ${userId}::uuid IS NULL THEN 'p_user_id is required'
          WHEN ${amount}:: numeric IS NULL OR ${amount}:: numeric <= 0 THEN 'p_amount must be > 0'
          ELSE NULL
      END
      AS error_msg
    ),
    user_update AS (
      UPDATE users
      SET balance_credits = COALESCE(balance_credits, 0) +
      ${amount}
      :
      :
      numeric,
      updated_at
      =
      NOW
      (
      )
      WHERE
      id
      =
      ${userId}
      :
      :
      uuid
      AND
      (
      SELECT
      error_msg
      FROM
      validation
      )
      IS
      NULL
      RETURNING
      balance_credits
      )
      SELECT CASE
                 WHEN (SELECT error_msg FROM validation) IS NOT NULL THEN
                     NULL::numeric
        ELSE 
          (SELECT balance_credits FROM user_update)
      END
      AS new_balance
	`);
	const rows = rowsOf<{ new_balance: number }>(res);
	return rows[0] ?? null;
}
