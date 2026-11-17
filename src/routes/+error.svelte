<script lang="ts">
	let { status, error } = $props();
</script>

<div class="flex flex-col items-center justify-center py-24">
	<h1 class="text-title font-bold text-lg">{status}</h1>
	<span class="text-muted">{error?.message}</span>
</div>
