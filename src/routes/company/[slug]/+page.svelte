<script lang="ts">
	import { formatRelativeExpiry, formatExpiry } from '$lib/date';
	import CompanyAvatar from '$lib/ui/canonical/CompanyAvatar.svelte';
	import BackButton from '$lib/ui/canonical/BackButton.svelte';
	import SplitPane from '$lib/ui/layout/SplitPane.svelte';
	import BackWithText from '$lib/ui/canonical/BackWithText.svelte';
	import { X_PADDING } from '$lib/constant.ts';
	import IconAndText from '$lib/ui/canonical/IconAndText.svelte';

	let { data } = $props();

	const company = $derived(data.company);
	const markets = $derived(data.markets);
</script>

<SplitPane>
	{#snippet leftHeader()}
		<BackWithText showBack={true} text={company.name} titleClass={'text-black'} />
	{/snippet}

	{#snippet left()}
		<div class="{X_PADDING} py-4 flex flex-col items-start gap-3 sm:flex-row border-border border-b-[0.5px]">
			<CompanyAvatar name={company.name} logo_url={company.logo_url} size="lg" />
			<div>
				<h1 class="text-2xl font-medium">{company.name}</h1>
				<p class="mt-1 text-base">{company.bio}</p>
			</div>
		</div>

		<h2 class="{X_PADDING} py-3 text-lg font-medium border-b-[0.5px] border-border">Markets</h2>

		{#if markets.length > 0}
			<div class="grid grid-cols-1">
				{#each markets as market}
					<a
						href={`/market/${market.id}`}
						class='{X_PADDING} hover-highlight-secondary border-b-[0.5px] border-border py-4'
					>
						<div class="font-medium">{market.question}</div>
						<div class="mt-1 text-sm text-muted" title={formatExpiry(market.expires_at)}>
							Expires: {formatRelativeExpiry(market.expires_at)}
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<div class="{X_PADDING}">
				<IconAndText icon="bx:bar-chart-alt-2" text="No markets found for this company."></IconAndText>
			</div>
		{/if}
	{/snippet}


	{#snippet right()}
	{/snippet}
</SplitPane>
