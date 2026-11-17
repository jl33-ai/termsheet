<script lang="ts">
    import type { OutcomeLike } from '$lib/types';
	import { outcomeColorHex } from '$lib/colors.ts';
	import { getCurrencySymbol, formatMoney } from '$lib/currency.ts';

	let {
		outcomeId = null,
		outcomeName = null,
		colorHex = null,
		amount = null,
		shares = null,
		outcomes = [],
		mode = 'compact'
	} = $props<{
		outcomeId?: string | null;
		outcomeName?: string | null;
		colorHex?: string | null;
		amount?: number | null;
		shares?: number | null;
		outcomes?: OutcomeLike[];
		mode?: 'compact' | 'verbose';
	}>();

	const currency = getCurrencySymbol();
	const value = $derived(amount != null ? Number(amount) : shares != null ? Number(shares) : null);

	function fmtConcise(n: number) {
		const v = Math.abs(Number(n) || 0);
		if (v >= 1_000_000_000) return `${currency}${(v / 1_000_000_000).toFixed(1)}B`;
		if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(1)}M`;
		if (v >= 10_000) return `${currency}${Math.round(v / 1000)}K`;
		if (v >= 1000) return `${currency}${(v / 1000).toFixed(1)}K`;
		return `${currency}${Math.round(v)}`;
	}

	const outcomeHex = $derived.by(() =>
		outcomeColorHex({
			explicitHex: colorHex,
			id: outcomeId ?? null,
			name: outcomeName ?? null,
			shortCode: null,
		})
	);
</script>

{#if mode === 'compact'}
	{#if (outcomeName || value != null) && (outcomeName || value != null)}
    <span class="mr-1 font-medium" style={outcomeHex ? `color: ${outcomeHex}` : ''}>
      {outcomeName}{value != null ? ` (${fmtConcise(value)})` : ''}
    </span>
	{/if}
{:else}
	<div class="flex text-lg text-title items-center gap-1 font-medium" style={outcomeHex ? `color: ${outcomeHex}` : ''}>
		{#if value != null}
			<span>Bet {formatMoney(value, currency)}</span>
		{/if}
		{#if outcomeName}
			<span>on {outcomeName}</span>
		{/if}
	</div>
{/if}
