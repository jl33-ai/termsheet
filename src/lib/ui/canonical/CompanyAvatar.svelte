<script lang="ts">
	let {
		name,
		logo_url = '',
		size = 'sm'
	} = $props<{ name: string; logo_url?: string | null; size?: 'sm' | 'lg' }>();

	const cls = $derived(size === 'lg' ? 'h-10 w-10' : 'h-6 w-6');
	const initial = $derived(name?.[0]?.toUpperCase() || '');
	const colorIndex = $derived.by(() => {
		const s = name || '';
		let h = 0;
		for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
		return h % 32;
	});
	const bgStyle = $derived(`background-color: var(--random-color-${colorIndex});`);
</script>

{#if logo_url}
	<img src={logo_url} alt={`${name} logo`} class={`${cls} rounded-full`} />
{:else}
	<div
		class={`${cls} flex items-center justify-center rounded-full text-xs font-medium text-white`}
		style={bgStyle}
	>
		{initial}
	</div>
{/if}
