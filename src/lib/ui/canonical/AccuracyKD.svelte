<script lang="ts">
	import { tooltip } from '$lib/ui/tooltip.ts';
	import InfoTooltip from '$lib/ui/canonical/InfoTooltip.svelte';

	let {
		correct = 0,
		pending = 0,
		incorrect = 0,
		showZeros = false,
		verbose = false
	} = $props<{
		correct?: number;
		pending?: number;
		incorrect?: number;
		showZeros?: boolean;
		verbose?: boolean; // optional: enables verbose layout
	}>();

	const show = $derived.by(() => Boolean(showZeros || correct || pending || incorrect));

	function word(n: number) {
		return n === 1 ? 'bet' : 'bets';
	}

	const total = $derived.by(() => correct + pending + incorrect);
	const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

	const correctTip = $derived.by(() => `${correct} correct ${word(correct)}`);
	const pendingTip = $derived.by(() => `${pending} pending ${word(pending)}`);
	const incorrectTip = $derived.by(() => `${incorrect} incorrect ${word(incorrect)}`);
</script>

{#snippet MetricChip({ value, tip, className }: { value: number; tip: string; className?: string })}
	<span use:tooltip={tip} class={`rounded-sm ${className} cursor-pointer`}>{value}</span>
{/snippet}


{#if show}
	{#if verbose}
		<div
			class="flex flex-col gap-2"
			aria-label={`Track record: Correct ${correct}, Incorrect ${incorrect}, Pending ${pending}`}
			role="group"
		>
			<!--			<div class="flex items-center gap-2">-->
			<!--				<span class="font-medium text-title">Track record</span>-->
			<!--				<InfoTooltip text="This is your track record. Everything on termsheet is immutable." />-->
			<!--			</div>-->
			<div class="flex flex-wrap items-center gap-5 text-sm">
				<div class="flex items-center gap-2">
					{@render MetricChip({ value: correct, tip: correctTip, className: 'font-medium text-accent' })}
					<span class="text-muted text-xs">correct</span>
				</div>
				<div class="flex items-center gap-2">
					{@render MetricChip({ value: incorrect, tip: incorrectTip, className: 'font-medium text-error' })}
					<span class="text-muted text-xs">incorrect</span>
				</div>
				<div class="flex items-center gap-2">
					{@render MetricChip({ value: pending, tip: pendingTip, className: 'text-muted' })}
					<span class="text-muted text-xs">pending</span>
				</div>
			</div>
		</div>
	{:else}
		<div
			class="flex items-center gap-2 text-sm"
			title="Correct / Incorrect / Pending"
			aria-label={`Correct: ${correct}, Incorrect: ${incorrect}, Pending: ${pending}`}
			role="group"
		>
			{@render MetricChip({ value: correct, tip: correctTip, className: 'font-medium text-accent' })}
			{@render MetricChip({ value: incorrect, tip: incorrectTip, className: 'font-medium text-title' })}
			{@render MetricChip({ value: pending, tip: pendingTip, className: 'text-muted' })}

			<InfoTooltip text="This is your track record. Everything on termsheet is immutable." />
		</div>
	{/if}
{/if}
