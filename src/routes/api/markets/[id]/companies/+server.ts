import { error, json } from '@sveltejs/kit';
import { db, schema, eq } from '$lib/server/db.ts';
import { ensureUuid } from '$lib/server/input';
import { companyLiteSelect } from '$lib/server/selects';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
    const marketId = ensureUuid('id', params.id);

    // Prefer many-to-many via market_companies; fall back to markets.company_id
    try {
        const rows = await db
            .select(companyLiteSelect)
            .from(schema.companies)
            .innerJoin(
                schema.marketCompanies,
                eq(schema.companies.id, schema.marketCompanies.companyId)
            )
            .where(eq(schema.marketCompanies.marketId, marketId));

        if (rows.length > 0) return json({ companies: rows });
    } catch (e) {
        // Ignore and try fallback below (likely missing market_companies table)
    }

    // Fallback: use the single company reference on markets
    try {
        const [market] = await db
            .select({ companyId: schema.markets.companyId })
            .from(schema.markets)
            .where(eq(schema.markets.id, marketId));

        if (market?.companyId) {
            const [company] = await db
                .select(companyLiteSelect)
                .from(schema.companies)
                .where(eq(schema.companies.id, market.companyId));

            if (company) return json({ companies: [company] });
        }
        return json({ companies: [] });
    } catch (e) {
        throw error(500, 'Failed to load companies');
    }
};
