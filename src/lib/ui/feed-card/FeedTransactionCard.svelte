<script lang="ts">
	import FeedCard from '$lib/ui/feed-card/FeedCard.svelte';
	import OutcomeAmount from '$lib/ui/comments/OutcomeAmount.svelte';
	import AppImage from '$lib/ui/canonical/AppImage.svelte';
	import Username from '$lib/ui/canonical/Username.svelte';
	import { formatDateShortRelative, formatDateTime } from '$lib/date.ts';
	import type { FeedItem, MarketRow, Transaction, OutcomeRow } from '$lib/types';
	import { X_PADDING } from '$lib/constant.ts';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { appToast } from '$lib/ui/toast.ts';
    import FeedTransactionToolbar from '$lib/ui/feed-card/FeedTransactionToolbar.svelte';
	import Loading from '$lib/ui/canonical/Loading.svelte';

	// Accept only the transaction; this component fetches the market by id.
	let { transaction } = $props<{ transaction: Transaction & Record<string, any> }>();

	let market: MarketRow | null = $state(null);
	let loadingMarket = $state(false);
	let outcomes: OutcomeRow[] = $state([]);
	let loadingOutcomes = $state(false);

	async function goToTrade(e?: MouseEvent | KeyboardEvent) {
		// If the click/keypress originated on the username link, let it navigate
		const target = (e?.target as HTMLElement | null) ?? null;
		if (target && (target.closest('a.username') || target.closest('.username'))) {
			return;
		}

		// Prevent accidental navigation while selecting text
		if (typeof window !== 'undefined') {
			const sel = window.getSelection?.();
			if (sel && sel.type === 'Range' && sel.toString().trim().length > 0) return;
		}

		if (e && 'preventDefault' in e) e.preventDefault();
		const txId = (transaction as any)?.id ?? null;
		if (txId) goto(`/transaction/${encodeURIComponent(String(txId))}`);
	}

	async function loadMarket() {
		const mid = (transaction as any)?.market_id;
		if (!mid) return;
		loadingMarket = true;
		try {
			const res = await fetch(`/api/markets/${encodeURIComponent(String(mid))}`);
			if (!res.ok) throw new Error('Failed to load market');
			const m = await res.json();
			// Cast to MarketRow (server returns detail row with superset of fields)
			market = m as MarketRow;
		} catch {
			market = null;
		} finally {
			loadingMarket = false;
		}
	}

	async function loadOutcomes() {
		const mid = (transaction as any)?.market_id;
		if (!mid) return;
		loadingOutcomes = true;
		try {
			const res = await fetch(`/api/markets/${encodeURIComponent(String(mid))}/outcomes`);
			const data = await res.json().catch(() => ({ outcomes: [] }));
			outcomes = Array.isArray(data?.outcomes) ? (data.outcomes as OutcomeRow[]) : [];
		} catch {
			outcomes = [] as any;
		} finally {
			loadingOutcomes = false;
		}
	}

	$effect(() => {
		if (typeof window !== 'undefined' && (transaction as any)?.market_id) {
			void loadMarket();
			void loadOutcomes();
		}
	});

	function tradeUrl() {
		const txId = (transaction as any)?.id ?? null;
		if (!txId) return '';
		const href = `/transaction/${encodeURIComponent(String(txId))}`;
		return typeof window !== 'undefined' ? new URL(href, window.location.href).toString() : href;
	}

	function copyTradeLink(e?: MouseEvent) {
		if (e) e.stopPropagation();
		const url = tradeUrl();
		if (!url) return;
		navigator?.clipboard?.writeText(url)
			.then(() => appToast.success('Link copied!'))
			.catch(() => {
				try {
					// Fallback prompt copy
					window?.prompt?.('Copy link', url);
					appToast.success('Link copied!');
				} catch {}
			});
	}

	// Minimal FeedItem for nested FeedCard (when market is ready)
	const feedItem = $derived.by<FeedItem | null>(() => (market ? { market, summary: null, comments: [] } : null));

	// Comment content + author fields (best-effort)
	const commentText = $derived<string>(String((transaction as any)?.comment_content || ''));
	const commentId = $derived.by<string | null>(() => ((transaction as any)?.comment_id ?? null) as string | null);
	const commentCount = $derived.by<number>(() => {
		const n = Number((transaction as any)?.reply_count ?? 0);
		return Number.isFinite(n) ? n : 0;
	});
	const likesCount = $derived.by<number>(() => Number((transaction as any)?.likes_count ?? 0));
	const isLiked = $derived.by<boolean>(() => Boolean((transaction as any)?.liked));
	const created = $derived.by(() => {
		const ts = (transaction as any)?.created_at;
		return ts ? { short: formatDateShortRelative(ts), full: formatDateTime(ts) } : null;
	});

</script>

<div class="feed-tx-card border-border border-b-[0.5px] flex flex-col gap-3 hover-highlight-secondary {X_PADDING} py-4">
	<!-- Header row (mirror Comment.svelte layout) -->
	<div
		class="flex items-start gap-2 cursor-pointer"
		role="link"
		tabindex={0}
		onclick={goToTrade}
		onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { goToTrade(e); } }}
	>
		<div class="mt-2 h-10 w-10 overflow-hidden rounded-full shrink-0">
			<AppImage src={(transaction as any)?.avatar_url || null} size={40} alt="avatar" />
		</div>
		<div class="min-w-0 flex-1">
			<div class="mb-0.5">
				<Username variant="black" weight="medium" extraClass="text-sm" user={transaction as any} />
				{#if created}
					<span class="ml-1 text-sm text-faint" title={created.full}>{created.short}</span>
				{/if}
			</div>
			<p class="mt-0.5 leading-snug text-sm text-base">
				<OutcomeAmount
					outcomeId={(transaction as any)?.outcome_id ?? null}
					outcomeName={(transaction as any)?.outcome_name ?? null}
					colorHex={(transaction as any)?.outcome_color_hex ?? null}
					amount={(transaction as any)?.amount_credits ?? null}
					outcomes={outcomes}
					mode="compact"
				/>
				{#if commentText}
					<span>{commentText}</span>
				{/if}
			</p>
		</div>
	</div>

	<div class="overflow-hidden ml-12">
		{#if feedItem}
			<FeedCard item={feedItem} class="border border-border rounded-sm inner-feed-card" />
		{:else}
			<div class="w-full h-48 flex items-center justify-center">
				<Loading />
			</div>
		{/if}
	</div>

<!--	toolbar -->
	<div class="ml-12">
	<FeedTransactionToolbar
        commentId={commentId}
        initialLikes={likesCount}
        initialIsLiked={isLiked}
        commentCount={commentCount}
        onClickComment={(e) => { e.stopPropagation(); goToTrade(e); }}
        onClickCopy={(e) => { e.stopPropagation(); copyTradeLink(e); }}
    />
	</div>
</div>

<style>
  /* When hovering the inner FeedCard, cancel the outer hover highlight */
  :global(.feed-tx-card:hover:has(.inner-feed-card:hover)) {
    background: transparent !important;
  }
</style>
