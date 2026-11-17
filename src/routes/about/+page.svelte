<script lang="ts">
	import SplitPane from '$lib/ui/layout/SplitPane.svelte';
	import BackWithText from '$lib/ui/canonical/BackWithText.svelte';

	const lines = [
		'Turning tech news into an open, meritocratic tournament.',
		'Because we got tired of armchair vc\'s on X.'
	];
</script>

<SplitPane>
	{#snippet leftHeader()}
		<BackWithText showBack={false} text={'About'} titleClass={'text-title'} />
	{/snippet}
	{#snippet left()}
		<div class="w-full">
			<div class="px-6">
				<div class="mt-3 flex flex-col gap-2">
					{#each lines as line}
						<span class="text-base">{line}</span>
					{/each}
				</div>
			</div>
		</div>
	{/snippet}
	{#snippet right()}
		<div class="text-sm text-muted">Info</div>
	{/snippet}

</SplitPane>
