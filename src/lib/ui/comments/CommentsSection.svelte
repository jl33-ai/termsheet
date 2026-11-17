<script lang="ts">
	import CommentThread from '$lib/ui/comments/CommentThread.svelte';
	import WriteAComment from '$lib/ui/comments/WriteAComment.svelte';
	import { sortWithKey } from '$lib/comments/utils';
	import type { CommentSortKey } from '$lib/types';
	import Icon from '@iconify/svelte';
	import { page } from '$app/state';
	import IconAndText from '$lib/ui/canonical/IconAndText.svelte';
	import { X_PADDING } from '$lib/constant.ts';
	import Loading from '$lib/ui/canonical/Loading.svelte';

	// Props (Svelte 5 runes)
	let {
		comments = [],
		user = null,
		marketId = '',
		outcomes = [],
		header = 'Comments',
		// Composer visibility: on market pages, top-level comments are disabled
		allowTopLevel = true,
		// Optional filter chip
		showFilterBadge = false,
		filterName = '',
		onClearFilter = undefined as undefined | (() => void),
		// Optional pagination
		hasMore = false,
		loadingMore = false,
		onLoadMore = undefined as undefined | (() => void),
		// Optional loading state for initial/replies
		isLoading = false,
		// Optional: refresh hook for trade-page replies
		onAfterReply = undefined as undefined | (() => void)
	} = $props<{
		comments?: any[];
		user?: any;
		marketId?: string;
		outcomes?: any[];
		header?: string;
		allowTopLevel?: boolean;
		showFilterBadge?: boolean;
		filterName?: string;
		onClearFilter?: () => void;
		hasMore?: boolean;
		loadingMore?: boolean;
		onLoadMore?: () => void;
		isLoading?: boolean;
		onAfterReply?: () => void;
	}>();

	let commentSort = $state<CommentSortKey>('likes');
	// Bump to force re-sort when likes change on items without changing array identity
	let likesBump = $state(0);
	$effect(() => {
		const handler = () => (likesBump = likesBump + 1);
		window.addEventListener('termsheet:comment-like-changed', handler);
		return () => window.removeEventListener('termsheet:comment-like-changed', handler);
	});

	const orderedComments = $derived.by(() => {
		// read to establish dependency; value unused
		const _ = likesBump;
		return sortWithKey(comments as any, user?.id ?? null, commentSort);
	});
	// Local, optimistic comments created via WriteAComment
	let newComments = $state<any[]>([]);
	const isTradeRepliesView = $derived(!!page.data?.comment?.id);
	const hasPositions = $derived(((page.data?.positions as any[]) || []).length > 0);
	const isLoggedIn = $derived(!!page.data?.user?.id);
	// Disable top-level commenting on market page when logged in but no positions
	const disableTopLevel = $derived(isLoggedIn && !hasPositions);
	// On trade replies view, never disable the composer
	const disableComposer = $derived(isTradeRepliesView ? false : (disableTopLevel || !allowTopLevel));

	// Auto-load more when reaching bottom of page
	const BOTTOM_THRESHOLD = 64; // px from bottom
	let lastTriggerAt = 0;
	const MIN_INTERVAL_MS = 1000; // throttle to avoid loops
	let disableAutoLoad = $state(false); // circuit-breaker if no progress
	let awaitingProgress = false;
	let lastCountSnapshot = 0;

	function currentCount() {
		return (newComments?.length || 0) + (orderedComments?.length || 0);
	}

	function isAtPageBottom() {
		if (typeof window === 'undefined') return false;
		const doc = document.documentElement;
		const scrollY = window.scrollY || window.pageYOffset;
		const viewport = window.innerHeight;
		const fullHeight = doc.scrollHeight;
		return viewport + scrollY >= fullHeight - BOTTOM_THRESHOLD;
	}

	function maybeLoadMore() {
		if (!hasMore || loadingMore || disableAutoLoad || typeof onLoadMore !== 'function') return;
		if (!isAtPageBottom()) return;
		const now = Date.now();
		if (now - lastTriggerAt < MIN_INTERVAL_MS) return;
		lastTriggerAt = now;
		awaitingProgress = true;
		onLoadMore?.();
	}

	// Attach passive scroll/resize listeners when there is more to load
	$effect(() => {
		if (!hasMore || disableAutoLoad) return;
		let ticking = false;
		const handler = () => {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(() => {
				ticking = false;
				maybeLoadMore();
			});
		};
		window.addEventListener('scroll', handler, { passive: true });
		window.addEventListener('resize', handler);
		// Initial check in case we're already at the bottom
		queueMicrotask(() => handler());
		return () => {
			window.removeEventListener('scroll', handler);
			window.removeEventListener('resize', handler);
		};
	});

	// Track progress to prevent endless retry loops
	$effect(() => {
		// refresh snapshot when list grows
		const cnt = currentCount();
		if (cnt > lastCountSnapshot) {
			lastCountSnapshot = cnt;
			awaitingProgress = false;
		}
	});

	$effect(() => {
		if (!awaitingProgress) return;
		if (loadingMore) return;
		// A load completed but count did not increase; stop auto-loading to avoid loops
		const cnt = currentCount();
		if (cnt <= lastCountSnapshot) {
			disableAutoLoad = true;
			awaitingProgress = false;
		}
	});
</script>

<div class="flex flex-col border-border border-t-[0.5px] border-b-[0.5px] py-2 {X_PADDING}">
	<div class="flex justify-between items-center">
		<h3 id="comments" class="font-bold">{header}</h3>
		<div class="flex items-center justify-end gap-2">
			<select
				class="text-xs border-none"
				value={commentSort}
				onchange={(e) => (commentSort = (e.target as HTMLSelectElement).value as any)}
			>
				<option value="likes">Popularity</option>
				<option value="amount">Bet size</option>
			</select>
		</div>
	</div>

	{#if showFilterBadge && filterName}
		<div class="mt-1 flex items-center gap-2">
			<div class="inline-flex items-center rounded-sm border border-border px-2 py-1">
				<span class="text-xs text-muted">Filtered by</span>
				<span class="ml-1 inline-flex items-center text-xs font-medium text-title">{filterName}</span>
				{#if onClearFilter}
					<button
						type="button"
						class="ml-2 inline-flex items-center"
						aria-label="Clear filter"
						onclick={() => onClearFilter?.()}
					>
						<Icon icon="bx:x" class="text-muted" />
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>


<div class="grid">
	{#if isTradeRepliesView}
		<WriteAComment
			{user}
			market_id={marketId}
			parent_id={page.data?.comment?.id}
			disabled={disableComposer}
			disabledTooltip="You must place a bet to comment"
			onAfterSubmit={() => onAfterReply?.()}
		/>
	{:else}
<!--		<WriteAComment-->
<!--			{user}-->
<!--			market_id={marketId}-->
<!--			disabled={disableComposer}-->
<!--			disabledTooltip="You must place a bet to comment"-->
<!--			onOptimisticAdd={(c) => (newComments = [c, ...newComments])}-->
<!--			onOptimisticRemove={(c) => (newComments = newComments.filter((x) => x.id !== c.id))}-->
<!--		/>-->
	{/if}

	{#if isLoading}
		<div class="w-full h-24">
			<Loading />
		</div>
	{:else}
		{#each newComments as nc (nc.id)}
			<div class="border-border border-b-[0.5px] first:border-t-0">
				<CommentThread comment={nc} market_id={marketId} {user} {outcomes} />
			</div>
		{/each}
		{#each orderedComments as c (c.id)}
			<div class="border-border border-b-[0.5px] first:border-t-0">
				<CommentThread comment={c} market_id={marketId} {user} {outcomes} />
			</div>
		{:else}
			{#if newComments.length === 0}
				<IconAndText icon="bx:comment" text="No comments yet."></IconAndText>
			{/if}
		{/each}
	{/if}

	<!-- Auto-load happens on page bottom scroll; keep a subtle loading hint -->
	{#if hasMore && loadingMore}
		<div class="mt-3 flex justify-center">
			<span class="text-sm text-muted">Loading…</span>
		</div>
	{/if}
</div>