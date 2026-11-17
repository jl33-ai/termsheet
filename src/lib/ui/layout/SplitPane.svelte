<script lang="ts">
	import type { Snippet } from 'svelte';
	import Banner from '$lib/ui/canonical/Banner.svelte';
	import { setContext } from 'svelte';

	// Back-compat: support original left/right as well as optional leftTop/leftBottom
	// If leftTop/leftBottom provided, they define left content; otherwise fall back to left.
	let {
		left,
		leftHeader,
		right
	} = $props<{
		left?: Snippet;
		leftHeader?: Snippet;
		right: Snippet;
	}>();

	let leftPaneEl: HTMLDivElement | null = null;

	// Mobile drawers + breakpoint stores
	import { getDrawers } from '$lib/stores/ui-drawers.svelte.ts';
	import { getBreakpoint } from '$lib/stores/breakpoint.svelte.ts';
	import Icon from '@iconify/svelte';

	const drawers = getDrawers();
	const bp = getBreakpoint();

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && drawers) drawers.rightOpen = false;
	}

	const onGlobalWheel = (e: WheelEvent) => {
		if (!leftPaneEl) return;
		const path = (e.composedPath?.() ?? []) as EventTarget[];
		if (path.includes(leftPaneEl)) return;
		e.preventDefault();
		leftPaneEl.scrollBy({ top: e.deltaY });
	};

	$effect(() => {
		if (typeof window === 'undefined') return;
		window.addEventListener('wheel', onGlobalWheel, { passive: false });
		return () => window.removeEventListener('wheel', onGlobalWheel as any);
	});

	// Provide left scroll container via context for children that need it
	const ctxKey = 'splitpane';
	$effect(() => {
		setContext(ctxKey, {
			getLeftPane: () => leftPaneEl
		});
	});
</script>

<!-- Mobile floating controls: do not take layout space -->
{#if bp?.isMobile && !drawers?.leftOpen && !drawers?.rightOpen}
	<button
		class="md:hidden fixed shadow-xs left-3 top-3 z-50 px-2 py-1 border border-border rounded-sm bg-white"
		onclick={() => drawers?.openLeft()}
	>
		<Icon icon="bx:menu" class="text-xl text-muted" />
	</button>
	<button
		class="md:hidden fixed shadow-xs right-3 top-3 z-50 px-2 py-1 border border-border rounded-sm bg-white"
		onclick={() => drawers?.openRight()}
	>
		<Icon icon="bx:dots-horizontal" class="text-xl text-muted" />
	</button>
{/if}

<!--use divide-y-border -->
<div class="pane-shadow h-full bg-white border-border border-[0.5px] w-full md:w-[38rem]">
	<div class="flex h-full flex-col">
		{#if leftHeader}
			{@render leftHeader?.()}
		{/if}
		<div class="flex-1 overflow-y-auto scrollbar-hide pb-6" bind:this={leftPaneEl}>
			<Banner />
			{@render left?.()}
		</div>
	</div>
</div>


<!-- Desktop right pane -->
<aside class="hidden md:flex flex-col pl-8 pt-8" style="width: 20rem">
	{@render right?.()}
</aside>

<!-- Mobile right drawer -->
{#if bp?.isMobile && drawers?.rightOpen}
	<div class="md:hidden fixed inset-0 z-40" onkeydown={onKey} tabindex="0">
		<!-- backdrop -->
		<div class="absolute inset-0 bg-black/30" onclick={() => drawers?.closeRight()}></div>
		<!-- drawer -->
		<aside class="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white border-l border-border p-4">
			<div class="flex justify-end mb-2">
				<button class="text-sm app-button"
								onclick={() => drawers?.closeRight()}>Close
				</button>
			</div>
			{@render right?.()}
		</aside>
	</div>
{/if}
