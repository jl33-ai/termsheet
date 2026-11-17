<script lang="ts">
  import type { CardProps } from '$lib/types';

  let { class: className = '', children }: CardProps = $props();

	const baseClasses = 'bg-white border border-gray-200 rounded-lg p-6';
</script>

<div class="{baseClasses} {className}">
	{@render children?.()}
</div>
