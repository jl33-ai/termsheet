<script lang="ts">
	import Icon from '@iconify/svelte';

	let { icon, text } = $props();
</script>

<div class="w-full text-faint h-36 gap-2 text-sm  flex-col flex justify-center items-center">
	<Icon icon={icon} class="text-lg" />
	<span>{text}</span>
	<!-- todo	start the conversation -->
</div>
