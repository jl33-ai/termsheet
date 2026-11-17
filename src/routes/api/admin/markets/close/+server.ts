import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { marketsClose } from '$lib/server/sql/functions.ts';
import { ensureUuid } from '$lib/server/input';
import { requireAdmin, safeJson } from '$lib/server/http';
import type { AdminCloseMarketBody } from '$lib/types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await safeJson<AdminCloseMarketBody>(request);
	const market_id = ensureUuid('market_id', body.market_id);

	await requireAdmin(cookies);

	const data = await marketsClose(market_id);
	if (data?.error) throw error(400, data.error);
	return json(data);
};
