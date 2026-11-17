import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db, schema, asc, eq } from '$lib/server/db.ts';
import { requireAdmin, safeJson } from '$lib/server/http';
import type { CreateCompanyBody } from '$lib/types';
import { DEFAULT_MARKET_TEMPLATES } from '$lib/config/default-markets';
import { marketsCreate } from '$lib/server/sql/functions.ts';
import { companyBasicSelect } from '$lib/server/selects';

// GET /api/companies
export const GET: RequestHandler = async () => {
	const rows = await db
		.select(companyBasicSelect)
		.from(schema.companies)
		.orderBy(asc(schema.companies.name));
	return json({ companies: rows });
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	await requireAdmin(cookies);

	const body = await safeJson<CreateCompanyBody>(request);

	const name = typeof body?.name === 'string' ? body.name.trim() : '';
	if (!name) throw error(400, 'name is required');

	const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';
	if (!slug) throw error(400, 'slug is required');

	// Check if slug already exists
	const existingCompany = await db
		.select({ id: schema.companies.id })
		.from(schema.companies)
		.where(eq(schema.companies.slug, slug))
		.limit(1);

	if (existingCompany.length > 0) {
		throw error(400, 'Company with this slug already exists');
	}

    const bio = typeof body?.bio === 'string' ? body.bio.trim() : '';
    const logo_url = typeof body?.logo_url === 'string' ? body.logo_url.trim() : '';
    const create_default_markets = Boolean(body?.create_default_markets);
    const default_market_indexes_raw = Array.isArray(body?.default_market_indexes)
        ? body.default_market_indexes
        : [];

	const rows = await db
		.insert(schema.companies)
		.values({ name, slug, bio, logoUrl: logo_url || null })
		.returning({ id: schema.companies.id });

	const inserted = rows?.[0];
	if (!inserted) {
		throw error(500, 'Failed to insert company');
	}

    let markets_created = 0;

    // Compute which default templates to create
    let selectedTemplates = [] as typeof DEFAULT_MARKET_TEMPLATES;
    if (default_market_indexes_raw.length > 0) {
        const uniq = Array.from(new Set(default_market_indexes_raw.map((n) => Number(n))));
        selectedTemplates = uniq
            .filter((i) => Number.isInteger(i) && i >= 0 && i < DEFAULT_MARKET_TEMPLATES.length)
            .map((i) => DEFAULT_MARKET_TEMPLATES[i]);
    } else if (create_default_markets) {
        selectedTemplates = DEFAULT_MARKET_TEMPLATES;
    }

    if (selectedTemplates.length > 0) {
        for (const template of selectedTemplates) {
            const question = template.question.replace('[company_name]', name);
            const expires_at =
                template.expires_months && template.expires_months > 0
                    ? new Date(Date.now() + template.expires_months * 30 * 24 * 60 * 60 * 1000).toISOString()
                    : null;

			try {
				const marketData = {
					question,
					market_type: template.market_type,
					expires_at,
					outcomes: template.outcomes || [
						{ name: 'Yes', short_code: 'YES' },
						{ name: 'No', short_code: 'NO' }
					],
					company_id: inserted.id,
					rules: template.rules || null,
					thumbnail_url: null
				};

				console.log(`Creating market for ${name}:`, JSON.stringify(marketData, null, 2));
            		const created = await marketsCreate(marketData);
				const out = (created?.[0] ?? created);
				if (out?.market_id) {
					await db
						.insert(schema.marketCompanies)
						.values({ marketId: out.market_id, companyId: inserted.id })
						.onConflictDoNothing({
							target: [schema.marketCompanies.marketId, schema.marketCompanies.companyId]
						});
				}
				markets_created++;
			} catch (err) {
				console.error(`Failed to create default market "${question}" for company ${name}:`, err);
			}
		}
	}

	return json({
		id: inserted.id,
		markets_created,
		company_url: `/company/${slug}`
	});
};
