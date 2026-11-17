<script lang="ts">
  import type { SButtonProps } from '$lib/types';

  let {
    type = 'button',
    disabled = false,
    variant = 'primary',
    onclick,
    class: className = '',
    children,
    ...rest
  }: SButtonProps = $props();

	const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors';
	const primaryClasses = 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400';
	const secondaryClasses = 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100';
	const disabledClasses = 'disabled:cursor-not-allowed';
</script>

<button
	{type}
	{disabled}
	{onclick}
	class="{baseClasses} {variant === 'primary' ? primaryClasses : secondaryClasses} {disabledClasses} {className}"
	{...rest}
>
	{@render children?.()}
</button>
