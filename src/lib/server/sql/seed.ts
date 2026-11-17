import { db, sql } from '$lib/server/db.ts';
import { rowsOf } from '$lib/server/sql/util.ts';
import { marketsCreate, walletTransactionsDeposit, positionsPlaceBet } from '$lib/server/sql/functions.ts';

export async function seedDatabase() {
	try {
		// Ensure required companies exist
		await db.execute(sql`
      INSERT INTO companies (id, slug, name, bio, logo_url) VALUES
        ('6c7a1a5b-6e2d-4d86-9b3e-9d9d7a1f4a11', 'cluely', 'Cluely', 'Cluely builds AI-driven tooling for ambitious teams.', 'https://dummyimage.com/240x240/111827/ffffff.png&text=C'),
        ('7f3e2a9c-5c16-47f1-9c4a-2b5c0a6a9d77', 'bolttech', 'BoltTech', 'Full‑stack data infra for modern startups.', 'https://dummyimage.com/240x240/111827/ffffff.png&text=B'),
        ('a1b2c3d4-5e6f-7890-a1b2-c3d4e5f67890', 'openai', 'OpenAI', 'AI research and deployment company on a mission to ensure AGI benefits all.', 'https://dummyimage.com/240x240/111827/ffffff.png&text=O'),
        ('b2c3d4e5-6f78-9012-3456-789012345678', 'anthropic', 'Anthropic', 'AI safety company developing safe, beneficial AI systems.', 'https://dummyimage.com/240x240/111827/ffffff.png&text=A'),
        ('c3d4e5f6-7890-1234-5678-901234567890', 'stripe', 'Stripe', 'Financial infrastructure for the internet.', 'https://dummyimage.com/240x240/111827/ffffff.png&text=S'),
        ('d4e5f678-9012-3456-7890-123456789012', 'spacex', 'SpaceX', 'Advancing space technology to make life multiplanetary.', 'https://dummyimage.com/240x240/111827/ffffff.png&text=X'),
        ('e5f67890-1234-5678-9012-345678901234', 'cursor', 'Cursor', 'The AI-first code editor.', 'https://dummyimage.com/240x240/111827/ffffff.png&text=C'),
        ('f6789012-3456-7890-1234-567890123456', 'aws', 'Amazon Web Services', 'Comprehensive and broadly adopted cloud platform.', 'https://dummyimage.com/240x240/111827/ffffff.png&text=AWS'),
        ('a7890123-4567-8901-2345-67890123456a', 'microsoft', 'Microsoft', 'Empowering every person and organization on the planet to achieve more.', 'https://dummyimage.com/240x240/111827/ffffff.png&text=M')
      ON CONFLICT (slug) DO NOTHING
    `);

		// Ensure seed users exist
		await db.execute(sql`
      INSERT INTO users (x_user_id, x_username, username, x_name, x_avatar_url, bio, balance_credits) VALUES
        ('seed:test', 'dev_builder', 'dev', 'Dev Builder', 'https://i.pravatar.cc/150?img=11', 'Generalist engineer. Shipping daily.', 10000),
        ('seed:alice', 'pmarca', 'pmarca', 'Marc Andreessen', 'https://i.pravatar.cc/150?img=32', 'VC and technologist. Product, power laws, and optimism.', 5200),
        ('seed:bob', 'naval', 'naval', 'Naval Ravikant', 'https://i.pravatar.cc/150?img=5', 'Angel investor. Build wealth, health, and happiness.', 3400),
        ('seed:charlie', 'balajis', 'balajis', 'Balaji Srinivasan', 'https://i.pravatar.cc/150?img=15', 'Founder, investor. Networks, crypto, and the future.', 2100),
        ('seed:diana', 'sarahguo', 'sarahguo', 'Sarah Guo', 'https://i.pravatar.cc/150?img=47', 'VC. AI products and go-to-market.', 1800)
      ON CONFLICT (x_user_id) DO UPDATE SET 
        x_username = EXCLUDED.x_username,
        x_name = EXCLUDED.x_name,
        x_avatar_url = COALESCE(users.x_avatar_url, EXCLUDED.x_avatar_url),
        bio = COALESCE(users.bio, EXCLUDED.bio),
        balance_credits = EXCLUDED.balance_credits
    `);

		// Create sample markets using the marketsCreate function
		let marketsCreated = 0;
		const [stripeMarket] = await marketsCreate({
			question: 'Will Stripe IPO by the end of 2025?',
			market_type: 'BINARY',
			expires_at: '2025-12-31T23:59:59.000Z',
			outcomes: [
				{ name: 'Yes', short_code: 'YES', color_hex: '#22c55e' },
				{ name: 'No', short_code: 'NO', color_hex: '#ef4444' }
			],
			company_id: '121b373e-3632-4061-9f5e-18c6453de21c',
			rules:
				'Resolves YES if Stripe completes an IPO (traditional or direct listing) on a major exchange by 2025-12-31 23:59:59 UTC. SPAC/merger transactions do not count. Otherwise resolves NO.',
			thumbnail_url:
				'https://images.unsplash.com/photo-1556745753-b2904692b3cd?q=80&w=1200&auto=format&fit=crop'
		});
		marketsCreated++;

		const [btcMarket] = await marketsCreate({
			question: 'Will Bitcoin trade above $100,000 before the end of 2026?',
			market_type: 'BINARY',
			expires_at: '2026-12-31T23:59:59.000Z',
			outcomes: [
				{ name: 'Yes', short_code: 'YES', color_hex: '#22c55e' },
				{ name: 'No', short_code: 'NO', color_hex: '#ef4444' }
			],
			company_id: '121b373e-3632-4061-9f5e-18c6453de21c',
			rules:
				'Resolves YES if BTC/USD on a reputable exchange prints a trade at or above $100,000 prior to the deadline. Otherwise NO.',
			thumbnail_url:
				'https://images.unsplash.com/photo-1621417052236-8c90883c4c08?q=80&w=1200&auto=format&fit=crop'
		});
		marketsCreated++;

		const [aiMarket] = await marketsCreate({
			question: 'Which model will rank #1 on LMSYS Chatbot Arena by June 30, 2025?',
			market_type: 'CATEGORICAL',
			expires_at: '2025-06-30T23:59:59.000Z',
			outcomes: [
				{ name: 'GPT‑5', short_code: 'GPT5', color_hex: '#10b981' },
				{ name: 'Claude', short_code: 'CLAUDE', color_hex: '#f59e0b' },
				{ name: 'Llama', short_code: 'LLAMA', color_hex: '#3b82f6' },
				{ name: 'Gemini', short_code: 'GEMINI', color_hex: '#8b5cf6' }
			],
			company_id: '121b373e-3632-4061-9f5e-18c6453de21c',
			rules:
				'Resolves to the model holding the #1 spot on the Chatbot Arena leaderboard at the resolution time.',
			thumbnail_url:
				'https://images.unsplash.com/photo-1697442172442-cb6a4f0b2f6b?q=80&w=1200&auto=format&fit=crop'
		});
		marketsCreated++;

		// Three more markets for variety
		const [spacexMarket] = await marketsCreate({
			question: 'Will SpaceX complete a successful orbital Starship reentry by Q4 2025?',
			market_type: 'BINARY',
			expires_at: '2025-12-31T23:59:59.000Z',
			outcomes: [
				{ name: 'Yes', short_code: 'YES', color_hex: '#22c55e' },
				{ name: 'No', short_code: 'NO', color_hex: '#ef4444' }
			],
			company_id: 'd4e5f678-9012-3456-7890-123456789012',
			rules:
				"Resolves YES if SpaceX completes a Starship flight with controlled reentry and splashdown/landing, confirmed by SpaceX or FAA, by the deadline.",
			thumbnail_url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=1200&auto=format&fit=crop'
		});
		marketsCreated++;

		const [openaiRevMarket] = await marketsCreate({
			question: 'Will OpenAI annualized revenue exceed $10B by end of 2026?',
			market_type: 'BINARY',
			expires_at: '2026-12-31T23:59:59.000Z',
			outcomes: [
				{ name: 'Yes', short_code: 'YES', color_hex: '#22c55e' },
				{ name: 'No', short_code: 'NO', color_hex: '#ef4444' }
			],
			company_id: 'a1b2c3d4-5e6f-7890-a1b2-c3d4e5f67890',
			rules:
				'Resolves YES if reputable reporting (company statement or audited figures) shows annualized run‑rate ≥ $10B by 2026‑12‑31.',
			thumbnail_url: 'https://images.unsplash.com/photo-1581093448799-58d9f56149d3?q=80&w=1200&auto=format&fit=crop'
		});
		marketsCreated++;

		const [cursorMarket] = await marketsCreate({
			question: 'Will Cursor reach 1M monthly active developers by 2025‑12‑31?',
			market_type: 'BINARY',
			expires_at: '2025-12-31T23:59:59.000Z',
			outcomes: [
				{ name: 'Yes', short_code: 'YES', color_hex: '#22c55e' },
				{ name: 'No', short_code: 'NO', color_hex: '#ef4444' }
			],
			company_id: 'e5f67890-1234-5678-9012-345678901234',
			rules:
				"Resolves YES if Cursor publicly reports ≥1,000,000 MAUs (or authenticated active users) by the deadline.",
			thumbnail_url: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1200&auto=format&fit=crop'
		});
		marketsCreated++;

		// Additional markets
		const [starlinkIpo] = await marketsCreate({
			question: 'Will Starlink IPO by the end of 2026?',
			market_type: 'BINARY',
			expires_at: '2026-12-31T23:59:59.000Z',
			outcomes: [
				{ name: 'Yes', short_code: 'YES', color_hex: '#22c55e' },
				{ name: 'No', short_code: 'NO', color_hex: '#ef4444' }
			],
			company_id: 'd4e5f678-9012-3456-7890-123456789012',
			rules: 'Resolves YES if Starlink completes an IPO or direct listing on a major exchange by the deadline.',
			thumbnail_url: 'https://images.unsplash.com/photo-1447433819943-74a20887a81e?q=80&w=1200&auto=format&fit=crop'
		});
		marketsCreated++;

		const [awsTrainium] = await marketsCreate({
			question: 'Will AWS announce Trainium 3 GA by 2025‑12‑31?',
			market_type: 'BINARY',
			expires_at: '2025-12-31T23:59:59.000Z',
			outcomes: [
				{ name: 'Yes', short_code: 'YES', color_hex: '#22c55e' },
				{ name: 'No', short_code: 'NO', color_hex: '#ef4444' }
			],
			company_id: 'f6789012-3456-7890-1234-567890123456',
			rules: 'Resolves YES if AWS publicly announces GA availability of Trainium 3 by the deadline.',
			thumbnail_url: 'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=1200&auto=format&fit=crop'
		});
		marketsCreated++;

		const [msftCopilot] = await marketsCreate({
			question: 'Will Microsoft Copilot exceed 50M MAU by 2025‑12‑31?',
			market_type: 'BINARY',
			expires_at: '2025-12-31T23:59:59.000Z',
			outcomes: [
				{ name: 'Yes', short_code: 'YES', color_hex: '#22c55e' },
				{ name: 'No', short_code: 'NO', color_hex: '#ef4444' }
			],
			company_id: 'a7890123-4567-8901-2345-67890123456a',
			rules: 'Resolves YES if Microsoft reports ≥50M monthly active users for Copilot by the deadline.',
			thumbnail_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop'
		});
		marketsCreated++;

		const [cloudLeader] = await marketsCreate({
			question: 'Which cloud leads AI infra revenue in 2026?',
			market_type: 'CATEGORICAL',
			expires_at: '2026-12-31T23:59:59.000Z',
			outcomes: [
				{ name: 'AWS', short_code: 'AWS', color_hex: '#f59e0b' },
				{ name: 'Azure', short_code: 'AZURE', color_hex: '#3b82f6' },
				{ name: 'GCP', short_code: 'GCP', color_hex: '#22c55e' },
				{ name: 'Other', short_code: 'OTHER', color_hex: '#8b5cf6' }
			],
			company_id: '121b373e-3632-4061-9f5e-18c6453de21c',
			rules: 'Resolves to provider with largest AI infra revenue per reputable industry report by resolution.',
			thumbnail_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop'
		});
		marketsCreated++;

		// Add some initial deposits for seed users
		const seedUserIds = await db.execute(sql`
      SELECT id FROM users WHERE x_user_id IN ('seed:alice', 'seed:bob', 'seed:charlie', 'seed:diana', 'seed:test')
    `);

		for (const user of rowsOf(seedUserIds)) {
			await walletTransactionsDeposit({
				user_id: user.id,
				amount: Math.floor(Math.random() * 500) + 100,
				tx_hash: `0xseed_${user.id.slice(0, 8)}_${Date.now()}`,
				chain_id: 1,
				from_address: '0xSeedAddress',
				to_address: '0xTreasuryAddress'
			});
		}

		// Helper to get outcome id by name for a market
		async function outcomeIdByName(marketId: string, name: string) {
			const res = await db.execute(sql`SELECT id, name FROM outcomes WHERE market_id = ${marketId}::uuid`);
			const outs = rowsOf<{ id: string; name: string }>(res);
			return outs.find((o) => o.name.toLowerCase() === name.toLowerCase())?.id ?? outs[0]?.id;
		}

		// Resolve user ids for easier reference
		const usersRes = await db.execute(sql`SELECT id, username, x_user_id FROM users WHERE x_user_id LIKE 'seed:%'`);
		const users = rowsOf<{ id: string; username: string | null; x_user_id: string }>(usersRes);
		function idOf(xUserId: string) {
			return users.find((u) => u.x_user_id === xUserId)?.id as string;
		}

		// External links helper
		let externalLinksCreated = 0;
		async function addExternalLink(params: {
			source: 'x' | 'hackernews' | 'website';
			url: string;
			label?: string | null;
			authorUsername?: string | null;
			content?: string | null;
			marketId?: string | null;
			transactionId?: string | null;
			xUserId?: string | null;
		}) {
			const res = await db.execute(sql`
			  INSERT INTO external_links (source, url, label, author_username, content, user_id, market_id, transaction_id)
			  VALUES (
			    ${params.source}::external_source,
			    ${params.url},
			    ${params.label ?? null},
			    ${params.authorUsername ?? null},
			    ${params.content ?? null},
			    ${params.xUserId ? idOf(params.xUserId) : null}::uuid,
			    ${params.marketId ?? null}::uuid,
			    ${params.transactionId ?? null}::uuid
			  )
			  ON CONFLICT DO NOTHING
			  RETURNING id
			`);
			if (rowsOf(res).length > 0) externalLinksCreated++;
		}

		async function addReply(marketId: string, parentId: string, xUserId: string, content: string) {
			await db.execute(sql`
			  INSERT INTO comments (market_id, user_id, content, parent_id)
			  VALUES (${marketId}::uuid, ${idOf(xUserId)}::uuid, ${content}, ${parentId}::uuid)
			`);
		}

		async function addLike(commentId: string, xUserId: string) {
			await db.execute(sql`
			  INSERT INTO comment_likes (comment_id, user_id)
			  VALUES (${commentId}::uuid, ${idOf(xUserId)}::uuid)
			  ON CONFLICT (comment_id, user_id) DO NOTHING
			`);
		}

		// Seed trades with realistic comments across all markets
		let tradesCreated = 0;

		// Stripe IPO market
		{
			const yesId = await outcomeIdByName(stripeMarket.market_id, 'Yes');
			const noId = await outcomeIdByName(stripeMarket.market_id, 'No');
			const r1 = await positionsPlaceBet({
				user_id: idOf('seed:alice'),
				market_id: stripeMarket.market_id,
				outcome_id: yesId!,
				amount_credits: 250,
				comment: 'Revenue scale + audited financials. Window is right for 2025.'
			});
			tradesCreated++;
			// Attach market and transaction links
			await addExternalLink({ source: 'website', url: 'https://www.reuters.com/markets/companies/stripe-ipo-watch/', label: 'IPO watch', marketId: stripeMarket.market_id });
			if ((r1 as any)?.transaction_id) {
				await addExternalLink({ source: 'x', url: 'https://x.com/techinvestor/status/1', authorUsername: 'techinvestor', content: 'Hearing Stripe dusting off S‑1 playbook.', transactionId: (r1 as any).transaction_id, xUserId: 'seed:alice' });
			}
			const r2 = await positionsPlaceBet({
				user_id: idOf('seed:bob'),
				market_id: stripeMarket.market_id,
				outcome_id: noId!,
				amount_credits: 180,
				comment: 'Macro is wobbly and private financing remains attractive. Lean NO.'
			});
			tradesCreated++;
			if ((r1 as any)?.comment_id) {
				await addReply(stripeMarket.market_id, (r1 as any).comment_id, 'seed:charlie', 'Agree. Liquidity window opens if markets stay bid.');
				await addLike((r1 as any).comment_id, 'seed:diana');
				await addReply(stripeMarket.market_id, (r1 as any).comment_id, 'seed:test', 'Distribution will be oversubscribed if they go.');
			}
			if ((r2 as any)?.comment_id) {
				await addReply(stripeMarket.market_id, (r2 as any).comment_id, 'seed:alice', 'Counterpoint: payment margins steady; public investors will bid.');
				await addLike((r2 as any).comment_id, 'seed:diana');
			}
		}

		// BTC 100k market
		{
			const yesId = await outcomeIdByName(btcMarket.market_id, 'Yes');
			const r1 = await positionsPlaceBet({
				user_id: idOf('seed:charlie'),
				market_id: btcMarket.market_id,
				outcome_id: yesId!,
				amount_credits: 320,
				comment: 'ETF inflows + halving cycle. Path to 100k is plausible.'
			});
			tradesCreated++;
			await addExternalLink({ source: 'website', url: 'https://www.theblock.co/post/etf-inflows', label: 'ETF inflows tracker', marketId: btcMarket.market_id });
			if ((r1 as any)?.transaction_id) {
				await addExternalLink({ source: 'x', url: 'https://x.com/cryptoquant/status/2', authorUsername: 'cryptoquant', content: 'Funding positive, demand intact into halving.', transactionId: (r1 as any).transaction_id, xUserId: 'seed:charlie' });
			}
			const r2 = await positionsPlaceBet({
				user_id: idOf('seed:diana'),
				market_id: btcMarket.market_id,
				outcome_id: yesId!,
				amount_credits: 150,
				comment: 'Momentum + liquidity regime favors upside tails.'
			});
			tradesCreated++;
			if ((r1 as any)?.comment_id) {
				await addLike((r1 as any).comment_id, 'seed:bob');
				await addReply(btcMarket.market_id, (r1 as any).comment_id, 'seed:alice', 'Hashrate trends still point up, supports your case.');
			}
			if ((r2 as any)?.comment_id) {
				await addReply(btcMarket.market_id, (r2 as any).comment_id, 'seed:test', 'Watch funding rates; froth could fade into Q3.');
				await addLike((r2 as any).comment_id, 'seed:charlie');
			}
		}

		// LMSYS #1 model market (categorical)
		{
			const claudeId = await outcomeIdByName(aiMarket.market_id, 'Claude');
			const gpt5Id = await outcomeIdByName(aiMarket.market_id, 'GPT‑5');
			const r1 = await positionsPlaceBet({
				user_id: idOf('seed:alice'),
				market_id: aiMarket.market_id,
				outcome_id: claudeId!,
				amount_credits: 220,
				comment: 'Strong evals on reasoning and latency. Betting on Claude.'
			});
			tradesCreated++;
			await addExternalLink({ source: 'website', url: 'https://lmsys.org/blog/2024-are-leaderboard/', label: 'Arena leaderboard', marketId: aiMarket.market_id });
			const r2 = await positionsPlaceBet({
				user_id: idOf('seed:test'),
				market_id: aiMarket.market_id,
				outcome_id: gpt5Id!,
				amount_credits: 200,
				comment: 'If GPT‑5 ships, it steals the top slot.'
			});
			tradesCreated++;
			if ((r1 as any)?.comment_id) {
				await addReply(aiMarket.market_id, (r1 as any).comment_id, 'seed:bob', 'Arena is vibe‑sensitive; deployment pace matters more.');
				await addLike((r1 as any).comment_id, 'seed:test');
			}
			if ((r2 as any)?.comment_id) {
				await addLike((r2 as any).comment_id, 'seed:charlie');
				await addReply(aiMarket.market_id, (r2 as any).comment_id, 'seed:diana', 'Leaderboard flips if evals weight reasoning more.');
			}
			if ((r2 as any)?.transaction_id) {
				await addExternalLink({ source: 'x', url: 'https://x.com/ai_evals/status/3', authorUsername: 'ai_evals', content: 'Rumors on next‑gen model evals soon.', transactionId: (r2 as any).transaction_id, xUserId: 'seed:test' });
			}
		}

		// SpaceX Starship reentry market
		{
			const yesId = await outcomeIdByName(spacexMarket.market_id, 'Yes');
			const r1 = await positionsPlaceBet({
				user_id: idOf('seed:bob'),
				market_id: spacexMarket.market_id,
				outcome_id: yesId!,
				amount_credits: 300,
				comment: 'Flight cadence ramping. Reentry hardware iterations are compounding.'
			});
			tradesCreated++;
			if ((r1 as any)?.comment_id) {
				await addReply(spacexMarket.market_id, (r1 as any).comment_id, 'seed:alice', 'FAA schedule risk still non‑trivial.');
				await addLike((r1 as any).comment_id, 'seed:charlie');
				await addReply(spacexMarket.market_id, (r1 as any).comment_id, 'seed:diana', 'Telemetry improving; reentry survivability curve looks good.');
			}
			await addExternalLink({ source: 'x', url: 'https://x.com/SpaceX/status/4', authorUsername: 'SpaceX', content: 'Starship update: iterative testing continues.', marketId: spacexMarket.market_id });
		}

		// OpenAI revenue $10B market
		{
			const yesId = await outcomeIdByName(openaiRevMarket.market_id, 'Yes');
			const noId = await outcomeIdByName(openaiRevMarket.market_id, 'No');
			const r1 = await positionsPlaceBet({
				user_id: idOf('seed:diana'),
				market_id: openaiRevMarket.market_id,
				outcome_id: yesId!,
				amount_credits: 260,
				comment: 'Enterprise expansion + consumer subs. Run‑rate could clear $10B.'
			});
			tradesCreated++;
			const r2 = await positionsPlaceBet({
				user_id: idOf('seed:charlie'),
				market_id: openaiRevMarket.market_id,
				outcome_id: noId!,
				amount_credits: 140,
				comment: 'Capex and margin pressure. Growth yes, but below the bar.'
			});
			tradesCreated++;
			if ((r1 as any)?.comment_id) {
				await addLike((r1 as any).comment_id, 'seed:bob');
				await addReply(openaiRevMarket.market_id, (r1 as any).comment_id, 'seed:alice', 'New SKUs can unlock fresh budget lines.');
			}
			if ((r2 as any)?.comment_id) {
				await addReply(openaiRevMarket.market_id, (r2 as any).comment_id, 'seed:diana', 'Consumption growth + pricing power offsets infra costs.');
				await addLike((r2 as any).comment_id, 'seed:test');
			}
			await addExternalLink({ source: 'website', url: 'https://www.wsj.com/tech/ai/openai-revenue-run-rate', label: 'Revenue run‑rate report', marketId: openaiRevMarket.market_id });
		}

		// Cursor MAU market
		{
			const yesId = await outcomeIdByName(cursorMarket.market_id, 'Yes');
			const r1 = await positionsPlaceBet({
				user_id: idOf('seed:test'),
				market_id: cursorMarket.market_id,
				outcome_id: yesId!,
				amount_credits: 180,
				comment: 'Dev adoption is compounding. Word of mouth is strong.'
			});
			tradesCreated++;
			if ((r1 as any)?.comment_id) {
				await addLike((r1 as any).comment_id, 'seed:alice');
				await addReply(cursorMarket.market_id, (r1 as any).comment_id, 'seed:bob', 'Hiring velocity suggests strong roadmap throughput.');
			}
			await addExternalLink({ source: 'website', url: 'https://www.cursor.com/blog', label: 'Product updates', marketId: cursorMarket.market_id });
		}

		// New markets seeded above — add trades/comments
		{
			const yesId = await outcomeIdByName(starlinkIpo.market_id, 'Yes');
			const noId = await outcomeIdByName(starlinkIpo.market_id, 'No');
			const r1 = await positionsPlaceBet({ user_id: idOf('seed:alice'), market_id: starlinkIpo.market_id, outcome_id: yesId!, amount_credits: 200, comment: 'Backlog and cashflow look ready for public markets.' });
			tradesCreated++;
			const r2 = await positionsPlaceBet({ user_id: idOf('seed:bob'), market_id: starlinkIpo.market_id, outcome_id: noId!, amount_credits: 120, comment: 'Regulatory + capex uncertainty — later than 2026.' });
			tradesCreated++;
			if ((r1 as any)?.comment_id) await addReply(starlinkIpo.market_id, (r1 as any).comment_id, 'seed:charlie', 'Valuation optics may push to 2027.');
			if ((r2 as any)?.comment_id) {
				await addLike((r2 as any).comment_id, 'seed:alice');
				await addReply(starlinkIpo.market_id, (r2 as any).comment_id, 'seed:test', 'Space cashflows volatile; agree IPO timing likely slips.');
			}
			await addExternalLink({ source: 'website', url: 'https://www.bloomberg.com/companies/starlink', label: 'Starlink outlook', marketId: starlinkIpo.market_id });
		}

		{
			const yesId = await outcomeIdByName(awsTrainium.market_id, 'Yes');
			const r1 = await positionsPlaceBet({ user_id: idOf('seed:diana'), market_id: awsTrainium.market_id, outcome_id: yesId!, amount_credits: 160, comment: 'Roadmap cadence + partner leaks point to GA in 2025.' });
			tradesCreated++;
			if ((r1 as any)?.comment_id) {
				await addLike((r1 as any).comment_id, 'seed:test');
				await addReply(awsTrainium.market_id, (r1 as any).comment_id, 'seed:charlie', 'Benchmarks vs H100 matter; GA hinges on perf parity.');
			}
			await addExternalLink({ source: 'website', url: 'https://aws.amazon.com/machine-learning/trainium/', label: 'Trainium family', marketId: awsTrainium.market_id });
		}

		{
			const yesId = await outcomeIdByName(msftCopilot.market_id, 'Yes');
			const noId = await outcomeIdByName(msftCopilot.market_id, 'No');
			const r1 = await positionsPlaceBet({ user_id: idOf('seed:test'), market_id: msftCopilot.market_id, outcome_id: yesId!, amount_credits: 210, comment: 'Distribution via Office is unmatched; MAU ramps quickly.' });
			tradesCreated++;
			const r2 = await positionsPlaceBet({ user_id: idOf('seed:charlie'), market_id: msftCopilot.market_id, outcome_id: noId!, amount_credits: 130, comment: 'License friction + cost could cap MAU under 50M.' });
			tradesCreated++;
			if ((r2 as any)?.comment_id) await addReply(msftCopilot.market_id, (r2 as any).comment_id, 'seed:bob', 'Seat bundling lowers friction more than you think.');
			if ((r1 as any)?.comment_id) {
				await addLike((r1 as any).comment_id, 'seed:diana');
				await addReply(msftCopilot.market_id, (r1 as any).comment_id, 'seed:alice', 'Governance/rollout speed across enterprise is the swing.');
			}
			await addExternalLink({ source: 'website', url: 'https://blogs.microsoft.com/', label: 'Copilot announcements', marketId: msftCopilot.market_id });
		}

		{
			const awsId = await outcomeIdByName(cloudLeader.market_id, 'AWS');
			const azureId = await outcomeIdByName(cloudLeader.market_id, 'Azure');
			const gcpId = await outcomeIdByName(cloudLeader.market_id, 'GCP');
			const r1 = await positionsPlaceBet({ user_id: idOf('seed:diana'), market_id: cloudLeader.market_id, outcome_id: awsId!, amount_credits: 220, comment: 'Hardware breadth + enterprise ties. Lean AWS.' });
			tradesCreated++;
			const r2 = await positionsPlaceBet({ user_id: idOf('seed:charlie'), market_id: cloudLeader.market_id, outcome_id: azureId!, amount_credits: 180, comment: 'Microsoft GTM + Copilot bundling drives AI infra.' });
			tradesCreated++;
			const r3 = await positionsPlaceBet({ user_id: idOf('seed:test'), market_id: cloudLeader.market_id, outcome_id: gcpId!, amount_credits: 140, comment: 'TPUs and data stack synergy make a case.' });
			tradesCreated++;
			if ((r2 as any)?.comment_id) await addReply(cloudLeader.market_id, (r2 as any).comment_id, 'seed:alice', 'Azure’s enterprise attach is unique, agreed.');
			if ((r3 as any)?.comment_id) await addReply(cloudLeader.market_id, (r3 as any).comment_id, 'seed:bob', 'GCP wins if TPUs stay supply‑favored.');
			if ((r1 as any)?.comment_id) await addLike((r1 as any).comment_id, 'seed:test');
			await addExternalLink({ source: 'website', url: 'https://www.gartner.com/en/research/methodologies/magic-quadrants', label: 'Industry rankings', marketId: cloudLeader.market_id });
		}

		return {
			success: true,
			message: 'Database seeded with companies, users, markets, trades, and comments',
			markets_created: marketsCreated,
			trades_created: tradesCreated,
			external_links_created: externalLinksCreated,
			users_created: 5,
			companies_created: 10
		};
	} catch (error) {
		console.error('Seed error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred'
		};
	}
}
