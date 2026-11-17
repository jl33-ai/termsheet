<script lang="ts">
	import Modal from '$lib/ui/canonical/Modal.svelte';

	let {
		open = $bindable(false),
		onContinue = null,
		onCancel = null
	} = $props<{
		open?: boolean;
		onContinue?: (() => void) | null;
		onCancel?: (() => void) | null;
	}>();
</script>

{#if open}
	<Modal open={open} onClose={() => { open = false; onCancel?.(); }}>
		{#snippet header()}
			<h3 class="text-title font-medium">Before you place a bet</h3>
		{/snippet}
		{#snippet children()}
			<div class="grid gap-2">
				<ul class="list-disc pl-5 text-sm text-base">
					<li>Bets are immutable and cannot be deleted.</li>
					<li>Bets are a permanent part of the history.</li>
					<li>All bets are public.</li>
				</ul>
			</div>
		{/snippet}
		{#snippet footer()}
			<div class="mt-3 flex justify-end gap-2">
				<button class="app-button naked" type="button" onclick={() => { open = false; onCancel?.(); }}>Cancel</button>
				<button class="app-button" type="button" onclick={() => { onContinue?.(); open = false; }}>Continue</button>
			</div>
		{/snippet}
	</Modal>
{/if}

