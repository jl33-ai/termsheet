import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { positionsPlaceBet } from '$lib/server/sql/functions.ts';
import { db, sql } from '$lib/server/db.ts';
import { requireUser, safeJson } from '$lib/server/http';
import { ensureUuid } from '$lib/server/input';
import type { PlaceBetBody } from '$lib/types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await safeJson<PlaceBetBody>(request);

	const market_id = ensureUuid('market_id', body.market_id);

	const outcome_id = ensureUuid('outcome_id', body.outcome_id);

	const amount_credits = typeof body?.amount_credits === 'number' ? body.amount_credits : 0;
	if (amount_credits <= 0) throw error(400, 'amount_credits must be a positive number');

	const comment = typeof body?.comment === 'string' ? body.comment.trim() : null;

	const { id: user_id } = await requireUser(cookies);

	const data = await positionsPlaceBet({
		user_id,
		market_id,
		outcome_id,
		amount_credits,
		comment
	});

	if (data?.error) {
		throw error(400, data.error);
	}

	// Defensive link: ensure the top-level comment is linked to the new transaction.
	// The SQL function already does this, but we reinforce to avoid any edge-case drift.
    try {
        const txId = (data as { transaction_id?: string } | null | undefined)?.transaction_id;
        const commentId = (data as { comment_id?: string } | null | undefined)?.comment_id;
        if (txId && commentId) {
			await db.execute(sql`
				UPDATE comments
				SET transaction_id = ${txId}::uuid
				WHERE id = ${commentId}::uuid
				  AND (transaction_id IS NULL OR transaction_id <> ${txId}::uuid)
			`);
		}
	} catch {}

	return json(data);
};
