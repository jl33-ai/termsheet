<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	// helpers kept minimal in-file for subtitle logic
	import CommentsSection from '$lib/ui/comments/CommentsSection.svelte';
	import TransactionWidget from '$lib/ui/transactions/TransactionWidget.svelte';
	import SplitPane from '$lib/ui/layout/SplitPane.svelte';
	import OutcomeList from '$lib/ui/outcomes/OutcomeList.svelte';
	import MarketHeaderRow from '$lib/ui/market/MarketHeaderRow.svelte';
	import { getBanner } from '$lib/stores/banner.svelte.ts';
	import { computeMarketBanner } from '$lib/market/banner';
	import { withQuery } from '$lib/url';
	import { buildPriceMapFromPool, outcomePrice } from '$lib/market/pricing';
	import { filterByOutcome, findOutcomeName, dedupeAppend } from '$lib/comments/utils';
	// unified layout: non-binary styles for all markets

	let { data } = $props();

	const banner = $derived(getBanner());

	let betAmounts = $state<{ [outcomeId: string]: number }>({});

	// Query helpers moved to $lib/url

	async function setSelectedOutcomeInUrl(id: string | null) {
		const valid = id && (outcomes || []).some((o: any) => o.id === id) ? id : null;
		const current = page.url.searchParams.get('outcome') ?? null;
		if (valid === current) return;
		const href = withQuery(page.url, { outcome: valid });
		await goto(href, { replaceState: true, keepFocus: true, noScroll: true });
	}

	let tradeAmount = $state<number | null>(null);
	let loading = $state<{ [outcomeId: string]: boolean }>({});
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	let detailsOpen = $state(false);

	const market = $derived(data.market);
	const outcomes = $derived(data.outcomes);
	const pool_balances = $derived(data.pool_balances);
	const positions = $derived(data.positions);
	const positionsNormalized = $derived.by(() => (positions || []).map((p: any) => ({
		outcome_id: p.outcome_id,
		shares: Number(p.shares ?? 0)
	})));
	// Manage comments locally with pagination
	let commentsLocal = $state<any[]>([...data.comments]);
	let commentsNextCursor = $state<string | null>(data.comments_next_cursor ?? null);

	// Comment creation UI is handled in TransactionWidget; keep display logic here clean


	$effect(() => {
		commentsLocal = [...data.comments];
		commentsNextCursor = data.comments_next_cursor ?? null;
	});
	const user = $derived(data.user);
	const company = $derived(data.company);

	$effect(() => {
		const b = computeMarketBanner(market, outcomes, positionsNormalized, user);
		const st = banner;
		if (!st) return;
		if (b) st.set(b.content, b.icon);
		else st.clear();
	});

	// Pool math helpers must be declared before any reactive usage
	const totalPoolBalance = $derived(pool_balances.reduce((acc, b) => acc + Number(b.balance), 0));

	// Precompute outcome prices for O(1) lookup in loops
	const priceByOutcomeId = $derived.by(() =>
		buildPriceMapFromPool((pool_balances || []).map((b) => ({
			market_id: b.market_id,
			outcome_id: b.outcome_id,
			balance: Number(b.balance)
		})))
	);

	// balance lookup not needed here; prices precomputed via map

	function getOutcomePrice(outcomeId: string) {
		return outcomePrice(outcomeId, priceByOutcomeId, (outcomes || []).length);
	}


	// Selection is derived directly from URL
	const selectedOutcomeId = $derived.by(() => {
		const v = page.url.searchParams.get('outcome');
		if (!v) return null;
		return (outcomes || []).some((o: any) => o.id === v) ? v : null;
	});

	// Filter comments by currently selected outcome; when none selected, show all
	const visibleComments = $derived.by(() => {
		// Only show comments that are tied to trades (must have transaction_id and outcome_id)
		const tradeComments = (commentsLocal || []).filter((c) => c?.transaction_id && c?.outcome_id);
		return filterByOutcome(tradeComments as any, selectedOutcomeId);
	});

	// Sorting handled inside CommentsSection; only filter here

	// Friendly signifier for active outcome filter (used for comments)
	const selectedOutcomeName = $derived.by(() => findOutcomeName(outcomes, selectedOutcomeId));

	// Small filter badge is rendered by CommentsSection

	// Handle optimistic comment add/remove coming from TransactionWidget
	function onCommentOptimistic(c: any) {
		if (!c) return;
		commentsLocal = [c, ...commentsLocal];
	}

	function onCommentOptimisticRemove(p: { id: string }) {
		const id = p?.id;
		if (!id) return;
		commentsLocal = commentsLocal.filter((c) => c.id !== id);
	}

	// Pagination: load more comments
	const COMMENTS_PAGE_SIZE = 20;
	let loadingMore = $state(false);

	async function loadMoreComments() {
		if (loadingMore || !commentsNextCursor) return;
		loadingMore = true;
		try {
			const res = await fetch(`/api/markets/${encodeURIComponent(market.id)}/comments?cursor=${encodeURIComponent(commentsNextCursor)}&limit=${COMMENTS_PAGE_SIZE}`);
			if (res.ok) {
				const payload = await res.json();
				const items = (payload?.items ?? []) as any[];
				if (items.length > 0) commentsLocal = dedupeAppend(commentsLocal as any, items as any);
				commentsNextCursor = payload?.nextCursor ?? null;
			}
		} finally {
			loadingMore = false;
		}
	}


	import { getCurrencySymbol } from '$lib/currency';
	import {
		buildOutcomeIndex,
		barFillForOutcome,
		barFillForBinary,
		binaryIntentFromName
	} from '$lib/colors';
	import RelatedMarkets from '$lib/ui/market/RelatedMarkets.svelte';
	import MarketDetails from '$lib/ui/market/MarketDetails.svelte';
	import { getModal } from '$lib/stores/ui-modal.svelte.ts';
	import { X_PADDING } from '$lib/constant.ts';
	import BackWithText from '$lib/ui/canonical/BackWithText.svelte';
    import AppImage from '$lib/ui/canonical/AppImage.svelte';


	const modal = getModal();

	function openContributeModal() {
		modal?.show({ kind: 'contributeSource', marketId: market.id });
	}


	// Allow unselecting by clicking outside the OutcomeListChartMain in the left pane
	let outcomeListEl: HTMLDivElement | null = null;

	function onLeftPaneClick(e: MouseEvent) {
		const target = e.target as Node | null;
		if (!target) return;
		if (outcomeListEl && !outcomeListEl.contains(target)) {
			void setSelectedOutcomeInUrl(null);
		}
	}

	const selectedPrice = $derived(selectedOutcomeId ? getOutcomePrice(selectedOutcomeId) : 0);


	// Ranked outcomes for unified list.
	// Do not sort by % for scalar-type markets; preserve server order (indexId ASC).
	const rankedItems = $derived.by(() => {
		const base = (outcomes ?? []).map((o: any) => ({
			id: o.id,
			name: o.name,
			short_code: o.short_code,
			price: getOutcomePrice(o.id)
		}));
		const mt = market?.market_type;
		// Schema uses SCALAR_BUCKET; also guard for possible 'SCALAR'
		if (mt === 'SCALAR_BUCKET' || mt === 'SCALAR') return base;
		return [...base].sort((a, b) => b.price - a.price);
	});

	// use centralized intent helper from colors
	// bar colors now sourced via $lib/colors helpers
	// If the selected id becomes invalid due to data refresh, clear it from URL
	$effect(() => {
		if (!outcomes || outcomes.length === 0) return;
		if (selectedOutcomeId && !outcomes.some((o) => o.id === selectedOutcomeId)) {
			void setSelectedOutcomeInUrl(null);
		}
	});

	// Also proactively clear an invalid outcome query param if present
	$effect(() => {
		const raw = page.url.searchParams.get('outcome');
		if (!raw) return;
		if (!(outcomes || []).some((o: any) => o.id === raw)) {
			void setSelectedOutcomeInUrl(null);
		}
	});

	function selectOutcome(id: string) {
		void setSelectedOutcomeInUrl(id);
		const stored = betAmounts[id];
		tradeAmount = typeof stored === 'number' && stored > 0 ? stored : tradeAmount;
	}

	$effect(() => {
		if (selectedOutcomeId) {
			betAmounts[selectedOutcomeId] = Number(tradeAmount) || 0;
		}
	});
</script>

<svelte:head>
	<title>{market?.question ?? 'Market'}</title>
	<!-- Simple tab title: market name -->
</svelte:head>

<!-- banner handled globally via computeMarketBanner + Banner.svelte -->


<SplitPane>
	{#snippet leftHeader()}
		<BackWithText text={'Back'} />
	{/snippet}
	{#snippet left()}
		<div class="w-full" role="region" tabindex="0" onclick={onLeftPaneClick} onkeydown={() => {}}>
			<div class="{X_PADDING}">


				<div class="flex items-center gap-3">
					<AppImage src={market.thumbnail_url} alt="Market thumbnail" size={40} tooltip={false} />
					<MarketHeaderRow question={market.question} copyHref={page.url.href} marketId={market.id} />
				</div>

				<!-- Companies and Sources are rendered within MarketDetails -->

				<div class="py-8" bind:this={outcomeListEl}>
					<OutcomeList
						items={rankedItems}
						selectedId={selectedOutcomeId}
						fillColor={(it, isSel) => {
						const active = selectedOutcomeId ? isSel : true; // when no selection, treat all as selected
						return market.market_type === 'BINARY'
							? barFillForBinary(binaryIntentFromName(it.short_code ?? it.name), active)
							: barFillForOutcome(outcomes, it.id, active) || '';
					}}
						onChoose={({ id }) => selectOutcome(id)}
					/>
				</div>


				{#if detailsOpen}
					<MarketDetails {market} {outcomes} />
				{/if}
			</div>

			<button
				class="w-full flex items-center justify-center py-3 text-sm text-title hover-highlight-secondary"
				onclick={() => (detailsOpen = !detailsOpen)}
			>
				{detailsOpen ? 'See less' : 'See more'}
			</button>

			<CommentsSection
				comments={visibleComments}
				{user}
				marketId={market.id}
				{outcomes}
				allowTopLevel={false}
				showFilterBadge={Boolean(selectedOutcomeName)}
				filterName={selectedOutcomeName || ''}
				onClearFilter={() => setSelectedOutcomeInUrl(null)}
				hasMore={Boolean(commentsNextCursor)}
				loadingMore={loadingMore}
				onLoadMore={loadMoreComments}
			/>
		</div>
	{/snippet}
	{#snippet right()}
		<TransactionWidget
			{market}
			{outcomes}
			{pool_balances}
			positions={positionsNormalized}
			{user}
			commentOptimistic={onCommentOptimistic}
			commentOptimisticRemove={onCommentOptimisticRemove}
		/>
		<RelatedMarkets markets={data.related_markets as any} />
	{/snippet}
</SplitPane>
