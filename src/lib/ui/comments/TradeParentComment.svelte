<script lang="ts">
	import AppImage from '$lib/ui/canonical/AppImage.svelte';
	import Username from '$lib/ui/canonical/Username.svelte';
	import { getCurrencySymbol } from '$lib/currency.ts';
	import { formatDateShort, formatDateTime } from '$lib/date.ts';
	import OutcomeAmount from '$lib/ui/comments/OutcomeAmount.svelte';

	let { trade, comment = null, outcomes = [] } = $props<{
		trade: any;
		comment?: any | null;
		outcomes?: any[];
	}>();

	const author = $derived(comment ?? trade);
	const createdAt = $derived(comment?.created_at ?? trade?.created_at ?? null);
	const outcomeId = $derived(trade?.outcome_id ?? null);
	const outcomeName = $derived((trade as any)?.outcome_name ?? null);
	const outcomeColorHex = $derived((trade as any)?.outcome_color_hex ?? null);
	const amount = $derived(Number(trade?.amount_credits ?? 0));

	const created = $derived.by(() =>
		createdAt ? { short: formatDateShort(createdAt), full: formatDateTime(createdAt) } : null
	);
</script>

<div class="group grid grid-cols-[40px_1fr] gap-2 py-3">
	<div class="mt-2 h-10 w-10 overflow-hidden rounded-full">
		<AppImage src={author?.avatar_url || null} size={40} alt="avatar" />
	</div>
	<div>
		<div class="mb-0.5 flex items-center gap-1">
			<Username variant="black" user={author} />
			{#if created}
				<span class="text-sm text-faint" title={created.full}>{created.short}</span>
			{/if}
		</div>

		<OutcomeAmount outcomeId={outcomeId} outcomeName={outcomeName} colorHex={outcomeColorHex} amount={amount} {outcomes}
									 mode="verbose" />

		{#if comment?.content}
			<p class="mt-2 leading-snug text-base">{comment.content}</p>
		{/if}
	</div>

</div>
