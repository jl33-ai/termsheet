import { schema } from '$lib/server/db';
import { sql } from '$lib/server/db';

// Centralized Drizzle select fragments to keep field aliases consistent.
// These do not change returned shapes; only reduce duplication.

export const userProfileSelect = {
  id: schema.users.id,
  username: schema.users.username,
  x_username: schema.users.xUsername,
  x_name: schema.users.xName,
  x_avatar_url: schema.users.xAvatarUrl,
  bio: schema.users.bio,
  created_at: schema.users.createdAt,
  correct_bets_count: schema.users.correctBetsCount,
  pending_bets_count: schema.users.pendingBetsCount,
  incorrect_bets_count: schema.users.incorrectBetsCount,
} as const;

export const userViewerSelect = {
  id: schema.users.id,
  username: schema.users.username,
  x_username: schema.users.xUsername,
} as const;

export const positionWithMarketSelect = {
  shares: schema.positions.shares,
  avg_price: schema.positions.avgPrice,
  updated_at: schema.positions.updatedAt,
  outcome_id: schema.positions.outcomeId,
  outcome_name: schema.outcomes.name,
  outcome_color_hex: schema.outcomes.colorHex,
  market_id: schema.markets.id,
  market_question: schema.markets.question,
  market_closed_at: schema.markets.closedAt,
  market_resolution_outcome_id: schema.markets.resolutionOutcomeId,
} as const;

export const userPublicSelect = {
  id: schema.users.id,
  username: schema.users.username,
  x_avatar_url: schema.users.xAvatarUrl,
} as const;

export const userSessionSelect = {
  id: schema.users.id,
  x_user_id: schema.users.xUserId,
  x_username: schema.users.xUsername,
  x_avatar_url: schema.users.xAvatarUrl,
} as const;

export const marketPricePointSelect = {
  outcome_id: schema.marketOutcomePrices.outcomeId,
  price: schema.marketOutcomePrices.price,
  created_at: schema.marketOutcomePrices.createdAt,
} as const;

export const externalLinkRowSelect = {
  id: schema.externalLinks.id,
  // Cast enum to text for consistent client handling
  source: sql<string>`(${schema.externalLinks.source})::text`,
  url: schema.externalLinks.url,
  label: schema.externalLinks.label,
  author_username: schema.externalLinks.authorUsername,
  content: schema.externalLinks.content,
  fetched_at: schema.externalLinks.fetchedAt,
} as const;

// Outcomes (full row used on market page)
export const outcomeRowSelectFull = {
  id: schema.outcomes.id,
  market_id: schema.outcomes.marketId,
  name: schema.outcomes.name,
  short_code: schema.outcomes.shortCode,
  color_hex: schema.outcomes.colorHex,
  min_value: schema.outcomes.minValue,
  max_value: schema.outcomes.maxValue,
  rep_value: schema.outcomes.repValue,
  index_id: schema.outcomes.indexId,
} as const;

// Outcomes (lite used on trade page)
export const outcomeRowSelectLite = {
  id: schema.outcomes.id,
  name: schema.outcomes.name,
  short_code: schema.outcomes.shortCode,
  color_hex: schema.outcomes.colorHex,
} as const;

// Outcomes list row for API (id, name, short_code, index_id)
export const outcomeRowSelectList = {
  id: schema.outcomes.id,
  name: schema.outcomes.name,
  short_code: schema.outcomes.shortCode,
  index_id: schema.outcomes.indexId,
} as const;

// Pool balances basic row
export const poolBalanceRowSelect = {
  market_id: schema.poolBalances.marketId,
  outcome_id: schema.poolBalances.outcomeId,
  balance: schema.poolBalances.balance,
} as const;

// Market minimal row used on trade page
export const marketMinimalSelect = {
  id: schema.markets.id,
  question: schema.markets.question,
  market_type: schema.markets.marketType,
  closed_at: schema.markets.closedAt,
  resolution_outcome_id: schema.markets.resolutionOutcomeId,
  thumbnail_url: schema.markets.thumbnailUrl,
} as const;

// Market detail row used on market page
export const marketDetailSelect = {
  id: schema.markets.id,
  question: schema.markets.question,
  market_type: schema.markets.marketType,
  company_id: schema.markets.companyId,
  resolution_outcome_id: schema.markets.resolutionOutcomeId,
  expires_at: schema.markets.expiresAt,
  created_at: schema.markets.createdAt,
  updated_at: schema.markets.updatedAt,
  closed_at: schema.markets.closedAt,
  rules: schema.markets.rules,
  thumbnail_url: schema.markets.thumbnailUrl,
  pot_credits: schema.markets.potCredits,
  resolved_total_winning_shares: schema.markets.resolvedTotalWinningShares,
  retro_cutoff_at: schema.markets.retroCutoffAt,
} as const;

// Company lite row with snake_case outputs
export const companyLiteSelect = {
  id: schema.companies.id,
  name: schema.companies.name,
  slug: schema.companies.slug,
  bio: schema.companies.bio,
  logo_url: schema.companies.logoUrl,
} as const;

// Company basic (id, name, slug)
export const companyBasicSelect = {
  id: schema.companies.id,
  name: schema.companies.name,
  slug: schema.companies.slug,
} as const;

// Markets id + question (used for related lists)
export const marketIdQuestionSelect = {
  id: schema.markets.id,
  question: schema.markets.question,
} as const;

// Markets id + question + expires_at (used on company page)
export const marketIdQuestionExpiresSelect = {
  id: schema.markets.id,
  question: schema.markets.question,
  expires_at: schema.markets.expiresAt,
} as const;

// User balance credits (for tooltips)
export const userBalanceSelect = {
  id: schema.users.id,
  balance_credits: schema.users.balanceCredits,
} as const;

// Positions basic for user-market
export const positionBasicSelect = {
  outcome_id: schema.positions.outcomeId,
  shares: schema.positions.shares,
} as const;

export const userIdSelect = {
  id: schema.users.id,
} as const;

export const userUsernameSelect = {
  username: schema.users.username,
} as const;

export const marketIdQuestionCreatedSelect = {
  id: schema.markets.id,
  created_at: schema.markets.createdAt,
  question: schema.markets.question,
} as const;

export const transactionIdUserMarketCommentSelect = {
  id: schema.transactions.id,
  user_id: schema.transactions.userId,
  market_id: schema.transactions.marketId,
  comment_id: schema.transactions.commentId,
} as const;

// Pinned trade presentation row
export const pinnedTradeRowSelect = {
  pin_created_at: schema.pinnedTransactions.createdAt,
  transaction_id: schema.transactions.id,
  tx_created_at: schema.transactions.createdAt,
  amount_credits: schema.transactions.amountCredits,
  market_id: schema.transactions.marketId,
  outcome_id: schema.transactions.outcomeId,
  comment_id: schema.transactions.commentId,
  comment_content: schema.comments.content,
  market_question: schema.markets.question,
  outcome_name: schema.outcomes.name,
  outcome_color_hex: schema.outcomes.colorHex,
  outcome_index_id: schema.outcomes.indexId,
} as const;
