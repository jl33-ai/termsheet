<script lang="ts">
	import FeedCard from '$lib/ui/feed-card/FeedCard.svelte';

	import type { FeedItem } from '$lib/types';
	import SplitPane from '$lib/ui/layout/SplitPane.svelte';
	import FeedTransactionCard from '$lib/ui/feed-card/FeedTransactionCard.svelte';
	import { page } from '$app/state';
	import TabSwitch from '$lib/ui/TabSwitch.svelte';
	import SearchBar from '$lib/ui/home/SearchBar.svelte';
	import Loading from '$lib/ui/canonical/Loading.svelte';
	import { appToast } from '$lib/ui/toast.ts';
    import { getContext } from 'svelte';

	// Prefer $page store; support both top-level and streamed keys
	const itemsRecent = $derived.by(() => {
		const d: any = page.data;
		const list = d?.recent ?? d?.streamed?.recent ?? [];
		return Array.isArray(list) ? (list as FeedItem[]) : [];
	});
	const itemsForYou = $derived.by(() => {
		const d: any = page.data;
		const list = d?.forYou ?? d?.streamed?.forYou ?? [];
		return Array.isArray(list) ? (list as FeedItem[]) : [];
	});
	const recentTx = $derived.by(() => (Array.isArray(page.data?.recent_transactions) ? page.data.recent_transactions : []));

	// Pagination state, consolidated per-tab
	type Tab = 'forYou' | 'recent';
	let nextCursor = $state<{ forYou: string | null; recent: string | null }>({ forYou: null, recent: null });
	let loading = $state<{ forYou: boolean; recent: boolean }>({ forYou: false, recent: false });
	let more = $state<{ forYou: FeedItem[]; recent: FeedItem[] }>({ forYou: [], recent: [] });

	// Fallback recent transactions (when For you feed is empty)
	let moreTx = $state<any[]>([]);
	let loadingTx = $state(false);
	let nextCursorTx = $state<string | null>(null);

	// Initialize cursors from streamed $page data
	$effect(() => {
		nextCursor.forYou = page.data?.streamed?.nextCursor ?? null;
		nextCursor.recent = page.data?.streamed?.recentNextCursor ?? null;
	});

	// Initialize TX cursor from server-provided recent transaction list
	$effect(() => {
		if (Array.isArray(recentTx) && recentTx.length > 0) {
			const last = recentTx[recentTx.length - 1] as any;
			const created = last?.created_at ? new Date(last.created_at).toISOString() : null;
			const id = last?.id ?? null;
			nextCursorTx = created && id ? `${created}|${id}` : null;
		}
	});

	function dedupeAppend(base: FeedItem[], more: FeedItem[]): FeedItem[] {
		const seen = new Set(base.map((i) => i.market.id));
		const out: FeedItem[] = [];
		for (const it of more) {
			if (seen.has(it.market.id)) continue;
			seen.add(it.market.id);
			out.push(it);
		}
		return out;
	}

	async function loadMore(tab: Tab) {
		const cursor = nextCursor[tab];
		if (loading[tab] || !cursor) return;
		loading[tab] = true;
		try {
			const mode = tab;
			const url = `/api/feed?limit=12&cursor=${encodeURIComponent(cursor)}&mode=${encodeURIComponent(mode)}`;
			appToast.info(`Loading more ${tab === 'forYou' ? 'For you' : 'Recent'}…`);
			const res = await fetch(url);
			const j = await res.json();
			const items = (Array.isArray(j?.items) ? (j.items as FeedItem[]) : []);
			const base = tab === 'forYou' ? [...itemsForYou, ...more.forYou] : [...itemsRecent, ...clientRecent, ...more.recent];
			const append = dedupeAppend(base, items);
			if (append.length) {
				if (tab === 'forYou') more.forYou = [...more.forYou, ...append];
				else more.recent = [...more.recent, ...append];
			}
			nextCursor[tab] = j?.nextCursor ?? null;
		} catch {
		} finally {
			loading[tab] = false;
		}
	}

	async function loadMoreTx() {
		if (loadingTx || !nextCursorTx) return;
		loadingTx = true;
		try {
			const url = `/api/transactions/recent?limit=12&cursor=${encodeURIComponent(nextCursorTx)}`;
			const res = await fetch(url);
			const j = await res.json();
			const items = Array.isArray(j?.items) ? (j.items as any[]) : [];
			// dedupe by transaction id
			const seen = new Set<string>([...recentTx, ...moreTx].map((t: any) => String(t.id)));
			const append = items.filter((t: any) => {
				const id = String(t?.id ?? '');
				if (!id || seen.has(id)) return false;
				seen.add(id);
				return true;
			});
			if (append.length) moreTx = [...moreTx, ...append];
			nextCursorTx = j?.nextCursor ?? null;
		} catch {
		} finally {
			loadingTx = false;
		}
	}

	// Do not dismiss cards in realtime after bets
	function handleOutcomeClick(_item: FeedItem) {
		// intentionally no-op: keep item visible until next reload
	}

	let currentPage = $state<'forYou' | 'recent'>('forYou');

	// Client-side infinite scroll via scroll listener on SplitPane's pane
	const MIN_INTERVAL_MS = 900; // throttle triggers
	let lastTriggerAt = 0;
	const splitCtx: any = getContext('splitpane');

	function maybeLoadMore() {
		const now = Date.now();
		if (now - lastTriggerAt < MIN_INTERVAL_MS) return;
		// Special case: For you is empty -> show recent transactions with comments
		if (currentPage === 'forYou' && (!itemsForYou || itemsForYou.length === 0)) {
			if (!nextCursorTx || loadingTx) return;
			lastTriggerAt = now;
			loadMoreTx();
			return;
		}
		const tab = currentPage as Tab;
		if (!nextCursor[tab] || loading[tab]) return;
		lastTriggerAt = now;
		loadMore(tab);
	}

	$effect(() => {
		if (typeof window === 'undefined') return;
		const el = splitCtx?.getLeftPane?.() as HTMLElement | null;
		if (!el) return;
		let raf = 0;
		const tick = () => {
			raf = 0;
			const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
			if (remaining < 200) maybeLoadMore();
		};
		const onScroll = () => {
			if (raf) return;
			raf = requestAnimationFrame(tick);
		};
		const onResize = () => tick();
		el.addEventListener('scroll', onScroll, { passive: true } as any);
		window.addEventListener('resize', onResize, { passive: true } as any);
		// initial check to backfill if content is short
		queueMicrotask(() => tick());
		return () => {
			el.removeEventListener('scroll', onScroll as any);
			window.removeEventListener('resize', onResize as any);
			if (raf) cancelAnimationFrame(raf);
		};
	});

	// Client-side fallback to ensure recent markets populate even if stream is delayed
	let clientRecent = $state<FeedItem[]>([]);
	$effect(async () => {
		if (typeof window === 'undefined') return;
		// if server-streamed recent is empty, fetch a fallback
		if (!itemsRecent?.length && clientRecent.length === 0) {
			try {
				const res = await fetch('/api/feed?limit=12&mode=recent');
				const j = await res.json();
				const arr = Array.isArray(j?.items) ? (j.items as FeedItem[]) : [];
				if (arr.length) clientRecent = arr;
				nextCursor.recent = j?.nextCursor ?? nextCursor.recent;
			} catch {
			}
		}
	});
</script>

<SplitPane>
	{#snippet leftHeader()}
		<TabSwitch
			bind:value={currentPage}
			options={[
					{ value: 'forYou', label: 'For you' },
					{ value: 'recent', label: 'Recent' }
				]}
		/>
	{/snippet}

	{#snippet left()}
		<div class="flex flex-col">
			{#if currentPage === 'forYou'}
				{#if itemsForYou?.length}
					{#each itemsForYou as it (it.market.id)}
						<FeedCard item={it} onClickOutcome={handleOutcomeClick} />
					{/each}
					{#if more.forYou.length}
						{#each more.forYou as it (it.market.id)}
							<FeedCard item={it} onClickOutcome={handleOutcomeClick} />
						{/each}
					{/if}
					<!-- sentinel for infinite scroll (forYou) -->
					{#if nextCursor.forYou}
						<div class="h-4"></div>
						<div class="flex items-center justify-center py-3">
							<button
								class="app-text-button text-sm"
								disabled={loading.forYou}
								onclick={() => loadMore('forYou')}
							>
								{loading.forYou ? 'Loading…' : 'Load more'}
							</button>
						</div>
					{/if}
				{:else}
					{#each recentTx as tx}
						<FeedTransactionCard transaction={tx} />
					{/each}
					{#if moreTx.length}
						{#each moreTx as tx (tx.id)}
							<FeedTransactionCard transaction={tx} />
						{/each}
					{/if}
					{#if nextCursorTx}
						<div class="h-4"></div>
						<div class="flex items-center justify-center py-3">
							<button
								class="app-text-button text-sm"
								disabled={loadingTx}
								onclick={() => loadMoreTx()}
							>
								{loadingTx ? 'Loading…' : 'Load more'}
							</button>
						</div>
					{/if}
				{/if}
			{:else}
				{#if itemsRecent?.length}
					{#each itemsRecent as it (it.market.id)}
						<FeedCard item={it} onClickOutcome={handleOutcomeClick} />
					{/each}
				{:else if clientRecent.length}
					{#each clientRecent as it (it.market.id)}
						<FeedCard item={it} onClickOutcome={handleOutcomeClick} />
					{/each}
				{:else}
					<div class="flex items-center justify-center py-6">
						<Loading size={18} />
					</div>
				{/if}
				{#if itemsRecent?.length || clientRecent.length}
					{#if more.recent.length}
						{#each more.recent as it (it.market.id)}
							<FeedCard item={it} onClickOutcome={handleOutcomeClick} />
						{/each}
					{/if}
					<!-- sentinel for infinite scroll (recent) -->
					{#if nextCursor.recent}
						<div class="h-4"></div>
						<div class="flex items-center justify-center py-3">
							<button
								class="app-text-button text-sm"
								disabled={loading.recent}
								onclick={() => loadMore('recent')}
							>
								{loading.recent ? 'Loading…' : 'Load more'}
							</button>
						</div>
					{/if}
				{/if}
			{/if}
		</div>
	{/snippet}


	{#snippet right()}
		<div class="flex flex-col gap-4">
			<SearchBar />
		</div>
	{/snippet}

</SplitPane>
