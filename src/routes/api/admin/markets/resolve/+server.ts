import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { marketsResolve, marketsResolveCutoff, marketsClose } from '$lib/server/sql/functions.ts';
import { ensureUuid } from '$lib/server/input';
import { requireAdmin, safeJson } from '$lib/server/http';
import type { AdminResolveMarketBody } from '$lib/types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await safeJson<AdminResolveMarketBody>(request);
	const market_id = ensureUuid('market_id', body.market_id);
	const outcome_id = ensureUuid('outcome_id', body.outcome_id);
	const cutoff = typeof body?.cutoff === 'string' ? body.cutoff : '';

	await requireAdmin(cookies);

	// Enforce: market must be closed before resolving. Do both in one call.
	try {
		const res = await marketsClose(market_id);
		if (res && typeof (res as any).error === 'string') {
			const msg = String((res as any).error).toLowerCase();
			const benign = msg.includes('already') || msg.includes('closed');
			if (!benign) throw error(400, (res as any).error);
		}
	} catch (e: any) {
		const msg = String(e?.message || '').toLowerCase();
		if (!(msg.includes('already') || msg.includes('closed'))) {
			throw error(400, 'Failed to close market before resolving');
		}
	}

	const data = cutoff
		? await marketsResolveCutoff(market_id, outcome_id, cutoff)
		: await marketsResolve(market_id, outcome_id);
	if (data?.error) throw error(400, data.error);
	return json(data);
};
