<script lang="ts">
	import Icon from '@iconify/svelte';
	import { tooltip } from '$lib/ui/tooltip.ts';

	let {
		text,
		placement = 'bottom',
		class: extraClass = ''
	} = $props<{
		text: string;
		placement?: 'top' | 'bottom' | 'left' | 'right';
		class?: string;
	}>();

	const tip = $derived.by(() => ({ content: text, placement }));
</script>

<span
	use:tooltip={tip}
	class={`inline-flex items-center text-faint hover:text-muted ${extraClass}`}
	tabindex="0"
	aria-label={text}
>
  <Icon icon="bx:info-circle" class="text-sm" />
	<!-- minimal, reusable info tooltip icon -->
</span>

