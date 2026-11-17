import type { LayoutServerLoad } from './$types';
import { getSessionUser, isAdminUser } from '$lib/server/admin';
import { dev } from '$app/environment';
// Use explicit extension for consistency with the rest of the codebase
import { db, schema, desc } from '$lib/server/db.ts';
import { marketIdQuestionCreatedSelect } from '$lib/server/selects';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const user = await getSessionUser(cookies);
	const allowed = dev || isAdminUser(user);

    // Matches src/lib/ui/admin/RecentMarketsWidget.svelte props
    let recent_markets: Array<{ id: string; question: string; created_at: Date } | { id: string; question: string; created_at: string }> = [];
    if (allowed) {
        try {
            const rows = await db
                .select(marketIdQuestionCreatedSelect)
                .from(schema.markets)
                .orderBy(desc(schema.markets.createdAt))
                .limit(10);
            // Normalize Date -> ISO string for client widget expectations
            recent_markets = (rows as Array<{ id: string; question: string; created_at: Date }>).map((r) => ({
                id: r.id,
                question: r.question,
                created_at: r.created_at instanceof Date ? r.created_at.toISOString() : (r.created_at as unknown as string)
            }));
        } catch {
            recent_markets = [];
        }
    }

	return {
		allowed,
		recent_markets
	};
};
