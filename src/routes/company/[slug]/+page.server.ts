import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db, schema, eq } from '$lib/server/db.ts';
import { companyLiteSelect, marketIdQuestionExpiresSelect } from '$lib/server/selects';

export const load: PageServerLoad = async ({ params }) => {
	const { slug } = params;

	// Fetch company data
    const rows = await db
        .select(companyLiteSelect)
        .from(schema.companies)
        .where(eq(schema.companies.slug, slug))
        .limit(1);
    const company = rows?.[0];
    if (!company) {
        throw error(404, 'Company not found');
    }

	// Fetch markets for the company
    const markets = await db
        .select(marketIdQuestionExpiresSelect)
        .from(schema.markets)
        .where(eq(schema.markets.companyId, company.id));

	return {
		company,
        markets: markets ?? []
    };
};
