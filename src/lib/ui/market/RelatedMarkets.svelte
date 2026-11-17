<script lang="ts">
    import type { MarketRow } from '$lib/types';

	let { markets = [] } = $props<{ markets?: MarketRow[] }>();
</script>

{#if markets && markets.length > 0}
	<h3 class="mt-6 mb-2">Related</h3>
	<div class="flex flex-col gap-3">
		{#each markets as m}
			<a
				href={`/market/${m.id}`}
				class="hover-highlight block font-bold text-title hover:underline"
			>
				{m.question}
			</a>
		{/each}
	</div>
{/if}
