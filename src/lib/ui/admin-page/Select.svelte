<script lang="ts">
  import type { SelectProps } from '$lib/types';

  let {
    value = $bindable(''),
    disabled = false,
    required = false,
    class: className = '',
    id,
    onchange,
    children,
    ...rest
  }: SelectProps = $props();

	const baseClasses = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed';
</script>

<select
	{id}
	bind:value
	{disabled}
	{required}
	{onchange}
	class="{baseClasses} {className}"
	{...rest}
>
	{@render children?.()}
</select>
