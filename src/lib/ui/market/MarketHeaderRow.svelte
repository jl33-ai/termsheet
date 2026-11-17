<script lang="ts">
	import BackButton from '$lib/ui/canonical/BackButton.svelte';
	import CopyLinkButton from '$lib/ui/canonical/CopyLinkButton.svelte';
	import MarketSources from '$lib/ui/market/MarketSources.svelte';

	let { question, copyHref, marketId }: { question: string; copyHref: string; marketId: string } = $props();
</script>

<div class="group mt-2 w-[90%]">
	<h1 class="inline text-2xl font-bold text-title">{question}</h1>
	<div class="ml-2 inline-block align-middle opacity-100 md:opacity-0 md:group-hover:opacity-100">
		<CopyLinkButton href={copyHref} />
	</div>
</div>
