<script lang="ts">
	import type { LayoutData } from '../../../../.svelte-kit/types/src/routes/$types';
	import { getDrawers } from '$lib/stores/ui-drawers.svelte.ts';
	import LeftNav from './LeftNav.svelte';
	import { getBreakpoint } from '$lib/stores/breakpoint.svelte.ts';

	let { data } = $props<{ data: LayoutData }>();

	const drawers = getDrawers();
	const bp = getBreakpoint();

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') drawers?.closeLeft();
	}
</script>

<!-- Desktop static left bar -->
<aside class="hidden md:flex flex-col w-64">
	<LeftNav {data} />
</aside>

<!-- Mobile left drawer -->
{#if bp?.isMobile && drawers?.leftOpen}
	<div class="md:hidden fixed inset-0 z-40" onkeydown={onKey} tabindex="0">
		<!-- backdrop -->
		<div class="absolute inset-0 bg-black/30" onclick={() => drawers?.closeLeft()}></div>
		<!-- drawer -->
		<aside class="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white border-r border-border p-4">
			<div class="flex justify-end mb-2">
				<button class="text-sm px-2 py-1 app-button" onclick={() => drawers?.closeLeft()}>Close</button>
			</div>
			<LeftNav {data} />
		</aside>
	</div>
{/if}
