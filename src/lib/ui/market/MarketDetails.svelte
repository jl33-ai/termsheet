<script lang="ts">
	import MarketTrendGraph from '$lib/ui/market/MarketTrendGraph.svelte';
	import LinkifiedText from '$lib/ui/LinkifiedText.svelte';
	import MarketDates from '$lib/ui/market/MarketDates.svelte';
	import IconAndText from '$lib/ui/canonical/IconAndText.svelte';
	import MarketCompanies from '$lib/ui/market/MarketCompanies.svelte';
	import MarketSources from '$lib/ui/market/MarketSources.svelte';

	import type { MarketMeta, OutcomeRow, MarketPricePoint } from '$lib/types';

	let { market, outcomes }: { market: MarketMeta; outcomes: OutcomeRow[] } = $props();

	let loading = $state(true);
	let price_history = $state<MarketPricePoint[]>([]);

	$effect(() => {
		loading = true;
		void (async function run() {
			try {
				const res = await fetch(`/api/markets/${market.id}/prices`);
				if (res.ok) {
					const data = await res.json();
					price_history = (data?.price_history ?? []) as MarketPricePoint[];
				}
			} catch {
			}
			loading = false;
		})();
	});

</script>

<section class="my-4">
	<MarketTrendGraph {outcomes} {price_history} />
	<MarketCompanies marketId={market.id} class="mt-4 text-sm" />
	<MarketSources marketId={market.id} class="text-sm" />
	<MarketDates {market} />


	{#if market.rules}
		<div class="mt-3">
			<LinkifiedText text={market.rules} />
		</div>
	{/if}
</section>
