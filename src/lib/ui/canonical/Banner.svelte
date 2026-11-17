<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { getBanner } from '$lib/stores/banner.svelte.ts';
	import Icon from '@iconify/svelte';

	const banner = $derived(getBanner());

	// Clear existing banner when navigating away; pages can set a new one.
	beforeNavigate(() => {
		banner?.clear?.();
	});
</script>

{#if banner?.state}
	<section
		class="flex w-full items-center justify-center gap-1 bg-gray-100 py-3"
	>
		{#if banner.state.icon}
			<Icon icon={banner.state.icon} class="text-muted" />
		{/if}
		<span class="text-sm font-medium text-muted">{banner.state.content}</span>
	</section>
{/if}
