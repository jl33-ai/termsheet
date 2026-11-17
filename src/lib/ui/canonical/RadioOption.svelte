<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		checked = $bindable(false),
		label = '',
		description = '',
		disabled = false,
		onSelect,
		right
	} = $props<{
		checked?: boolean;
		label?: string;
		description?: string;
		disabled?: boolean;
		onSelect?: () => void;
		right?: Snippet;
	}>();

	function select() {
		if (disabled) return;
		onSelect?.();
		// Fallback for local-control usage
		checked = true;
	}

	function onKeyDown(e: KeyboardEvent) {
		if (disabled) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			select();
		}
	}
</script>

<div
	role="radio"
	aria-checked={checked}
	aria-disabled={disabled}
	tabindex={disabled ? -1 : 0}
	class={`flex items-center justify-between rounded-sm p-2 transition-colors duration-[144ms] ease-out ${
    disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover-highlight-secondary'
  }`}
	onclick={select}
	onkeydown={onKeyDown}
>
	<div class="flex items-center gap-2">
    <span class={`flex items-center justify-center h-4 w-4 rounded-full transition-colors [duration-144ms] ease-out ${
        checked ? 'bg-[color:var(--c-title)]' : 'bg-white border border-border'
      }`}>
      <span
				class={`h-[7px] w-[7px] rounded-full bg-white transition-transform duration-[144ms] ease-out  ${checked ? 'scale-100' : 'scale-0'}`}></span>
    </span>
		<div>
			<div class={`text-sm ${checked ? 'font-medium text-title' : 'text-base'}`}>{label}</div>
			{#if description}
				<div class="text-xs text-faint">{description}</div>
			{/if}
		</div>
	</div>
	{@render right?.()}
</div>
