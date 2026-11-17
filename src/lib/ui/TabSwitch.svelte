<script lang="ts">
	import Icon from '@iconify/svelte';

	type Option = { value: string; label: string; icon?: string };

	let {
		value = $bindable<string>(),
		options = [] as Option[],
		class: className = ''
	} = $props<{ value?: string; options?: Option[]; class?: string }>();
</script>

<div class={`flex border-b-[0.5px] border-border ${className}`}>
	{#each options as opt}
		<button
			type="button"
			class="relative flex-1 py-3 hover-highlight"
			class:text-title={value === opt.value}
			class:text-muted={value !== opt.value}
			class:font-bold={value === opt.value}
			class:font-medium={value !== opt.value}
			onclick={() => (value = opt.value)}
		>
      <span class="inline-flex items-center gap-[6px]">
        {#if opt.icon}
          <Icon icon={opt.icon} class="text-sm" />
        {/if}
				<span>{opt.label}</span>
      </span>
			{#if value === opt.value}
				<div
					class="pointer-events-none absolute bottom-0 left-1/2 h-[1px] w-1/4 -translate-x-1/2 bg-[color:var(--c-title)]"></div>
			{/if}
		</button>
	{/each}
</div>
