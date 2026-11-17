import {
	index,
	integer,
	numeric,
	pgEnum,
	pgTable,
	primaryKey,
	boolean,
	jsonb,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';

// Users
export const users = pgTable(
	'users',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		xUserId: varchar('x_user_id', { length: 64 }).notNull().unique(),
		xUsername: varchar('x_username', { length: 50 }).unique(),
		xName: varchar('x_name', { length: 120 }),
		xAvatarUrl: varchar('x_avatar_url', { length: 512 }),

		username: varchar('username', { length: 50 }).unique(),
		bio: text('bio'),

		balanceCredits: numeric('balance_credits', { precision: 20, scale: 4 }).default('1000.00'),

		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

		// K/D style counters
		correctBetsCount: integer('correct_bets_count').notNull().default(0),
		pendingBetsCount: integer('pending_bets_count').notNull().default(0),
		incorrectBetsCount: integer('incorrect_bets_count').notNull().default(0)
	},
	() => ({})
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Sessions
export const sessions = pgTable('sessions', {
	token: varchar('token', { length: 255 }).primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
	expiresAt: timestamp('expires_at', { withTimezone: true })
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// Companies
export const companies = pgTable(
	'companies',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		slug: text('slug').notNull(),
		name: text('name').notNull(),
		bio: text('bio'),
		logoUrl: text('logo_url'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
	},
    (t): any => ({
		slugUnique: uniqueIndex('companies_slug_unique').on(t.slug)
	})
);

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

// Enum: market_type
export const marketTypeEnum = pgEnum('market_type', ['BINARY', 'CATEGORICAL', 'SCALAR_BUCKET']);

// Markets
// @ts-expect-error Drizzle supports forward references between tables
export const markets = pgTable(
	'markets',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		companyId: uuid('company_id').references(() => companies.id),
		question: text('question').notNull(),
		marketType: marketTypeEnum('market_type').notNull(),

			// @ts-expect-error Drizzle forward reference to outcomes
			resolutionOutcomeId: uuid('resolution_outcome_id').references(() => outcomes.id as any, {
			onDelete: 'set null'
		}),
		expiresAt: timestamp('expires_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
		closedAt: timestamp('closed_at', { withTimezone: true }),
		rules: text('rules'),
		thumbnailUrl: text('thumbnail_url'),

		// Optional manual curation score (1-5). If null, UI computes simple heat.
		heatScore: integer('heat_score'),

		potCredits: numeric('pot_credits'),
		resolvedTotalWinningShares: numeric('resolved_total_winning_shares'),
		retroCutoffAt: timestamp('retro_cutoff_at', { withTimezone: true })
	},
    (t): any => ({
		createdIdx: index('markets_created_idx').on(t.createdAt),
		companyIdx: index('markets_company_idx').on(t.companyId),
		expiresIdx: index('markets_expires_idx').on(t.expiresAt),
		resolutionIdx: index('markets_resolution_idx').on(t.resolutionOutcomeId)
	})
);

export type Market = typeof markets.$inferSelect;
export type NewMarket = typeof markets.$inferInsert;

// Outcomes
// @ts-expect-error Drizzle supports forward references between tables
export const outcomes = pgTable(
	'outcomes',
	{
		id: uuid('id').defaultRandom().primaryKey(),
			marketId: uuid('market_id')
				.notNull()
				// @ts-expect-error Drizzle forward reference to markets
				.references(() => markets.id as any),
		name: text('name').notNull(),
		shortCode: text('short_code').notNull(),
		colorHex: text('color_hex'),
		minValue: numeric('min_value'),
		maxValue: numeric('max_value'),
		repValue: numeric('rep_value'),
		indexId: integer('index_id').notNull()
	},
    (t): any => ({
		marketIndexUnique: uniqueIndex('outcomes_market_index_unique').on(t.marketId, t.indexId),
		marketCodeUnique: uniqueIndex('outcomes_market_code_unique').on(t.marketId, t.shortCode)
	})
);

export type Outcome = typeof outcomes.$inferSelect;
export type NewOutcome = typeof outcomes.$inferInsert;

// Pools
export const pools = pgTable('pools', {
	marketId: uuid('market_id')
		.primaryKey()
		.references(() => markets.id),
	kConstant: numeric('k_constant', { precision: 80, scale: 4 }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

export type Pool = typeof pools.$inferSelect;
export type NewPool = typeof pools.$inferInsert;

// Pool balances
export const poolBalances = pgTable(
	'pool_balances',
	{
		marketId: uuid('market_id')
			.notNull()
			.references(() => markets.id),
		outcomeId: uuid('outcome_id')
			.notNull()
			.references(() => outcomes.id),
		balance: numeric('balance', { precision: 20, scale: 4 }).notNull()
	},
    (t): any => ({
		pk: primaryKey({ name: 'pool_balances_pkey', columns: [t.marketId, t.outcomeId] })
	})
);

export type PoolBalance = typeof poolBalances.$inferSelect;
export type NewPoolBalance = typeof poolBalances.$inferInsert;

// Positions
export const positions = pgTable(
	'positions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id),
		marketId: uuid('market_id')
			.notNull()
			.references(() => markets.id),
		outcomeId: uuid('outcome_id')
			.notNull()
			.references(() => outcomes.id),
		shares: numeric('shares', { precision: 20, scale: 4 }).default('0'),
		avgPrice: numeric('avg_price', { precision: 20, scale: 4 }),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
	},
	(t) => ({
		userOutcomeUnique: uniqueIndex('positions_user_outcome_unique').on(t.userId, t.outcomeId),
		userMarketIdx: index('positions_user_market_idx').on(t.userId, t.marketId),
		marketOutcomeIdx: index('positions_market_outcome_idx').on(t.marketId, t.outcomeId)
	})
);

export type Position = typeof positions.$inferSelect;
export type NewPosition = typeof positions.$inferInsert;

// Transactions (also referred to as 'trades')
// @ts-expect-error Drizzle supports forward references between tables
export const transactions = pgTable(
	'transactions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id),
		marketId: uuid('market_id')
			.notNull()
			.references(() => markets.id),
		type: text('type').notNull(),
		outcomeId: uuid('outcome_id').references(() => outcomes.id),
		// Each trade owns exactly one top-level comment node (auto-created by trigger)
			commentId: uuid('comment_id')
				.notNull()
					.references(() => comments.id as any),
		amountCredits: numeric('amount_credits', { precision: 20, scale: 4 }),
		sharesChange: numeric('shares_change', { precision: 20, scale: 4 }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
		refundedAt: timestamp('refunded_at', { withTimezone: true }),
			// @ts-expect-error Drizzle forward reference to transactions
			originalTxId: uuid('original_tx_id').references(() => transactions.id as any)
	},
	(t) => ({
		txMarketCreatedIdx: index('tx_market_created_idx').on(t.marketId, t.createdAt),
		txUserCreatedIdx: index('tx_user_created_idx').on(t.userId, t.createdAt),
		txCommentIdx: uniqueIndex('transactions_comment_unique').on(t.commentId)
	})
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

// Pinned transactions (user-curated highlights)
export const pinnedTransactions = pgTable(
    'pinned_transactions',
    {
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        transactionId: uuid('transaction_id')
            .notNull()
            .references(() => transactions.id as any, { onDelete: 'cascade' }),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    },
    (t) => ({
        pk: primaryKey({ name: 'pinned_transactions_pkey', columns: [t.userId, t.transactionId] }),
        userIdx: index('pinned_transactions_user_idx').on(t.userId),
        txIdx: index('pinned_transactions_tx_idx').on(t.transactionId)
    })
);

export type PinnedTransaction = typeof pinnedTransactions.$inferSelect;
export type NewPinnedTransaction = typeof pinnedTransactions.$inferInsert;

// Comments
// @ts-expect-error Drizzle supports forward references between tables
export const comments = pgTable(
	'comments',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		marketId: uuid('market_id')
			.notNull()
			.references(() => markets.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		// content can be NULL for auto-created trade root nodes
		content: text('content'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
					// @ts-expect-error Drizzle forward reference to comments
					parentId: uuid('parent_id').references(() => comments.id as any, { onDelete: 'cascade' }),
		// If set, this is the single top-level node for that transaction
				transactionId: uuid('transaction_id').references(() => transactions.id as any)
	},
	(t) => ({
		commentsMarketCreatedIdx: index('comments_market_created_idx').on(t.marketId, t.createdAt),
		commentsUserIdx: index('comments_user_idx').on(t.userId),
		commentsParentIdx: index('comments_parent_idx').on(t.parentId),
		commentsTxIdx: uniqueIndex('comments_transaction_unique').on(t.transactionId)
	})
);

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

// Comment likes
export const commentLikes = pgTable(
	'comment_likes',
	{
		commentId: uuid('comment_id')
			.notNull()
			.references(() => comments.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
	},
	(t) => ({
		pk: primaryKey({ name: 'comment_likes_pkey', columns: [t.commentId, t.userId] }),
		userIdx: index('comment_likes_user_idx').on(t.userId)
	})
);

export type CommentLike = typeof commentLikes.$inferSelect;
export type NewCommentLike = typeof commentLikes.$inferInsert;

// Historical outcome prices
export const marketOutcomePrices = pgTable(
	'market_outcome_prices',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		marketId: uuid('market_id')
			.notNull()
			.references(() => markets.id),
		outcomeId: uuid('outcome_id')
			.notNull()
			.references(() => outcomes.id),
		price: numeric('price').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
	},
	(t) => ({
		marketCreatedIdx: index('market_outcome_prices_market_created_idx').on(t.marketId, t.createdAt)
	})
);

export type MarketOutcomePrice = typeof marketOutcomePrices.$inferSelect;
export type NewMarketOutcomePrice = typeof marketOutcomePrices.$inferInsert;

// Wallet transactions
export const walletTransactions = pgTable(
	'wallet_transactions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id),
		type: text('type').notNull(),
		amountCredits: numeric('amount_credits', { precision: 20, scale: 4 }).notNull(),
		txHash: text('tx_hash'),
		chainId: integer('chain_id'),
		fromAddress: text('from_address'),
		toAddress: text('to_address'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
	},
	(t) => ({
		userCreatedIdx: index('wallet_transactions_user_created_idx').on(t.userId, t.createdAt)
	})
);

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type NewWalletTransaction = typeof walletTransactions.$inferInsert;

// External sources enum
export const externalSourceEnum = pgEnum('external_source', ['x', 'hackernews', 'website']);

// External links: attach one source post to exactly one target (market OR transaction)
export const externalLinks = pgTable(
    'external_links',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        source: externalSourceEnum('source').notNull(),
        url: text('url').notNull(),
        // simplified optional metadata
        label: text('label'),
        authorUsername: text('author_username'),
        content: text('content'),
        fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow(),
        userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

        marketId: uuid('market_id').references(() => markets.id, { onDelete: 'cascade' }),
        transactionId: uuid('transaction_id').references(() => transactions.id, { onDelete: 'cascade' })
    },
    (t) => ({
        marketCreatedIdx: index('external_links_market_created_idx').on(t.marketId, t.fetchedAt),
        txCreatedIdx: index('external_links_tx_created_idx').on(t.transactionId, t.fetchedAt),
        userIdx: index('external_links_user_idx').on(t.userId)
    })
);

export type ExternalLink = typeof externalLinks.$inferSelect;
export type NewExternalLink = typeof externalLinks.$inferInsert;

// Market companies associative table
export const marketCompanies = pgTable(
	'market_companies',
	{
		marketId: uuid('market_id')
			.notNull()
			.references(() => markets.id, { onDelete: 'cascade' }),
		companyId: uuid('company_id')
			.notNull()
			.references(() => companies.id, { onDelete: 'cascade' })
	},
	(t) => ({
		pk: primaryKey({ name: 'market_companies_pkey', columns: [t.marketId, t.companyId] }),
		marketIdx: index('market_companies_market_idx').on(t.marketId),
		companyIdx: index('market_companies_company_idx').on(t.companyId)
	})
);

export type MarketCompany = typeof marketCompanies.$inferSelect;
export type NewMarketCompany = typeof marketCompanies.$inferInsert;
