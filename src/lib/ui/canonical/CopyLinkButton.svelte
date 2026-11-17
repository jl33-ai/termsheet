<script lang="ts">
	import Icon from '@iconify/svelte';

	let {
		href,
		title = 'Copy link',
		class: className = ''
	} = $props<{
		href: string;
		title?: string;
		class?: string;
	}>();

	let copied = $state(false);

	function copy() {
		const full =
			typeof window !== 'undefined' ? new URL(href, window.location.href).toString() : href;
		try {
			navigator.clipboard?.writeText(full);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// no-op
		}
	}
</script>

<button
	class={`hover-highlight p-1 text-faint ${className}`}
	title={copied ? 'Copied!' : title}
	onclick={copy}
	type="button"
>
	{#if copied}
		<Icon icon="bx:check" />
	{:else}
		<Icon icon="bx:link" />
	{/if}
</button>
