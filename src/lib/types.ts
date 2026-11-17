// Centralized application types
//
// Policy: Use Drizzle-inferred table types as the single source of truth for
// database rows. Do NOT define duplicate table-shaped interfaces here.
// Only define DTOs and UI-specific shapes that differ from DB rows.

export type MarketType = 'BINARY' | 'CATEGORICAL' | 'SCALAR_BUCKET';

// Re-export Drizzle-inferred row types for convenience
export type {
	User,
	NewUser,
	Session,
	NewSession,
	Company,
	NewCompany,
	Market,
	NewMarket,
	Outcome,
	NewOutcome,
	Pool,
	NewPool,
	PoolBalance,
	NewPoolBalance,
	Position,
	NewPosition,
	Transaction,
	NewTransaction,
	Comment,
	NewComment,
	CommentLike,
	NewCommentLike,
	MarketOutcomePrice,
	NewMarketOutcomePrice,
	WalletTransaction,
	NewWalletTransaction
} from '../db/schema';

// Common enums/unions used across server + client
export type CommentSortKey = 'likes' | 'amount';
export type MarketBanner = { content: string; icon?: string } | null;

// Cookies
import type { Cookies } from '@sveltejs/kit';
export type OAuthCookieName =
  | 'x_oauth_state'
  | 'x_oauth_code_verifier'
  | 'post_auth_next'
  | 'session_token';
export type CookieOpts = NonNullable<Parameters<Cookies['set']>[2]>;

// API request body DTOs
export type CreateMarketBody = {
	question: string;
	market_type: MarketType;
	expires_at?: string | null;
	outcomes?: Array<{ name: string; short_code: string }>;
	company_id?: string | null;
	rules?: string | null;
	thumbnail_url?: string | null;
	heat_score?: number | null;
};

export type CreateCompanyBody = {
	name: string;
	slug: string;
	bio?: string;
	logo_url?: string | null;
	create_default_markets?: boolean;
	default_market_indexes?: number[]; // indexes into DEFAULT_MARKET_TEMPLATES
};

export type PlaceBetBody = {
	market_id: string;
	outcome_id: string;
	amount_credits: number;
	comment?: string | null;
};

export type WalletDepositBody = {
	amount: number;
	tx_hash?: string | null;
	chain_id?: number | null;
	from_address?: string | null;
	to_address?: string | null;
};

export type SetUsernameBody = { username: string };
export type SetNameBody = { name: string };
export type SetBioBody = { bio: string };

export type AdminResolveMarketBody = {
	market_id: string;
	outcome_id: string;
	cutoff?: string;
};

export type AdminCloseMarketBody = { market_id: string };
export type ClaimBody = { market_id: string };

export type CreateCommentBody = {
  market_id: string;
  content: string;
  parent_id?: string | null;
  transaction_id?: string | null;
};

// Generic utility types used across lib
export type BinaryIntent = 'yes' | 'no' | 'neutral';

export type OutcomeLike = {
	id: string;
	name: string;
	short_code?: string | null;
	color_hex?: string | null;
};

export interface OutcomeNew {
	id: string; // UUID
	market_id: string; // UUID
	name: string;
	short_code: string;
	color_hex?: string;
	index_id: number;
}

// ==========================================
// LEGACY (editor/preview) DTOs
// Keep names distinct from Drizzle types to avoid collisions.
// ==========================================

export interface LegacyMarket {
	id: string;
	created_at: string;
	settled_at?: string | null;
	external_ref?: string | null;
	type: string; // 'binary' | 'range' | 'numeric' | ...
	status: string; // 'open' | 'resolved' | ...
	resolved_value?: any | null;
	title: string;
	resolution_criteria?: string | null;
	image?: string | null;
	odds?: number | null;
}

export interface LegacyOutcome {
	id: string;
	created_at: string;
	external_ref?: string | null;
	market_id?: string | null;
	code: string;
	label: string;
	status: string; // 'trading' | 'resolved'
	result?: boolean | null;
	last_price?: number | null; // NUMERIC(8,4)
	updated_at?: string | null;
}

export interface OutcomeDetail extends LegacyOutcome {
	market?: Pick<LegacyMarket, 'id' | 'title' | 'resolution_criteria'> | null;
}

// ==========================================
// FEED AND LIGHTWEIGHT ROW TYPES
// ==========================================

// Minimal shapes used by the market feed loaders (derived from new schema)
export type MarketRow = {
    id: string;
    question: string;
    created_at: string;
    market_type: MarketType;
    expires_at?: string | null;
    closed_at?: string | null;
    resolution_outcome_id?: string | null;
    thumbnail_url?: string | null;
    heat_score?: number | null;
    // Optional fields included by some loaders (used in banners/resolution)
    pot_credits?: number | string | null;
    resolved_total_winning_shares?: number | string | null;
};

export type OutcomeRow = {
	id: string;
	market_id: string;
	name: string;
	short_code: string;
	color_hex?: string | null;
	min_value?: number | null;
	max_value?: number | null;
	rep_value?: number | null;
	index_id: number;
};

export type PoolBalanceRow = {
    market_id: string;
    outcome_id: string;
    balance: number | string;
};

export type FeedComment = {
	id: string;
	content: string;
	created_at: string;
	user_id: string;
	username: string;
	avatar_url?: string | null;
	shares: number | null;
	outcome_name: string | null;
	amount_credits?: number | null;
	balance_credits?: number | null;
  // User KD stats for Username tooltip
  correct_bets_count?: number | null;
  pending_bets_count?: number | null;
  incorrect_bets_count?: number | null;
};

export type FeedItem = {
	market: MarketRow;
	summary: string | null;
	comments: FeedComment[];
};

export type FeedPage = { items: FeedItem[]; nextCursor: string | null };

// ==========================================
// UI/CLIENT ROW SHAPES (snake_case)
// ==========================================

// Minimal per-user stats used in UI components
export type UserLite = {
  username?: string | null;
  x_username?: string | null;
  x_avatar_url?: string | null;
  avatar_url?: string | null;
  created_at?: string | Date | null;
  correct_bets_count?: number | null;
  pending_bets_count?: number | null;
  incorrect_bets_count?: number | null;
  // Accept Drizzle camelCase variants defensively
  correctBetsCount?: number | null;
  pendingBetsCount?: number | null;
  incorrectBetsCount?: number | null;
};

// Minimal user object from session cookie lookups
export type SessionUser = {
  id: string;
  x_user_id: string | null;
  x_username: string | null;
  x_avatar_url: string | null;
};

// Minimal position row for a specific user-market
export type UserPositionRow = { outcome_id: string; shares: number | string };

// Minimal company row used by UI link lists
export type CompanyLite = { id: string; name: string; slug: string; bio?: string | null };

// External link row returned by API (cast to text on server)
import type { ExternalLink } from '../db/schema';
export type ExternalLinkRow = {
  id: string;
  source: ExternalLink['source']; // 'x' | 'hackernews' | 'website'
  url: string;
  label?: string | null;
  author_username?: string | null;
  content?: string | null;
  fetched_at?: string | null;
};

// Generic comment-like shape used for sorting/filtering utilities
export type CommentBase = {
  id: string;
  user_id?: string | null;
  created_at?: string | null;
  likes_count?: number | null;
  amount_credits?: number | null;
  shares?: number | null;
  outcome_id?: string | null;
};

// Trade helpers
export type PlaceBetResult = {
  success: boolean;
  shares_bought: number;
  transaction_id?: string | null;
  [k: string]: any;
};

// ==========================================
// Default market templates (config)
// ==========================================

export interface DefaultOutcomeTemplate {
  name: string;
  short_code: string;
  color_hex?: string;
  min_value?: number;
  max_value?: number;
  rep_value?: number;
}

export interface DefaultMarketTemplate {
  question: string;
  market_type: MarketType;
  rules?: string;
  expires_months?: number; // months from company creation
  outcomes?: DefaultOutcomeTemplate[];
}

// ==========================================
// UI AND CLIENT TYPES (CENTRALIZED)
// ==========================================

// Tooltip arg for `use:tooltip`
export type TooltipArg =
	| string
	| { content: string; placement?: 'top' | 'bottom' | 'left' | 'right' };

// Auth intent persisted client-side between redirects
// Extend with 'bet' so a quick bet attempted while logged out can resume post-login.
export type PostAuthIntent =
  | { t: 'reply'; market_id: string; comment_id: string }
  | { t: 'bet'; market_id: string; outcome_id: string; amount_credits: number; comment?: string | null }
  | { t: 'none' };

// Outcome + current probability (0..1)
export type OutcomeWithPrice = {
	id: string;
	name: string;
	short_code?: string | null;
	price: number; // 0..1
	[k: string]: any;
};

// Price time series point for an outcome
export type MarketPricePoint = { outcome_id: string; price: number; created_at: string };

// Minimal market metadata used by details view
export type MarketMeta = {
	id: string;
	rules?: string | null;
	created_at?: string | null;
	expires_at?: string | null;
};

// Reusable UI prop helpers
export type UIPropsBase = { class?: string; [key: string]: any };

export type ButtonProps = UIPropsBase & {
	type?: 'button' | 'submit' | 'reset';
	variant?: 'primary' | 'secondary' | 'ghost';
	disabled?: boolean;
};

export type XAuthButtonProps = UIPropsBase;

export type BinaryOptionProps = UIPropsBase & {
	label: string;
	valueText: string; // e.g., 57.2%
	progress?: number; // 0..1 to mirror non-binary fill width
	intent?: BinaryIntent;
	selected?: boolean;
};

export type OutcomeListItem = OutcomeWithPrice;

// Editor: Market panel section state
export type MarketPanelSection = {
	id: string;
	market?: LegacyMarket | null; // legacy Market shape used by editor
	searchTerm?: string;
	searchResults?: LegacyMarket[];
	searching?: boolean;
	odds_at_time_of_writing?: number | null;
} | null;

// ==========================================
// UI Component Prop Types (Admin Page)
// ==========================================

export type SButtonProps = ButtonProps & {
  onclick?: () => void;
  children?: any;
};

export type InputProps = UIPropsBase & {
  type?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  oninput?: (e: Event) => void;
  onkeydown?: (e: KeyboardEvent) => void;
};

export type SelectProps = UIPropsBase & {
  value?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  onchange?: (e: Event) => void;
  children?: any;
};

export type CardProps = UIPropsBase & {
  children?: any;
};
