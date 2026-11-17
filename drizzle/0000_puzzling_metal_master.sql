CREATE TYPE "public"."external_source" AS ENUM('x', 'hackernews', 'website');--> statement-breakpoint
CREATE TYPE "public"."market_type" AS ENUM('BINARY', 'CATEGORICAL', 'SCALAR_BUCKET');--> statement-breakpoint
CREATE TABLE "comment_likes" (
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "comment_likes_pkey" PRIMARY KEY("comment_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"parent_id" uuid,
	"transaction_id" uuid
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"bio" text,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "external_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "external_source" NOT NULL,
	"url" text NOT NULL,
	"label" text,
	"author_username" text,
	"content" text,
	"fetched_at" timestamp with time zone DEFAULT now(),
	"user_id" uuid,
	"market_id" uuid,
	"transaction_id" uuid
);
--> statement-breakpoint
CREATE TABLE "market_companies" (
	"market_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	CONSTRAINT "market_companies_pkey" PRIMARY KEY("market_id","company_id")
);
--> statement-breakpoint
CREATE TABLE "market_outcome_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"outcome_id" uuid NOT NULL,
	"price" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"question" text NOT NULL,
	"market_type" "market_type" NOT NULL,
	"resolution_outcome_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"closed_at" timestamp with time zone,
	"rules" text,
	"thumbnail_url" text,
	"heat_score" integer,
	"pot_credits" numeric,
	"resolved_total_winning_shares" numeric,
	"retro_cutoff_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"name" text NOT NULL,
	"short_code" text NOT NULL,
	"color_hex" text,
	"min_value" numeric,
	"max_value" numeric,
	"rep_value" numeric,
	"index_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pinned_transactions" (
	"user_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "pinned_transactions_pkey" PRIMARY KEY("user_id","transaction_id")
);
--> statement-breakpoint
CREATE TABLE "pool_balances" (
	"market_id" uuid NOT NULL,
	"outcome_id" uuid NOT NULL,
	"balance" numeric(20, 4) NOT NULL,
	CONSTRAINT "pool_balances_pkey" PRIMARY KEY("market_id","outcome_id")
);
--> statement-breakpoint
CREATE TABLE "pools" (
	"market_id" uuid PRIMARY KEY NOT NULL,
	"k_constant" numeric(80, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"outcome_id" uuid NOT NULL,
	"shares" numeric(20, 4) DEFAULT '0',
	"avg_price" numeric(20, 4),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"type" text NOT NULL,
	"outcome_id" uuid,
	"comment_id" uuid NOT NULL,
	"amount_credits" numeric(20, 4),
	"shares_change" numeric(20, 4),
	"created_at" timestamp with time zone DEFAULT now(),
	"refunded_at" timestamp with time zone,
	"original_tx_id" uuid
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"x_user_id" varchar(64) NOT NULL,
	"x_username" varchar(50),
	"x_name" varchar(120),
	"x_avatar_url" varchar(512),
	"username" varchar(50),
	"bio" text,
	"balance_credits" numeric(20, 4) DEFAULT '1000.00',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"correct_bets_count" integer DEFAULT 0 NOT NULL,
	"pending_bets_count" integer DEFAULT 0 NOT NULL,
	"incorrect_bets_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "users_x_user_id_unique" UNIQUE("x_user_id"),
	CONSTRAINT "users_x_username_unique" UNIQUE("x_username"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount_credits" numeric(20, 4) NOT NULL,
	"tx_hash" text,
	"chain_id" integer,
	"from_address" text,
	"to_address" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_links" ADD CONSTRAINT "external_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_links" ADD CONSTRAINT "external_links_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_links" ADD CONSTRAINT "external_links_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_companies" ADD CONSTRAINT "market_companies_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_companies" ADD CONSTRAINT "market_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_outcome_prices" ADD CONSTRAINT "market_outcome_prices_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_outcome_prices" ADD CONSTRAINT "market_outcome_prices_outcome_id_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."outcomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_resolution_outcome_id_outcomes_id_fk" FOREIGN KEY ("resolution_outcome_id") REFERENCES "public"."outcomes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinned_transactions" ADD CONSTRAINT "pinned_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinned_transactions" ADD CONSTRAINT "pinned_transactions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_balances" ADD CONSTRAINT "pool_balances_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_balances" ADD CONSTRAINT "pool_balances_outcome_id_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."outcomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pools" ADD CONSTRAINT "pools_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_outcome_id_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."outcomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_outcome_id_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."outcomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_original_tx_id_transactions_id_fk" FOREIGN KEY ("original_tx_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comment_likes_user_idx" ON "comment_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "comments_market_created_idx" ON "comments" USING btree ("market_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_user_idx" ON "comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "comments_parent_idx" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "comments_transaction_unique" ON "comments" USING btree ("transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_slug_unique" ON "companies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "external_links_market_created_idx" ON "external_links" USING btree ("market_id","fetched_at");--> statement-breakpoint
CREATE INDEX "external_links_tx_created_idx" ON "external_links" USING btree ("transaction_id","fetched_at");--> statement-breakpoint
CREATE INDEX "external_links_user_idx" ON "external_links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "market_companies_market_idx" ON "market_companies" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "market_companies_company_idx" ON "market_companies" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "market_outcome_prices_market_created_idx" ON "market_outcome_prices" USING btree ("market_id","created_at");--> statement-breakpoint
CREATE INDEX "markets_created_idx" ON "markets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "markets_company_idx" ON "markets" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "markets_expires_idx" ON "markets" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "markets_resolution_idx" ON "markets" USING btree ("resolution_outcome_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outcomes_market_index_unique" ON "outcomes" USING btree ("market_id","index_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outcomes_market_code_unique" ON "outcomes" USING btree ("market_id","short_code");--> statement-breakpoint
CREATE INDEX "pinned_transactions_user_idx" ON "pinned_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pinned_transactions_tx_idx" ON "pinned_transactions" USING btree ("transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "positions_user_outcome_unique" ON "positions" USING btree ("user_id","outcome_id");--> statement-breakpoint
CREATE INDEX "positions_user_market_idx" ON "positions" USING btree ("user_id","market_id");--> statement-breakpoint
CREATE INDEX "positions_market_outcome_idx" ON "positions" USING btree ("market_id","outcome_id");--> statement-breakpoint
CREATE INDEX "tx_market_created_idx" ON "transactions" USING btree ("market_id","created_at");--> statement-breakpoint
CREATE INDEX "tx_user_created_idx" ON "transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_comment_unique" ON "transactions" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "wallet_transactions_user_created_idx" ON "wallet_transactions" USING btree ("user_id","created_at");