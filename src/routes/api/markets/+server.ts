import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db, schema, asc, desc, sql } from '$lib/server/db.ts';
import { marketsCreate } from '$lib/server/sql/functions.ts';
import type { MarketType, CreateMarketBody } from '$lib/types';
import { requireAdmin, safeJson } from '$lib/server/http';
import { marketIdQuestionCreatedSelect } from '$lib/server/selects';

// GET /api/markets?q=term
export const GET: RequestHandler = async ({ url }) => {
	// accept both `q` and `search` for compatibility
	const raw = url.searchParams.get('q') ?? url.searchParams.get('search') ?? '';
	const term = raw.trim();

	if (!term) {
		const rows = await db
			.select(marketIdQuestionCreatedSelect)
			.from(schema.markets)
			.orderBy(desc(schema.markets.createdAt))
			.limit(5);
		return json({ markets: rows });
	}

	// a real implementation would do something smarter here
	const pattern = `%${term}%`;
	const rows = await db
		.select(marketIdQuestionCreatedSelect)
		.from(schema.markets)
		.where(
			sql`${schema.markets.question}
    ILIKE
    ${pattern}`
		)
		.limit(10);
	return json({ markets: rows });
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	await requireAdmin(cookies);

	const body = await safeJson<CreateMarketBody>(request);

	const question = typeof body?.question === 'string' ? body.question.trim() : '';
	if (!question) throw error(400, 'question is required');

	const market_type = typeof body?.market_type === 'string' ? (body.market_type as MarketType) : '';
	if (!market_type || !['BINARY', 'CATEGORICAL', 'SCALAR_BUCKET'].includes(market_type)) {
		throw error(400, 'valid market_type is required');
	}

	const expires_at = typeof body?.expires_at === 'string' ? body.expires_at : null;
	const rulesRaw = typeof body?.rules === 'string' ? body.rules.trim() : null;
	const rules = rulesRaw && rulesRaw.length > 0 ? rulesRaw : null;
	const thumbRaw = typeof body?.thumbnail_url === 'string' ? body.thumbnail_url.trim() : null;
	const thumbnail_url = thumbRaw && thumbRaw.length > 0 ? thumbRaw : null;

	const company_id =
		typeof body?.company_id === 'string' && body.company_id.length > 0 ? body.company_id : null;

	let outcomes = body?.outcomes;
	if (market_type === 'BINARY') {
		outcomes = [
			{ name: 'Yes', short_code: 'YES' },
			{ name: 'No', short_code: 'NO' }
		];
	}

	if (!Array.isArray(outcomes) || outcomes.length < 2) {
		throw error(400, 'outcomes must be an array of at least 2 items');
	}

    // optional admin-curated heat score (1-5)
    let heat_score: number | null = null;
    if (typeof body?.heat_score !== 'undefined' && body?.heat_score !== null) {
        const n = Number(body.heat_score);
        if (!Number.isNaN(n)) {
            const clamped = Math.max(1, Math.min(5, Math.floor(n)));
            heat_score = clamped;
        }
    }

    const result = await marketsCreate({
        question,
        market_type,
        expires_at,
        outcomes,
        company_id,
        rules,
        thumbnail_url,
        heat_score
    });
    // markets_create returns a JSON object (unwrapped in util)
    const out = (result?.[0] ?? result);

    // If a company was provided, also ensure the join row exists
    try {
        if (company_id && out?.market_id) {
            await db
                .insert(schema.marketCompanies)
                .values({ marketId: out.market_id, companyId: company_id })
                .onConflictDoNothing({
                    target: [schema.marketCompanies.marketId, schema.marketCompanies.companyId]
                });
        }
    } catch {
        // Ignore join errors so market creation still succeeds
    }

    return json(out);
};
