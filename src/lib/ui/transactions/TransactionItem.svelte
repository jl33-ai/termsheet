<script lang="ts">
	import OutcomeAmount from '$lib/ui/comments/OutcomeAmount.svelte';
	import { formatDateShort } from '$lib/date.ts';
	import { goto } from '$app/navigation';
	import { X_PADDING } from '$lib/constant.ts';
	import { tooltip } from '$lib/ui/tooltip.ts';
	import { outcomePaletteCategorical } from '$lib/colors.ts';

	let {
		trade,
		isOwner = false,
		isPinned = false,
		loading = false,
		onPin = null,
		onUnpin = null
	} = $props<{
		trade: {
			id: string;
			market_id: string;
			market_question: string;
			outcome_id?: string | null;
			outcome_name?: string | null;
			outcome_color_hex?: string | null;
			outcome_index_id?: number | null;
			amount_credits?: number | null;
			created_at: string | Date;
			comment_content?: string | null;
		};
		isOwner?: boolean;
		isPinned?: boolean;
		loading?: boolean;
		onPin?: ((id: string) => void) | null;
		onUnpin?: ((id: string) => void) | null;
	}>();

	const amount = $derived(trade?.amount_credits != null ? Number(trade.amount_credits) : null);
	const created = $derived.by(() => formatDateShort(trade.created_at));

	const computedColorHex = $derived.by(() => {
		const hex = trade?.outcome_color_hex ?? null;
		if (hex) return hex;
		const idx = Number((trade as any)?.outcome_index_id);
		if (Number.isFinite(idx) && idx >= 0) {
			const palette = outcomePaletteCategorical;
			return palette[idx % palette.length] || null;
		}
		return null;
	});

	function doPin(e?: MouseEvent) {
		if (e) e.stopPropagation();
		if (isOwner && onPin) onPin(trade.id);
	}

	function doUnpin(e?: MouseEvent) {
		if (e) e.stopPropagation();
		if (isOwner && onUnpin) onUnpin(trade.id);
	}

	function open() {
		goto(`/transaction/${trade.id}`);
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			open();
		}
	}
</script>


<div class="flex hover-highlight-secondary {X_PADDING} py-3 items-center gap-3 cursor-pointer" role="link" tabindex="0"
		 use:tooltip={trade.market_question}
		 onclick={open}
		 onkeydown={onKey}>
	<span class="w-16 shrink-0 text-sm text-faint">{created}</span>
	<div class="min-w-0 flex-1 flex items-baseline gap-1">
		<OutcomeAmount
			outcomeId={trade.outcome_id ?? null}
			outcomeName={trade.outcome_name ?? null}
			colorHex={computedColorHex}
			amount={amount}
			mode="compact"
		/>
		{#if trade.comment_content}
			<span class="min-w-0 flex-1 truncate text-base">{trade.comment_content}</span>
		{/if}
	</div>
	<div class="ml-2 shrink-0 flex items-center gap-2 text-sm whitespace-nowrap">
		{#if isOwner}
			{#if isPinned}
				<button class="app-text-button text-faint text-xs" onclick={doUnpin}
								disabled={loading}>{loading ? '…' : 'Unpin'}</button>
			{:else}
				<button class="app-text-button text-faint text-xs" onclick={doPin}
								disabled={loading}>{loading ? '…' : 'Pin'}</button>
			{/if}
		{/if}
	</div>
</div>
