<script lang="ts">
	import { page } from '$app/state';
	import CommentsSection from '$lib/ui/comments/CommentsSection.svelte';
	import SplitPane from '$lib/ui/layout/SplitPane.svelte';
	import UserProfileWidget from '$lib/ui/user-card/UserProfileWidget.svelte';
	import FeedCard from '$lib/ui/feed-card/FeedCard.svelte';
	import type { FeedItem, FeedComment } from '$lib/types';
	import UserIdentity from '$lib/ui/canonical/UserIdentity.svelte';
	import OutcomeAmount from '$lib/ui/comments/OutcomeAmount.svelte';
	import BackWithText from '$lib/ui/canonical/BackWithText.svelte';
	import FeedTransactionToolbar from '$lib/ui/feed-card/FeedTransactionToolbar.svelte';
	import { appToast } from '$lib/ui/toast.ts';
	import { X_PADDING } from '$lib/constant.ts';

	let { data } = $props<{
		data: {
			trade: any;
			comment: any | null;
			user: any;
			market: any;
			outcomes: any[];
			pool_balances: any[];
			positions: any[];
			author: any
		}
	}>();
	const trade = $derived(data.trade);
	const market = $derived(data.market);
	const user = $derived(data.user);
	const author = $derived(data.author);
	const mainComment = $derived(data.comment);
	const outcomes = $derived(data.outcomes || []);
	// No pool balances/positions needed now that TradeWidget is removed

	// Build a minimal FeedItem for the right-side FeedCard
	const feedItem = $derived.by<FeedItem | null>(() => {
		if (!market) return null;
		const base: FeedItem = {
			market: market,
			summary: null,
			comments: []
		};
		if (mainComment) {
			const c: FeedComment = {
				id: mainComment.id,
				content: mainComment.content,
				created_at: mainComment.created_at,
				user_id: mainComment.user_id,
				username: mainComment.username,
				avatar_url: mainComment.avatar_url ?? null,
				outcome_name: trade?.outcome_name ?? null,
				amount_credits: trade?.amount_credits ?? null,
				shares: null,
				balance_credits: null
			};
			base.comments = [c];
		}
		return base;
	});

	// Right pane renders author card + TransactionWidget

	// Load replies for the main comment
	let replies = $state<any[]>([]);
	let loadingReplies = $state(false);

	async function loadReplies() {
		if (!mainComment?.id) return;
		loadingReplies = true;
		try {
			const res = await fetch(`/api/comments/${encodeURIComponent(mainComment.id)}/replies`);
			const rows = (await res.json()) as any[];
			replies = Array.isArray(rows) ? rows : [];
		} catch {
			replies = [];
		} finally {
			loadingReplies = false;
		}
	}

	$effect(() => {
		if (mainComment?.id) void loadReplies();
	});

	// Sorting and rendering handled in CommentsSection

	const commentPermalink = $derived.by(() => {
		try {
			const cid = String(mainComment?.id ?? '').trim();
			if (!cid) return '';
			const base = `${page.url.pathname}${page.url.search}`;
			return `${base}#comment-${encodeURIComponent(cid)}`;
		} catch {
			return '';
		}
	});

	const tradePermalink = $derived.by(() => {
		try {
			return `${page.url.pathname}${page.url.search}`;
		} catch {
			return '';
		}
	});

	function goToReply() {
		const el = document.getElementById('comments');
		el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	// Simple tab title: outcome + comment (fallbacks to market question)
	const pageTitle = $derived.by(() => {
		const outcome = (trade?.outcome_name ?? '').trim();
		const comment = (mainComment?.content ?? '').trim();
		const composed = [outcome, comment].filter(Boolean).join(' — ');
		return composed || market?.question || 'Transaction';
	});


	function copyPermalink(e?: MouseEvent) {
		if (e) e.stopPropagation();
		const href = (commentPermalink && commentPermalink.length > 0) ? commentPermalink : tradePermalink;
		if (!href) return;
		try {
			const full = typeof window !== 'undefined' ? new URL(href, window.location.href).toString() : href;
			navigator?.clipboard?.writeText(full)
				.then(() => appToast.success('Link copied!'))
				.catch(() => {
					try {
						window?.prompt?.('Copy link', full);
						appToast.success('Link copied!');
					} catch {}
				});
		} catch {}
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>


<!-- market status pills intentionally removed for cleanliness -->

<SplitPane rightWidth={320}>
	{#snippet leftHeader()}
		<BackWithText text={market?.question} href={tradePermalink} />
	{/snippet}
	{#snippet left()}
		<div class="w-full">
			<div class="mt-6 {X_PADDING}">
				<UserIdentity
					username={(author?.username ?? author?.x_username ?? '') as string}
					avatarUrl={(author?.x_avatar_url ?? author?.avatar_url ?? null) as string | null}
					joinedAt={(author?.created_at ?? null) as string | Date | null}
				/>
			</div>


			<!-- Bet summary with inline comment (single paragraph, wraps naturally) -->
			<p class="mt-4 mb-16 text-sm text-base leading-snug {X_PADDING}">
				<OutcomeAmount
					outcomeId={trade?.outcome_id ?? null}
					outcomeName={trade?.outcome_name ?? null}
					colorHex={trade?.outcome_color_hex ?? null}
					amount={trade?.amount_credits ?? null}
					{outcomes}
					mode="compact"
				/>
				{#if mainComment?.content}
					<span> — {mainComment.content}</span>
				{/if}
			</p>


			<div class="my-2 {X_PADDING}">
				<FeedTransactionToolbar
					commentId={(mainComment?.id ?? null) as string | null}
					initialLikes={Number(mainComment?.likes_count ?? 0)}
					initialIsLiked={Boolean(mainComment?.liked)}
					commentCount={Number(mainComment?.reply_count ?? 0)}
					onClickComment={() => goToReply()}
					onClickCopy={(e) => copyPermalink(e)}
				/>
			</div>


			<CommentsSection
				comments={replies}
				isLoading={loadingReplies}
				{user}
				marketId={market.id}
				{outcomes}
				header="Comments"
				onAfterReply={() => loadReplies()}
			/>
		</div>
	{/snippet}
	{#snippet right()}
		<div id="transaction-widget" class="flex flex-col gap-2">
			{#if author}
				<UserProfileWidget user={author} showBorder />
			{/if}
			{#if feedItem}
				<FeedCard item={feedItem} isNaked />
			{/if}
		</div>
	{/snippet}
</SplitPane>
