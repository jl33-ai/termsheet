import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/http';
import { seedDatabase } from '$lib/server/sql/seed.ts';
import { db, schema } from '$lib/server/db.ts';
import { positionsPlaceBet } from '$lib/server/sql/functions.ts';

export const POST: RequestHandler = async ({ cookies }) => {
	const sessionUser = await requireAdmin(cookies);

	try {
		const result = await seedDatabase();

		let userBetsCreated = 0;
		try {
			// Fetch a pool of outcomes to sample from
			const outcomes = await db
				.select({ outcomeId: schema.outcomes.id, marketId: schema.outcomes.marketId })
				.from(schema.outcomes);

			// Simple comment snippets (<=140 chars enforced by SQL)
			const comments = [
				'Leaning into momentum here.',
				'Risk/reward looks attractive at this price.',
				'Positioning for upside surprises.',
				'Macro backdrop supportive; nibbling in.',
				'Counter-consensus take; small size.',
				'Liquidity decent; testing a starter size.',
				'Eye on catalysts next quarter.',
				'Hedging prior exposure on this market.',
				'Valuation and flow set-up look good.',
				'Purely a feeler — tracking developments.'
			];

			if (outcomes.length > 0) {
				for (let i = 0; i < 10; i++) {
					const pick = outcomes[Math.floor(Math.random() * outcomes.length)];
					const amount = Math.floor(Math.random() * 50) + 20;
					const comment = comments[Math.floor(Math.random() * comments.length)];

					const res = await positionsPlaceBet({
						user_id: sessionUser.id,
						market_id: pick.marketId,
						outcome_id: pick.outcomeId,
						amount_credits: amount,
						comment
					});

					if ((res as any)?.success && !(res as any)?.error) userBetsCreated++;
				}
			}
		} catch (e) {
			// Non-fatal: random bets are best-effort
			console.warn('Random bet seeding failed:', e);
		}

		if (result.success) {
			return json({
				success: true,
				message: result.message,
				details: {
					companies_created: result.companies_created,
					users_created: result.users_created,
					markets_created: result.markets_created,
					trades_created: (result as any).trades_created ?? 0,
					external_links_created: (result as any).external_links_created ?? 0,
					user_bets_created: userBetsCreated
				}
			});
		} else {
			return json(
				{
					success: false,
					error: result.error
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error('Seed endpoint error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			},
			{ status: 500 }
		);
	}
};
