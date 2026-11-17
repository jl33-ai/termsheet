<script lang="ts">
	import Icon from '@iconify/svelte';

	let term = $state('');
	let results = $state<{ id: string; question: string }[]>([]);
	let open = $state(false);
	let searching = $state(false);

	let debounceId: number | null = null;

	async function runSearch(q: string) {
		searching = true;
		try {
			const url = q.trim().length ? `/api/search?q=${encodeURIComponent(q.trim())}` : `/api/search`;
			const res = await fetch(url);
			const j = await res.json().catch(() => ({} as any));
			const arr = Array.isArray(j?.markets) ? (j.markets as any[]) : [];
			results = arr.map((m) => ({ id: String(m.id), question: String(m.question ?? '') }));
		} catch {
			results = [];
		} finally {
			searching = false;
		}
	}

	function onInput(e: Event) {
		term = (e.currentTarget as HTMLInputElement).value;
		open = true;
		if (debounceId) window.clearTimeout(debounceId);
		debounceId = window.setTimeout(() => runSearch(term), 200);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			open = false;
			return;
		}
		if (e.key === 'Enter') {
			const first = results?.[0];
			if (first) {
				window.location.href = `/market/${first.id}`;
			}
		}
	}

	function onFocus() {
		open = true;
		if (!results.length) runSearch(term);
	}

	function onBlur() {
		// Small delay to allow link clicks
		setTimeout(() => (open = false), 120);
	}
</script>

<div class="relative w-full">
	<div class="flex items-center gap-2 py-2">
		<Icon icon="bx:search" class="text-faint" />
		<input
			class="flex-1 bg-transparent outline-none text-base text-sm"
			placeholder="Search markets"
			value={term}
			oninput={onInput}
			onfocus={onFocus}
			onblur={onBlur}
			onkeydown={onKeydown}
			type="search"
		/>
	</div>

	{#if open && results.length > 0}
		<div class="absolute z-10 mt-2 w-full rounded-sm pane-shadow border border-border bg-white">
			{#each results.slice(0, 5) as m}
				<a href={`/market/${m.id}`} class="block px-3 py-2 text-sm text-title hover:underline">
					{m.question}
				</a>
			{/each}
		</div>
	{/if}
</div>
