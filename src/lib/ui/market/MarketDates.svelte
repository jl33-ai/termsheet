<script lang="ts">
	import { tooltip } from '$lib/ui/tooltip.ts';
	import { formatDateShort, formatDateTime } from '$lib/date';

	let {
		market,
		class: className = ''
	}: {
		market: {
			expires_at?: string | null;
			closed_at?: string | null;
			resolution_outcome_id?: string | null;
		};
		class?: string;
	} = $props();

	const statusLine = $derived.by(() => {
		const isResolved = Boolean(market?.resolution_outcome_id);
		const hasClosedAt = Boolean(market?.closed_at);
		const hasExpiry = Boolean(market?.expires_at);

		if (isResolved) {
			const d = market?.closed_at ?? null;
			const dt = d ? formatDateTime(d) : '';
			return {
				text: `Resolved on: ${formatDateShort(d)}`,
				tooltip: dt ? `This market was resolved on ${dt}.` : 'This market was resolved.'
			};
		}
		if (hasClosedAt) {
			const d = market?.closed_at ?? null;
			const dt = d ? formatDateTime(d) : '';
			return {
				text: `Closed on: ${formatDateShort(d)}`,
				tooltip: dt
					? `This market was closed on ${dt} but no result has been selected yet.`
					: 'This market was closed but no result has been selected yet.'
			};
		}
		if (hasExpiry) {
			const d = market?.expires_at ?? null;
			const dt = d ? formatDateTime(d) : '';
			return {
				text: `Expires: ${formatDateShort(d)}`,
				tooltip: dt ? `This market will expire on ${dt}.` : 'This market will expire.'
			};
		}
		return { text: 'No expiry', tooltip: 'This market has no expiry date.' };
	});
</script>

<div class="{className} break-words text-muted text-sm leading-normal">
	<div class="mb-1">
        <span
					class="hover-highlight inline-block align-baseline cursor-pointer"
					use:tooltip={statusLine.tooltip}
				>{statusLine.text}</span>
	</div>

</div>
