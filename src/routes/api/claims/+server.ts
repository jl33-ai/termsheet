import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { positionsClaimResolved } from '$lib/server/sql/functions.ts';
import { ensureUuid } from '$lib/server/input';
import { requireUser, safeJson } from '$lib/server/http';
import type { ClaimBody } from '$lib/types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await safeJson<ClaimBody>(request);
	const market_id = ensureUuid('market_id', body.market_id);

	const { id: userId } = await requireUser(cookies);

	// Call Postgres function positions_claim_resolved(user_id, market_id)
	const row = await positionsClaimResolved(userId, market_id);
	if (row?.error) throw error(400, row.error as string);
	return json(row ?? { success: true });
};
