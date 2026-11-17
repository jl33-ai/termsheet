<script lang="ts">
	import { appToast } from '$lib/ui/toast.ts';
	import type { FeedItem } from '$lib/types';

	let items = $state<FeedItem[]>([]);
	let nextCursor = $state<string | null>(null);
	let loading = $state(false);
	let error = $state('');

	async function loadInitial() {
		items = [];
		nextCursor = null;
		await loadMore();
	}

	async function loadMore() {
		if (loading) return;
		loading = true;
		error = '';
		try {
			const url = nextCursor ? `/api/feed?limit=20&cursor=${encodeURIComponent(nextCursor)}` : '/api/feed?limit=20';
			const res = await fetch(url);
			if (!res.ok) throw new Error('Failed to load feed');
			const data = await res.json();
			items = [...items, ...(data.items || [])];
			nextCursor = data.nextCursor ?? null;
		} catch (e: any) {
			error = e.message || 'Failed to load';
			appToast.error(error);
		} finally {
			loading = false;
		}
	}

	// Per-row state maps
	let closing = $state<Record<string, boolean>>({});
	let resolving = $state<Record<string, boolean>>({});
	let expandResolve = $state<Record<string, boolean>>({});
	let outcomesByMarket = $state<Record<string, { id: string; name: string; short_code: string }[]>>({});
	let selectedOutcome = $state<Record<string, string>>({});
	let cutoffByMarket = $state<Record<string, string>>({});

	function setClosing(id: string, v: boolean) {
		closing = { ...closing, [id]: v };
	}

	function setResolving(id: string, v: boolean) {
		resolving = { ...resolving, [id]: v };
	}

	function setExpand(id: string, v: boolean) {
		expandResolve = { ...expandResolve, [id]: v };
	}

	function removeItem(id: string) {
		items = items.filter((it) => it.market.id !== id);
	}

	async function ensureOutcomes(id: string) {
		if (outcomesByMarket[id]) return;
		try {
			const res = await fetch(`/api/markets/${encodeURIComponent(id)}/outcomes`);
			if (!res.ok) throw new Error('Failed to load outcomes');
			const data = await res.json();
			outcomesByMarket = { ...outcomesByMarket, [id]: data.outcomes || [] };
		} catch (e: any) {
			appToast.error(e.message || 'Failed to load outcomes');
		}
	}

	async function closeMarket(id: string) {
		if (closing[id]) return;
		setClosing(id, true);
		try {
			const res = await fetch('/api/admin/markets/close', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ market_id: id })
			});
			if (!res.ok) throw new Error('Close failed');
			appToast.success('Market closed');
			removeItem(id);
		} catch (e: any) {
			appToast.error(e.message || 'Close failed');
		} finally {
			setClosing(id, false);
		}
	}

	async function resolveMarket(id: string, outcomeId: string, cutoff?: string) {
		if (!outcomeId) {
			appToast.warning('Select an outcome');
			return;
		}
		if (resolving[id]) return;
		setResolving(id, true);
		try {
			// Ensure closed (API allows idempotent close)
			await fetch('/api/admin/markets/close', {
				method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ market_id: id })
			});

			const res = await fetch('/api/admin/markets/resolve', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					market_id: id,
					outcome_id: outcomeId,
					cutoff: cutoff ? new Date(cutoff).toISOString() : undefined
				})
			});
			if (!res.ok) throw new Error('Resolve failed');
			appToast.success('Market resolved');
			removeItem(id);
		} catch (e: any) {
			appToast.error(e.message || 'Resolve failed');
		} finally {
			setResolving(id, false);
		}
	}

	async function quickResolveBinary(id: string, kind: 'YES' | 'NO') {
		await ensureOutcomes(id);
		const outs = outcomesByMarket[id] || [];
		const pick = outs.find((o) => (o.short_code || '').toUpperCase() === kind) || outs.find((o) => (o.name || '').toUpperCase() === (kind === 'YES' ? 'YES' : 'NO'));
		if (!pick) {
			appToast.error('Binary outcomes not found');
			return;
		}
		await resolveMarket(id, pick.id);
	}

	$effect(() => {
		// auto-load on mount
		void loadInitial();
	});
</script>

<div class="rounded-sm border border-border bg-white p-4">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="text-lg font-medium text-title">Active Markets</h2>
		<button class="text-xs text-accent underline" onclick={loadInitial} disabled={loading}>
			{loading ? 'Refreshing…' : 'Refresh'}
		</button>
	</div>

	{#if items.length === 0 && !loading}
		<p class="text-sm text-muted">No open markets.</p>
	{/if}

	<div class="grid gap-2">
		{#each items as it}
			<div class="rounded-sm border border-border p-3">
				<div class="flex items-start justify-between gap-3">
					<div class="flex-1 min-w-0">
						<div class="text-sm text-title font-medium line-clamp-2">{it.market.question}</div>
						<div class="mt-1 text-xs text-muted">{new Date(it.market.created_at).toLocaleString()}</div>
						<div class="mt-2 flex flex-wrap items-center gap-3">
							<a class="text-xs text-accent underline" href={`/market/${it.market.id}`}>View</a>
							<button class="text-xs text-accent underline"
											onclick={() => navigator.clipboard.writeText(it.market.id).then(() => appToast.success('Market ID copied!'))}>
								Copy ID
							</button>
							<button class="px-2 py-1 text-xs bg-gray-100 rounded-sm border border-border"
											onclick={() => closeMarket(it.market.id)}
											disabled={closing[it.market.id]}> {closing[it.market.id] ? 'Closing…' : 'Close'} </button>

							{#if it.market.market_type === 'BINARY'}
								<button class="px-2 py-1 text-xs bg-green-100 rounded-sm border border-border"
												onclick={() => quickResolveBinary(it.market.id, 'YES')} disabled={resolving[it.market.id]}>
									{resolving[it.market.id] ? 'Resolving…' : 'Resolve Yes'}
								</button>
								<button class="px-2 py-1 text-xs bg-red-100 rounded-sm border border-border"
												onclick={() => quickResolveBinary(it.market.id, 'NO')} disabled={resolving[it.market.id]}>
									{resolving[it.market.id] ? 'Resolving…' : 'Resolve No'}
								</button>
							{:else}
								<button class="px-2 py-1 text-xs bg-blue-50 rounded-sm border border-border"
												onclick={async () => { setExpand(it.market.id, !expandResolve[it.market.id]); if (!outcomesByMarket[it.market.id]) await ensureOutcomes(it.market.id); }}>
									{expandResolve[it.market.id] ? 'Hide Resolve' : 'Resolve…'}
								</button>
							{/if}
						</div>

						{#if expandResolve[it.market.id]}
							<div class="mt-3 flex flex-wrap items-center gap-2">
								<select class="px-2 py-1 border border-border rounded-sm text-sm"
												bind:value={selectedOutcome[it.market.id]}>
									<option value="">Select outcome…</option>
									{#each (outcomesByMarket[it.market.id] || []) as o}
										<option value={o.id}>{o.name}</option>
									{/each}
								</select>
								<input type="datetime-local" class="px-2 py-1 border border-border rounded-sm text-sm"
											 placeholder="Cutoff (optional)" bind:value={cutoffByMarket[it.market.id]} />
								<button class="px-3 py-1 text-xs bg-green-600 text-white rounded-sm"
												onclick={() => resolveMarket(it.market.id, selectedOutcome[it.market.id], cutoffByMarket[it.market.id])}
												disabled={resolving[it.market.id] || !selectedOutcome[it.market.id]}>
									{resolving[it.market.id] ? 'Resolving…' : 'Confirm Resolve'}
								</button>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>

	<div class="mt-3 flex items-center justify-between">
		{#if error}
			<span class="text-xs text-error">{error}</span>
		{/if}
		<button class="ml-auto px-3 py-1 text-sm bg-gray-100 rounded-sm border border-border" onclick={loadMore}
						disabled={loading || !nextCursor}>
			{nextCursor ? (loading ? 'Loading…' : 'Load More') : 'No more'}
		</button>
	</div>
</div>

